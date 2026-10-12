import { fetchPageHtml, extractReadableText, hasJsonLd } from './scrapeDo.js'

const PRODUCT_URL_HINTS = /\/(products?|item|shop|sku|p|catalog)\//i
const MAX_SITEMAP_URLS = 400
const MAX_CANDIDATES_TO_SCORE = 24
const MAX_SHORTLIST_FOR_AI = 12

async function tryFetchHtml(url) {
  try {
    const { html } = await fetchPageHtml(url)
    return html
  } catch {
    return ''
  }
}

function decodeXmlEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeXmlEntities(m[1].trim()))
}

/** Runs async work over items with bounded concurrency instead of fully sequential or fully parallel. */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** Finds a sitemap via the conventional path or robots.txt, and expands one level of sitemap-index nesting. */
async function discoverSitemapUrls(origin) {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  const robots = await tryFetchHtml(`${origin}/robots.txt`)
  candidates.push(...[...robots.matchAll(/Sitemap:\s*(\S+)/gi)].map((m) => m[1]))

  const urls = new Set()
  for (const sitemapUrl of candidates) {
    const xml = await tryFetchHtml(sitemapUrl)
    if (!xml) continue
    const locs = extractLocs(xml)
    for (const loc of locs) {
      if (urls.size >= MAX_SITEMAP_URLS) break
      if (/sitemap[^/]*\.xml(\?|$)/i.test(loc) && loc !== sitemapUrl) {
        const nestedXml = await tryFetchHtml(loc)
        extractLocs(nestedXml).forEach((u) => urls.add(u))
      } else {
        urls.add(loc)
      }
    }
    if (urls.size >= MAX_SITEMAP_URLS) break
  }
  return [...urls]
}

/** Fallback when no sitemap exists: pull same-domain links straight off the homepage. */
async function discoverProductUrlsFromHomepage(origin) {
  const html = await tryFetchHtml(origin)
  if (!html) return []
  const domain = new URL(origin).hostname
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1])
  const resolved = hrefs
    .map((h) => {
      try { return new URL(h, origin).toString() } catch { return null }
    })
    .filter(Boolean)
    .filter((u) => {
      try { return new URL(u).hostname === domain } catch { return false }
    })
  return [...new Set(resolved)]
}

function looksLikeProductUrl(url) {
  return PRODUCT_URL_HINTS.test(url)
}

function hasPriceSignal(text) {
  return /[$£€]\s?\d|\bA\$\s?\d|\d+\.\d{2}\b/.test(text)
}

/** Lower score = thinner page (fewer spec cues, no structured data, less body text) — a better outreach candidate. */
function heuristicRichnessScore(html, text) {
  let score = 0
  if (hasJsonLd(html)) score += 3
  const specCueCount = (text.match(/\b(size|weight|dimension|material|capacity|voltage|color|colour|model|sku|spec|certified|warranty)\b/gi) || []).length
  score += Math.min(specCueCount, 10)
  score += Math.min(Math.floor(text.length / 400), 5)
  return score
}

/**
 * Crawls a prospect's site (sitemap-first, homepage-link fallback), scores discovered product
 * pages for how little information they expose, and returns a short list of the thinnest real
 * product pages (cheap heuristic scoring only — no AI spend yet). A later step picks the final
 * target and extracts its product identity from this shortlist.
 */
export async function findThinProductPages(domainOrUrl) {
  const origin = (() => {
    try { return new URL(domainOrUrl).origin } catch { return new URL(`https://${domainOrUrl}`).origin }
  })()

  let urls = await discoverSitemapUrls(origin)
  const usedSitemap = urls.length > 0
  let productUrls = urls.filter(looksLikeProductUrl)
  if (productUrls.length === 0) productUrls = urls

  if (productUrls.length === 0) {
    productUrls = (await discoverProductUrlsFromHomepage(origin)).filter(looksLikeProductUrl)
  }

  if (productUrls.length === 0) {
    throw new Error(`Could not discover any product pages on ${origin}`)
  }

  const candidates = productUrls.slice(0, MAX_CANDIDATES_TO_SCORE)
  const perUrl = await mapWithConcurrency(candidates, 8, async (url) => {
    const html = await tryFetchHtml(url)
    if (!html) return null
    const text = extractReadableText(html, 6000)
    if (!hasPriceSignal(text)) return null
    return { url, text, score: heuristicRichnessScore(html, text) }
  })
  const scored = perUrl.filter(Boolean)

  if (scored.length === 0) {
    throw new Error(`Found ${candidates.length} candidate URLs on ${origin} but none looked like sellable product pages`)
  }

  scored.sort((a, b) => a.score - b.score)
  return {
    origin,
    usedSitemap,
    totalCandidatesScored: scored.length,
    shortlist: scored.slice(0, MAX_SHORTLIST_FOR_AI),
  }
}
