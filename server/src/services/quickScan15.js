import { countSpecCues, extractPriceFromHtml, extractPriceSignals } from './competitorBenchmark.js'
import { extractJsonLdObjects, hasJsonLd, BOT_BLOCKED_MESSAGE } from './scrapeDo.js'
import { callGemini, checkSiblingCodeRisk } from './gemini.js'
import { inferRegion, regionIsActive } from './region.js'
import { readPageForScan } from './quickScan.js'

/**
 * The 15-point AI-readiness scan (the checklist in "15 Point Checks": identity, specs, structured data,
 * login gate, documents & identifiers). It reads the page exactly as the six-check quick scan does and
 * reuses that scan's rules wherever a check overlaps (price, specifications, structured data, stock).
 *
 * Each check is pass / partial / fail, with the evidence behind it. A page that cannot be read is
 * "unverified", never silently passed. Gemini decides only the two identity checks the checklist assigns
 * to it, and anything it quotes must really appear in the page text.
 * Score = checks passed ÷ 15 (partial and unverified do not count as passed, and the result says so).
 */

const SPEC_PASS_MIN = 4 // same bar as the six-check scan: labelled specification fields visible without clicking
// Same pattern as quickScan.js: wording that tells a buyer (or an AI) whether the item can be bought now.
const STOCK_RE = /\b(in[- ]stock|out of stock|on hand|available(?: now| to ship| for)?|availability\s*[:\-]\s*(?!log\s?in|call|contact|n\/a)\w+|lead time|ships? (?:today|in|within)|back-?ordered?|low stock|pre-?order|\d+\s+(?:in stock|available|left)|stock\s*[:\-]\s*\w+)\b/i

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const appearsIn = (needle, haystack) => {
  const n = norm(needle)
  return n.length >= 3 && norm(haystack).includes(n)
}
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const stripTags = (s) => clean(String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'))
const isProduct = (o) => { const t = o?.['@type']; return t === 'Product' || (Array.isArray(t) && t.includes('Product')) }
const snippet = (text, re) => { const m = String(text).match(re); return m ? clean(m[0]).slice(0, 80) : '' }

/** What the page's JSON-LD Product block declares. */
function readMarkup(html) {
  if (!hasJsonLd(html)) return { present: false, product: false }
  const p = extractJsonLdObjects(html).find(isProduct)
  if (!p) return { present: true, product: false }
  const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers
  const brand = typeof p.brand === 'string' ? p.brand : p.brand?.name
  return {
    present: true,
    product: true,
    name: clean(p.name),
    brand: clean(brand),
    mpn: clean(p.mpn),
    gtin: clean(p.gtin || p.gtin8 || p.gtin12 || p.gtin13 || p.gtin14),
    sku: clean(p.sku),
    availability: String(offer?.availability || '').replace(/^.*\//, ''),
  }
}

function metaDescription(html) {
  const tag = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] || ''
  return stripTags(tag.match(/content=["']([^"']*)["']/i)?.[1] || '')
}

function canonicalHref(html) {
  const tag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] || ''
  return clean(tag.match(/href=["']([^"']*)["']/i)?.[1] || '')
}

/** Same page address ignoring protocol, "www.", query, hash, case and a trailing slash. */
function sameAddress(a, b) {
  try {
    const u = new URL(a)
    const v = new URL(b)
    const key = (x) => `${x.hostname.replace(/^www\./, '').toLowerCase()}${x.pathname.replace(/\/+$/, '').toLowerCase()}`
    return key(u) === key(v)
  } catch { return false }
}

/** The address a buyer actually lands on once redirects are followed. */
async function landingAddress(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AltiusNxtReadinessBot/1.0)' }, signal: AbortSignal.timeout(15000) })
    return res.url || url
  } catch { return url }
}

function pageLinks(html) {
  return [...html.matchAll(/<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: m[1], text: stripTags(m[2]) }))
}

