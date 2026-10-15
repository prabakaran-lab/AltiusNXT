import { countSpecCues, extractPriceFromHtml, extractPriceSignals } from './competitorBenchmark.js'
import { fetchPageHtml, extractReadableText, hasJsonLd, extractJsonLdObjects, isJsBlockedText, isBotChallengeText, BOT_BLOCKED_MESSAGE } from './scrapeDo.js'
import { quickAnalyze } from './gemini.js'
import { inferRegion, regionIsActive } from './region.js'
import { launchBrowserFor } from './browserLaunch.js'

/**
 * The website's quick scan: six checks, each scored from evidence on the page.
 *
 * How it stays accurate:
 *  - The page is read two ways at once — a plain download and a real browser — and the richer read is
 *    used, so content built by JavaScript (structured data, spec tabs) is seen. The browser also gives
 *    two texts: what is visible without interaction, and everything on the page including tab panels.
 *  - Each check is pass / fail / unverified, with the evidence behind it. A page that cannot be read is
 *    "unverified", never silently passed.
 *  - Where the model is used (brand, what-it-is-for, spotting spec fields written in sentences) it must
 *    quote the page, and the code accepts the answer only if that quote really appears in the page text.
 *  - Structured data is parsed in code and judged on completeness, not just presence.
 * Score = checks passed ÷ 6 (unverified counts as not passed, and the result says so).
 */

// A product page needs at least this many labelled specification fields, visible without clicking.
const SPEC_PASS_MIN = 4

// Wording that tells a buyer (or an AI) whether the item can be bought now.
const STOCK_RE = /\b(in[- ]stock|out of stock|on hand|available(?: now| to ship| for)?|availability\s*[:\-]\s*(?!log\s?in|call|contact|n\/a)\w+|lead time|ships? (?:today|in|within)|back-?ordered?|low stock|pre-?order|\d+\s+(?:in stock|available|left)|stock\s*[:\-]\s*\w+)\b/i

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const appearsIn = (needle, haystack) => {
  const n = norm(needle)
  return n.length >= 3 && norm(haystack).includes(n)
}

/** Reads the page in a real browser: the rendered HTML, the text visible without clicking, and the
 *  full text including hidden tab / accordion panels (scripts and styles removed). */
async function readWithBrowser(url) {
  const browser = await launchBrowserFor(url)
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(1200)
    return await page.evaluate(() => {
      const clone = document.body.cloneNode(true)
      clone.querySelectorAll('script, style, noscript, template, svg, iframe').forEach((n) => n.remove())
      return {
        html: document.documentElement.outerHTML,
        visible: (document.body.innerText || '').replace(/[ \t]+/g, ' ').slice(0, 14000),
        full: (clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14000),
      }
    })
  } finally {
    await browser.close().catch(() => {})
  }
}

/** Plain download + browser read, in parallel; whichever gives usable content wins, and the plain
 *  download backs up a site that blocks the browser. */
export async function readPageForScan(url) {
  const [staticRes, browserRes] = await Promise.allSettled([fetchPageHtml(url), readWithBrowser(url)])
  const staticHtml = staticRes.status === 'fulfilled' ? staticRes.value.html : ''
  const staticText = staticHtml ? extractReadableText(staticHtml, 12000) : ''
  const b = browserRes.status === 'fulfilled' ? browserRes.value : null
  // A bot-check screen is short readable text, but it is not the page: it must not be scored.
  const challenged = isBotChallengeText(b?.visible) || isBotChallengeText(staticText)
  const browserOk = Boolean(b && b.visible.length >= 200 && !isJsBlockedText(b.visible) && !isBotChallengeText(b.visible))
  const staticOk = staticText.length >= 200 && !isJsBlockedText(staticText) && !isBotChallengeText(staticText)
  const refused = staticRes.status === 'rejected' && /\b(401|403|429|503)\b/.test(String(staticRes.reason?.message || ''))

  if (!browserOk && !staticOk) {
    return { html: staticHtml || b?.html || '', visible: staticText || b?.visible || '', full: staticText || b?.full || '', readable: false, blocked: challenged || (refused && !b?.visible), source: 'none' }
  }
  const html = browserOk && hasJsonLd(b.html) ? b.html : staticHtml && hasJsonLd(staticHtml) ? staticHtml : (browserOk ? b.html : staticHtml)
  return {
    html,
    visible: browserOk ? b.visible : staticText,
    full: browserOk ? b.full : staticText,
    readable: true,
    source: browserOk && staticOk ? 'browser + download' : browserOk ? 'browser' : 'download',
  }
}

