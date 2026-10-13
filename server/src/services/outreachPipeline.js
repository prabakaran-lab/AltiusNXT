import { findThinProductPages } from './siteCrawler.js'
import {
  selectWeakProductAndIdentity,
  extractProductIdentityFromPage,
  buildOutreachQueries,
  extractCitedSellers,
  extractListingClaims,
  analyzeOutreachGaps,
  checkSiblingCodeRisk,
} from './gemini.js'
import { callOpenAIWithSearch, callClaudeWithSearch, withTransientRetry } from './liveEngines.js'
import { askGeminiTextWithSearch } from './gemini.js'
import { benchmarkCompetitors, extractPriceSignals, extractPriceFromHtml, countSpecCues, normalizeSellerName, isSameSeller, priceToValue as priceToValueShared, toPerUnit, extractUrls, measureSpecDepthFromUrls, prospectNameMatcher, SPEC_RECHECK_BELOW } from './competitorBenchmark.js'
import { extractJsonLdObjects, isBotChallengeText, BOT_BLOCKED_MESSAGE } from './scrapeDo.js'
import { runCrossEngineResearch, synthesizeCrossEngineFindings } from './crossEngineResearch.js'
import { testCrawlerAccess } from './crawlerAccess.js'
import { computeScorecard } from './scorecard.js'
import { buildRevenueAtStakeTable } from './revenueAtStake.js'
import { buildRevenueRisk } from './revenueRisk.js'
import { inferRegion, regionIsActive, userLocationFor, isForeignCurrencyPrice } from './region.js'
import { writeOutreachReport } from './reportWriter.js'
import { hasJsonLd, extractReadableText, fetchPageHtml, isJsBlockedText, checkProductStructuredDataFields, checkTitleTagDuplication, checkBreadcrumbDuplication } from './scrapeDo.js'
import { extractOcrEnrichedText } from './mistralOcr.js'
import { isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured } from '../config.js'
import { generateOutreachReportPdf } from './reportPdf.js'
import { sendOutreachReport } from './mailer.js'
import { lookupBusinessPlace } from './googlePlaces.js'
import { captureCurrentPageAndHeader, captureEnrichedMockupScreenshot } from './pageScreenshots.js'
import { findProductImage } from './manufacturerImage.js'
import { verifySellerPrices } from './priceVerification.js'

export const searchPrompt = (query, country, region) =>
  `A customer${country ? ` in ${country}` : ''} searches: "${query}". Using current, real information you can find via web search, answer naturally ` +
  `(2-4 sentences) recommending specific real sellers or suppliers${country ? ` that sell to buyers in ${country}` : ''} where relevant, with approximate current pricing ` +
  `if you find it${country ? ' (in local currency)' : ''}. Plain text only — no markdown formatting.` +
  // Only when the region is known with confidence; otherwise this prompt is unchanged.
  (regionIsActive(region) ? ` Answer for a buyer in ${region.country}; recommend sellers that serve ${region.country}, with prices in ${region.currencyCode}.` : '')

// A transient failure (rate-limit burst, 5xx, overloaded) is retried up to three times before the
// engine is counted as not having answered; a usage cap is not retried.
async function callEngineWithSearch(engine, prompt, userLocation) {
  if (engine === 'chatgpt') return withTransientRetry(() => callOpenAIWithSearch(prompt, { userLocation }))
  if (engine === 'claude') return withTransientRetry(() => callClaudeWithSearch(prompt, { userLocation }))
  if (engine === 'gemini') return withTransientRetry(() => askGeminiTextWithSearch(prompt))
  throw new Error(`Unknown engine: ${engine}`)
}