/** Gemini decides: does the page name the company that makes the product? Its quote is checked against the page. */
async function askManufacturer({ host, text, markupBrand }) {
  const prompt = `You are reading one product page sold by the store "${host}".

PAGE TEXT (truncated):
"""
${text.slice(0, 7000)}
"""
JSON-LD brand on the page: ${markupBrand || 'none'}

Return strict JSON: { "manufacturer": string, "evidence": string }
- "manufacturer": the company that MAKES this product, exactly as the page writes it. It is not the store selling it ("${host}"), and a model, series or product-line name on its own (for example "SOL-M" in a title) does not count unless the page ties it to a company ("by X", "Manufacturer: X", "Made by X", "X Medical"). Use "" if the page does not name the maker.
- "evidence": a short phrase COPIED EXACTLY from the page text where the maker is named, "" if none.
Never invent a manufacturer. Anything you return is checked against the page text and discarded if it does not appear there.`
  try { return await callGemini(prompt) } catch { return null }
}

const REGULATORY_RE = /\b(Medsafe|TGA|ARTG|FDA|510\(k\)|MHRA|Health Canada|ISO\s?\d{3,5}(?:[-:]\d+)*|EN\s?\d{3,5}(?:[-:]\d+)*|IEC\s?\d{3,5}(?:[-:]\d+)*|ANSI\s?[A-Z]?\d+|ASTM\s?[A-Z]?\d+|UL\s?\d{2,5})\b/i
const DOC_TEXT_RE = /data\s?sheet|\bIFU\b|instructions? for use|brochure|\bSDS\b|safety data|user manual|product manual|spec(?:ification)?s? sheet|certificate|declaration of conformity|technical (?:data|document)/i
const QUOTE_RE = /request (?:a )?quote|get (?:a )?quote|quote request|ask for (?:a )?quote|enquire|enquiry|contact (?:us|sales)[^.]{0,30}(?:price|pricing|quote)|call (?:us )?for (?:price|pricing)|price on (?:request|application)/i
const ACCOUNT_WHO_RE = /(?:trade|business|registered|approved|healthcare|clinic|professional|wholesale|commercial|institution)[^.]{0,50}(?:account|customers?|only)|(?:open|apply for|register for|set up|create)[^.]{0,20}(?:an? )?(?:trade |business |customer )?account|account[^.]{0,40}(?:available to|open to|eligible|for (?:trade|business|healthcare))/i

/**
 * The product's own content, without the site's menus and footer. Mega-menus list every category
 * ("Sterile Gloves", "Non Sterile"), which would make a word-based check pass on words that say nothing
 * about this product. The text is taken from the product heading onward, up to the first related-products
 * or footer marker.
 */
function productContent(fullText, html) {
  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
  const start = h1 ? fullText.indexOf(h1) : -1
  if (start < 0) return fullText
  const rest = fullText.slice(start)
  // Where the product ends and other products (best sellers, related items) or the footer begin.
  const end = rest.slice(h1.length).search(/related products?|you may also like|you might also|customers also (?:bought|viewed)|people also|recently viewed|best[- ]?sellers?|top sellers?|featured products?|popular products?|recommended (?:products?|for you)|more from|other products?|new arrivals?|subscribe|newsletter|©|copyright/i)
  return end < 0 ? rest.slice(0, 6000) : rest.slice(0, h1.length + end)
}

// Why a check matters when it fails ("reason", used in the headline) and what to do about it ("fix", used in the gap list).
const META = {
  'Manufacturer named': ['no manufacturer named', 'Name the manufacturer (the maker, not just the store) on the page.'],
  'Manufacturer part number': ['no manufacturer part number', 'Show the manufacturer part number, not only your own SKU.'],
  'Product unambiguously identified': ['the exact model is not clear', 'Make the manufacturer and exact part number clear so AI can tell this model apart from similar ones.'],
  'Specification table': ['too few specifications', 'Show a clear specification table (dimensions, ratings, materials) so AI can compare the product.'],
  'Sterile and latex-free': ['sterile and latex-free status not stated', 'State whether the product is sterile and latex-free.'],
  'Dead space and material': ['dead space and material not stated', 'State the dead space and the material of construction.'],
  'Box and case quantity': ['box and case quantity not stated', 'State the box (pack) quantity and the case quantity.'],
  'schema.org/Product block': ['no Product structured data', 'Add schema.org Product structured data (JSON-LD).'],
  'Brand, MPN and GTIN in markup': ['incomplete structured data', 'Include brand, part number and GTIN in the Product structured data.'],
  'Meta description': ['no meta description', 'Write a meaningful meta description for the page.'],
  'Canonical URL consistent': ['an inconsistent canonical URL', 'Make the canonical URL match the address buyers land on.'],
  'Price or quote route': ['no visible price or quote route', 'Show the price, or a clear quote route and who can open an account.'],
  'Stock or availability': ['no stock or availability information', 'Add a stock or availability statement to the product page.'],
  'Documents': ['no product documents linked', 'Link the data sheet, IFU or catalogue for this product.'],
  'Regulatory identifiers': ['no regulatory identifiers shown', 'Show the relevant registration or standard (for example Medsafe, ISO) on the page.'],
}