const isProduct = (o) => { const t = o?.['@type']; return t === 'Product' || (Array.isArray(t) && t.includes('Product')) }

/** What the page's structured data really declares. */
function inspectStructuredData(html) {
  if (!hasJsonLd(html)) return { present: false }
  const product = extractJsonLdObjects(html).find(isProduct)
  if (!product) return { present: true, product: false }
  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers
  const brand = typeof product.brand === 'string' ? product.brand : product.brand?.name
  const gtin = product.gtin || product.gtin8 || product.gtin12 || product.gtin13 || product.gtin14
  return {
    present: true,
    product: true,
    brand: brand || '',
    partNumber: String(product.mpn || gtin || '').trim(),
    hasOffer: Boolean(offer && (offer.price ?? offer.lowPrice ?? offer.priceSpecification)),
    availability: String(offer?.availability || '').replace(/^.*\//, ''),
    missing: [!brand && 'brand', !(product.mpn || gtin) && 'part number', !offer && 'price/offer'].filter(Boolean),
  }
}

const MISSING_FIX = (what) => `Add the missing structured-data fields (${what}).`

export function buildQuickScanResult({ read, llm, url }) {
  const visible = read.visible || ''
  const full = read.full || visible
  const sd = inspectStructuredData(read.html || '')
  const checks = []
  const add = (key, label, status, evidence, reason, fix) => checks.push({ key, label, status, evidence, reason, fix })
  const unreadable = !read.readable

  // 1. Price
  // Once the page's market is known with confidence, a price written in that market's own currency
  // marker (an "R" or "₹" price, say) is recognised too; with no clear market the default markers apply.
  const region = url ? inferRegion({ url, html: read.html || '', pageText: visible }) : null
  const price = extractPriceFromHtml(read.html || '') || extractPriceSignals(visible, regionIsActive(region) ? { currencyCode: region.currencyCode } : {})[0]
  add('price', 'Price', price ? 'pass' : unreadable ? 'unverified' : 'fail',
    price ? `${price.raw} shown on the page` : 'no price found',
    'no visible price', 'Show the price on the page in plain text and in structured data.')

  // 2. Brand — structured data, or a quote from the page that the code can find
  const brandQuote = String(llm?.brandEvidence || '').trim()
  const brandOk = Boolean(sd.brand) || (brandQuote && appearsIn(brandQuote, full))
  add('brand', 'Brand', brandOk ? 'pass' : unreadable ? 'unverified' : 'fail',
    brandOk ? `brand stated: ${sd.brand || llm?.brandName || brandQuote}` : 'no manufacturer or brand named',
    'no clear brand or manufacturer', 'State the manufacturer or brand name clearly on the page.')

  // 3. Specifications visible without clicking
  // A model-listed field only counts when its value sits right after its label in the page text
  // ("Voltage 230V"), not merely when both words occur somewhere on the page; one per label.
  const labelledPairIn = (label, value, text) => {
    const t = norm(text)
    const l = norm(label)
    const v = norm(value).slice(0, 40)
    if (l.length < 3 || v.length < 1) return false
    for (let i = t.indexOf(l); i !== -1; i = t.indexOf(l, i + 1)) {
      if (t.slice(i + l.length, i + l.length + l.length + 60).includes(v)) return true
    }
    return false
  }
  const fieldsIn = (text) => {
    const seen = new Set()
    for (const f of Array.isArray(llm?.specFields) ? llm.specFields : []) {
      if (f?.label && f?.value && !seen.has(norm(f.label)) && labelledPairIn(f.label, f.value, text)) seen.add(norm(f.label))
    }
    return seen.size
  }
  const visibleSpecs = Math.max(countSpecCues(visible), fieldsIn(visible))
  const allSpecs = Math.max(countSpecCues(full), fieldsIn(full))
  const specsOk = visibleSpecs >= SPEC_PASS_MIN
  const specsHidden = !specsOk && allSpecs >= SPEC_PASS_MIN
  add('specs', 'Specifications', specsOk ? 'pass' : unreadable ? 'unverified' : 'fail',
    specsOk ? `${visibleSpecs} labelled specification fields visible` : specsHidden
      ? `${allSpecs} specification fields exist, but only after clicking a tab or section (${visibleSpecs} visible)`
      : `only ${visibleSpecs} labelled specification field${visibleSpecs === 1 ? '' : 's'}`,
    specsHidden ? 'specifications hidden behind tabs' : 'too few specifications',
    specsHidden ? 'Show the specifications on the page itself, as a clear table, instead of behind a tab.' : 'Show a clear specification table (dimensions, ratings, materials) so AI can compare the product.')

  // 4. Structured data — present and complete enough to identify the product
  const sdOk = sd.present && sd.product && sd.missing.length === 0
  add('structured', 'Structured data', sdOk ? 'pass' : unreadable ? 'unverified' : 'fail',
    !sd.present ? 'no JSON-LD structured data' : !sd.product ? 'JSON-LD present but no Product record' : sdOk ? 'complete Product record (brand, part number, price)' : `Product record is missing: ${sd.missing.join(', ')}`,
    !sd.present ? 'no structured data' : !sd.product ? 'no Product structured data' : `incomplete structured data (no ${sd.missing.join(' or ')})`,
    !sd.present || !sd.product ? 'Add schema.org Product structured data (brand, part number, price, availability).' : MISSING_FIX(sd.missing.join(', ')))

  // 5. Stock — wording on the page, or availability declared in structured data
  const stockWording = STOCK_RE.test(visible)
  const stockOk = stockWording || Boolean(sd.availability)
  add('stock', 'Stock', stockOk ? 'pass' : unreadable ? 'unverified' : 'fail',
    stockWording ? 'stock wording shown on the page' : stockOk ? `availability declared in structured data only (${sd.availability}) — not shown to shoppers on the page` : 'no stock or availability wording',
    'missing stock information', 'Add real-time stock availability to the product page.')

  // 6. What it is used for — a sentence the code can find on the page
  const useQuote = String(llm?.applicationEvidence || '').trim()
  const useOk = Boolean(useQuote) && appearsIn(useQuote, full)
  add('application', 'Use explained', useOk ? 'pass' : unreadable ? 'unverified' : 'fail',
    useOk ? 'the copy says what the product is for' : 'no explanation of what it is used for',
    'no explanation of what it is used for', 'Explain what the product is used for and who it is for.')

  const passed = checks.filter((c) => c.status === 'pass')
  const failed = checks.filter((c) => c.status === 'fail')
  const unverified = checks.filter((c) => c.status === 'unverified')
  const score = Math.round((100 * passed.length) / checks.length)

  const bad = [...failed, ...unverified]
  const headline = bad.length === 0
    ? `All ${checks.length} AI-readiness checks passed.`
    : failed.length
      ? `${failed.length} of ${checks.length} AI-readiness checks failed, primarily due to ${failed[0].reason}${unverified.length ? `; ${unverified.length} could not be verified` : ''}.`
      : `${unverified.length} of ${checks.length} AI-readiness checks could not be verified because the page could not be read.`

  // Fixes for what failed come first; the model's other suggestions fill the remaining slots.
  const TOPIC = { price: /\bprice|pricing\b/i, brand: /\bbrand|manufacturer\b/i, specs: /\bspec|dimension|attribute\b/i, structured: /structured data|schema|json-?ld\b/i, stock: /\bstock|availability|inventory\b/i, application: /\buse[- ]case|application|used for|who it is for\b/i }
  // The six checks own their topics: a model suggestion about price, brand, specs, structured data,
  // stock or use would either repeat a failed check or contradict a passed one, so it is dropped.
  // What is left are suggestions about other things (reviews, media, related products …).
  const extras = (Array.isArray(llm?.topGaps) ? llm.topGaps : []).filter((g) => typeof g === 'string' && g.trim() && !Object.values(TOPIC).some((re) => re.test(g)))
  const topGaps = [...bad.map((c) => c.fix), ...extras].slice(0, Math.max(4, bad.length))

  return {
    productName: llm?.productName || '',
    brandStated: checks.find((c) => c.key === 'brand').status === 'pass',
    specsCount: visibleSpecs,
    priceVisible: Boolean(price),
    stockVisible: stockOk,
    hasApplicationCopy: useOk,
    hasStructuredData: sd.present,
    score,
    headline,
    topGaps,
    checks: checks.map(({ key, label, status, evidence }) => ({ key, label, status, evidence })),
    provisional: unverified.length > 0,
  }
}

/** Reads the page, asks the model to point at what it finds, and scores the six checks. */
export async function runQuickScan(url) {
  const read = await readPageForScan(url)
  // A site that refuses every automated reader gets no score at all — a made-up 0 would be wrong.
  if (read.blocked) throw new Error(BOT_BLOCKED_MESSAGE)
  if (!read.visible && !read.html) throw new Error('the page could not be loaded')
  // The model reads the full text (tab content included) so it can spot specs written in sentences;
  // every quote it returns is verified against the page by buildQuickScanResult.
  const llm = await quickAnalyze({ url, pageText: (read.full || read.visible).slice(0, 9000), hasJsonLd: hasJsonLd(read.html || '') })
  return buildQuickScanResult({ read, llm, url })
}
