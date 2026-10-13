import sharp from 'sharp'
import { fetchPageHtml, extractReadableText, extractJsonLdObjects, isBotChallengeText } from './scrapeDo.js'
import { extractUrls } from './competitorBenchmark.js'
import { askGeminiTextWithSearch } from './gemini.js'
import { isGeminiConfigured } from '../config.js'

/**
 * Finds a real product image for the enriched mock-up when the seller's own page has none.
 * Only an image taken from the MANUFACTURER's own product page is used, and only from a page that
 * shows this product's part number — so the picture is of the actual product, never a lookalike and
 * never generated. The image is downloaded and checked (a real image, big enough, not a logo)
 * before it is returned. Returns null when nothing can be verified: no image is better than a wrong one.
 */

const alnum = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const NOT_A_PRODUCT_IMAGE = /logo|favicon|sprite|placeholder|no[-_ ]?image|default|badge|icon|banner/i
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Image URLs a product page declares for itself, best first: structured data, then Open Graph. */
function declaredImages(html, pageUrl) {
  const out = []
  const push = (v) => {
    if (!v) return
    if (Array.isArray(v)) return v.forEach(push)
    const u = typeof v === 'string' ? v : v.url || v.contentUrl
    if (typeof u !== 'string') return
    try { out.push(new URL(u.replace(/&amp;/g, '&'), pageUrl).toString()) } catch { /* skip */ }
  }
  for (const o of extractJsonLdObjects(html)) {
    const type = o?.['@type']
    if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) push(o.image)
  }
  const meta = (name) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i')) || [])[1]
  push(meta('og:image'))
  push(meta('twitter:image'))
  return [...new Set(out)].filter((u) => !NOT_A_PRODUCT_IMAGE.test(new URL(u).pathname))
}

const SIZE_PARAMS = ['w', 'h', 'width', 'height', 'maxwidth', 'maxheight', 'size', 'sz', 'resize', 'fit']
function withoutSizeParams(u) {
  try {
    const url = new URL(u)
    SIZE_PARAMS.forEach((p) => url.searchParams.delete(p))
    return url.toString()
  } catch { return u }
}

/** Downloads an image and checks it is really a usable product picture; returns a data URL or null. */
async function fetchUsableImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA }, signal: AbortSignal.timeout(15000) })
    if (!res.ok || !/^image\/(jpeg|png|webp|gif)/i.test(res.headers.get('content-type') || '')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 4000 || buf.length > 8 * 1024 * 1024) return null
    const meta = await sharp(buf).metadata()
    if (!meta.width || !meta.height || meta.width < 300 || meta.height < 300) return null
    const out = await sharp(buf).flatten({ background: '#ffffff' }).resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer()
    return `data:image/jpeg;base64,${out.toString('base64')}`
  } catch {
    return null
  }
}

export async function findProductImage({ urls = [], brand, code, excludeDomain }) {
  const brandKey = alnum(brand)
  const codeKey = alnum(code)
  // Without a brand and a real-looking part number there is no way to be sure which product to show.
  if (brandKey.length < 3 || codeKey.length < 4 || !/[0-9]/.test(codeKey)) return null

  const isManufacturerHost = (u) => {
    try {
      const host = new URL(u).hostname.replace(/^www\./, '')
      if (excludeDomain && host.includes(excludeDomain)) return false
      return alnum(host.split('.').slice(0, -1).join('')).includes(brandKey)
    } catch { return false }
  }

  const tried = new Set()
  const fromPages = async (candidates) => {
    for (const pageUrl of candidates.filter((u) => !tried.has(u)).slice(0, 4)) {
      tried.add(pageUrl)
      try {
        const { html } = await fetchPageHtml(pageUrl)
        const text = extractReadableText(html, 20000)
        // A manufacturer page counts only if it shows this product's part number (in its text or its URL).
        if (isBotChallengeText(text) || !alnum(`${text} ${pageUrl}`).includes(codeKey)) continue
        for (const imageUrl of declaredImages(html, pageUrl).slice(0, 4)) {
          // Many sites declare a thumbnail (w=200&h=200); the same address without the size limits
          // is the full picture, so that is tried first.
          for (const candidate of [withoutSizeParams(imageUrl), imageUrl].filter((u, i, all) => all.indexOf(u) === i)) {
            const dataUrl = await fetchUsableImage(candidate)
            if (dataUrl) return { dataUrl, sourceUrl: candidate, pageUrl, host: new URL(pageUrl).hostname.replace(/^www\./, '') }
          }
        }
      } catch { /* try the next candidate */ }
    }
    return null
  }

  // 1. manufacturer pages the AI engines already linked; 2. if none of those checks out, one search for
  // the manufacturer's page, verified in exactly the same way.
  const found = await fromPages([...new Set(urls)].filter(isManufacturerHost))
  if (found || !isGeminiConfigured()) return found
  const text = await askGeminiTextWithSearch(`Find the manufacturer's own official product page for ${brand} ${code}. Give the page URL.`).catch(() => '')
  return fromPages(extractUrls(text).filter(isManufacturerHost))
}
