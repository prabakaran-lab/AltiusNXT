import { config, isScrapeDoConfigured } from '../config.js'

/**
 * Fetches the rendered HTML of a product page.
 * Uses scrape.do (JS-rendered, bypasses basic bot blocks) when configured;
 * falls back to a plain server-side fetch otherwise so the tool still works
 * for pages that don't need JS rendering.
 */
async function directFetch(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AltiusNxtReadinessBot/1.0)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw new Error(`Direct fetch failed (${res.status})`)
  }
  return { html: await res.text(), source: 'direct-fetch' }
}

export async function fetchPageHtml(url) {
  if (isScrapeDoConfigured()) {
    try {
      const endpoint = new URL('https://api.scrape.do/')
      endpoint.searchParams.set('token', config.scrapeDo.token)
      endpoint.searchParams.set('url', url)
      endpoint.searchParams.set('render', 'true')

      const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(25000) })
      if (!res.ok) {
        throw new Error(`scrape.do request failed (${res.status})`)
      }
      return { html: await res.text(), source: 'scrape.do' }
    } catch (err) {
      // Some sites block scrape.do's renderer outright (e.g. aggressive bot protection).
      // Fall back to a plain fetch rather than failing the whole scan.
      console.warn(`scrape.do failed for ${url} (${err.message}), falling back to direct fetch`)
      return directFetch(url)
    }
  }

  return directFetch(url)
}

/** Strips scripts/styles and collapses whitespace so we can hand a bounded amount of text to Gemini. */
export function extractReadableText(html, maxChars = 12000) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  const text = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, maxChars)
}

export function hasJsonLd(html) {
  return /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html)
}

/** Parses every JSON-LD block on the page into objects — best-effort, skips any block that
 *  doesn't parse rather than failing the whole page. Flattens @graph arrays one level since
 *  several platforms (Shopify, WooCommerce) nest the actual Product node inside one. */
export function extractJsonLdObjects(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const objects = []
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw.trim())
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        objects.push(item)
        if (Array.isArray(item?.['@graph'])) objects.push(...item['@graph'])
      }
    } catch {
      // Malformed JSON-LD — skip this block rather than failing the whole extraction.
    }
  }
  return objects
}

/** Finds the Product-typed JSON-LD node, if any, and reports which buyer-relevant fields it's
 *  missing — a page can have *some* structured data (true, and worth crediting) while still
 *  giving AI engines none of the specific fields that let them cite it confidently. Also flags
 *  the common platform mistake of the "brand" field naming the SELLER instead of the actual
 *  manufacturer (Shopify/WooCommerce default to the store name when no brand is set). */
export function checkProductStructuredDataFields(html, { manufacturerBrand, companyName } = {}) {
  const objects = extractJsonLdObjects(html)
  const product = objects.find((o) => {
    const type = o?.['@type']
    return type === 'Product' || (Array.isArray(type) && type.includes('Product'))
  })
  if (!product) return { hasProductNode: false, missingFields: [], brandIsSeller: false }

  // mpn (manufacturer part number) and sku (the seller's own internal stock code) are distinct
  // fields with distinct meaning — a page can have sku set and still be missing mpn entirely, and
  // sku alone doesn't help an AI engine cross-reference the product against other sellers. Only
  // mpn counts here, matching the same internal-code-vs-real-code distinction this pipeline
  // already applies to the visible page text elsewhere.
  const missingFields = []
  if (!product.mpn) missingFields.push('manufacturer part number (mpn)')
  if (!product.description || String(product.description).trim().length < 20) missingFields.push('description')
  if (!product.brand) missingFields.push('brand')

  const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name
  const brandIsSeller = Boolean(
    brandName && companyName &&
    brandName.trim().toLowerCase() === String(companyName).trim().toLowerCase() &&
    manufacturerBrand && manufacturerBrand.trim().toLowerCase() !== brandName.trim().toLowerCase()
  )

  return { hasProductNode: true, missingFields, brandIsSeller, statedBrand: brandName || null }
}

/** Checks the <title> tag for the specific defect of repeating the product name as two separate
 *  pipe/dash-separated segments (e.g. "X | X | Store Name") — a real, verifiable structural
 *  defect distinct from the content gaps above; only fires on an exact duplicate segment, never
 *  a fuzzy/guessed match. */
export function checkTitleTagDuplication(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return { hasDuplication: false, titleText: null }
  const titleText = match[1].replace(/\s+/g, ' ').trim()
  const segments = titleText.split(/[|–—-]/).map((s) => s.trim().toLowerCase()).filter(Boolean)
  const hasDuplication = new Set(segments).size < segments.length && segments.length > 1
  return { hasDuplication, titleText }
}

/** Checks a page's breadcrumb trail (common "breadcrumb" class/id patterns) for a consecutive
 *  repeated level (e.g. "Ball Bearings > Ball Bearings > ..."). Best-effort regex extraction
 *  over raw HTML — returns hasDuplication: false (never guesses) when no breadcrumb container
 *  is confidently found. */
export function checkBreadcrumbDuplication(html) {
  const match = html.match(/<[a-z]+[^>]*(?:class|id)=["'][^"']*breadcrumb[^"']*["'][^>]*>([\s\S]*?)<\/(?:nav|div|ul|ol)>/i)
  if (!match) return { hasDuplication: false, crumbs: [] }
  const text = match[1].replace(/<[^>]+>/g, '|').replace(/&nbsp;/g, ' ')
  const crumbs = text.split(/[|›»>/]/).map((s) => s.replace(/\s+/g, ' ').trim()).filter((s) => s.length > 0)
  let hasDuplication = false
  for (let i = 1; i < crumbs.length; i++) {
    if (crumbs[i].toLowerCase() === crumbs[i - 1].toLowerCase()) { hasDuplication = true; break }
  }
  return { hasDuplication, crumbs }
}

/** True when a static fetch only got a "please enable JavaScript" shell instead of real content —
 *  common on heavy JS portals. Callers should treat spec/description counts from this text as
 *  unreliable (likely just nav/menu noise) rather than a genuine measure of the page. */
export function isJsBlockedText(text) {
  return /javascript is disabled|enable javascript|requires javascript/i.test(text || '')
}