/** Runs all 15 checks on one product page. */
export async function runScan15(url) {
  const read = await readPageForScan(url)
  // A site that refuses every automated reader gets no score at all: a made-up 0 would be wrong.
  if (read.blocked) throw new Error(BOT_BLOCKED_MESSAGE)
  if (!read.visible && !read.html) throw new Error('the page could not be loaded')

  const html = read.html || ''
  const visible = read.visible || ''
  const everything = read.full || visible
  const full = productContent(everything, html) // the product's own content: every presence check reads this
  const host = new URL(url).hostname.replace(/^www\./, '')
  const unreadable = !read.readable
  const md = readMarkup(html)
  const checks = []
  const add = (gap, label, decidedBy, status, evidence) => checks.push({ n: checks.length + 1, gap, label, decidedBy, status: unreadable ? 'unverified' : status, evidence })

  // ---- Identity ----
  // 1. Manufacturer named (Gemini)
  const markupBrandIsSeller = md.brand && norm(host).replace(/ /g, '').includes(norm(md.brand).replace(/ /g, ''))
  let maker = ''
  let makerEvidence = ''
  if (md.brand && !markupBrandIsSeller) { maker = md.brand; makerEvidence = 'brand in structured data' }
  else if (!unreadable) {
    const g = await askManufacturer({ host, text: full, markupBrand: md.brand })
    const name = clean(g?.manufacturer)
    const quote = clean(g?.evidence)
    const isSeller = name && norm(host).replace(/ /g, '').includes(norm(name).replace(/ /g, ''))
    if (name && quote && !isSeller && appearsIn(quote, full) && appearsIn(name, full)) { maker = name; makerEvidence = `"${quote.slice(0, 80)}"` }
  }
  add('Identity', 'Manufacturer named', 'Gemini', maker ? 'pass' : 'fail', maker ? `manufacturer stated: ${maker} (${makerEvidence})` : 'no manufacturer named on the page (only the seller or a model name)')

  // 2. Manufacturer part number (code): a real MPN, not only the seller's own SKU
  const skuText = clean(full.match(/\b(?:sku|item\s*(?:no\.?|number|code)|stock\s*(?:code|no\.?)|product\s*code)\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-/.]{2,24})/i)?.[1] || md.sku)
  const mpnFromText = [...full.matchAll(/\b(mpn|mfr\.?\s*(?:part\s*)?(?:no\.?|number|#|code)|manufacturer(?:['’]s)?\s*(?:part\s*)?(?:no\.?|number|#|code)|manufacturer\s*part|part\s*(?:no\.?|number|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9\-/.]{2,24})/gi)]
    .map((m) => ({ label: m[1], value: m[2] }))
    .find((m) => norm(m.value) !== norm(skuText) && /mpn|mfr|manufacturer/i.test(m.label) || (norm(m.value) !== norm(skuText) && /part/i.test(m.label) && m.value.length >= 4))
  const mpn = md.mpn || mpnFromText?.value || ''
  add('Identity', 'Manufacturer part number', 'Code', mpn ? 'pass' : 'fail',
    mpn ? `part number ${mpn} shown${md.mpn ? ' in structured data' : ' on the page'}` : skuText ? `only the seller's SKU appears (${skuText})` : 'no part number or SKU found')

  // 3. Product unambiguously identified (Gemini, web-search grounded): a stand-in for "all AI engines land on the same product"
  let ambiguity
  if (!maker || !mpn) {
    ambiguity = ['fail', `cannot be pinned to one product: ${!maker && !mpn ? 'no manufacturer and no part number' : !maker ? 'no manufacturer' : 'no manufacturer part number'} on the page`]
  } else if (unreadable) {
    ambiguity = ['fail', 'page unreadable']
  } else {
    const title = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ? stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)[1]) : '')
    const sib = await checkSiblingCodeRisk({ manufacturerBrand: maker, manufacturerCode: mpn, productName: title || mpn, category: '' })
    ambiguity = sib.hasSiblingRisk
      ? ['partial', `a near-identical code exists in the same line (${sib.siblingCode}${sib.note ? `, ${sib.note}` : ''}), so engines can confuse the two`]
      : ['pass', `${maker} ${mpn} identifies one product; no confusable sibling code found`]
  }
  add('Identity', 'Product unambiguously identified', 'Gemini', ambiguity[0], ambiguity[1])

  // ---- Specs ----
  // 4. Specification table: labelled fields visible without clicking (same bar as the six-check scan)
  const visibleSpecs = countSpecCues(visible)
  const allSpecs = countSpecCues(everything)
  add('Specs', 'Specification table', 'Code', visibleSpecs >= SPEC_PASS_MIN ? 'pass' : 'fail',
    visibleSpecs >= SPEC_PASS_MIN ? `${visibleSpecs} labelled specification fields visible` : allSpecs >= SPEC_PASS_MIN ? `${allSpecs} fields exist, but only after clicking a tab (${visibleSpecs} visible)` : `only ${visibleSpecs} labelled specification field${visibleSpecs === 1 ? '' : 's'}`)

  // 5. Sterile and latex-free: both stated
  const sterile = /(?<!non[- ])\bsterile\b|\bsterilised\b|\bsterilized\b/i.test(full)
  const latexFree = /latex[- ]free|free (?:of|from) (?:natural )?(?:rubber )?latex|non[- ]?latex|not made with natural rubber latex|contains no (?:natural )?(?:rubber )?latex/i.test(full)
  add('Specs', 'Sterile and latex-free', 'Code', sterile && latexFree ? 'pass' : sterile || latexFree ? 'partial' : 'fail',
    sterile && latexFree ? 'both "sterile" and "latex-free" are stated' : sterile ? '"sterile" is stated, latex status is not' : latexFree ? '"latex-free" is stated, sterile status is not' : 'neither sterile nor latex-free is stated')

  // 6. Dead space and material (beyond a bare "PP")
  const deadSpace = /dead[- ]space|low dead space|\bLDS\b/i.test(full)
  const material = /\bmaterial\s*[:\-]\s*(?!PP\b)[A-Za-z]{4,}|polypropylene|polycarbonate|polyethylene|polystyrene|polyisoprene|silicone(?!\s+(?:lubricat|oil|coat))|stainless steel|borosilicate|\bglass\b|\bPVC\b|\bABS\b|nitrile|natural rubber/i.test(full)
  add('Specs', 'Dead space and material', 'Code', deadSpace && material ? 'pass' : deadSpace || material ? 'partial' : 'fail',
    deadSpace && material ? 'dead space and material are both stated' : deadSpace ? 'dead space is stated, material beyond "PP" is not' : material ? 'material is stated, dead space is not' : 'neither dead space nor material is stated')

  // 7. Box and case quantity
  const boxQty = /\b(?:box|pack|bx|pkt|pk)\s*(?:of|x|qty|quantity|:)?\s*\d+|\b\d+\s*(?:per|\/|x)\s*(?:box|pack|bx|pkt)\b|\bbx\s?\d+\b/i.test(full)
  const caseQty = /\b(?:case|carton|ctn|shipper|outer)\s*(?:of|x|qty|quantity|:)?\s*\d+|\b\d+\s*(?:per|\/)\s*(?:case|carton|ctn)\b|\b\d+\s*(?:boxes\s*)?(?:per|\/)\s*case/i.test(full)
  add('Specs', 'Box and case quantity', 'Code', boxQty && caseQty ? 'pass' : boxQty || caseQty ? 'partial' : 'fail',
    boxQty && caseQty ? `box (${snippet(full, /\b(?:box|pack|bx|pkt|pk)\s*(?:of|x|qty|quantity|:)?\s*\d+|\bbx\s?\d+\b/i)}) and case (${snippet(full, /\b(?:case|carton|ctn|shipper|outer)\s*(?:of|x|qty|quantity|:)?\s*\d+/i)}) quantities stated` : boxQty ? `box quantity stated (${snippet(full, /\b(?:box|pack|bx|pkt|pk)\s*(?:of|x|qty|quantity|:)?\s*\d+|\bbx\s?\d+\b/i)}), case quantity missing` : caseQty ? 'case quantity stated, box quantity missing' : 'neither box nor case quantity stated')

  // ---- Structured data ----
  // 8. schema.org/Product JSON-LD block
  add('Structured data', 'schema.org/Product block', 'Code', md.product ? 'pass' : 'fail',
    !md.present ? 'no JSON-LD structured data' : !md.product ? 'JSON-LD present but no Product record' : 'a Product record exists in JSON-LD')

  // 9. Brand, MPN and GTIN in the markup: all three
  const have9 = md.product ? [md.brand && 'brand', md.mpn && 'part number', md.gtin && 'GTIN'].filter(Boolean) : []
  add('Structured data', 'Brand, MPN and GTIN in markup', 'Code', have9.length === 3 ? 'pass' : have9.length ? 'partial' : 'fail',
    !md.product ? 'no Product markup to carry them' : have9.length === 3 ? 'brand, part number and GTIN are all in the markup' : have9.length ? `markup has ${have9.join(' and ')}; missing ${['brand', 'part number', 'GTIN'].filter((x) => !have9.includes(x)).join(', ')}` : 'brand, part number and GTIN are all absent from the markup')

  // 10. Meta description: a meaningful one
  const meta = metaDescription(html)
  const metaStatus = !meta ? 'fail' : meta.length < 50 ? 'partial' : 'pass'
  add('Structured data', 'Meta description', 'Code', metaStatus, !meta ? 'the meta description is empty or missing' : meta.length < 50 ? `meta description is only ${meta.length} characters` : `${meta.length}-character meta description present`)

  // 11. Canonical URL matches the address buyers land on
  const canonical = canonicalHref(html)
  const landed = await landingAddress(url)
  const canonicalAbs = canonical ? new URL(canonical, landed).toString() : ''
  add('Structured data', 'Canonical URL consistent', 'Code', canonicalAbs && sameAddress(canonicalAbs, landed) ? 'pass' : 'fail',
    !canonical ? 'no canonical tag' : sameAddress(canonicalAbs, landed) ? 'the canonical matches the page address' : `canonical is ${new URL(canonicalAbs).pathname} but buyers land on ${new URL(landed).pathname}`)

  // ---- Login gate ----
  // 12. Price, or a quote route plus who can open an account (same price rule as the six-check scan)
  const region = inferRegion({ url, html, pageText: visible })
  const price = extractPriceFromHtml(html) || extractPriceSignals(visible, regionIsActive(region) ? { currencyCode: region.currencyCode } : {})[0]
  const quoteRoute = QUOTE_RE.test(full) || QUOTE_RE.test(visible)
  const accountWho = ACCOUNT_WHO_RE.test(full)
  const loginPhrase = snippet(full, /please log\s?in[^.]{0,30}/i) || snippet(full, /log\s?in (?:to|for) (?:see|view|purchase|buy|order)[^.]{0,30}/i)
  const loginOnly = Boolean(loginPhrase)
  add('Login gate', 'Price or quote route', 'Code', price ? 'pass' : quoteRoute && accountWho ? 'pass' : quoteRoute || accountWho ? 'partial' : 'fail',
    price ? `${price.raw} shown on the page` : quoteRoute && accountWho ? 'a quote route and who can open an account are stated' : quoteRoute ? 'a quote route is stated, but not who can open an account' : accountWho ? 'account eligibility is stated, but there is no price or quote route' : loginOnly ? `no price or quote route; the only text is "${loginPhrase}"` : 'no price or quote route')

  // 13. Stock or availability (same rule as the six-check scan: page wording, or availability declared in markup)
  const stockWording = STOCK_RE.test(visible)
  add('Login gate', 'Stock or availability', 'Code', stockWording || md.availability ? 'pass' : 'fail',
    stockWording ? 'stock wording shown on the page' : md.availability ? `availability declared in structured data (${md.availability})` : 'no stock or availability statement')

  // ---- Documents & identifiers ----
  // 14. Documents: an IFU, data sheet or catalogue link
  // A PDF counts when it is a product document (IFU, data sheet, catalogue, brochure ...); store paperwork
  // such as a returns form, terms or an account application does not.
  const STORE_PAPERWORK = /return|refund|terms|policy|privacy|delivery|shipping|warranty claim|credit|account|application|order form|price list|newsletter/i
  const docLink = pageLinks(html.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' ')).find((l) =>
    DOC_TEXT_RE.test(l.text) || /\bcatalog(?:ue)?\b/i.test(l.text) && /\.pdf(\?|#|$)/i.test(l.href) || (/\.(pdf|docx?)(\?|#|$)/i.test(l.href) && !STORE_PAPERWORK.test(`${l.href} ${l.text}`)))
  const docMention = DOC_TEXT_RE.test(full)
  add('Documents & identifiers', 'Documents', 'Code', docLink ? 'pass' : docMention ? 'partial' : 'fail',
    docLink ? `document link found: "${(docLink.text || docLink.href).slice(0, 60)}"` : docMention ? 'a document is mentioned but not linked' : 'no IFU, data sheet or catalogue link')

  // 15. Regulatory identifiers (a bare "CE" does not count)
  const reg = full.match(REGULATORY_RE)
  add('Documents & identifiers', 'Regulatory identifiers', 'Code', reg ? 'pass' : 'fail',
    reg ? `regulatory reference shown: ${clean(reg[0])}` : /\bCE\b/.test(full) ? 'only "CE" appears; no registration or ISO / EN standard' : 'no registration or standard shown')

  for (const c of checks) [c.reason, c.fix] = META[c.label] || ['', '']

  const passed = checks.filter((c) => c.status === 'pass').length
  const partial = checks.filter((c) => c.status === 'partial').length
  const failed = checks.filter((c) => c.status === 'fail').length
  const unverified = checks.filter((c) => c.status === 'unverified').length
  const heading = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
  return {
    url,
    productName: heading || md.name || '',
    landedOn: landed,
    source: read.source,
    score: Math.round((100 * passed) / checks.length),
    passed,
    partial,
    failed,
    unverified,
    headline: `${passed} of ${checks.length} checks pass${partial ? `, ${partial} partial` : ''}${unverified ? `, ${unverified} could not be verified` : ''}.`,
    checks,
  }
}

/**
 * The website's scan result, built from the 15 checks. Same fields the page already reads (score, headline,
 * topGaps, productName, checks), so the front end needs no change. Gaps are the fixes for what failed first,
 * then what only partly passed, most important (earliest in the checklist) first.
 */
export function toSiteResult(r) {
  const failed = r.checks.filter((c) => c.status === 'fail')
  const partial = r.checks.filter((c) => c.status === 'partial')
  const unverified = r.checks.filter((c) => c.status === 'unverified')
  const total = r.checks.length
  const extra = [partial.length && `${partial.length} partly met`, unverified.length && `${unverified.length} could not be verified`].filter(Boolean).join(', ')
  const headline = failed.length + partial.length + unverified.length === 0
    ? `All ${total} AI-readiness checks passed.`
    : failed.length
      ? `${failed.length} of ${total} AI-readiness checks failed, primarily due to ${failed[0].reason}${extra ? ` (${extra})` : ''}.`
      : partial.length
        ? `${partial.length} of ${total} AI-readiness checks were only partly met, primarily due to ${partial[0].reason}.`
        : `${unverified.length} of ${total} AI-readiness checks could not be verified because the page could not be read.`
  return {
    productName: r.productName,
    score: r.score,
    headline,
    topGaps: [...failed, ...partial].map((c) => c.fix).slice(0, 6),
    checks: r.checks.map(({ n, label, status, evidence }) => ({ key: `check${n}`, label, status, evidence })),
    passed: r.passed,
    partial: r.partial,
    failed: r.failed,
    provisional: unverified.length > 0,
  }
}

/** Reads the page and scores it against the 15 checks, in the website's result shape. */
export async function runSiteScan(url) {
  return toSiteResult(await runScan15(url))
}
