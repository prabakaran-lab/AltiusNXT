import { chromium } from 'playwright'
import { fetchPageHtml, extractReadableText, isJsBlockedText, isBotChallengeText, extractJsonLdObjects } from './scrapeDo.js'
import { askGeminiTextWithSearch, extractSellerPrices, filterRelevantSellers } from './gemini.js'
import { callOpenAIWithSearch } from './liveEngines.js'
import { isGeminiConfigured, isOpenAIConfigured } from '../config.js'
import { CURRENCY_SYMBOLS, isForeignCurrencyPrice, regionSellerClause } from './region.js'

const MAX_SELLERS = 10
// Sellers priced outside the prospect's currency are dropped only when at least this many in-region
// sellers remain; below that they are kept and marked as supplementary.
const MIN_IN_REGION_SELLERS = 3
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

const nameTokens = (name) => String(name || '').toLowerCase()
  .replace(/\([^)]*\)/g, ' ')
  .replace(/\.(com|com\.au|co\.uk|co|net|store)\b/g, '')
  .split(/[^a-z0-9]+/).filter(Boolean)

/**
 * Builds a test for "is this seller name the prospect itself?". A business is named several ways —
 * "Acme Tools", "Acme Industrial Tools", "acmetools.com" — so besides the exact / substring match, a
 * name also counts when it contains every DISTINCTIVE word of the prospect's name. The distinctive
 * words are read from the prospect's own domain: the leading words of its name that spell the start
 * of the domain ("kitts" + "tools" in "kittstools.com"). Words that are not part of the domain
 * ("Industrial") are free to differ, and a name that shares only a generic word is not the prospect.
 */
