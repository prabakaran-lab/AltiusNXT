import { fetchPageHtml, extractReadableText, isBotChallengeText } from './scrapeDo.js'
import { extractPriceFromHtml, findKnownUrl, priceToValue } from './competitorBenchmark.js'

/**
 * Checks each competitor's price against the seller's OWN product page, so the report states prices
 * that were seen, not just reported by a search answer.
 *   confirmed   — the page shows this product's part number and a price that matches (within 2%)
 *   mismatch    — the page shows the product and a different price: the search figure is stale or
 *                 wrong, so the seller is left out of the comparison (never shown with a doubtful price)
 *   unconfirmed — no product page was linked / readable, or it declares no price: kept, but reported
 *                 as "as reported by live AI web search", never as confirmed
 * Only structured prices (JSON-LD / meta) from the page are used for the comparison, so a promo
 * banner or a related-product price can never be mistaken for the seller's price.
 */

const TOLERANCE = 0.02
const alnum = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const close = (a, b) => a > 0 && b > 0 && Math.abs(a - b) / Math.max(a, b) <= TOLERANCE

/** The page lists a pack: its price is a whole-number multiple of the single-item price, and the page itself
 *  names that pack size ("box of 10", "10-pack", "per 10"). A different pack size is not a wrong price. */
function isPackOf(pagePrice, itemPrice, pageText) {
  if (!(pagePrice > 0 && itemPrice > 0)) return false
  const ratio = pagePrice / itemPrice
  const n = Math.round(ratio)
  if (n < 2 || n > 1000 || Math.abs(ratio - n) / n > TOLERANCE) return false
  const near = new RegExp(`(?:pack|pkg|package|box|case|carton|bundle|set|lot|per|qty|quantity|of|sold\\s+in)\\s*[^.\\n]{0,25}\\b${n}\\b|\\b${n}\\s*[- ]?(?:pack|pk|pcs?|pieces?|ct|count|per)\\b`, 'i')
  return near.test(pageText)
}

async function verifyOne(seller, { knownUrls, excludeDomain, codeKey }) {
  const pageUrl = findKnownUrl(seller.seller, knownUrls, excludeDomain)
  if (!pageUrl) return { status: 'unconfirmed', reason: 'no product page linked' }
  let html
  try {
    ;({ html } = await fetchPageHtml(pageUrl))
  } catch {
    return { status: 'unconfirmed', pageUrl, reason: 'page could not be read' }
  }
  const text = extractReadableText(html, 20000)
  if (isBotChallengeText(text)) return { status: 'unconfirmed', pageUrl, reason: 'page blocked our reader' }
  // The page must be about this product, or its price says nothing about it.
  if (codeKey && !alnum(`${text} ${pageUrl}`).includes(codeKey)) return { status: 'unconfirmed', pageUrl, reason: 'page does not show the part number' }
  const page = extractPriceFromHtml(html)
  if (!page) return { status: 'unconfirmed', pageUrl, reason: 'page declares no price' }

  // The search figure may be the listed (pack) price or the per-item price derived from it.
  const stated = [priceToValue(seller.listedPrice || seller.price), seller.priceValue].filter((v) => Number.isFinite(v))
  const matches = stated.some((v) => close(v, page.value)) || stated.some((v) => isPackOf(page.value, v, text))
  return { status: matches ? 'confirmed' : 'mismatch', pageUrl, pagePrice: page.raw }
}

/**
 * @param sellers  [{ seller, price, priceValue, listedPrice? }]
 * @returns { sellers: [...kept, each with verification], dropped: [...], counts }
 */
export async function verifySellerPrices({ sellers, knownUrls, excludeDomain, productCode }) {
  const codeKey = (() => { const k = alnum(productCode); return k.length >= 4 && /[0-9]/.test(k) ? k : '' })()
  const checked = await Promise.all(sellers.map(async (s) => ({ s, v: await verifyOne(s, { knownUrls, excludeDomain, codeKey }).catch(() => ({ status: 'unconfirmed', reason: 'check failed' })) })))
  const kept = []
  const dropped = []
  for (const { s, v } of checked) {
    if (v.status === 'mismatch') {
      dropped.push({ seller: s.seller, searchPrice: s.price, pagePrice: v.pagePrice, pageUrl: v.pageUrl })
      console.log(`[outreach] price check: dropped ${s.seller} — search said ${s.price}, its own page shows ${v.pagePrice}`)
    } else {
      if (v.status === 'unconfirmed') console.log(`[outreach] price check: ${s.seller} unconfirmed (${v.reason})`)
      kept.push({ ...s, verification: v.status, verifiedOn: v.pageUrl || null })
    }
  }
  const confirmed = kept.filter((s) => s.verification === 'confirmed').length
  return { sellers: kept, dropped, counts: { confirmed, unconfirmed: kept.length - confirmed, dropped: dropped.length } }
}