const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`)

// Pulls a pack size + its inner unit noun out of a unit-of-sale description, e.g. "carton of 48
// rolls" -> { qty: 48, noun: 'roll' }, so a total price can be normalized to a per-item price —
// the comparison a buyer actually cares about when pack sizes differ between sellers. Returns
// null (never a fabricated 1) when the text doesn't clearly state a multi-item pack, since a
// wrong per-unit figure is worse than omitting the comparison.
function parsePackUnitShared(unitLabel) {
  const str = String(unitLabel || '')
  const m = str.match(/of\s+(\d+)\s*([a-z]+)/i)
  if (!m) return null
  const qty = Number(m[1])
  if (!qty || qty <= 1) return null
  const noun = m[2].toLowerCase().replace(/s$/, '')
  return { qty, noun }
}
const ENGINE_LABELS = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
]

/** Runs one buyer query against every configured engine with real web search, merges the answers,
 *  and extracts which real sellers got named and whether the prospect was among them. When the
 *  prospect wasn't cited but its own price is known, computes (in code, not via the LLM) where
 *  that price would have ranked among the prices THIS specific answer actually mentioned — the
 *  "at $X, you'd have been 2nd-lowest in this answer" footnote. */
async function runOneQuery({ query, prospectCompany, prospectDomain, prospectPrice, engines, computeFootnote = true, country = '', region }) {
  const prompt = searchPrompt(query, country, region)
  const userLocation = userLocationFor(region)
  const answers = await Promise.all(
    engines.map((engine) =>
      callEngineWithSearch(engine, prompt, userLocation).catch((err) => {
        console.warn(`[outreach] ${engine} search failed for "${query}": ${err.message}`)
        return ''
      })
    )
  )
  const { sellers: rawSellers, prospectCited, prospectCitedPrice, sellerPrices } = await extractCitedSellers({ texts: answers, prospectCompany, prospectDomain })
  // Each business once ("The Big Bearing Store" / "TheBigBearingStore.com"), and never the
  // prospect itself — its own column already says whether it was cited.
  const domainStem = normalizeSellerName(String(prospectDomain || '').split('.')[0])
  const isProspectName = (name) => isSameSeller(name, prospectCompany) || (domainStem.length >= 4 && normalizeSellerName(name).includes(domainStem)) ||
    prospectNameMatcher({ names: [prospectCompany], domain: prospectDomain })(name)
  const sellers = rawSellers.filter((s, i) => !isProspectName(s) && rawSellers.findIndex((o) => isSameSeller(o, s)) === i)

  // Only meaningful for queries that actually name the product — a category query's answer isn't
  // about this specific item, so "you'd have ranked Nth" wouldn't be a real comparison.
  let note = null
  if (computeFootnote && !prospectCited && prospectPrice && sellerPrices.length >= 2) {
    const prices = sellerPrices
      .map((s) => Number(String(s.price).match(/[\d.,]+/)?.[0]?.replace(',', '')))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (prices.length >= 2) {
      const rank = prices.filter((p) => p < prospectPrice.value).length + 1
      if (rank <= prices.length) {
        note = `At ${prospectPrice.raw}, ${prospectCompany} would have had the ${ordinal(rank)}-lowest price in this answer.`
      }
    }
  }

  // Short per-engine excerpts so the report writer can summarise what each engine actually said.
  const answerExcerpts = Object.fromEntries(engines.map((engine, i) => [engine, String(answers[i] || '').slice(0, 700)]))
  // Links the engines gave for the products they named — used to measure competitor spec depth on
  // the exact product pages rather than guessing at each seller's website.
  return { query, sellersCited: sellers, prospectCited, citedPrice: prospectCited ? prospectCitedPrice : '', note, answerExcerpts, urls: extractUrls(...answers) }
}

/**
 * Evaluates the fixed gap-rule set against real measured evidence (the page itself + the
 * competitor benchmark) and returns only the gaps that actually fired — see analyzeOutreachGaps
 * in gemini.js, which phrases these but never decides whether they exist. This is what stops a
 * gap's text from contradicting the deterministic spec-depth chart shown elsewhere in the report.
 */
// Gaps a reader would rank as the most consequential come first; the written section shows at
// most this many so the report stays a five-gap page like the reference, not a laundry list.
const MAX_GAPS = 5
const GAP_PRIORITY = [
  'page_requires_javascript', 'robots_txt_blocks_ai_crawlers', 'site_operational_notice', 'manufacturer_code_missing', 'manufacturer_not_stated', 'no_specification_table',
  'spec_depth_below_competitors', 'naming_inconsistency', 'no_product_description', 'structured_data_url_encoded',
  'structured_data_missing_fields', 'no_structured_data', 'structured_data_brand_is_seller', 'unit_of_sale_not_stated',
  'sibling_code_disambiguation_risk', 'title_tag_duplicated', 'breadcrumb_duplicated',
]

function computeGapEvidence({ identity, prospectHasCodeOnPage, realManufacturerCode = '', realCodeOnPage = true, prospectSpecCount, prospectHasJsonLd, prospectPrice, pageText, renderedText = '', html = '', benchmark, jsBlocked, siblingCodeRisk, structuredDataFields, titleCheck, breadcrumbCheck, crawlerAccess }) {
  const fired = []

  // A store-wide operational notice ("call to order — payments are having technical issues") is
  // the one thing on the page an engine will flag ahead of any content gap, and buyers see it too.
  // Such banners are often injected by script, so the browser-rendered text is checked too.
  const notice = `${pageText}\n${renderedText}`.match(/[^.!?\n]{0,140}\b(technical (?:issues|difficulties|problems)|(?:issues|problems) (?:with )?(?:completing|processing|accepting) (?:payments?|orders?)|unable to (?:process|accept|complete) (?:payments?|orders?|checkout)|payments? (?:are|is) (?:currently |temporarily )?(?:unavailable|down|not working)|(?:please )?call(?:\s*(?:or|\/)\s*text)? (?:us )?(?:to|so we can) (?:order|place an? order|purchase|process)|phone orders only|checkout is (?:currently |temporarily )?unavailable)\b[^.!?\n]{0,140}/i)
  if (notice) {
    fired.push({ ruleId: 'site_operational_notice', evidence: { noticeText: notice[0].replace(/\s+/g, ' ').trim() } })
  }

  // A page with no scannable spec table (no table / definition-list markup and only a handful
  // of labelled facts) forces every buyer and every engine to parse prose for the numbers.
  const tableRows = (html.match(/<tr\b/gi) || []).length
  const dlTerms = (html.match(/<dt\b/gi) || []).length
  const hasSpecTableMarkup = tableRows >= 3 || dlTerms >= 3
  if (html && !hasSpecTableMarkup && prospectSpecCount <= 3) {
    fired.push({ ruleId: 'no_specification_table', evidence: { specFieldsReadable: prospectSpecCount, hasTableMarkup: false } })
  }

  // The title calls the product one thing and the description another ("A-80" vs "A80i") —
  // exactly the kind of mismatch that makes an engine doubt it has the right product.
  const titleText = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || identity.productName || ''
  const modelTokens = (s) => [...String(s).matchAll(/\b([A-Za-z]{1,4}-?\d{2,5}[A-Za-z]{0,2})\b/g)].map((m) => m[1])
  const canon = (t) => t.replace(/-/g, '').toLowerCase()
  const titleTokens = [...new Set(modelTokens(titleText).map(canon))]
  if (titleTokens.length) {
    const variants = [...new Set(modelTokens(pageText))].filter((b) => {
      const cb = canon(b)
      return titleTokens.some((t) => t !== cb && (cb.startsWith(t) || t.startsWith(cb)))
    })
    if (variants.length) {
      fired.push({ ruleId: 'naming_inconsistency', evidence: { titleModel: modelTokens(titleText)[0], bodyVariants: variants.slice(0, 3) } })
    }
  }

  // Structured data whose text is still URL-encoded ("The%20A80i%20is...") is unreadable to the
  // parsers that read it first, even though the visible page looks fine.
  const ldProduct = extractJsonLdObjects(html).find((o) => {
    const type = o?.['@type']
    return type === 'Product' || (Array.isArray(type) && type.includes('Product'))
  })
  if (ldProduct?.description && /%20|%2F|%0A|%22/.test(String(ldProduct.description))) {
    fired.push({ ruleId: 'structured_data_url_encoded', evidence: { sample: String(ldProduct.description).slice(0, 90) } })
  }
  const competitorSpecCounts = benchmark.sellers.map((s) => s.specCount).filter((n) => Number.isFinite(n))
  const competitorSpecMedian = competitorSpecCounts.length
    ? [...competitorSpecCounts].sort((a, b) => a - b)[Math.floor(competitorSpecCounts.length / 2)]
    : null

  // This is its own gap rather than left to silently distort the others below — a page that
  // didn't render at all is a different, more fundamental finding than "thin content."
  if (jsBlocked) {
    fired.push({ ruleId: 'page_requires_javascript', evidence: { note: 'A standard fetch of this page returned a "please enable JavaScript" message instead of the product content — AI crawlers that do not execute JavaScript will see the same thing.' } })
  }

  if (identity.manufacturerCode && !prospectHasCodeOnPage) {
    const competitorsShowingCode = benchmark.sellers.filter((s) => s.showsCode).length
    fired.push({
      ruleId: 'manufacturer_code_missing',
      evidence: { manufacturerCode: identity.manufacturerCode, competitorsShowingCode, totalCompetitors: benchmark.sellers.length },
    })
  } else if (!identity.manufacturerCode && !identity.manufacturerBrand && (identity.standardDesignation || identity.sellerSku)) {
    // Interchange-standard part sold under the seller's own number, with no maker named at all.
    fired.push({
      ruleId: 'manufacturer_not_stated',
      evidence: {
        standardDesignation: identity.standardDesignation || null,
        sellerStockNumber: identity.sellerSku || null,
        note: 'The page gives only the seller\'s own stock number and names no manufacturer or brand, so a buyer or AI engine cannot tell whose part this is or cross-reference it.',
      },
    })
  } else if (realManufacturerCode && !realCodeOnPage) {
    // The page shows a model name ("A-80") but not the manufacturer's actual part number the
    // other sellers and the engines cross-reference by ("1-1334-1"). No competitor count here:
    // the benchmark only fetches seller homepages, so "0 competitors show the code" would be a
    // claim the evidence can't support.
    fired.push({
      ruleId: 'manufacturer_code_missing',
      evidence: { manufacturerCode: realManufacturerCode, pageShowsInstead: identity.manufacturerCode || identity.productName, note: 'Buyers and AI engines cross-reference by the manufacturer part number; it does not appear anywhere on the page.' },
    })
  }

  // Only fires alongside manufacturer_code_missing: a lookalike sibling code is a disambiguation
  // risk specifically because the page doesn't display its OWN code clearly enough to rule it
  // out — if the real code is already shown on the page, there's nothing to disambiguate.
  if (!prospectHasCodeOnPage && siblingCodeRisk?.hasSiblingRisk) {
    fired.push({
      ruleId: 'sibling_code_disambiguation_risk',
      evidence: { manufacturerCode: identity.manufacturerCode, siblingCode: siblingCodeRisk.siblingCode, siblingProductName: siblingCodeRisk.note },
    })
  }

  // Compare against the real benchmark when there is one; fall back to an absolute floor only
  // when no competitor data exists to compare against at all.
  const specGapFires = competitorSpecMedian !== null ? prospectSpecCount < competitorSpecMedian : prospectSpecCount < 2
  if (specGapFires) {
    fired.push({
      ruleId: 'spec_depth_below_competitors',
      evidence: { prospectSpecCount, competitorSpecMedian, competitorCount: benchmark.sellers.length },
    })
  }

  if (prospectPrice && identity.unitOfSale) {
    const unitStated = identity.unitOfSale
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .some((w) => pageText.toLowerCase().includes(w.toLowerCase()))
    if (!unitStated) {
      const pack = parsePackUnitShared(identity.unitOfSale)
      fired.push({
        ruleId: 'unit_of_sale_not_stated',
        evidence: {
          price: prospectPrice.raw,
          inferredUnit: identity.unitOfSale,
          // Computed per-item price so the gap's own detail can show the arithmetic (e.g.
          // "A$72.95 / 48 = A$1.52"), not just restate the total — only when a pack size is
          // confidently parseable, never a guessed denominator.
          ...(pack ? { perUnitPrice: `${String(prospectPrice.raw).replace(/[\d.,]/g, '') || '$'}${(prospectPrice.value / pack.qty).toFixed(2)}`, perUnitNoun: pack.noun, packQty: pack.qty } : {}),
        },
      })
    }
  }

  if (pageText.length < 600) {
    fired.push({ ruleId: 'no_product_description', evidence: { visiblePageTextLength: pageText.length } })
  }

  // Binary presence check stays as the fallback for pages with no structured data at all;
  // structuredDataFields (when given) replaces it with the finer-grained version — a page can
  // have one clean, well-formed block that's still missing the specific fields (mpn,
  // description) an AI engine needs, which "no structured data" would have missed entirely.
  if (structuredDataFields && structuredDataFields.hasProductNode) {
    if (structuredDataFields.missingFields.length > 0) {
      fired.push({
        ruleId: 'structured_data_missing_fields',
        evidence: { missingFields: structuredDataFields.missingFields },
      })
    }
    if (structuredDataFields.brandIsSeller) {
      fired.push({
        ruleId: 'structured_data_brand_is_seller',
        evidence: { statedBrand: structuredDataFields.statedBrand, realManufacturerBrand: identity.manufacturerBrand },
      })
    }
  } else if (!prospectHasJsonLd) {
    fired.push({ ruleId: 'no_structured_data', evidence: { hasStructuredData: false } })
  }

  if (titleCheck?.hasDuplication) {
    fired.push({ ruleId: 'title_tag_duplicated', evidence: { titleText: titleCheck.titleText } })
  }
  if (breadcrumbCheck?.hasDuplication) {
    fired.push({ ruleId: 'breadcrumb_duplicated', evidence: { crumbs: breadcrumbCheck.crumbs } })
  }

  // The site's own robots.txt tells an AI crawler not to fetch this page: measured from robots.txt
  // itself, and quoted rule by rule.
  if (crawlerAccess?.robotsBlockedAiAgents?.length) {
    fired.push({ ruleId: 'robots_txt_blocks_ai_crawlers', evidence: { blockedAgents: crawlerAccess.robotsBlockedAiAgents } })
  }

  const rank = (id) => { const i = GAP_PRIORITY.indexOf(id); return i === -1 ? GAP_PRIORITY.length : i }
  return fired.sort((a, b) => rank(a.ruleId) - rank(b.ruleId)).slice(0, MAX_GAPS)
}

/** Finds the weakest product page with a genuinely real, identifiable manufacturer + code,
 *  retrying across the crawler's shortlist until one qualifies or the shortlist is exhausted. */
async function findIdentifiableWeakProduct(website) {
  const crawl = await findThinProductPages(website)
  const excludeIndexes = []
  for (let attempt = 0; attempt < crawl.shortlist.length; attempt++) {
    const picked = await selectWeakProductAndIdentity({ shortlist: crawl.shortlist, excludeIndexes })
    if (picked.identifiable) return { ...picked, crawl }
    if (picked.originalIndex === undefined) break
    excludeIndexes.push(picked.originalIndex)
  }
  throw new Error(
    `Crawled ${crawl.totalCandidatesScored} product pages on ${crawl.origin} but found none with a genuinely ` +
    `identifiable real manufacturer + model code — this report format needs one to benchmark against real competitors.`
  )
}

/** Direct-URL mode (self-serve): the visitor already chose this exact page — extracts its
 *  identity as best-effort, but unlike the crawl-mode candidate selection there's no other page
 *  to fall back to, so this still rejects outright when the page clearly isn't a single product
 *  (e.g. a homepage or category listing) rather than silently generating a report full of
 *  placeholder text ("the product assessed", a promo-banner price mistaken for a product price). */
async function resolveGivenProductPage(productUrl) {
  const REJECT_MESSAGE =
    'This doesn\'t look like a single product page — we couldn\'t identify a specific product on it. ' +
    'Please paste the URL of one product\'s page (for example ".../product/abc123/some-item-name"), ' +
    'not a homepage or category/collection listing.'

  // Deterministic gate first: a bare domain root ("https://site.com/") is structurally a
  // homepage, never a single product's own page — reject it before ever asking the model,
  // because the model will sometimes "find" a product mentioned or featured on that page (a
  // hero banner, a "best seller" card) and confidently report it as the identity even though
  // the URL itself was never that product's page. That previously produced reports whose
  // headline/name was a real, specific product but whose screenshot, gap analysis and spec
  // count were all computed from the homepage's content instead.
  let pathname = ''
  try {
    pathname = new URL(productUrl).pathname
  } catch {
    // leave pathname empty; fetchPageHtml below will raise its own error for a malformed URL
  }
  if (pathname.split('/').filter(Boolean).length === 0) {
    throw new Error(REJECT_MESSAGE)
  }

  let html
  try {
    ;({ html } = await fetchPageHtml(productUrl))
  } catch (err) {
    // A refusal (403 / 429 / 503) is the site's bot protection: say so rather than show a bare status code.
    if (/\b(401|403|429|503)\b/.test(err.message)) throw new Error(BOT_BLOCKED_MESSAGE)
    throw err
  }
  const pageText = extractReadableText(html, 6000)
  if (isBotChallengeText(pageText)) throw new Error(BOT_BLOCKED_MESSAGE)
  // The page's own schema.org blocks, as written, go to the identity step alongside the text.
  const jsonLd = JSON.stringify(extractJsonLdObjects(html))
  const identity = await extractProductIdentityFromPage({ url: productUrl, pageText, jsonLd: jsonLd === '[]' ? '' : jsonLd })
  if (!identity?.productName?.trim() || identity?.isHomepageOrListing) {
    throw new Error(REJECT_MESSAGE)
  }
  return { ...identity, url: productUrl, pageText }
}

/**
 * End-to-end: resolves the product either by crawling a prospect's site for a weak, identifiable
 * page (cold outreach — pass `website`) or from a single URL the visitor already chose (self-serve
 * — pass `productUrl`), benchmarks it against real competitors, runs a live multi-engine citation
 * audit, and assembles every field the outreach PDF template needs. Does not render or send — see
 * `runOutreachPipeline` for that.
 */
export async function buildOutreachReportData({ company, website, productUrl, contactName, contactTitle, contactEmail, location, timezoneLabel, senderName, senderTitle, senderEmail, revenueBracket }) {
  if (!website && !productUrl) throw new Error('buildOutreachReportData needs either website (crawl mode) or productUrl (direct mode)')

  const prospectDomain = new URL(website || productUrl).hostname.replace(/^www\./, '')

  const identity = website ? await findIdentifiableWeakProduct(website) : await resolveGivenProductPage(productUrl)
  const { html: prospectHtml } = await fetchPageHtml(identity.url)
  const prospectHasJsonLd = hasJsonLd(prospectHtml)

  // A code that is just the page's own URL slug or its JSON-LD "sku", on a page that names no
  // manufacturer, is the SELLER's stock number (EPCO's "B1603-2RS"), not a manufacturer part
  // number — reporting it as one misdescribes the product and hides the real gap (no maker named).
  {
    const canonCode = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    let urlSlug = ''
    try { urlSlug = new URL(identity.url).pathname.split('/').filter(Boolean).pop() || '' } catch { /* keep '' */ }
    const ldProduct = extractJsonLdObjects(prospectHtml).find((o) => {
      const type = o?.['@type']
      return type === 'Product' || (Array.isArray(type) && type.includes('Product'))
    })
    const code = canonCode(identity.manufacturerCode)
    const looksLikeSellerSku = Boolean(code) && !identity.manufacturerBrand &&
      (code === canonCode(urlSlug) || (ldProduct?.sku && code === canonCode(ldProduct.sku)))
    if (looksLikeSellerSku) {
      console.warn(`[outreach] "${identity.manufacturerCode}" is the seller's own stock number on ${identity.url}; not treating it as a manufacturer code`)
      identity.sellerSku = identity.manufacturerCode
      identity.manufacturerCode = ''
    }
  }
  const structuredDataFields = checkProductStructuredDataFields(prospectHtml, { manufacturerBrand: identity.manufacturerBrand, companyName: company })
  const titleCheck = checkTitleTagDuplication(prospectHtml)
  const breadcrumbCheck = checkBreadcrumbDuplication(prospectHtml)

  // Plain HTML text extraction only sees what's in markup — a spec table baked into a diagram
  // image, or detail stated only in a linked PDF datasheet, is invisible to it even though a
  // human (or AI assistant) reading the page would pick it up. OCR that content in and fold it
  // into pageText so spec-depth counting, code-presence detection, and the gap/description
  // checks below all see it too. Best-effort: '' (no-op) when Mistral isn't configured or the
  // page has no datasheet/diagram worth the OCR cost.
  const ocrText = await extractOcrEnrichedText(prospectHtml, identity.url)
  if (ocrText) {
    identity.pageText = `${identity.pageText}\n\n${ocrText}`.slice(0, 10000)
  }
  // A static fetch of a JS-only page (common on heavy B2B portals) returns a "please enable
  // JavaScript" shell plus a huge nav/category menu instead of the real product content — that
  // menu text falsely inflates the spec-cue count (e.g. "Material Handling" category links match
  // the "material" cue) and would otherwise mask a page that's actually empty of real content.
  const jsBlocked = isJsBlockedText(identity.pageText)
  let prospectSpecCount = jsBlocked ? 0 : countSpecCues(identity.pageText)
  // The page's own structured price first (JSON-LD / meta) — the text scan is only a fallback,
  // since page text lists the struck-through MSRP before the real price on most store templates.
  let prospectPrice = extractPriceFromHtml(prospectHtml) || extractPriceSignals(identity.pageText)[0] || null

  // The report is about the STORE the page belongs to. When the typed company name doesn't match
  // the site (a tester typing their own employer, a buyer typing a parent company), use the
  // store's own trading name so citation matching, the competitor exclusion and every label in
  // the report refer to the business that actually owns the page.
  const siteName = (prospectHtml.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) || [])[1]?.trim() || ''
  const domainStem = normalizeSellerName(prospectDomain.split('.')[0]) // "epco-sales" → "epcosales"
  const typedKey = normalizeSellerName(company)
  const typedMatchesSite = Boolean(typedKey) && Boolean(domainStem) && (
    typedKey.includes(domainStem) || domainStem.includes(typedKey) ||
    (siteName && normalizeSellerName(siteName) === typedKey)
  )
  const typedCompany = company
  if (!typedMatchesSite) {
    company = siteName || prospectDomain.replace(/^(.)/, (c) => c.toUpperCase())
    console.warn(`[outreach] typed company "${typedCompany}" doesn't match ${prospectDomain}; reporting on "${company}"`)
  }
  const codePresencePattern = identity.manufacturerCode
    ? identity.manufacturerCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]*')
    : null
  const prospectHasCodeOnPage = codePresencePattern
    ? new RegExp(codePresencePattern, 'i').test(identity.pageText)
    : false

  // Resolved early so both query generation (local delivery intent) and the "prepared for" line
  // can use a real address rather than leaving location blank when the form didn't collect one.
  const placeInfo = await lookupBusinessPlace({ companyName: company, website: website || `https://${prospectDomain}` }).catch(() => null)
  const resolvedLocation = location || placeInfo?.formattedAddress || ''

  // The market this page sells into (country + currency) — buyer queries, cross-engine research
  // and the competitor benchmark are all scoped to it.
  // Evidence-weighed inference: a region is acted on only when its confidence is high or medium; below
  // that no country is assumed and every prompt stays region-free.
  const region = inferRegion({ url: identity.url, html: prospectHtml, pageText: identity.pageText, placeInfo })
  console.log(`[outreach] region: ${region.country || 'unknown'} (${region.currencyCode || '?'}) from ${region.source} | confidence ${region.confidence} | signals: ${region.signals.map((x) => x.type).join(', ') || 'none'}`)
  // A price written with the market's own currency marker (e.g. an "R" or "₹" price) is recognised once the market is known.
  if (!prospectPrice && regionIsActive(region)) prospectPrice = extractPriceSignals(identity.pageText, { currencyCode: region.currencyCode })[0] || null

  const queries = await buildOutreachQueries({
    productName: identity.productName,
    manufacturerBrand: identity.manufacturerBrand,
    manufacturerCode: identity.manufacturerCode,
    category: identity.category,
    location: resolvedLocation,
    attributes: identity.attributes,
    country: region.country,
    avoidNames: [company, typedCompany, prospectDomain, [...prospectDomain.split('.')].sort((a, b) => b.length - a.length)[0]],
    region,
  })
  console.log(`[outreach] buyer queries: ${(queries.named || []).length} named + ${(queries.category || []).length} category`)

  const engines = []
  if (isOpenAIConfigured()) engines.push('chatgpt')
  if (isAnthropicConfigured()) engines.push('claude')
  if (isGeminiConfigured()) engines.push('gemini')

  // The checkable claims the listing makes about the product — each is put to the three engines
  // to verify against the manufacturer's own documentation (see crossEngineResearch.js).
  const listingClaims = await extractListingClaims({ url: identity.url, pageText: identity.pageText })
  console.log(`[outreach] ${listingClaims.length} listing claim(s) to verify`)

  const [namedResults, categoryResults, crossEngine, pageScreenshots, siblingCodeRisk, crawlerAccess] = await Promise.all([
    Promise.all((queries.named || []).map((q) => runOneQuery({ query: q, prospectCompany: company, prospectDomain, prospectPrice, engines, computeFootnote: true, country: region.country, region }))),
    Promise.all((queries.category || []).map((q) => runOneQuery({ query: q, prospectCompany: company, prospectDomain, prospectPrice, engines, computeFootnote: false, country: region.country, region }))),
    // The single-prompt cross-engine research step (see crossEngineResearch.js) — replaces the
    // old separate findManufacturerSpecs + page-reaction-audit calls with one open-ended research
    // ask per engine, mirroring what a person manually checking ChatGPT/Claude/Gemini would do.
    runCrossEngineResearch({
      productName: identity.productName,
      manufacturerBrand: identity.manufacturerBrand,
      knownCodes: [identity.manufacturerCode].filter(Boolean),
      sellerSku: identity.sellerSku,
      unitOfSale: identity.unitOfSale,
      category: identity.category,
      dimensions: identity.attributes?.join(', '),
      price: prospectPrice?.raw,
      url: identity.url,
      country: region.country,
      currencyCode: region.currencyCode,
      claims: listingClaims,
      pageText: identity.pageText,
      region,
    }).catch(() => ({ responses: { chatgpt: null, claude: null, gemini: null } })),
    captureCurrentPageAndHeader(identity.url).catch(() => ({ fullScreenshot: null, headerCrop: null })),
    checkSiblingCodeRisk({ manufacturerBrand: identity.manufacturerBrand, manufacturerCode: identity.manufacturerCode, productName: identity.productName, category: identity.category }).catch(() => ({ hasSiblingRisk: false, siblingCode: '', note: '' })),
    testCrawlerAccess(identity.url).catch(() => null),
  ])
  const { fullScreenshot: currentPageScreenshot, headerCrop } = pageScreenshots
  // Only engines that actually returned an answer are named and counted: one that failed (a usage limit,
  // an outage) produced no result, and the report must not say it was tested.
  const answered = (id) => [...namedResults, ...categoryResults].some((r) => r.answerExcerpts?.[id]) || Boolean(crossEngine.responses?.[id])
  const respondedEngines = engines.filter(answered)
  // Competitor pages with a low plain-download count are re-read in a real browser (see
  // competitorBenchmark.js); the prospect's page gets the same second look, so both are measured the
  // same way: the higher of the plain-text and the browser-rendered reading.
  if (prospectSpecCount < SPEC_RECHECK_BELOW && (pageScreenshots.renderedText || '').length >= 200) {
    prospectSpecCount = Math.max(prospectSpecCount, countSpecCues(pageScreenshots.renderedText))
  }

  const crossEngineFindings = await synthesizeCrossEngineFindings({
    responses: crossEngine.responses,
    groundTruth: {
      priceVisibleOnPage: Boolean(prospectPrice),
      priceShown: prospectPrice?.raw || null,
      manufacturerCodeShownOnPage: prospectHasCodeOnPage,
      specCountOnPage: prospectSpecCount,
      hasStructuredData: prospectHasJsonLd,
      structuredDataBrandIsTheSeller: Boolean(structuredDataFields?.brandIsSeller),
      pageNeedsJavaScriptToShowContent: jsBlocked,
      aiCrawlersBlockedByRobotsTxt: (crawlerAccess?.robotsBlockedAiAgents || []).map((b) => b.agent),
    },
    country: region.country,
    claims: listingClaims,
    region,
  })
  // An engine that couldn't fetch the page returns an apology rather than an assessment; quoting
  // that in the report reads as a broken tool, so such quotes are dropped rather than rendered.
  const isUsableQuote = (q) => {
    // A fragment like "No Technical Specifications Table -" isn't a quotable assessment.
    if (!q || typeof q !== 'string' || q.trim().length < 45 || !/\s\w+\s\w+\s\w+/.test(q)) return false
    return !/\b(cannot|can't|unable to|couldn't|could not|not able to|wasn't able to|was unable to)\s+(?:\w+\s+){0,2}(access|open|load|fetch|retrieve|browse|view|reach|examine|visit)\b|\bno access to\b|\bI don't have access\b|\bpage (?:is|was) (?:inaccessible|unavailable)\b|\bunfortunately,? I\b/i.test(q)
  }
  const pageReaction = {
    chatgpt: isUsableQuote(crossEngineFindings.chatgptQuote) ? crossEngineFindings.chatgptQuote : null,
    claude: isUsableQuote(crossEngineFindings.claudeQuote) ? crossEngineFindings.claudeQuote : null,
  }

  // Fall back to what the cross-engine research found only when the page's own identity
  // extraction came up empty — the page's own stated brand/code always wins when present, since
  // that's what's actually displayed (or not) to a buyer reading the page itself.
  if (!identity.manufacturerBrand && crossEngineFindings.manufacturerBrand) identity.manufacturerBrand = crossEngineFindings.manufacturerBrand
  if (!identity.manufacturerCode && crossEngineFindings.manufacturerCode) identity.manufacturerCode = crossEngineFindings.manufacturerCode
  // An interchange-standard number ("1603-2RS") made by many brands is not anyone's part number;
  // record it so the gaps section can say "no manufacturer named" rather than "MPN missing".
  identity.standardDesignation = crossEngineFindings.isStandardDesignation ? String(crossEngineFindings.standardDesignation || '').trim() : ''

  // Every product page the engines linked while answering — where competitor spec depth is measured.
  const aiLinkedUrls = [
    ...namedResults.flatMap((r) => r.urls || []),
    ...categoryResults.flatMap((r) => r.urls || []),
    ...extractUrls(crossEngine.responses?.chatgpt, crossEngine.responses?.claude, crossEngine.responses?.gemini),
  ]

  const benchmark = await benchmarkCompetitors({
    manufacturerBrand: identity.manufacturerBrand,
    manufacturerCode: identity.manufacturerCode,
    productName: identity.productName,
    category: identity.category,
    excludeDomain: prospectDomain,
    excludeCompany: company,
    region,
    knownUrls: aiLinkedUrls,
  }).catch((err) => {
    console.warn(`[outreach] competitor benchmark failed: ${err.message}`)
    return { sellers: [] }
  })

  // Merge in sellers the cross-engine research found but benchmarkCompetitors' own search
  // missed — deduped by normalized name so the same seller found by both never double-counts.
  // Name variants of the prospect ("Acme Industrial Tools" for "Acme Tools") are the prospect too.
  const looksLikeProspect = prospectNameMatcher({ names: [company, typedCompany], domain: prospectDomain })
  const isMarketplaceName = (name) => /^(ebay|amazon|alibaba|aliexpress|walmart marketplace|etsy|mercari|craigslist|facebook marketplace)\b/i.test(String(name || '').trim())
  const extraSellers = []
  for (const s of crossEngineFindings.sellers || []) {
    if (!(s?.seller && s?.price) || s.inStock === false || looksLikeProspect(s.seller) || isMarketplaceName(s.seller)) continue
    // Same market only: skip sellers the research tagged as another country or priced in another currency.
    if (region.country && (s.inRegion === false || isForeignCurrencyPrice(s.price, region.currencyCode))) continue
    // Same business under a slightly different name ("PGN" / "PGN Bearings") is one seller.
    if (benchmark.sellers.some((b) => isSameSeller(b.seller, s.seller)) || extraSellers.some((e) => isSameSeller(e.seller, s.seller))) continue
    extraSellers.push(s)
  }
  // Engines often quote a pack price in the price text itself ("$85.74 per 25-pack"), so the unit is
  // read from that text too. Everything below is on a per-single-item basis.
  const extraSellersPriced = extraSellers
    .map((s) => ({ seller: s.seller, priceValue: priceToValueShared(s.price), price: s.price, unit: '', isProspect: false }))
    .filter((s) => Number.isFinite(s.priceValue) && s.priceValue > 0)
    .map((s) => {
      const u = toPerUnit({ price: s.price, priceValue: s.priceValue, unit: s.price })
      return { ...s, ...u, unit: u.packQty > 1 ? 'each' : '' }
    })
  const prospectUnit = prospectPrice ? toPerUnit({ price: prospectPrice.raw, priceValue: prospectPrice.value, unit: identity.unitOfSale }) : null

  // Every competitor price is checked against the seller's own product page. A seller whose page
  // shows a different price is left out; one that cannot be checked stays, flagged as unconfirmed.
  const verification = await verifySellerPrices({
    sellers: [...benchmark.sellers, ...extraSellersPriced],
    knownUrls: [...aiLinkedUrls, ...(benchmark.urls || [])],
    excludeDomain: prospectDomain,
    productCode: identity.manufacturerCode,
  }).catch((err) => {
    console.warn(`[outreach] price verification failed: ${err.message}`)
    return null
  })
  const verificationOf = verification ? new Map(verification.sellers.map((x) => [x.seller, x.verification])) : null
  const stillListed = (x) => !verificationOf || verificationOf.has(x.seller)
  const verifiedAs = (x) => verificationOf?.get(x.seller) || 'unconfirmed'
  if (verification) console.log(`[outreach] price check: ${verification.counts.confirmed} confirmed on the seller's page, ${verification.counts.unconfirmed} unconfirmed, ${verification.counts.dropped} dropped`)

  const pricedEntries = [
    ...(prospectPrice ? [{ seller: company, ...prospectUnit, unit: prospectUnit.packQty > 1 ? 'each' : identity.unitOfSale, isProspect: true }] : []),
    ...benchmark.sellers.filter(stillListed).map((x) => ({ seller: x.seller, priceValue: x.priceValue, price: x.price, unit: x.unit, listedPrice: x.listedPrice, packQty: x.packQty || 1, isProspect: false, supplementary: Boolean(x.supplementary), verification: verifiedAs(x) })),
    ...extraSellersPriced.filter(stillListed).map((x) => ({ ...x, verification: verifiedAs(x) })),
  ]
  // A price far from the group's median is a different item or quantity that slipped through (a
  // 25-pack at the single-item price, a bundle, a different product) — not a comparable seller.
  const groupMedian = (() => {
    const v = pricedEntries.map((p) => p.priceValue).sort((a, b) => a - b)
    return v.length ? v[Math.floor(v.length / 2)] : 0
  })()
  const allPriced = pricedEntries
    .filter((p) => p.isProspect || pricedEntries.length < 3 || (p.priceValue / groupMedian <= 4 && p.priceValue / groupMedian >= 0.25))
    .sort((a, b) => a.priceValue - b.priceValue)
  const convertedPacks = allPriced.filter((p) => p.packQty > 1)
  const priceUnitNote = convertedPacks.length
    ? `Prices are shown per single item; pack prices were divided by pack size (${convertedPacks.slice(0, 4).map((p) => `${p.isProspect ? company : p.seller} ${p.listedPrice} ÷ ${p.packQty}`).join('; ')}).`
    : ''

  // What was actually checked, stated plainly in the report: a price is "confirmed" only if it was seen
  // on the seller's own product page.
  const competitorsPriced = allPriced.filter((p) => !p.isProspect)
  const confirmedCount = competitorsPriced.filter((p) => p.verification === 'confirmed').length
  const droppedCount = verification?.counts.dropped || 0
  const priceVerificationNote = competitorsPriced.length
    ? `${confirmedCount} of ${competitorsPriced.length} competitor prices were confirmed on the seller's own product page${confirmedCount < competitorsPriced.length ? `; the other ${competitorsPriced.length - confirmedCount} are as reported by live AI web search and could not be confirmed on the seller's page` : ''}${droppedCount ? `. ${droppedCount} further seller${droppedCount === 1 ? '' : 's'} found by search ${droppedCount === 1 ? 'was' : 'were'} left out because ${droppedCount === 1 ? 'its' : 'their'} own page showed a different price` : ''}.`
    : ''

  const prospectRank = allPriced.findIndex((p) => p.isProspect) + 1
  // "Unranked" reads as a data gap, not a finding — when there's no price to rank (or nothing to
  // rank it against), say what's actually true instead.
  const priceRankLabel = prospectRank > 0
    ? `${ordinal(prospectRank)} lowest`
    : prospectPrice
      ? 'price not comparable — no other sellers found'
      : 'price not shown on page'

  // Laid out like the reference reports: the two sellers AI cited with the richest listings
  // (richest first), then the competitor median, then the client last, highlighted. No
  // manufacturer row. A seller the AI answers actually named outranks one found only by the
  // price search; benchmark.sellers is sorted by PRICE, so this needs its own ranking.
  const citedSellerNames = [...namedResults, ...categoryResults].flatMap((r) => r.sellersCited || [])
  const wasCitedByAi = (name) => citedSellerNames.some((c) => isSameSeller(c, name))
  // Only sellers whose page was actually read are compared: a page that would not load says
  // nothing about its spec depth and must not show as "0 fields". Two sources: the sellers found by
  // the price search, and the product pages the AI engines linked for the sellers they named.
  const linkedMeasured = await measureSpecDepthFromUrls({
    urls: aiLinkedUrls,
    sellerNames: [...citedSellerNames, ...benchmark.sellers.map((s) => s.seller)],
    excludeDomain: prospectDomain,
    limit: 5,
    productCode: identity.manufacturerCode,
  }).catch((err) => {
    console.warn(`[outreach] spec-depth measurement of linked pages failed: ${err.message}`)
    return []
  })
  const measuredCompetitors = benchmark.sellers.filter((s) => !looksLikeProspect(s.seller) && Number.isFinite(s.specCount))
  for (const m of linkedMeasured) {
    if (looksLikeProspect(m.seller) || measuredCompetitors.some((c) => isSameSeller(c.seller, m.seller))) continue
    measuredCompetitors.push({ seller: m.seller, specCount: m.specCount, fromAiLink: true })
  }
  // Pages the engines linked count as "cited by AI" even when the name they used differs.
  const specScore = (s) => (wasCitedByAi(s.seller) || s.fromAiLink ? 2 : 0) + (s.specCount > 0 ? 1 : 0)
  const topCompetitors = [...measuredCompetitors]
    .sort((a, b) => specScore(b) - specScore(a) || b.specCount - a.specCount)
    .slice(0, 2)
    .sort((a, b) => b.specCount - a.specCount)
  console.log(`[outreach] spec depth read on: ${measuredCompetitors.map((c) => `${c.seller}=${c.specCount}`).join(', ') || 'no competitor page'} | ${company}=${prospectSpecCount}`)
  const specDepthRows = topCompetitors.map((s) => ({ label: s.seller, count: s.specCount, highlight: false }))
  if (measuredCompetitors.length > 2) {
    const median = measuredCompetitors.map((s) => s.specCount).sort((a, b) => a - b)[Math.floor(measuredCompetitors.length / 2)]
    specDepthRows.push({ label: 'Median of other sellers', count: median, highlight: false })
  }
  specDepthRows.push({ label: company, count: prospectSpecCount, highlight: true })

  // (The enriched-page screenshot is taken after the report writer runs, below — it shows the
  // writer's corrected page content.)

  const namedCitedCount = namedResults.filter((r) => r.prospectCited).length
  const categoryCitedCount = categoryResults.filter((r) => r.prospectCited).length
  // The headline stat counts citation across every buyer query asked, not just the ones that
  // name the product — a category query citing the prospect still counts as a citation, and the
  // reference report's own "0 of 8" denominator is the full named+category query count.
  const totalCitedCount = namedCitedCount + categoryCitedCount
  const totalAskedCount = namedResults.length + categoryResults.length

  const realManufacturerCode = String(crossEngineFindings.manufacturerCode || '').trim()
  const realCodeOnPage = realManufacturerCode
    ? new RegExp(realManufacturerCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s-]+/g, '[\\s-]*'), 'i').test(`${identity.pageText}\n${prospectHtml}`)
    : true
  const firedGaps = computeGapEvidence({
    identity, prospectHasCodeOnPage, realManufacturerCode, realCodeOnPage, prospectSpecCount, prospectHasJsonLd, prospectPrice,
    pageText: identity.pageText, renderedText: pageScreenshots.renderedText || '', html: prospectHtml, benchmark, jsBlocked, siblingCodeRisk,
    structuredDataFields, titleCheck, breadcrumbCheck, crawlerAccess,
  })
  const strengthFacts = {
    priceVisible: Boolean(prospectPrice),
    noLoginRequired: true, // scraping succeeded without auth, so the page is at least publicly readable
    googleRating: placeInfo?.rating ?? null,
    googleReviewCount: placeInfo?.reviewCount ?? null,
    // Real, checked page facts the reference reports credit when present — so "strengths" can be
    // specific ("one clean structured-data block, the correct manufacturer brand, a clean
    // breadcrumb") instead of generic.
    hasOneCleanStructuredDataBlock: Boolean(structuredDataFields?.hasProductNode),
    structuredDataBrand: structuredDataFields?.hasProductNode && !structuredDataFields.brandIsSeller ? structuredDataFields.statedBrand : null,
    cleanBreadcrumb: Boolean(breadcrumbCheck?.crumbs?.length) && !breadcrumbCheck.hasDuplication,
    hasProductDescription: identity.pageText.length >= 600,
    showsMsrpDiscount: /\b(msrp|rrp|list price|was)\b.{0,40}\byou save\b|\byou save\b/i.test(identity.pageText),
    inStock: /\bin stock\b/i.test(identity.pageText),
    cheapestInStockListing: prospectRank === 1 && allPriced.length > 2,
    aiCrawlersAllowed: crawlerAccess?.fullyAccessible && !crawlerAccess.robotsBlockedAiAgents?.length ? `${crawlerAccess.accessibleCount} of ${crawlerAccess.totalBots} AI crawlers can fetch the page` : null,
  }
  // ---- Report writer: every section's text, from the evidence above (see reportWriter.js) ----
  const revenueBasis = buildRevenueRisk({ revenueBracket, region })
  const trimText = (t, n) => (typeof t === 'string' ? t.slice(0, n) : '')
  const queryForWriter = (type) => (r) => ({
    type, query: r.query, sellers_cited: r.sellersCited, prospect_cited: r.prospectCited,
    cited_price_if_any: r.citedPrice || null, engine_answer_excerpts: r.answerExcerpts,
  })
  const writer = await writeOutreachReport({
    PRODUCT: {
      seller: company, name: identity.productName, url: identity.url, seller_sku: identity.sellerSku || null,
      manufacturer_brand: identity.manufacturerBrand || null, manufacturer_code: identity.manufacturerCode || null,
      standard_designation: identity.standardDesignation || null, category: identity.category, unit_of_sale: identity.unitOfSale,
      listed_price: prospectPrice?.raw || null, currency: region.currencyCode || null,
      region: region.country || 'not determinable', region_source: region.source, business_address: resolvedLocation || null,
    },
    // PerplexityBot is left out: Perplexity is not part of this report.
    CRAWLER_ACCESS: crawlerAccess
      ? crawlerAccess.results.filter((r) => r.label !== 'PerplexityBot').map((r) => ({ agent: r.label, status: r.status, ok: r.ok, ...(crawlerAccess.inconclusive ? { test_inconclusive: true } : {}) }))
      : null,
    ROBOTS_TXT: trimText(crawlerAccess?.robotsTxt, 2000),
    ORGANIC_QUERIES: [...namedResults.map(queryForWriter('product')), ...categoryResults.map(queryForWriter('category'))],
    CITATION_SUMMARY: { cited_in: totalCitedCount, total_queries: totalAskedCount, engines: respondedEngines },
    CROSS_ENGINE_RESEARCH: {
      raw_responses: {
        chatgpt: trimText(crossEngine.responses?.chatgpt, 6000),
        claude: trimText(crossEngine.responses?.claude, 6000),
        gemini: trimText(crossEngine.responses?.gemini, 6000),
      },
      synthesis: {
        manufacturer_brand: crossEngineFindings.manufacturerBrand, manufacturer_code: crossEngineFindings.manufacturerCode,
        is_standard_designation: crossEngineFindings.isStandardDesignation, page_review_findings: crossEngineFindings.pageReviewFindings,
        conflicts: crossEngineFindings.conflicts, manufacturer_specs: crossEngineFindings.manufacturerSpecs,
        claim_checks: crossEngineFindings.claimChecks || [], recommendations: crossEngineFindings.recommendations || [],
        agreements: crossEngineFindings.agreements || [], page_read_reliability: crossEngineFindings.pageReadReliability || [],
      },
      // Which engines actually answered the research brief (after retries); a usage cap is disclosed, not hidden.
      engine_status: crossEngine.engineStatus || null,
    },
    LISTING_CLAIMS: listingClaims,
    // The seller's own page text, so the writer can set what the page states beside the manufacturer's documentation.
    PAGE_TEXT: trimText(identity.pageText, 6000),
    GROUND_TRUTH: {
      price_visible_on_page: Boolean(prospectPrice), price_shown: prospectPrice?.raw || null,
      manufacturer_code_shown_on_page: prospectHasCodeOnPage, real_code_on_page: realCodeOnPage,
      spec_count_on_page: prospectSpecCount, has_structured_data: prospectHasJsonLd, structured_data_fields: structuredDataFields,
      title_check: titleCheck, breadcrumb_check: breadcrumbCheck, page_requires_javascript: jsBlocked,
      attributes_stated: identity.attributes, sibling_code_risk: siblingCodeRisk,
      schema_conflicts: identity.schemaConflicts || [],
      robots_txt_verdicts: (crawlerAccess?.robotsVerdicts || []).filter((v) => v.agent !== 'PerplexityBot').map((v) => ({ agent: v.agent, allowed: v.allowed, rule: v.rule || null })),
    },
    FIRED_GAP_RULES: firedGaps,
    STRENGTH_FACTS: strengthFacts,
    COMPETITOR_PRICES: allPriced.map((p) => ({ seller: p.isProspect ? `${company} (prospect)` : p.seller, price: p.price, ...(p.isProspect ? {} : { verified_on_seller_page: p.verification === 'confirmed' }), ...(p.packQty > 1 ? { listed_price: p.listedPrice, pack_size: p.packQty } : {}), region: region.country || null, supplementary: Boolean(p.supplementary) })),
    // Same rule the rest of the report uses (lower half of the same-region price range = competitive).
    PRICE_POSITION: {
      prospect_rank: prospectRank || null, seller_count: allPriced.length, label: priceRankLabel,
      price_is_competitive: prospectRank > 0 && prospectRank <= Math.ceil(allPriced.length / 2),
    },
    SPEC_DEPTH: specDepthRows,
    REVENUE: { mode: revenueBasis.mode, base: revenueBasis.basis.rangeLabel, source_or_disclaimer: revenueBasis.basis.source },
    CONTACT: { prepared_by: senderName, email: senderEmail },
  })

  console.log(`[outreach] report writer: ${writer?._meta?.model || 'none (fallback text)'} | competitors measured for spec depth: ${measuredCompetitors.length}`)
  let gaps
  let strengths
  if (writer?.gaps?.length) {
    gaps = writer.gaps
    strengths = writer.strengths
  } else {
    ;({ gaps, strengths } = await analyzeOutreachGaps({
      company,
      productName: identity.productName,
      manufacturerCode: identity.manufacturerCode,
      firedGaps,
      strengthFacts,
    }))
  }
  const revenueRisk = buildRevenueRisk({ revenueBracket, region, model: writer?.revenueModel })

  // The enriched page: the seller's real, live page with its content corrected and completed —
  // MPN line, rewritten description and bullets, Specifications / Package contents / FAQ — all from
  // the writer's evidence-checked content. Falls back to a composited layout only if the live page
  // can't be edited (see captureEnrichedMockupScreenshot).
  const enrichedMockupScreenshot = await captureEnrichedMockupScreenshot({
    url: identity.url,
    enriched: writer?.enrichedPage || null,
    productName: identity.productName,
    category: identity.category,
    manufacturerBrand: identity.manufacturerBrand,
    manufacturerCode: identity.manufacturerCode,
    price: prospectPrice?.raw || null,
    specs: crossEngineFindings.manufacturerSpecs || [],
    description: `${identity.productName}${identity.manufacturerBrand ? ` from ${identity.manufacturerBrand}` : ''}${identity.category ? ` — ${identity.category}` : ''}.`,
    headerCrop,
    // Used only when the page shows a "no image" placeholder: a verified picture of this exact product from its manufacturer's page.
    getProductImage: () => findProductImage({ urls: aiLinkedUrls, brand: identity.manufacturerBrand, code: identity.manufacturerCode, excludeDomain: prospectDomain }),
  }).catch(() => null)

  // Fall back to the competitor median when the client's own price isn't visible, rather than
  // silently dropping the whole section — the copy makes clear it's a stand-in, not their price.
  const revenueBasisPrice = prospectPrice
    ? { value: prospectPrice.value, raw: prospectPrice.raw, isFallback: false }
    : allPriced.length
      ? { value: allPriced[Math.floor(allPriced.length / 2)].priceValue, raw: allPriced[Math.floor(allPriced.length / 2)].price, isFallback: true }
      : null
  const revenueTable = revenueBasisPrice
    ? {
        ...buildRevenueAtStakeTable({ unitPrice: revenueBasisPrice.value, currency: revenueBasisPrice.raw.replace(/[\d.,]/g, '') || '$', unitLabel: identity.unitOfSale || 'units' }),
        caption: revenueBasisPrice.isFallback
          ? `No price was visible on ${company}'s own page, so this uses the median price found among comparable sellers (${revenueBasisPrice.raw}) as a stand-in. These are revenue figures, not profit, and not a sales forecast.`
          : `Illustrative scenarios for a single product at ${revenueBasisPrice.raw}. These are revenue figures, not profit, and not a sales forecast. They exclude repeat orders and associated product lines.`,
      }
    : null

  const priceIsCompetitive = prospectRank > 0 && prospectRank <= Math.ceil(allPriced.length / 2)
  const now = new Date()
  const methodologyDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const methodologyMonthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const engineNames = ENGINE_LABELS.filter((e) => respondedEngines.includes(e.id)).map((e) => e.label)
  const engineNamesSentence = engineNames.length <= 1
    ? (engineNames[0] || 'live AI search')
    : `${engineNames.slice(0, -1).join(', ')} and ${engineNames[engineNames.length - 1]}`

  // States the actual computed finding (price standing + citation outcome) rather than a generic
  // description of the method — e.g. "...and why X was not cited even though its price beats
  // most of the sellers that were." Built from real numbers, never templated filler.
  const priceClause = prospectPrice
    ? priceIsCompetitive
      ? ' even though its price beats most of the sellers that were'
      : ' — its price is not among the lowest cited either'
    : ''
  const citationClause = totalCitedCount === 0
    ? `and why ${company} was not cited${priceClause}`
    : totalCitedCount === totalAskedCount
      ? `and ${company} was cited in every one of them${prospectPrice ? (priceIsCompetitive ? ', with a price that already beats most of the sellers that were' : '') : ''}`
      : `and why ${company} was cited in only some of them${priceClause}`
  const lede = `What happened when we asked ${engineNamesSentence} the way buyers do for ${identity.productName}, ${citationClause}.`

  // Same median-of-competitor-specs comparison computeGapEvidence uses internally, recomputed
  // here (cheap) since the scorecard needs it independently of whether the spec gap actually fired.
  const competitorSpecCounts = benchmark.sellers.map((s) => s.specCount).filter((n) => Number.isFinite(n))
  const competitorSpecMedian = competitorSpecCounts.length
    ? [...competitorSpecCounts].sort((a, b) => a - b)[Math.floor(competitorSpecCounts.length / 2)]
    : null
  const unitStatedOnPage = Boolean(
    identity.unitOfSale && identity.pageText.toLowerCase().includes(
      identity.unitOfSale.split(/\s+/).filter((w) => w.length > 2)[0]?.toLowerCase() || '\0'
    )
  )
  const lowerPageText = identity.pageText.toLowerCase()
  const scorecard = computeScorecard({
    crawlerAccess, titleCheck, breadcrumbCheck, structuredDataFields, prospectHasJsonLd,
    prospectHasCodeOnPage, manufacturerCode: identity.manufacturerCode,
    prospectSpecCount, competitorSpecMedian,
    unitOfSale: identity.unitOfSale, unitStatedOnPage,
    description: identity.pageText,
    priceRank: prospectRank > 0 ? prospectRank : null, sellerCount: allPriced.length, prospectPrice,
    googleRating: placeInfo?.rating ?? null, googleReviewCount: placeInfo?.reviewCount ?? null,
    hasStockIndicator: /\b(in stock|out of stock|on hand|lead time|ships? (today|in))\b/i.test(lowerPageText),
    hasAddToCart: /\b(add to cart|add to quote|buy now|request quote)\b/i.test(lowerPageText),
    hasVariantInfo: /\b(variant|choose (a |an )?option|select (a |an )?(size|color|colour))\b/i.test(lowerPageText),
    hasFaqOrFullDescription: /\b(faq|frequently asked)\b/i.test(lowerPageText) || identity.pageText.length > 600,
    totalCitedCount, totalAskedCount,
  })

  const reportData = {
    lead: { company, contactName, contactTitle, website: website || `https://${prospectDomain}`, domain: prospectDomain, location: resolvedLocation, timezoneLabel, email: contactEmail },
    region,
    enrichedInjected: enrichedMockupScreenshot?.injected || null,
    product: { name: identity.productName, manufacturerBrand: identity.manufacturerBrand, manufacturerCode: identity.manufacturerCode, url: identity.url, category: identity.category },
    lede,
    crawlerAccess,
    scorecard,
    crossEngineConflicts: crossEngineFindings.conflicts || [],
    headline: {
      line1: prospectPrice
        ? (prospectRank === 1 && allPriced.length > 2
            ? (/\bin stock\b/i.test(identity.pageText) ? 'Cheapest in stock.' : 'Cheapest listing found.')
            : priceIsCompetitive ? 'Competitively priced.' : 'Priced above comparable sellers.')
        : 'Price not shown on page.',
      line2: crawlerAccess?.robotsBlockedAiAgents?.length
        ? `robots.txt blocks ${crawlerAccess.robotsBlockedAiAgents.length} AI crawlers.`
        : crawlerAccess?.fullyAccessible
        ? 'Open to every AI crawler.'
        : crawlerAccess && !crawlerAccess.inconclusive && crawlerAccess.accessibleCount < crawlerAccess.totalBots
          ? `Blocked for ${crawlerAccess.totalBots - crawlerAccess.accessibleCount} of ${crawlerAccess.totalBots} AI crawlers.`
          : 'Available to order.',
      line3: totalCitedCount === 0
        ? 'Not cited by AI LLMs.'
        : totalCitedCount === totalAskedCount
          ? 'Cited by AI LLMs.'
          : 'Only partially cited by AI LLMs.',
    },
    stats: {
      citedCount: totalCitedCount,
      totalQueries: totalAskedCount,
      priceRank: priceRankLabel,
      sellerCount: allPriced.length,
      priceLow: allPriced[0]?.price || '—',
      priceHigh: allPriced[allPriced.length - 1]?.price || '—',
      currency: prospectPrice?.raw.replace(/[\d.,]/g, '') || '$',
    },
    methodology: [
      {
        title: `${namedResults.length + categoryResults.length} buyer queries`,
        body: `Phrased the way real buyers search. ${namedResults.length} name the product directly; ${categoryResults.length} are broader category searches.`,
      },
      {
        title: `${engineNames.length} AI LLM${engineNames.length === 1 ? '' : 's'}, tested live`,
        body: `Buyer queries were run live with web search on ${methodologyDate}.${engineNames.includes('ChatGPT') && engineNames.includes('Claude') ? ' ChatGPT and Claude were each then asked to review your product page directly.' : ''} AI answers can vary between runs and between engines, so treat this as a snapshot rather than a fixed ranking.`,
      },
      { title: 'Verified at source', body: "Competitor prices were compared with each seller's own product page where it could be read, and what the AI engines said about your page was checked against your live page." },
    ],
    engineNames,
    methodologyMonthYear,
    // Links the category-query results back to a cause the prospect can actually act on: the
    // category queries never name the product, so being surfaced by one depends entirely on
    // whether the page states the same attributes those queries are built from. Checked against
    // the real page text, not asserted — only built when there are real attributes to check.
    categoryQueryCausalNote: (() => {
      const categoryAttrs = (identity.attributes || []).filter(Boolean)
      if (categoryResults.length === 0 || categoryAttrs.length === 0) return null
      const lowerPageText = identity.pageText.toLowerCase()
      const statedAttrs = categoryAttrs.filter((a) => lowerPageText.includes(a.toLowerCase()))
      const stateClause = statedAttrs.length === categoryAttrs.length
        ? 'The current page states all of these.'
        : statedAttrs.length === 0
          ? 'The current page states none of these.'
          : `The current page states only ${statedAttrs.join(', ')}.`
      return `The ${categoryResults.length} category queries above don't name ${identity.productName}, so ${company} could only appear in them if its page stated the attributes buyers ask for (${categoryAttrs.join(', ')}). ${stateClause}`
    })(),
    queries: { named: namedResults, category: categoryResults },
    quotes: pageReaction,
    commercialImplications:
      `${identity.category ? `${identity.category.charAt(0).toUpperCase()}${identity.category.slice(1)} purchases` : 'Purchases like this'} often come with related lines bought alongside them. When an AI answer cites another supplier, that order — and sometimes the ongoing account — goes there instead. Existing customers are not affected the same way; the exposure is with new buyers who begin their search with an AI assistant.`,
    gaps,
    strengths,
    specDepth: specDepthRows,
    specDepthCaption: 'Indicative spec-mention count across the pages checked. Pricing and specification differences point to content mattering, though it is not the only influence on AI citation.',
    beforeAfter: {
      currentScreenshot: currentPageScreenshot ? `data:image/png;base64,${currentPageScreenshot.toString('base64')}` : null,
      enrichedScreenshot: enrichedMockupScreenshot ? `data:image/png;base64,${enrichedMockupScreenshot.toString('base64')}` : null,
      // Mirrors the page-3 gap list exactly, so this page can't disagree with the findings above
      // it — falls back to the raw measured facts only on the rare page with zero fired gaps.
      currentBullets: gaps.length
        ? gaps.map((g) => g.title)
        : [
            `Title: "${identity.productName}"${identity.productName.length < 40 ? ' (abbreviated/generic)' : ''}`,
            prospectHasCodeOnPage ? `Manufacturer code shown: ${identity.manufacturerCode}` : 'No manufacturer code identifiable',
            prospectPrice ? `Price shown: ${prospectPrice.raw}` : 'No price shown',
            `Specifications: ${prospectSpecCount} visible`,
            prospectHasJsonLd ? 'Structured product data: present' : 'Structured product data: none found',
          ],
      enrichedBullets: [
        `Full title with manufacturer brand${identity.manufacturerCode ? ' and code' : ''}`,
        crossEngineFindings.manufacturerSpecs.length ? `Specification table: ${crossEngineFindings.manufacturerSpecs.length} manufacturer-published values` : 'Expanded specification table built from manufacturer data',
        'Clear unit-of-sale and per-unit price shown',
        'Product description for AI to cite',
        'Structured product data (schema.org) included',
      ],
      caption: 'The enriched version is a mock-up rendered from the real data above, not a live page — content would be confirmed with you and the manufacturer before anything is published.',
    },
    businessImpact: [
      { title: 'Eligibility for AI answers.', detail: 'Queries naming this product can be matched to a listing that is priced competitively against the sellers currently cited.' },
      // Only a real, named comparison when there's a genuine competitor to cite — a vague "near you"
      // claim with no location is worse than just not making the point.
      ...(prospectPrice && allPriced.find((p) => !p.isProspect)
        ? [(() => {
            const competitor = allPriced.find((p) => !p.isProspect)
            const own = allPriced.find((p) => p.isProspect)
            // Both prices are already per single item (see allPriced), so they compare directly.
            const perItem = own.packQty > 1 || competitor.packQty > 1 ? ' per item' : ''
            return {
              title: 'Clear price comparison.',
              detail: `${own.price}${perItem}${own.packQty > 1 ? ` (${own.listedPrice} for ${own.packQty})` : ''} compares directly with ${competitor.price}${perItem} at ${competitor.seller}.`,
            }
          })()]
        : []),
      ...(resolvedLocation
        ? [{ title: 'Local relevance.', detail: `Buyers near ${resolvedLocation} who search through AI can be directed to a local supplier.` }]
        : []),
      { title: 'One source for every channel.', detail: 'The same enriched content serves search engines, AI assistants and customers reading the page directly.' },
      { title: 'No guarantee of citation.', detail: 'AI engines decide independently. Enrichment makes the listing matchable and citable, and we re-test the same queries afterward so you can see what changed.' },
    ],
    priceComparison: allPriced.map((p) => ({
      seller: p.isProspect ? `${company}${totalCitedCount === 0 ? ' (not cited)' : totalCitedCount === totalAskedCount ? ' (cited)' : ' (partially cited)'}` : p.seller,
      price: p.price,
      isProspect: p.isProspect,
    })),
    priceVerificationNote,
    priceComparisonCaption: [
      `Prices as found on ${methodologyDate}. Prices change, so treat differences of a few dollars as indicative.`,
      priceVerificationNote || null,
      // Computed, not templated — only stated when there's a real "N of M" to report (needs the
      // prospect ranked against at least one other seller).
      prospectRank > 0 && allPriced.length > 1
        ? `${company}'s price is lower than ${allPriced.length - prospectRank} of the ${allPriced.length - 1} other sellers checked here.`
        : null,
      priceUnitNote || null,
    ].filter(Boolean).join(' '),
    revenueTable,
    // 12-month revenue at risk (page-1 tile) and the cost-of-doing-nothing model (page 5) — from
    // the revenue band the visitor chose, or the illustrative 5M placeholder when they didn't.
    revenueRisk,
    methodologyDate,
    // Conditional rather than a fixed claim — a page can check out on every rule this engine
    // tests (code shown, specs on par with its real competitor, structured data present) and
    // still go uncited, since citation also depends on factors off this one page entirely
    // (domain authority, backlinks, how the AI model happened to weigh sources that day). Saying
    // "the gap is in content" when zero content gaps fired would contradict page 3 directly.
    refSummaryNote: gaps.length > 0
      ? 'The clearest gap is in content, not price. This assessment covers one product page — if other listings use the same template, similar gaps are likely across the catalogue.'
      : 'This page checks out against every on-page signal we test — code shown, specs on par with the competitor cited alongside it, structured data present — yet still wasn\'t cited. That points to factors beyond this one page (site-wide authority, backlinks, how the AI model weighted sources that day) rather than a fix to make here. Re-running the same queries over time, and checking whether other pages on the site show the same pattern, is the next useful signal.',
    nextSteps: {
      optionA: {
        title: '20-Minute Walkthrough',
        body: `A screen-share with our catalog team to review the fuller audit: the AI query logs, a benchmark against up to 12 sellers, and the proposed page with structured product data. We can run the same queries live on the call so you see today's answers, not a recording.${timezoneLabel ? ` Scheduled in ${timezoneLabel}.` : ''} No sales figures needed to get started.`,
        contact: `Contact: ${senderEmail}`,
      },
      optionB: {
        title: 'Three Products of Your Choice',
        body: 'Send us the web addresses of three product pages you care about most. We will show you live how AI search responds to each one today, and what enrichment would change.',
        note: 'No proposal or commitment required — any follow-on work would be quoted separately.',
      },
      // Matches optionB's own ask exactly — this is the literal contradiction the gap-analysis
      // doc flagged (closing banner asked for "part numbers" while option B asked for web
      // addresses), so the two must stay in sync rather than being independently hardcoded.
      ctaHeadline: 'Send us three product page addresses.',
      ctaBody: 'We will show you how AI search currently responds to each one, and what enrichment would change.',
    },
    availableOnRequest: 'AI query logs, page snapshot, 15-point scorecard and the 24-field attribute map for this product.',
    sender: { name: senderName, title: senderTitle, company: 'AltiusNxt Technologies', email: senderEmail },
    unsubscribeEmail: senderEmail,
  }

  // Fallback KPI tiles, from computed facts, used wherever the writer's tile didn't pass its check.
  const fallbackKpis = [
    { value: `${totalCitedCount} of ${totalAskedCount}`, label: `BUYER SEARCH ANSWERS THAT NAMED ${String(company).toUpperCase()}` },
    prospectRank > 0 && allPriced.length > 1
      ? { value: priceRankLabel, label: `PRICE RANK AMONG ${allPriced.length} ${region.country ? `${region.country.toUpperCase()} ` : ''}SELLERS OF THIS PRODUCT` }
      : { value: `${prospectSpecCount}`, label: 'BUYING-DECISION SPECIFICATION FIELDS VISIBLE ON THE PAGE' },
  ]
  return applyWriterText(reportData, writer, { fallbackKpis, pageReaction })
}

