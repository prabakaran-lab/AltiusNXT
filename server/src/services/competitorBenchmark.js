import { fetchPageHtml, extractReadableText, isJsBlockedText, extractJsonLdObjects } from './scrapeDo.js'
import { askGeminiTextWithSearch, extractSellerPrices, filterRelevantSellers } from './gemini.js'
import { callOpenAIWithSearch } from './liveEngines.js'
import { isGeminiConfigured, isOpenAIConfigured } from '../config.js'

const MAX_SELLERS = 10
// How far a seller's price can sit from the group median before it's treated as a different
// unit/quantity (e.g. single unit vs. a box of 10) rather than a genuinely comparable price,
// and dropped from the price chart. Wide enough to allow real price spread, narrow enough to
// catch the kind of $17-vs-$380 mismatch that signals mismatched units.
const MAX_MEDIAN_RATIO = 4

export function normalizeSellerName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')            // "PGN (PGN Bearings)" → "PGN"; "Bearings Direct (AMPEC)" → "Bearings Direct"
    .replace(/\.(com|com\.au|co\.uk|co|net|store)\b/g, '')
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/** True when two seller names refer to the same business: identical once normalized, or one is a
 *  prefix of the other ("PGN" / "PGN Bearings", "Intech Bearing" / "Intech Bearing Inc"). */
export function isSameSeller(a, b) {
  const ka = normalizeSellerName(a)
  const kb = normalizeSellerName(b)
  if (!ka || !kb) return false
  if (ka === kb) return true
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka]
  return short.length >= 3 && long.startsWith(short)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Phrases that mean the number nearby is a threshold/promo amount, not the product's own price
// (e.g. "Free shipping on orders over $75", "Spend $50 and save 10%") — a plain currency-regex
// grab has no way to tell these apart from the real price, and since promo banners commonly sit
// above the actual price in page text/DOM order, naively taking the first match picks the promo
// threshold instead. Checked against a window of text around each match, not just a prefix.
const PROMO_CONTEXT_RE = /\b(free\s+shipping|shipping\s+on\s+orders?|orders?\s+over|spend|save\s+\$?\d|minimum\s+order|coupon|discount\s+code|gift\s+card)\b/i

// Grabs currency-prefixed numbers (A$72.95, $67.00, £12.50, €9.99) — the page's own currency
// convention is kept rather than normalized, since the report displays each seller's own price as-is.
// Drops matches sitting in a promo/threshold context (see PROMO_CONTEXT_RE) so a "free shipping
// over $75" banner above the real price doesn't get mistaken for the product's price.
// A number introduced by one of these is the struck-through "before" price (MSRP / was / list),
// not what the buyer pays — it usually appears BEFORE the sale price in page text, so without this
// check the first match is the wrong one.
const STRIKE_CONTEXT_RE = /\b(msrp|rrp|was|list price|retail price|compare at|regular price|you save|save)\b\s*:?\s*$/i

export function extractPriceSignals(text) {
  // Thousands separators are part of the number ("$4,450.00"), never a decimal comma — the old
  // pattern read "$4,672.50" as "4,67" → 467, which then poisoned every price-derived figure.
  const matches = [...text.matchAll(/(A\$|US\$|NZ\$|CA\$|[$£€])\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d{1,6}(?:\.\d{2})?)/g)]
  const out = []
  for (const m of matches) {
    const windowStart = Math.max(0, m.index - 40)
    const windowEnd = Math.min(text.length, m.index + m[0].length + 20)
    if (PROMO_CONTEXT_RE.test(text.slice(windowStart, windowEnd))) continue
    const value = Number(m[2].replace(/,/g, ''))
    if (!(value > 0 && value < 1000000)) continue
    const before = text.slice(windowStart, m.index).trim()
    out.push({ raw: `${m[1]}${m[2]}`, value, isStrike: STRIKE_CONTEXT_RE.test(before) })
  }
  // Current/sale prices rank ahead of struck-through "was" prices; otherwise keep page order.
  return out.sort((a, b) => Number(a.isStrike) - Number(b.isStrike))
}