export function prospectNameMatcher({ names = [], domain = '' } = {}) {
  const stem = normalizeSellerName(String(domain || '').split('.')[0])
  const keys = [...names.map(normalizeSellerName), stem].filter((k) => k.length >= 4)
  const distinctive = names.map((n) => {
    const run = []
    let spelled = ''
    for (const t of nameTokens(n)) {
      if (!stem || !stem.startsWith(spelled + t)) break
      run.push(t)
      spelled += t
    }
    return run.join('').length >= 4 ? run : []
  }).filter((run) => run.length)
  return (sellerName) => {
    const key = normalizeSellerName(sellerName)
    if (!key) return false
    if (keys.some((p) => key === p || key.includes(p) || p.includes(key))) return true
    const tokens = new Set(nameTokens(sellerName))
    return distinctive.some((run) => run.every((t) => tokens.has(t)))
  }
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

// Currency markers the default pattern in extractPriceSignals already reads.
const DEFAULT_PRICE_MARKERS = new Set(['$', 'A$', 'US$', 'NZ$', 'CA$', '£', '€'])

// For a market whose currency the default pattern doesn't read (an "R" price in South Africa, "₹" in
// India, "S$", "RM", ...): a pattern for that currency's symbol or ISO code, so its prices count too.
// Used only once the market is known, because a bare letter such as "R" is not a price marker elsewhere.
function marketPricePattern(currencyCode) {
  const code = String(currencyCode || '').toUpperCase()
  const symbol = String(CURRENCY_SYMBOLS[code] || '').trim()
  const markers = [...new Set([symbol, code].filter((m) => m && !DEFAULT_PRICE_MARKERS.has(m)))]
  if (!markers.length) return null
  const esc = (m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z])(${markers.map(esc).join('|')})\\s?(\\d{1,3}(?:[, ]\\d{3})+(?:\\.\\d{2})?|\\d{1,6}(?:\\.\\d{2})?)`, 'g')
}

export function extractPriceSignals(text, { currencyCode } = {}) {
  // Thousands separators are part of the number ("$4,450.00"), never a decimal comma — the old
  // pattern read "$4,672.50" as "4,67" → 467, which then poisoned every price-derived figure.
  const marketRe = marketPricePattern(currencyCode)
  const matches = [
    ...text.matchAll(/(A\$|US\$|NZ\$|CA\$|[$£€])\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d{1,6}(?:\.\d{2})?)/g),
    ...(marketRe ? text.matchAll(marketRe) : []),
  ].sort((a, b) => a.index - b.index)
    // "S$49.90" is also seen by the plain "$" pattern as "$49.90": keep only the longer, fuller match.
    .filter((m, _, all) => !all.some((o) => o !== m && o.index < m.index && o.index + o[0].length >= m.index + m[0].length))
  const out = []
  for (const m of matches) {
    const windowStart = Math.max(0, m.index - 40)
    const windowEnd = Math.min(text.length, m.index + m[0].length + 20)
    if (PROMO_CONTEXT_RE.test(text.slice(windowStart, windowEnd))) continue
    const value = Number(m[2].replace(/[, ]/g, ''))
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
  const symbolFor = (cur) => CURRENCY_SYMBOLS[String(cur || '').toUpperCase()] || '$'
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

/** How many single items a priced unit holds: "box of 25" / "25-pack" / "per 25-piece package" /
 *  "per 100" → that number; "each", "per piece" or nothing stated → 1. Used to put every seller's
 *  price on the same footing (per single item) before they are charted and ranked. */
export function parsePackQuantity(unitText) {
  const t = String(unitText || '').toLowerCase()
  if (!t) return 1
  const patterns = [
    /(?:pack|package|pkg|box|case|carton|bag|set|lot|bundle)\s*(?:of|x)\s*(\d{1,4})\b/,
    /\b(\d{1,4})\s*[- ]?\s*(?:pack|pk|pkg|package|piece|pieces|pc|pcs|ct|count)\b/,
    /\bper\s+(\d{1,4})\b/,
    /\b(\d{1,4})\s*\/\s*(?:box|case|pack|pk)\b/,
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m) {
      const n = Number(m[1])
      if (n > 1 && n <= 5000) return n
    }
  }
  if (/\b(?:the |a )?pair\b/.test(t)) return 2
  return 1
}

/** Re-expresses a listed price as a price per single item, keeping what was listed so the report
 *  can say how it got there. Prices that are already per item come back unchanged. */
export function toPerUnit({ price, priceValue, unit }) {
  const qty = parsePackQuantity(unit)
  // Just the amount ("$4.52"), without the words an engine tacked on ("per wheel", "for the pair").
  const listed = (String(price || '').match(/^\s*[^\d\s]*\s?\d[\d,]*(?:\.\d+)?/) || [String(price || '')])[0].trim()
  if (qty <= 1 || !(priceValue > 0)) return { price: listed || price, priceValue, packQty: 1, listedPrice: listed || price }
  const perItem = priceValue / qty
  const symbol = (String(price || '').match(/^\s*([^\d\s]*)/) || [])[1] || '$'
  return { price: `${symbol}${perItem.toFixed(2)}`, priceValue: perItem, packQty: qty, listedPrice: listed }
}

/** Every http(s) link in some AI answers (tracking parameters removed) — the engines name the
 *  exact product pages they found, which is where a seller's spec depth should be measured. */
export function extractUrls(...texts) {
  const out = []
  for (const text of texts) {
    for (const m of String(text || '').matchAll(/https?:\/\/[^\s)\]>"'`]+/g)) {
      try {
        const u = new URL(m[0].replace(/[.,;]+$/, ''))
        for (const k of [...u.searchParams.keys()]) if (/^utm_|^ref$|^srsltid$/i.test(k)) u.searchParams.delete(k)
        out.push(u.toString())
      } catch { /* not a URL */ }
    }
  }
  return [...new Set(out)]
}

const NOT_A_SELLER_HOST = /(^|\.)(amazon|ebay|walmart|alibaba|aliexpress|etsy|facebook|youtube|pinterest|reddit|wikipedia|waze|google|bing|yelp|mapquest|linkedin|instagram|twitter|x|tiktok)\./i

// The text of a page as a real browser shows it — for sites that refuse plain downloads or only
// draw their content with JavaScript.
async function renderedPageText(browser, url) {
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1800)
    return await page.evaluate(() => (document.body?.innerText || '').slice(0, 20000))
  } finally {
    await page.close().catch(() => {})
  }
}