/**
 * Lays the report writer's text over the deterministic defaults, field by field — anything the
 * writer didn't return (or that failed its checks) keeps the pipeline's own computed text.
 * The third KPI tile is always the computed revenue figure, never model-written.
 */
export function applyWriterText(data, writer, { fallbackKpis, pageReaction }) {
  const w = writer || {}
  const risk = data.revenueRisk
  const illustrative = risk.mode === 'illustrative'
  const categoryName = risk.category.applied && risk.category.name ? risk.category.name.toUpperCase() : ''

  const kpis = [...(w.kpis || [])]
  for (const f of fallbackKpis) if (kpis.length < 2 && !kpis.some((k) => k.value === f.value)) kpis.push(f)
  kpis.push(illustrative
    ? { value: `~${risk.total.label}*`, label: 'ILLUSTRATIVE ANNUAL COST OF DOING NOTHING — *EXAMPLE SCALE ONLY, SEE P.5' }
    : { value: risk.total.label, label: `EST. ANNUAL REVENUE AT RISK${categoryName ? ` ACROSS YOUR ${categoryName} RANGE` : ''} (RANGE, SEE P.5)` })

  // The "what's fixed" bullets describe what was actually put on the enriched page, so they can't
  // promise anything the screenshot doesn't show.
  const ep = w.enrichedPage
  const inj = data.enrichedInjected // what the screenshot step actually put on the page (null = unknown)
  const countWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
  const spell = (n) => (n >= 0 && n <= 10 ? countWords[n] : String(n))
  const brandForMpn = ep ? String(ep.mpnLabel || '').replace(/\s*MPN\s*$/i, '').trim() : ''
  const placed = {
    mpn: !inj || inj.mpn,
    title: !inj || inj.title,
    description: !inj || inj.description || inj.bullets,
    sections: !inj || inj.sections,
    fullSections: !inj || (inj.sections && !inj.specsOnly),
  }
  // Counts of what the screenshot really shows (content that did not fit the frame was trimmed).
  const shownSpecs = ep ? (inj?.specRows ?? ep.specs?.length ?? 0) : 0
  const shownFaqs = ep ? (inj?.faqCount ?? ep.faqs?.length ?? 0) : 0
  const shownPackage = ep ? Boolean(ep.packageContents) && (inj?.packageContents ?? true) : false
  const enrichedBullets = ep
    ? [
        ep.mpnValue && placed.mpn && `Real ${brandForMpn ? `${brandForMpn} ` : 'manufacturer '}part number ${ep.mpnValue} shown and labelled`,
        ((ep.title && placed.title) || ((ep.description || ep.bullets?.length) && placed.description)) &&
          `${[ep.title && placed.title && 'Title', (ep.description || ep.bullets?.length) && placed.description && 'description and bullet points'].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase())} rewritten to match the manufacturer's documentation`,
        inj?.image && `Product image added from the manufacturer's own page (${inj.imageSource})`,
        shownSpecs > 0 && placed.sections && `${shownSpecs}-attribute specification table visible without any click`,
        shownPackage && placed.fullSections && 'Full package contents listed',
        shownFaqs > 0 && placed.fullSections && `Short FAQ answering the ${spell(shownFaqs)} question${shownFaqs === 1 ? '' : 's'} buyers and AI engines were unsure about`,
      ].filter(Boolean).slice(0, 5)
    : []

  // Writer quotes first, topped up to two with the pipeline's own checked quotes from other engines.
  const quotes = [...(w.quotes || [])]
  for (const [engine, quote] of [['chatgpt', pageReaction.chatgpt], ['claude', pageReaction.claude]]) {
    if (quotes.length < 2 && quote && !quotes.some((q) => q.engine === engine)) quotes.push({ engine, quote })
  }

  return {
    ...data,
    headline: w.headline?.line1 && w.headline?.line2 ? w.headline : data.headline,
    lede: w.lede || data.lede,
    kpis,
    fullAuditText: w.fullAuditText || `This summary sits on top of a fuller technical audit of your product page: ${data.availableOnRequest.replace(/\.$/, '')}.`,
    methodology: w.methodology?.length === 3 ? w.methodology : data.methodology,
    resultsHeadline: w.resultsHeadline || '',
    resultsIntro: w.resultsIntro || '',
    resultsFootnote: w.resultsFootnote || '',
    quotes,
    howToRead: w.howToRead || '',
    fieldComparison: w.fieldComparison || null,
    commercialImplications: w.commercialImplications || data.commercialImplications,
    gapsIntro: w.gapsIntro || '',
    specDepthCaption: w.specDepthCaption || data.specDepthCaption,
    beforeAfter: {
      ...data.beforeAfter,
      currentBullets: w.currentBullets?.length ? w.currentBullets : data.beforeAfter.currentBullets,
      enrichedBullets: enrichedBullets.length ? enrichedBullets : (w.enrichedBullets?.length ? w.enrichedBullets : data.beforeAfter.enrichedBullets),
      caption: w.beforeAfterCaption || data.beforeAfter.caption,
    },
    businessImpact: w.businessImpact?.length ? w.businessImpact : data.businessImpact,
    commercialIntro: w.commercialIntro || '',
    priceComparisonCaption: w.priceCaption ? [w.priceCaption, data.priceVerificationNote].filter(Boolean).join(' ') : data.priceComparisonCaption,
    priceFinding: w.priceFinding || null,
    closingNote: w.closingNote || null,
    nextSteps: {
      ...data.nextSteps,
      intro: w.nextSteps?.intro || '',
      optionA: { ...data.nextSteps.optionA, body: w.nextSteps?.optionA || data.nextSteps.optionA.body },
      optionB: { ...data.nextSteps.optionB, body: w.nextSteps?.optionB || data.nextSteps.optionB.body },
    },
  }
}

export async function runOutreachPipeline(input) {
  const data = await buildOutreachReportData(input)
  const pdfBuffer = await generateOutreachReportPdf(data)
  await sendOutreachReport({
    to: input.contactEmail,
    contactName: input.contactName,
    company: input.company,
    productName: data.product.name,
    pdfBuffer,
    filename: `AltiusNxt-AI-Readiness-Report-${input.company.replace(/\s+/g, '-')}.pdf`,
    senderName: input.senderName,
    senderEmail: input.senderEmail,
    unsubscribeEmail: input.senderEmail,
  })
  return { data, pdfBuffer }
}