/**
 * The page's own machine-readable price (JSON-LD Product offers, then Open Graph / itemprop meta)
 * — authoritative where present, and immune to the "MSRP shown before sale price" ordering trap.
 */
export function extractPriceFromHtml(html) {
  const symbolFor = (cur) => ({ USD: '$', AUD: 'A$', NZD: 'NZ$', CAD: 'CA$', GBP: '£', EUR: '€' }[String(cur || '').toUpperCase()] || '$')
  const fmt = (value, cur) => `${symbolFor(cur)}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const toValue = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, ''))

  for (const o of extractJsonLdObjects(html || '')) {
    const type = o?.['@type']
    if (!(type === 'Product' || (Array.isArray(type) && type.includes('Product')))) continue
    const offers = Array.isArray(o.offers) ? o.offers[0] : o.offers
    const value = toValue(offers?.price ?? offers?.lowPrice ?? offers?.priceSpecification?.price)
    if (value > 0) return { raw: fmt(value, offers.priceCurrency), value, source: 'json-ld' }
  }
  const metaAttr = (names) => {
    const alt = names.join('|')
    const a = html.match(new RegExp(`<meta[^>]+(?:property|itemprop|name)=["'](?:${alt})["'][^>]+content=["']([^"']+)["']`, 'i'))
    const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|itemprop|name)=["'](?:${alt})["']`, 'i'))
    return (a || b)?.[1]
  }
  const metaPrice = metaAttr(['product:price:amount', 'og:price:amount', 'price'])
  if (metaPrice) {
    const value = toValue(metaPrice)
    if (value > 0) return { raw: fmt(value, metaAttr(['product:price:currency', 'og:price:currency', 'priceCurrency'])), value, source: 'meta' }
  }
  return null
}

// Buying-decision specification fields a page can state. Counted as DISTINCT labels present as
// a labelled fact (label followed by a colon/dash, or by a value with digits close behind) — not
// raw keyword hits, which let nav text like "Material Handling" inflate the count.
const SPEC_LABELS = [
  // (deliberately no "sku"/"quantity": the seller's own stock code and the cart field aren't product facts)
  'brand', 'manufacturer', 'part number', 'mpn', 'model', 'upc', 'voltage', 'input voltage', 'amperage', 'amps',
  'output', 'duty cycle', 'phase', 'power', 'wattage', 'horsepower', 'torch', 'lead length', 'cable length', 'cut capacity',
  'cut thickness', 'capacity', 'weight', 'dimensions', 'length', 'width', 'height', 'depth', 'diameter', 'bore', 'outer diameter',
  'inner diameter', 'thread', 'material', 'finish', 'color', 'colour', 'size', 'load rating', 'speed', 'rpm', 'temperature',
  'pressure', 'flow rate', 'seal', 'warranty', 'certification', 'includes', "what's included", 'in the box', 'compatibility',
  'ply', 'sheets', 'pack', 'country of origin',
]
export function countSpecCues(text) {
  const t = String(text || '').toLowerCase()
  let count = 0
  for (const label of SPEC_LABELS) {
    const l = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // "label:" / "label -" / "label |", or the label with a number right behind it ("80% duty cycle",
    // "duty cycle 80%") — a prose mention like "...on the power supply and 2 year..." doesn't count.
    if (new RegExp(`\\b${l}\\b\\s*[:\\-–|]|\\b${l}\\b[^.\\n\\d]{0,10}\\d|\\d[^.\\n]{0,8}\\b${l}\\b`).test(t)) count++
  }
  return count
}

export function priceToValue(raw) {
  const m = String(raw).match(/\d[\d,]*(?:\.\d+)?/)
  return m ? Number(m[0].replace(/,/g, '')) : NaN
}

/**
 * Finds real sellers of the identical product and their prices via a live-web-search-grounded
 * LLM call (same engines already used for the citation audit), then extracts a structured list.
 * Originally this searched via Bright Data's SERP API directly, but that zone's async delivery
 * never completed in testing (requests stayed "pending" indefinitely) — this sidesteps that
 * dependency entirely using infrastructure already proven to work in this pipeline. Each found
 * seller's own page is then lightly scraped (best-effort, never fatal) for a spec-depth count.
 */
export async function benchmarkCompetitors({ manufacturerBrand, manufacturerCode, productName, category, excludeDomain, excludeCompany }) {
  const codeRegex = manufacturerCode ? new RegExp(manufacturerCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null
  if (!manufacturerBrand && !manufacturerCode && !productName) {
    throw new Error('Need at least a manufacturer brand, code, or product name to search for competitors')
  }
  const debug = Boolean(process.env.DEBUG_OUTREACH)

  // A natural description searches far better than a literal brand+code concatenation — a
  // page-derived "code" like "Bp F Black (PK10)" is often just how ONE retailer phrases it, and
  // quoting it verbatim as a search term returns nothing from anyone else.
  const query = [manufacturerBrand, manufacturerCode].filter(Boolean).join(' ').trim() || productName
  const naturalDescription = [manufacturerBrand, category || productName].filter(Boolean).join(' ')
  const searchPrompt = `Find real online stores that currently sell ${naturalDescription} — specifically the variant described as ` +
    `"${manufacturerCode || productName}". For each real seller you find (even if it's a similar or closely matching variant from the ` +
    `same manufacturer), state the store/seller name, the exact current price, whether it is currently in stock or sold out / ` +
    `unavailable, and the exact configuration or part number that price is for, as plain sentences. Include the manufacturer's own ` +
    `store or official distributor if it sells direct. List as many distinct real sellers as you can find, with their prices.`

  let searchText = ''
  if (isGeminiConfigured()) {
    searchText = await askGeminiTextWithSearch(searchPrompt).catch((err) => {
      if (debug) console.error(`[debug benchmarkCompetitors] gemini search failed: ${err.message}`)
      return ''
    })
  }
  if (!searchText && isOpenAIConfigured()) {
    searchText = await callOpenAIWithSearch(searchPrompt).catch((err) => {
      if (debug) console.error(`[debug benchmarkCompetitors] openai search failed: ${err.message}`)
      return ''
    })
  }
  if (debug) console.error(`[debug benchmarkCompetitors] query="${query}" searchText:`, JSON.stringify(searchText))
  if (!searchText) return { query, sellers: [] }

  const { sellers: rawSellers } = await extractSellerPrices({ text: searchText, excludeCompany })
  if (debug) console.error(`[debug benchmarkCompetitors] extracted ${rawSellers.length} seller/price pairs:`, JSON.stringify(rawSellers))

  // Dedupe by normalized name — the extraction prompt asks for this too, but a second pass here
  // catches variants the LLM missed (e.g. "Amazon" and "Amazon AU" slipping through as separate).
  // The prospect itself must never appear as its own competitor — matched by store name AND by
  // domain stem, since engines name a store several ways ("MyToolSupply", "My Tool Supply",
  // "mytoolsupply.com") and the typed company name may differ from the store's trading name.
  const prospectKeys = [excludeCompany, excludeDomain ? excludeDomain.split('.')[0] : '']
    .map(normalizeSellerName).filter((k) => k.length >= 4)
  const isProspect = (name) => {
    const key = normalizeSellerName(name)
    return prospectKeys.some((p) => key === p || key.includes(p) || p.includes(key))
  }
  // Open marketplaces mix third-party, used and grey-import listings under one name, so their
  // price isn't a comparable dealer price — the reference reports cite them in the query tables
  // but never rank them in the price benchmark.
  const isMarketplace = (name) => /^(ebay|amazon|alibaba|aliexpress|walmart marketplace|etsy|mercari|craigslist|facebook marketplace)\b/i.test(String(name || '').trim())

  const seenNames = []
  const deduped = []
  for (const s of rawSellers.slice(0, MAX_SELLERS + 4)) {
    const key = normalizeSellerName(s.seller)
    if (!key || seenNames.some((seen) => isSameSeller(seen, s.seller))) continue
    if (isProspect(s.seller) || isMarketplace(s.seller)) continue
    // Sold-out / unavailable listings are shown for reference in the reference report, never
    // ranked against the prospect's in-stock price.
    if (s.inStock === false) {
      if (debug) console.error(`[debug benchmarkCompetitors] dropped out-of-stock seller: ${s.seller} ${s.price}`)
      continue
    }
    seenNames.push(s.seller)
    deduped.push(s)
    if (deduped.length >= MAX_SELLERS) break
  }

  // Relevance gate: drop candidates the LLM surfaced that share a name/brand but are clearly a
  // different product line (e.g. "Browning Safes" for a Browning power-transmission part).
  const relevant = await filterRelevantSellers({ sellers: deduped, productName, manufacturerBrand, category })
  if (debug && relevant.length !== deduped.length) {
    console.error(`[debug benchmarkCompetitors] relevance filter dropped ${deduped.length - relevant.length}:`,
      JSON.stringify(deduped.filter((d) => !relevant.includes(d)).map((d) => d.seller)))
  }

  const withPrices = relevant
    .map((s) => ({ ...s, priceValue: priceToValue(s.price) }))
    .filter((s) => Number.isFinite(s.priceValue) && s.priceValue > 0)

  // Outlier sanity filter: a price far from the group median usually means a different unit or
  // quantity slipped through (single unit vs. a box of 10), not a genuinely comparable price —
  // this is what produces a nonsensical $17-to-$380 spread for "the same product."
  const med = withPrices.length >= 2 ? median(withPrices.map((s) => s.priceValue)) : null
  const sane = med
    ? withPrices.filter((s) => {
        const ratio = s.priceValue / med
        const keep = ratio <= MAX_MEDIAN_RATIO && ratio >= 1 / MAX_MEDIAN_RATIO
        if (!keep && debug) console.error(`[debug benchmarkCompetitors] dropped price outlier: ${s.seller} ${s.price} (median ${med})`)
        return keep
      })
    : withPrices

  const sellers = []
  for (const s of sane) {
    let specCount = 0
    let showsCode = false
    try {
      // Best-effort only — a seller named by the LLM but not independently confirmed by scrape
      // still has a real, LLM-sourced price; we just can't add a spec-depth count for it.
      // "Intech Bearing Inc." → intechbearinginc.com; "theBigBearingStore.com" keeps its own domain.
      const sellerLower = s.seller.trim().toLowerCase()
      const guessUrl = /^https?:\/\//i.test(s.seller)
        ? s.seller
        : /\.[a-z]{2,}$/.test(sellerLower) && !/\s/.test(sellerLower)
          ? `https://${sellerLower}`
          : `https://${sellerLower.replace(/[^a-z0-9]/g, '')}.com`
      if (excludeDomain && guessUrl.includes(excludeDomain)) continue
      const { html } = await fetchPageHtml(guessUrl)
      const sellerText = extractReadableText(html, 5000)
      specCount = isJsBlockedText(sellerText) ? 0 : countSpecCues(sellerText)
      showsCode = codeRegex ? codeRegex.test(sellerText) : false
    } catch {
      // seller name isn't a cleanly guessable domain, or the page didn't load — fine, keep the price
    }
    sellers.push({ seller: s.seller, price: s.price, unit: s.unit || '', priceValue: s.priceValue, specCount, showsCode })
  }

  sellers.sort((a, b) => a.priceValue - b.priceValue)
  return { query, sellers }
}