// A page whose plain download shows fewer labelled spec fields than this is read again in a real
// browser: specification tables are often filled in by JavaScript, so a plain download can show 0
// for a page that really lists them. Same figure as the "enough specifications" bar used elsewhere.
export const SPEC_RECHECK_BELOW = 4

/** Spec-field count of a page as a real browser shows it (visible text, nothing clicked), or null if unreadable. */
async function renderedSpecCount(url, getBrowser) {
  try {
    const text = await renderedPageText(await getBrowser(), url)
    return text.length >= 200 && !isBotChallengeText(text) ? countSpecCues(text) : null
  } catch { return null }
}

/**
 * Spec depth of the competitors the AIs actually pointed at: reads each linked product page (one per
 * seller) and counts its labelled specification fields — the same measure used for the prospect's
 * own page. A plain download is tried first; if the page refuses it or needs JavaScript, a real
 * browser reads it. A page that still can't be read is left out (not counted as 0 fields).
 * Returns [{ seller, url, specCount }].
 */
export async function measureSpecDepthFromUrls({ urls, sellerNames = [], excludeDomain, limit = 5, productCode = '' }) {
  // A competitor's page only says something about this product if it shows the product's own part
  // number. Letters and digits only, so "49-16-28PS" and "4916 28 PS" are the same number.
  const codeKey = String(productCode || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const checkCode = codeKey.length >= 4 && /[0-9]/.test(codeKey) // only a real-looking part number is worth matching
  const showsProduct = (text) => !checkCode || String(text).toLowerCase().replace(/[^a-z0-9]/g, '').includes(codeKey)
  const depth = (u) => u.pathname.split('/').filter(Boolean).length
  const candidates = []
  for (const raw of urls || []) {
    try {
      const u = new URL(raw)
      const host = u.hostname.replace(/^www\./, '')
      if (depth(u) < 1 || NOT_A_SELLER_HOST.test(host) || (excludeDomain && host.includes(excludeDomain))) continue
      candidates.push({ url: u.toString(), host, depth: depth(u) })
    } catch { /* skip */ }
  }
  // one page per seller (the deepest, most product-like URL), a handful at most
  const picks = []
  for (const c of candidates.sort((a, b) => b.depth - a.depth)) {
    if (picks.some((p) => p.host === c.host)) continue
    picks.push(c)
    // Read a few more pages than needed: the ones that turn out not to show the product are dropped.
    if (picks.length >= (checkCode ? limit * 2 : limit)) break
  }
  if (!picks.length) return []

  const labelFor = (host) => {
    const stem = normalizeSellerName(host.split('.')[0])
    const named = sellerNames.find((n) => {
      const k = normalizeSellerName(n)
      return k.length >= 4 && stem.length >= 4 && (k === stem || k.includes(stem) || stem.includes(k))
    })
    return named || host.split('.')[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
  }

  let browser = null
  const getBrowser = async () => (browser ||= await chromium.launch({ headless: true }))
  try {
    const results = await Promise.all(picks.map(async (p) => {
      let text = ''
      try {
        const { html } = await fetchPageHtml(p.url)
        text = extractReadableText(html, 6000)
      } catch { /* fall through to the browser */ }
      let count = text.length >= 200 && !isJsBlockedText(text) && !isBotChallengeText(text) ? countSpecCues(text) : null
      let seen = text
      // A low or unreadable plain count is checked against the page as a browser renders it; the
      // higher reading stands, and a page neither way can read is left out (never counted as 0).
      if (count === null || count < SPEC_RECHECK_BELOW || !showsProduct(seen)) {
        try {
          const rendered = await renderedPageText(await getBrowser(), p.url)
          if (rendered.length >= 200 && !isBotChallengeText(rendered)) {
            count = Math.max(count ?? 0, countSpecCues(rendered))
            seen += ` ${rendered}`
          }
        } catch { /* keep the plain reading */ }
      }
      if (count === null || !showsProduct(seen)) return null
      return { seller: labelFor(p.host), url: p.url, specCount: count }
    }))
    return results.filter(Boolean).slice(0, limit)
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

// The product page the AIs linked for a seller: same business by domain, preferring a deep
// product URL over a homepage.
export function findKnownUrl(sellerName, knownUrls, excludeDomain) {
  const key = normalizeSellerName(sellerName)
  if (key.length < 4) return null
  const matches = (knownUrls || []).filter((u) => {
    try {
      const host = new URL(u).hostname.replace(/^www\./, '')
      if (excludeDomain && host.includes(excludeDomain)) return false
      const stem = normalizeSellerName(host.split('.')[0])
      return stem.length >= 4 && (stem === key || key.includes(stem) || stem.includes(key))
    } catch { return false }
  })
  const depth = (u) => { try { return new URL(u).pathname.split('/').filter(Boolean).length } catch { return 0 } }
  return matches.sort((a, b) => depth(b) - depth(a))[0] || null
}

/**
 * Finds real sellers of the identical product and their prices via a live-web-search-grounded
 * LLM call (same engines already used for the citation audit), then extracts a structured list.
 * Originally this searched via Bright Data's SERP API directly, but that zone's async delivery
 * never completed in testing (requests stayed "pending" indefinitely) — this sidesteps that
 * dependency entirely using infrastructure already proven to work in this pipeline. Each found
 * seller's own page is then lightly scraped (best-effort, never fatal) for a spec-depth count.
 */
export async function benchmarkCompetitors({ manufacturerBrand, manufacturerCode, productName, category, excludeDomain, excludeCompany, region, knownUrls }) {
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
  // Same market as the prospect: a South African store is compared with South African sellers in
  // rand, not with US listings in dollars.
  const country = region?.country || ''
  // The one shared seller-region sentence (empty unless the region is known with confidence).
  const sellerRegion = regionSellerClause(region)
  const regionClause = sellerRegion ? ` ${sellerRegion}` : ''
  const searchPrompt = `Find real online stores${country ? ` in ${country}` : ''} that currently sell ${naturalDescription} — specifically the variant described as ` +
    `"${manufacturerCode || productName}". For each real seller you find, state the store/seller name, the exact current price, ` +
    `whether it is currently in stock or sold out / unavailable, and the exact configuration or part number that price is for ` +
    `(say plainly if it is a different variant, size or pack), as plain sentences. Include the manufacturer's own ` +
    `store or official distributor if it sells direct. List as many distinct real sellers as you can find, with their prices.${regionClause}`

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

  const { sellers: extractedSellers } = await extractSellerPrices({ text: searchText, excludeCompany, country, region })
  if (debug) console.error(`[debug benchmarkCompetitors] extracted ${extractedSellers.length} seller/price pairs:`, JSON.stringify(extractedSellers))

  // Region gate: a seller tagged as outside the prospect's country, or priced in an explicitly
  // different currency, isn't a like-for-like comparison. Dropped whenever at least three in-region
  // sellers remain; otherwise kept, flagged as supplementary, so the benchmark isn't left empty.
  // The currency the extraction reported for a seller counts too, not only the symbol in its price text.
  const outOfRegion = (s) => s.inRegion === false || isForeignCurrencyPrice(s.price, region?.currencyCode) ||
    Boolean(region?.currencyCode && /^[A-Za-z]{3}$/.test(String(s.currency || '').trim()) && String(s.currency).trim().toUpperCase() !== region.currencyCode)
  const inRegion = extractedSellers.filter((s) => !outOfRegion(s))
  if (country && inRegion.length >= MIN_IN_REGION_SELLERS && inRegion.length < extractedSellers.length) {
    console.log(`[outreach] dropped ${extractedSellers.length - inRegion.length} seller(s) priced outside ${country}: ${extractedSellers.filter(outOfRegion).map((s) => `${s.seller} ${s.price}`).join('; ')}`)
  }
  const rawSellers = !country || inRegion.length >= MIN_IN_REGION_SELLERS
    ? inRegion.length ? inRegion : extractedSellers
    : extractedSellers.map((s) => (outOfRegion(s) ? { ...s, supplementary: true } : s))

  // Dedupe by normalized name — the extraction prompt asks for this too, but a second pass here
  // catches variants the LLM missed (e.g. "Amazon" and "Amazon AU" slipping through as separate).
  // The prospect itself must never appear as its own competitor — matched by store name AND by
  // domain stem, since engines name a store several ways ("MyToolSupply", "My Tool Supply",
  // "mytoolsupply.com") and the typed company name may differ from the store's trading name.
  const isProspect = prospectNameMatcher({ names: [excludeCompany], domain: excludeDomain })
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
  const relevant = await filterRelevantSellers({ sellers: deduped, productName, manufacturerBrand, manufacturerCode, category })
  if (debug && relevant.length !== deduped.length) {
    console.error(`[debug benchmarkCompetitors] relevance filter dropped ${deduped.length - relevant.length}:`,
      JSON.stringify(deduped.filter((d) => !relevant.includes(d)).map((d) => d.seller)))
  }

  // Every seller's price per SINGLE item: a "$85.74 per 25-pack" is $3.43 here, so a pack price is
  // never charted or ranked against a single-item price. The listed price is kept for the report.
  const withPrices = relevant
    .map((s) => ({ ...s, priceValue: priceToValue(s.price) }))
    .filter((s) => Number.isFinite(s.priceValue) && s.priceValue > 0)
    .map((s) => {
      const u = toPerUnit({ price: s.price, priceValue: s.priceValue, unit: `${s.unit || ''} ${s.price || ''}` })
      return { ...s, ...u, unit: u.packQty > 1 ? 'each' : s.unit }
    })

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
  let browser = null
  const getBrowser = async () => (browser ||= await chromium.launch({ headless: true }))
  const isProductUrl = (u) => { try { return new URL(u).pathname.split('/').filter(Boolean).length >= 1 } catch { return false } }
  try {
  for (const s of sane) {
    // null = not measured. A page that wouldn't load, or that only renders with JavaScript, tells
    // us nothing about its spec depth — it must not be charted as "0 fields".
    let specCount = null
    let showsCode = false
    try {
      // Best-effort only — a seller named by the LLM but not independently confirmed by scrape
      // still has a real, LLM-sourced price; we just can't add a spec-depth count for it.
      // First choice is the product page the AIs actually linked for this seller; otherwise
      // "Intech Bearing Inc." → intechbearinginc.com; "theBigBearingStore.com" keeps its own domain.
      const sellerLower = s.seller.trim().toLowerCase()
      const guessUrl = findKnownUrl(s.seller, knownUrls, excludeDomain) || (/^https?:\/\//i.test(s.seller)
        ? s.seller
        : /\.[a-z]{2,}$/.test(sellerLower) && !/\s/.test(sellerLower)
          ? `https://${sellerLower}`
          : `https://${sellerLower.replace(/[^a-z0-9]/g, '')}.com`)
      if (excludeDomain && guessUrl.includes(excludeDomain)) continue
      const { html } = await fetchPageHtml(guessUrl)
      const sellerText = extractReadableText(html, 5000)
      showsCode = codeRegex ? codeRegex.test(sellerText) : false
      // Spec depth is a property of a PRODUCT page. A guessed site root (no path) is not one — it
      // would read as "0 fields" for any store — so those sellers are left unmeasured here.
      if (isProductUrl(guessUrl)) {
        if (sellerText.length >= 200 && !isJsBlockedText(sellerText) && !isBotChallengeText(sellerText)) specCount = countSpecCues(sellerText)
        // A low or unreadable plain count is checked against the page as a browser renders it.
        if (specCount === null || specCount < SPEC_RECHECK_BELOW) {
          const rendered = await renderedSpecCount(guessUrl, getBrowser)
          if (rendered !== null) specCount = Math.max(specCount ?? 0, rendered)
        }
      }
    } catch {
      // seller name isn't a cleanly guessable domain, or the page didn't load — fine, keep the price
    }
    sellers.push({ seller: s.seller, price: s.price, unit: s.unit || '', priceValue: s.priceValue, listedPrice: s.listedPrice, packQty: s.packQty || 1, specCount, showsCode, supplementary: Boolean(s.supplementary) })
  }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }

  sellers.sort((a, b) => a.priceValue - b.priceValue)
  return { query, sellers, urls: extractUrls(searchText) }
}
