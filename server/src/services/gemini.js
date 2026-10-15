import { config, isGeminiConfigured } from '../config.js'
import { regionBuyerClause, regionSellerClause } from './region.js'

async function callGeminiRaw(prompt, { json = true, timeoutMs = 45000 } = {}) {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured on the server')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content')
  return text
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text)
  } catch {
    // Occasionally wraps the JSON in a markdown code fence despite responseMimeType, or the
    // response gets truncated mid-array/object by the output token limit — both are worth one
    // cheap local repair attempt before giving up and asking the model to retry.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenced) {
      try { return JSON.parse(fenced[1]) } catch { /* fall through */ }
    }
    return null
  }
}

export async function callGemini(prompt, { retried = false, timeoutMs } = {}) {
  const text = await callGeminiRaw(prompt, { json: true, timeoutMs })
  const parsed = parseJsonLoose(text)
  if (parsed !== null) return parsed

  if (!retried) {
    console.warn('[gemini] JSON parse failed, retrying once. Raw response (first 500 chars):', text.slice(0, 500))
    return callGemini(prompt, { retried: true, timeoutMs })
  }

  console.error('[gemini] JSON parse failed twice. Raw response (first 1000 chars):', text.slice(0, 1000))
  throw new Error('Gemini did not return valid JSON')
}

/** Plain-text Gemini call, used when Gemini is queried as one of the live-audit engines. */
export async function askGeminiText(prompt) {
  const text = await callGeminiRaw(prompt, { json: false })
  return text.trim()
}

/**
 * Real-web-search-grounded variant, via Gemini's built-in google_search tool. Same
 * GEMINI_API_KEY as the calls above — only the request body differs (tool declaration,
 * and no responseMimeType since grounded answers must be plain text).
 */
export async function askGeminiTextWithSearch(prompt, { timeoutMs = 45000 } = {}) {
  if (!isGeminiConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured on the server')
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini (web search) request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts || []
  const text = parts.map((p) => p.text).filter(Boolean).join(' ').trim()
  if (!text) throw new Error('Gemini (web search) returned no content')
  return text
}

/**
 * Fast, single-call analysis used for the free instant result shown on the site.
 * Cheap enough to run on an anonymous URL paste (still rate-limited at the route level).
 */
export async function quickAnalyze({ url, pageText, hasJsonLd }) {
  const prompt = `You are an AI-discoverability auditor for industrial/B2B distributor product pages.
Analyze the following scraped product page text and score it against five checks that determine whether
AI shopping assistants (ChatGPT, Claude, Gemini, Perplexity) can find, understand and recommend it.

URL: ${url}
Page has a JSON-LD structured data block: ${hasJsonLd}

PAGE TEXT (truncated):
"""
${pageText}
"""

Return strict JSON with this exact shape:
{
  "productName": string,          // best-guess product name/title found on the page
  "brandStated": boolean,         // is a manufacturer/brand name clearly present?
  "specsCount": number,           // rough count of distinct technical specs/attributes visible
  "priceVisible": boolean,
  "stockVisible": boolean,
  "hasApplicationCopy": boolean,  // does the page explain what the product is used for / who it's for?
  "hasStructuredData": boolean,   // same as the JSON-LD flag passed in, echoed back
  "score": number,                // 0-100 AI-readiness score, weighted across the five checks above
  "topGaps": string[],            // 3-5 short, concrete gap statements, most important first
  "headline": string,             // one sentence a distributor owner would understand, e.g. "3 of 5 AI-readiness checks failed"
  "brandName": string,            // the manufacturer/brand as the page writes it, "" if the page names none
  "brandEvidence": string,        // a short phrase COPIED EXACTLY from the page text where that brand is named, "" if none
  "applicationEvidence": string,  // one sentence (max 200 chars) COPIED EXACTLY from the page text that says what the product is used for, "" if none
  "specFields": [ { "label": string, "value": string } ]  // every labelled specification you can find in the page text — including inside specification / details sections — copied exactly (max 25); [] if none
}
Copy text exactly as written on the page — never paraphrase or invent. Anything you return in brandEvidence,
applicationEvidence or specFields is checked against the page text, and is discarded if it does not appear there.`

  return callGemini(prompt)
}

// Kept in sync with the REVENUE_BRACKETS options on the lead form (src/components/LeadFormModal.jsx).
const REVENUE_BRACKETS = {
  under_5m: { label: 'Under $5M', mid: 2500000 },
  '5m_25m': { label: '$5M – $25M', mid: 15000000 },
  '25m_100m': { label: '$25M – $100M', mid: 62500000 },
  over_100m: { label: '$100M+', mid: 150000000 },
}

/**
 * Estimates the prospect's approximate annual revenue from public signals on their own
 * homepage (industry, footprint, product range, years in business, etc.) — never a
 * verified figure, but disclosed the same way the reference report discloses its
 * assumptions ("conservative assumptions are stated for each figure"). Always expressed
 * as one of the same four ranges offered on the lead form, rather than a single point
 * figure — and if the prospect picked one on the form, that answer is used directly.
 */
export async function estimateRevenueAndRisk({ companyName, homepageText, productCategory, revenueBracket }) {
  const selfReported = REVENUE_BRACKETS[revenueBracket]
  const bracketList = Object.values(REVENUE_BRACKETS).map((b) => b.label).join(', ')

  const prompt = `You are a B2B research analyst estimating a company's rough annual revenue from public
signals only — the kind of estimate a sales rep does before a call, not audited financial data.
Be conservative and explicit about your reasoning. Always express the revenue as ONE of these four ranges,
never a single point figure: ${bracketList}.
${selfReported
    ? `The company selected this revenue range themselves on our intake form: "${selfReported.label}". Use it directly as the confirmed range rather than re-guessing from the homepage.`
    : `The company did not disclose a revenue range, so classify them into the single most likely one of the four ranges above using signals on their homepage (industry, footprint, product range, years in business, etc.). If the homepage gives you almost nothing to work with, pick the widest/most conservative range you can defend and say so plainly.`}

COMPANY: ${companyName}
PRODUCT CATEGORY THEY SELL: ${productCategory || 'unknown'}

COMPANY HOMEPAGE TEXT (truncated):
"""
${homepageText || '(homepage could not be read)'}
"""

Return strict JSON with this exact shape:
{
  "confidence": "low" | "medium" | "high",
  "revenueDisplay": string,                    // exactly one of: ${bracketList}
  "estimatedAnnualRevenueUSD": number,         // the midpoint of the chosen range, used only for the arithmetic below
  "revenueBasis": string,                      // 1-2 sentences: what signals (or the self-reported answer) led to this range
  "newBuyerRiskUSD": number,                   // conservative estimate: estimatedAnnualRevenueUSD * 0.15 (new-customer share) * 0.3 (share now AI-first) — show your arithmetic in newBuyerExplanation
  "newBuyerExplanation": string,
  "existingAccountRiskUSD": number,            // conservative estimate: estimatedAnnualRevenueUSD * 0.85 (existing-book share) * 0.10 (annual buyer turnover) * 0.25 (share lost to re-decision)
  "existingAccountExplanation": string,
  "totalRiskUSD": number                       // newBuyerRiskUSD + existingAccountRiskUSD
}`

  const result = await callGemini(prompt)
  result.selfReported = Boolean(selfReported)
  if (selfReported) {
    // Guaranteed correct regardless of how the model formats it — the client told us this directly.
    result.revenueDisplay = selfReported.label
    result.estimatedAnnualRevenueUSD = selfReported.mid
    result.confidence = 'high'
  }
  return result
}

/** Extractive only: lists competing brand/product names actually mentioned across an engine's real answers. */
export async function extractDominantPeers({ engine, texts, companyName }) {
  const joined = (texts || []).filter(Boolean).join('\n---\n').slice(0, 6000)
  if (!joined.trim()) return []
  const prompt = `Below are real answers an AI assistant (${engine}) gave to buyer questions about a product category.
List only the distinct competing brand or product names actually mentioned in this text — do not add any not present.
Exclude "${companyName}" itself. Return strict JSON: { "peers": string[] } with at most 5 names, most-frequent first.
If nothing is mentioned, return { "peers": [] }.

ANSWERS:
"""
${joined}
"""`
  try {
    const result = await callGemini(prompt)
    return Array.isArray(result?.peers) ? result.peers.slice(0, 5) : []
  } catch {
    return []
  }
}

/**
 * The "report writer" for the full audit PDF. Every number it's given (scores, gap list,
 * before/after fields, live-audit outcomes) was computed elsewhere from real signals —
 * this call's job is to write the narrative *around* those facts, not invent new ones.
 */
export async function synthesizeAuditReport({ url, company, brandName, productName, quickScan, gaps, beforeAfter, scores, engineSummaries, revenue }) {
  const prompt = `You are writing an internal AI-discoverability audit for AltiusNxt's client-facing report.
Every fact below is real, already measured — your job is ONLY to write clear, specific narrative text that
accurately reflects these facts. Never invent a specification, certification, number or competitor name that
isn't given to you here. If a fact isn't provided, describe the gap generically rather than guessing specifics.

PRODUCT: ${productName} (manufacturer brand: ${brandName || 'not stated on the page'})
URL: ${url}
DISTRIBUTOR / CLIENT: ${company}

MEASURED SIGNALS: ${JSON.stringify(quickScan)}
GAPS ALREADY IDENTIFIED: ${JSON.stringify(gaps)}
BEFORE / AFTER ENRICHMENT MOCKUP: ${JSON.stringify(beforeAfter)}
COMPUTED SCORES (0-100): ${JSON.stringify(scores)}
LIVE ENGINE AUDIT SUMMARY (real, per engine): ${JSON.stringify(engineSummaries)}
${revenue ? `ESTIMATED REVENUE CONTEXT: ${JSON.stringify(revenue)}` : ''}

Return strict JSON with this exact shape:
{
  "executiveFinding": string,   // 3-4 sentence executive summary opening the report, grounded only in the facts above
  "scorecard": [                // exactly 15 rows, grouped by the 3 pillars below (5 each), in this order
    { "pillar": "find"|"understand"|"recommend", "ref": string, "metric": string, "finding": string, "status": "PASS"|"FAIL"|"CRIT_FAIL" }
  ],
  "remediationPriorities": [     // exactly 3, ordered by impact
    { "title": string, "impact": "CRITICAL"|"HIGH"|"MEDIUM", "effort": "Low"|"Medium"|"High", "owner": string, "deficiency": string, "remediation": string }
  ],
  "remediatedCopy": string       // one rich paragraph of natural-language product copy using ONLY the specs present in beforeAfter.after — this is what a rewritten page description would say
}

For the 15-row scorecard, cover (in order): pillar "find" — crawler access, URL/taxonomy structure, structured data (JSON-LD), identifier resolution (brand/MPN), search/citation visibility; pillar "understand" — attribute completeness, unit/spec normalization, taxonomy depth, description depth, related/sibling linking; pillar "recommend" — manufacturer brand identity, commercial signals (price/stock), buyer-question coverage, live answer engine outcome, overall recommendation readiness.`

  return callGemini(prompt)
}

/**
 * Deeper analysis run once a lead submits their contact details.
 * Generates the technician-question set (queried live against real engines separately,
 * in liveAudit.js) plus the page-level gap analysis and before/after mockup, which remain
 * AltiusNxt's own assessment of the scraped page.
 */
export async function deepAnalyze({ url, pageText, quickScan }) {
  const prompt = `You are an AI-discoverability consultant preparing an internal sales-prep report for AltiusNxt
about a prospect's product page. This report will be reviewed by a human (Govind) before anything is sent
to the prospect, so be analytically honest — do not invent specific competitor product names you are not
reasonably confident exist, and do not fabricate dollar figures.

URL: ${url}
Prior quick-scan result: ${JSON.stringify(quickScan)}

PAGE TEXT (truncated):
"""
${pageText}
"""

Return strict JSON with this exact shape:
{
  "productCategory": string,        // e.g. "HVAC digital multimeter"
  "technicianQuestions": [          // exactly 6 realistic buyer/technician search questions for this product category — keep this list short, quality over quantity
    { "question": string }
  ],
  "gaps": [                         // the 5-gap framework, tailored to what was actually found on this page
    { "title": string, "detail": string }
  ],
  "beforeAfter": {
    "before": { "title": string, "brand": string, "price": string, "stock": string, "specCount": number, "hasDatasheet": boolean, "hasStructuredData": boolean },
    "after":  { "title": string, "brand": string, "price": string, "stock": string, "specCount": number, "hasDatasheet": boolean, "hasStructuredData": boolean, "sampleSpecs": string[] }
  },
  "recommendationSummary": string   // 2-3 sentence plain-English summary for the sales rep to open the follow-up call with
}`

  return callGemini(prompt)
}

/**
 * Picks the single weakest-but-still-identifiable product page from a shortlist the crawler
 * already narrowed down by cheap heuristics, and extracts the manufacturer identity needed to
 * find real competitors selling the identical item (brand + model/part code). "Identifiable"
 * matters more than "weakest" here — a page with zero specs AND no brand clue is useless for
 * the rest of the pipeline, since there's nothing to benchmark it against.
 */
export async function selectWeakProductAndIdentity({ shortlist, excludeIndexes = [] }) {
  const eligible = shortlist.map((c, i) => ({ ...c, originalIndex: i })).filter((c) => !excludeIndexes.includes(c.originalIndex))
  if (eligible.length === 0) {
    return { identifiable: false, reasoning: 'No remaining candidates in the shortlist.' }
  }

  const candidateBlocks = eligible
    .map((c, i) => `CANDIDATE ${i + 1}\nURL: ${c.url}\nPAGE TEXT (truncated):\n"""\n${c.text.slice(0, 2500)}\n"""`)
    .join('\n\n')

  const prompt = `You are selecting a product page on a prospect's website for an AltiusNxt outreach report. These
candidates were already pre-filtered as thin (few visible specs) by cheap heuristics. Your job has two
requirements, and the SECOND one is a hard constraint, not a preference:

1. Prefer the thinnest page — fewest visible specs, no real description, abbreviated title.
2. It MUST be specific enough that a buyer could search for it and find the same real item on other sellers'
   sites — a real manufacturer plus either a literal model/part code OR a specific enough variant description
   (material, size, point type, color, pack count) that it identifies one real product, not a whole category.
   This is a hard constraint, not a preference: a house brand or generic/unbranded item with nothing distinguishing
   it from any other similar product does NOT qualify, even if it is the thinnest page, because there is nothing
   to benchmark it against real competitors.

   Two worked examples of the distinction:
   - NOT identifiable: a "Tape Dispenser Packaging Gun" page with no brand stated. "Packaging Gun" just restates
     the product category from the title — it doesn't point to one findable real product.
   - IS identifiable: a "Cross Ballpoint Pen Refill, Fine, Black" page, even with no literal part number printed.
     "Cross" is a real manufacturer, and "ballpoint / fine / black" is specific enough that the identical item is
     findable and price-comparable on other retailers' sites. Use the variant description as manufacturerCode when
     there's no literal part number, rather than leaving it blank or inventing a fake one.

   If NONE of the candidates clear this bar, say so honestly — do not force it onto whichever is thinnest.

${candidateBlocks}

Return strict JSON with this exact shape:
{
  "identifiable": boolean,              // true only if you are genuinely confident in a real manufacturer + code below
  "selectedIndex": number,              // 1-based index into the candidates above (only meaningful if identifiable is true)
  "confidence": "low" | "medium" | "high",
  "productName": string,
  "manufacturerBrand": string,          // a REAL manufacturer name you're confident exists, or "" if none
  "manufacturerCode": string,           // a REAL alphanumeric model/part number (e.g. "1002", "ZD421"), or "" if none — never invent one from descriptive title words
  "category": string,
  "unitOfSale": string,
  "attributes": string[],               // 3-5 short distinguishing attributes actually stated on the page (e.g. "2-ply",
                                          // "700 sheets", "bore 40mm") — used to build real category search queries later
  "reasoning": string                   // 1-2 sentences, including why you're confident this is a real identifiable product (or why none qualified)
}`

  const result = await callGemini(prompt)
  if (process.env.DEBUG_OUTREACH) console.error('[debug selectWeakProductAndIdentity raw]', JSON.stringify(result))
  // Trust the model's own identifiable verdict (the prompt above does the real work of teaching
  // the distinction) — only guard against the self-contradictory case of claiming identifiable
  // while leaving the brand or code empty.
  const hasIdentity = Boolean(result?.manufacturerBrand?.trim() && result?.manufacturerCode?.trim())
  if (!result?.identifiable || !hasIdentity) {
    return { identifiable: false, reasoning: result?.reasoning || 'No candidate had a verifiable manufacturer code.' }
  }

  const index = Number(result.selectedIndex) - 1
  const selected = eligible[index]
  if (!selected) throw new Error('Gemini selected an out-of-range candidate index')
  return { ...result, identifiable: true, originalIndex: selected.originalIndex, url: selected.url, pageText: selected.text }
}

/**
 * Extracts product identity from a single, already-chosen page (the self-serve flow, where the
 * visitor submitted this exact URL themselves) — unlike selectWeakProductAndIdentity, there's no
 * candidate to reject in favor of another; this always returns its best-effort read, honestly
 * leaving manufacturerBrand/manufacturerCode empty when genuinely not determinable rather than
 * inventing one, since downstream steps already degrade gracefully on an empty value.
 */
export async function extractProductIdentityFromPage({ url, pageText, jsonLd = '' }) {
  // The page's own schema.org blocks (when it has any) state brand / mpn / sku in machine-readable
  // form, so they are shown alongside the text. Trimmed so a huge block can't crowd out the page.
  const ldBlock = String(jsonLd || '').trim().slice(0, 3000)
  const prompt = `You are extracting product identity from a single product page an AI-discoverability report will be built around.

URL: ${url}
PAGE TEXT (truncated):
"""
${pageText.slice(0, 4000)}
"""
JSON-LD / SCHEMA.ORG BLOCKS FOUND ON THE PAGE:
"""
${ldBlock || 'none'}
"""
Use the JSON-LD as evidence for brand / part number, but it can be wrong (a store often puts its OWN name in "brand"
and its own stock number in "sku"). If the schema "brand" names the reseller rather than the real manufacturer, say so
in "schemaConflicts".

IMPORTANT — the seller's own internal SKU/item number is NOT the manufacturer code, even though it often appears
right next to it on the page. Pick the identifier that matches the MANUFACTURER's own part-numbering convention
(e.g. matches patterns you recognize for that brand, appears directly beside the brand name, or is reused across
multiple different sellers listing the same item) — not the seller's internal stock/item code, which is usually a
longer, store-specific alphanumeric string with no relation to the brand (e.g. a URL path segment literally labeled
"item" or similar). The URL path often has both: prefer the one adjacent to the brand name over the one adjacent to
words like "item".

CRITICAL — this page itself must BE one product's dedicated page, not a homepage, category/collection listing, or
search results page that merely mentions, features, or links to a product (e.g. a hero banner, a "best seller" card,
a "shop by brand" tile). If the PAGE TEXT reads like a homepage/listing — multiple distinct products, navigation
categories, store-wide promos ("free shipping over $X"), rather than one product's own description/specs/price —
set "isHomepageOrListing": true and leave the other fields as your best guess only; do not pick one featured product
and report it as if this were that product's own page.

Return strict JSON with this exact shape:
{
  "isHomepageOrListing": boolean,       // true if this page is a homepage/category/listing, not one product's own page
  "productName": string,                // a clear, searchable product name/title from the page
  "manufacturerBrand": string,          // the real manufacturer brand if stated or confidently inferable, else ""
  "manufacturerCode": string,           // the manufacturer's OWN model/part number (not the seller's internal SKU) OR a
                                          // specific enough variant description (material, size, color, pack count) that
                                          // identifies this one product among competitors, else ""
  "category": string,                   // e.g. "digital multimeter", "toilet tissue carton"
  "unitOfSale": string,                 // e.g. "carton of 48 rolls", "single unit" — best guess from the page text
  "attributes": string[]                // 3-5 short distinguishing attributes actually stated on the page or in the
                                          // title (e.g. "2-ply", "700 sheets", "individually wrapped", "bore 40mm") —
                                          // these drive category-level search queries, so pick ones a real buyer
                                          // would search by, not generic marketing words. [] if none are stated.
  "schemaConflicts": string[]           // each place the JSON-LD contradicts the page or the real manufacturer (e.g. brand
                                          // names the reseller); [] if there is no JSON-LD or no conflict
}
Be honest about manufacturerBrand/manufacturerCode — leave either "" rather than guessing if the page genuinely doesn't support it.`

  return callGemini(prompt)
}

/**
 * Lists the checkable factual claims a product page makes about the product itself (features,
 * specifications, compatibility, certifications, what's in the box), quoted as the page words
 * them, so the cross-engine research can verify each against the manufacturer's documentation.
 * Every claim must actually appear in the page text — a claim the model can't be matched back to
 * the page is dropped, so nothing is verified (or called false) that the page never said.
 */
export async function extractListingClaims({ url, pageText }) {
  const text = String(pageText || '').slice(0, 5000)
  if (text.trim().length < 80) return []

  const prompt = `You are listing the factual claims a product listing makes about the product itself, so each one can be
checked against the manufacturer's own documentation.

URL: ${url}
PAGE TEXT:
"""
${text}
"""

List up to 6 specific, checkable claims the page makes — technical features and feature names, specifications,
compatibility (battery system, standards, fittings), certifications, what is included in the box, warranty, origin.
Prefer claims a buyer would rely on and that could be wrong or copied from a different variant (motor type, protection
features, compatibility). Exclude price, shipping, store policies and vague marketing ("high quality", "best value").
Copy each claim from the page text in the page's own words (at most 200 characters, no paraphrase).

Return strict JSON: { "claims": [ string ] }. Return { "claims": [] } if the page makes no checkable claims.`

  try {
    const result = await callGemini(prompt)
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const pageNorm = norm(text)
    const seen = new Set()
    return (Array.isArray(result?.claims) ? result.claims : [])
      .map((c) => String(c || '').trim().replace(/\s+/g, ' ').slice(0, 220))
      .filter((c) => c.length >= 12)
      // Must trace back to the page: the claim's opening words appear in the page text.
      .filter((c) => pageNorm.includes(norm(c).split(' ').slice(0, 5).join(' ')))
      .filter((c) => !seen.has(norm(c)) && seen.add(norm(c)))
      .slice(0, 6)
  } catch (err) {
    console.warn(`[outreach] listing-claim extraction failed: ${err.message}`)
    return []
  }
}

/** The prompt for the buyer-query step, kept separate so its exact wording can be checked in tests. */
export function buildQueriesPrompt({ productName, manufacturerBrand, manufacturerCode, category, location, attributes, country, avoid = [], region }) {
  const attrList = (attributes || []).filter(Boolean)
  // Present only when the region is known with confidence; otherwise the prompt is unchanged.
  const buyerRegion = regionBuyerClause(region)
  return `You are drafting buyer search queries for an AI-discoverability audit of a specific product.

PRODUCT: ${productName}
MANUFACTURER BRAND: ${manufacturerBrand || 'unknown'}
MANUFACTURER CODE: ${manufacturerCode || 'unknown'}
CATEGORY: ${category}
DISTINGUISHING ATTRIBUTES (actually stated on the page): ${attrList.length ? attrList.join(', ') : 'none given'}
BUYER COUNTRY / MARKET: ${country || 'unknown'}
BUYER LOCATION: ${location || 'unknown'}
${buyerRegion ? `${buyerRegion}
` : ''}
Phrase every query the way a real buyer in ${country || 'the prospect\'s market'} types it — local spelling, local
terms, and the country name where a buyer there would naturally add it (e.g. "... price South Africa"). Never name the
seller's own store or website${avoid.length ? ` (${avoid.map((n) => `"${n}"`).join(', ')})` : ''}.

Write exactly 4 "named" queries (name the brand/model/product) covering these distinct intents, one each:
1. The exact product, as a buyer would type it, with price intent ("<product> price <country>")
2. Specifications confirmation ("<product> specifications <key attribute> <country>?")
3. Where to buy ("Where to buy <product> <country>?")
4. Cheapest / lowest price ("Cheapest <product> for sale <country>?")

Write exactly 2 "category" queries that do NOT name the brand or model at all — build these FROM THE DISTINGUISHING
ATTRIBUTES above, phrased around a real buying SITUATION a buyer would actually type, not just the attributes
concatenated. Prefer naming a plausible end-use or application when the category supports one (e.g. for a bearing:
"ball bearing, 7/8 OD x 5/16 bore, for an electric motor" or "bulk sealed ball bearings for electric motor
manufacturing" rather than just "2RS sealed ball bearing OD 0.875"). If no attributes were given, fall back to the
category name plus a buyer qualifier (location, bulk/volume, a typical use case) — never just the bare category name
alone, and never a query that's just the brand/code rephrased.

Every query must be genuinely distinct in intent from every other query in its list — no near-duplicates (e.g.
"buy X" and "where to buy X" count as the same intent; only include one).

Make the second category query a local supplier / dealer search for this category in ${country || 'the buyer\'s market'}
(e.g. "<category> supplier <city or country>, <brand> dealer?") — the one exception allowed to name the brand, as a
dealer search, but never the model or code. Locate it at the level a buyer would type — the country, the state, or the
nearest major city — never at suburb or street level, because a query that names the seller's own suburb mostly
returns the seller and says nothing about how AI treats it among competitors.${region?.city && buyerRegion ? ` The buyer region's city is ${region.city}: use it, or the state or country, to locate that query.` : ''}

Return strict JSON with this exact shape:
{ "named": string[], "category": string[] }
Exactly 4 named, exactly 2 category. Keep each query realistic and short, the way someone actually types it.`
}

/**
 * Generates the buyer-style query set for the live multi-engine audit: a majority naming the
 * product/brand directly, a few broader category searches that don't name it at all — mirroring
 * how real buyers search, split the same way the report tables split them.
 */
export async function buildOutreachQueries({ productName, manufacturerBrand, manufacturerCode, category, location, attributes, country, avoidNames = [], region }) {
  // The seller's own name / domain must never appear in a buyer query (it would just return the
  // seller). The prompt is told which names; the result is also checked in code afterwards.
  const avoid = [...new Set((avoidNames || []).map((n) => String(n || '').trim()).filter((n) => n.length >= 3))]
  const mentionsAvoided = (q) => {
    const flat = String(q).toLowerCase().replace(/[^a-z0-9]/g, '')
    return avoid.some((n) => {
      const key = n.toLowerCase().replace(/[^a-z0-9]/g, '')
      return key.length >= 5 && flat.includes(key)
    })
  }
  const prompt = buildQueriesPrompt({ productName, manufacturerBrand, manufacturerCode, category, location, attributes, country, avoid, region })

  const result = await callGemini(prompt)
  // A query that names the seller is dropped (it would only return the seller). Never padded with
  // invented queries: a shorter list is reported as it is.
  const clean = (list) => (Array.isArray(list) ? list.filter((q) => typeof q === 'string' && q.trim() && !mentionsAvoided(q)) : [])
  return { ...result, named: clean(result?.named), category: clean(result?.category) }
}

/**
 * Extractive only: lists real seller/company names mentioned across merged live-search answers
 * for one query, plus any prices mentioned alongside them — the price data lets the pipeline
 * compute a real "at $X, you'd have ranked Nth in this specific answer" footnote in code, rather
 * than asking the model to do that arithmetic itself.
 */
export async function extractCitedSellers({ texts, prospectCompany, prospectDomain }) {
  const joined = (texts || []).filter(Boolean).join('\n---\n').slice(0, 6000)
  if (!joined.trim()) return { sellers: [], prospectCited: false, sellerPrices: [] }

  const prompt = `Below are real, live-web-search-grounded answers from AI assistants responding to a buyer query.
List only the distinct real seller/retailer/company names actually mentioned in this text — do not add any not present,
and do not include generic terms like "online retailers" or "Amazon" unless literally named. Treat near-duplicate
names of the same business as ONE seller and list it once (e.g. "The Big Bearing Store" and "TheBigBearingStore.com").
Also say whether "${prospectCompany}"${prospectDomain ? ` (domain: ${prospectDomain})` : ''} is mentioned anywhere in this text — report
that only through "prospectCited", never inside "sellers" or "sellerPrices".
Separately, list any seller+price pairs where a specific price is actually stated for that seller in this text.

ANSWERS:
"""
${joined}
"""

Return strict JSON: { "sellers": string[], "prospectCited": boolean, "prospectCitedPrice": string, "sellerPrices": [ { "seller": string, "price": string } ] }.
List at most 8 sellers, most-frequently-mentioned first. "price" is just currency symbol + number (e.g. "$67.00").
"prospectCitedPrice" is the price this text states for "${prospectCompany}" itself, "" if none is stated.
"sellerPrices" only includes sellers where this specific text states a price — it's fine for this to be empty or
shorter than "sellers".`

  try {
    const result = await callGemini(prompt)
    return {
      sellers: Array.isArray(result?.sellers) ? result.sellers.slice(0, 8) : [],
      prospectCited: Boolean(result?.prospectCited),
      prospectCitedPrice: typeof result?.prospectCitedPrice === 'string' ? result.prospectCitedPrice.trim() : '',
      sellerPrices: Array.isArray(result?.sellerPrices) ? result.sellerPrices : [],
    }
  } catch {
    return { sellers: [], prospectCited: false, prospectCitedPrice: '', sellerPrices: [] }
  }
}

/**
 * Extracts a structured seller/price list from a free-text web-search-grounded answer (e.g. from
 * askGeminiTextWithSearch). Purely extractive — every seller/price pair must already be present
 * in the text; this never estimates or invents a price.
 */
export async function extractSellerPrices({ text, excludeCompany, country, region }) {
  if (!text?.trim()) return { sellers: [] }
  // Only when the region is known with confidence; otherwise the prompt is unchanged.
  const sellerRegion = regionSellerClause(region)

  const prompt = `Below is a real, live-web-search-grounded answer listing sellers of a specific product and their prices.
Extract every distinct real seller/retailer name mentioned together with a specific price for this product. Treat
near-duplicate names as the SAME seller (e.g. "Amazon" and "Amazon.com" and "amazon.com.au" are one seller — keep
only one entry, its lowest/clearest price).
Only include a seller if an actual price is given for it — skip any mentioned without a price.
${excludeCompany ? `Exclude "${excludeCompany}" from this list even if mentioned.` : ''}
${sellerRegion ? `${sellerRegion}
` : ''}
TEXT:
"""
${text}
"""

Return strict JSON: { "sellers": [ { "seller": string, "price": string, "unit": string, "inStock": boolean | null, "configuration": string${country ? ', "inRegion": boolean | null' : ''}${sellerRegion ? ', "currency": string' : ''} } ] }.${country ? `
- "inRegion" is true if the text shows this seller sells to buyers in ${country} (a ${country} store, domain or
  local-currency price), false if it is clearly based in / selling to a different country, null if the text doesn't say.` : ''}
- "price" must be ONLY the currency symbol and number (e.g. "$72.95" or "A$67.00") — never append notes like
  "(excluding tax)" or "(sign-in price)" to it. If a seller gives both an including-tax and excluding-tax price,
  use the including-tax one. If a price range is given, use the lower number.
- "unit" is what that price buys, exactly as stated or clearly implied by the text (e.g. "each", "carton of 48",
  "box of 10", "per 100") — "" if genuinely not stated.
- "inStock" is false ONLY if the text says that seller's listing is sold out, out of stock, discontinued,
  unavailable or backordered; true if it says in stock / available; null if the text doesn't say.
- "configuration" is the exact variant / part number / bundle the price is for, as stated ("" if not stated).${sellerRegion ? `
- "currency" is the ISO code of the currency that seller's price is in (e.g. "NZD"), "" if the text doesn't say.` : ''}
List at most 14 distinct sellers, cheapest first if determinable.`

  try {
    const result = await callGemini(prompt)
    return { sellers: Array.isArray(result?.sellers) ? result.sellers.slice(0, 14) : [] }
  } catch {
    return { sellers: [] }
  }
}

/**
 * Relevance gate: an LLM that read "Browning" results can easily surface Browning Safes or an
 * unrelated retailer alongside genuine Browning power-transmission sellers. This asks, per
 * candidate, whether it's actually the same brand AND product line — not just a name match —
 * and drops anything that fails. Fails open (keeps everything) on a parse error, since a missed
 * false-positive is a smaller problem than silently dropping all competitor data.
 */
export async function filterRelevantSellers({ sellers, productName, manufacturerBrand, manufacturerCode, category }) {
  if (!sellers?.length) return []
  const prompt = `You are checking whether each candidate seller genuinely sells the SAME product, not just a
brand-name match. The product being benchmarked is: "${productName}" — brand "${manufacturerBrand || 'unknown'}",
${manufacturerCode ? `model / part number "${manufacturerCode}", ` : ''}category "${category || 'unknown'}".

CANDIDATES (seller — price (unit) [the configuration / part number that price is for]):
${sellers.map((s, i) => `${i + 1}. ${s.seller} — ${s.price}${s.unit ? ` (${s.unit})` : ''}${s.configuration ? ` [${s.configuration}]` : ''}`).join('\n')}

A candidate FAILS if it's clearly a different product line from the same manufacturer (e.g. "Browning Safes" when
the product is a Browning power-transmission part), a different brand that merely shares a word, an obviously
unrelated business, or — when its configuration is stated — a clearly different model, size or specification of the
product (a pack or quantity difference alone is NOT a different product: the price is compared per item later).
A candidate PASSES if there's no clear reason to doubt it's the same product.

Return strict JSON: { "keepIndexes": number[] } — the 1-based indexes of candidates above that PASS.`

  try {
    const result = await callGemini(prompt)
    const keep = new Set(Array.isArray(result?.keepIndexes) ? result.keepIndexes : [])
    if (keep.size === 0) return sellers // treat an empty/malformed result as "couldn't determine" — fail open
    return sellers.filter((_, i) => keep.has(i + 1))
  } catch {
    return sellers
  }
}

/**
 * Writes the "gaps" section from a list of gap rules that ALREADY fired against real measured
 * evidence (computed in outreachPipeline.js's computeGapEvidence — see that function for the
 * rules). This function only phrases each fired gap into a title/detail using its own evidence;
 * it never decides whether a gap exists, so the written text can't contradict the deterministic
 * numbers shown elsewhere in the report (e.g. the spec-depth chart) the way free-form generation
 * could. If no rules fired, returns an empty gaps array rather than inventing filler.
 */
export async function analyzeOutreachGaps({ company, productName, manufacturerCode, firedGaps, strengthFacts }) {
  if (!firedGaps?.length) {
    return { gaps: [], strengths: await writeStrengths({ company, productName, strengthFacts }) }
  }

  const prompt = `You are writing the "gaps on this page" section of an AltiusNxt outreach report. Each gap below
ALREADY fired against real measured evidence — your only job is to phrase it as a specific, concrete finding using
ONLY the evidence given for that gap. Do not add any claim not supported by its evidence object. Do not invent
additional gaps beyond the ones listed.
${companyNameRule(company)}
PRODUCT: ${productName}
MANUFACTURER CODE: ${manufacturerCode || 'not stated on the page'}

FIRED GAPS (phrase every one of these, in this order):
${firedGaps.map((g, i) => `${i + 1}. rule "${g.ruleId}" — evidence: ${JSON.stringify(g.evidence)}`).join('\n')}

Return strict JSON with this exact shape:
{
  "gaps": [                  // exactly ${firedGaps.length}, same order as above
    { "title": string, "detail": string }
  ]
}`

  const { gaps } = await callGemini(prompt)
  return { gaps: Array.isArray(gaps) ? gaps : [], strengths: await writeStrengths({ company, productName, strengthFacts }) }
}

// The report is addressed to the store that owns the page — the manufacturer/brand of the product
// is a different business and must never be presented as the customer.
function companyNameRule(company) {
  if (!company) return ''
  return `
SELLER (the business that owns this page and receives this report): ${company}
When you refer to the seller, use exactly "${company}" — never the product's manufacturer or brand, which is a
different business. Name "${company}" at most once per item, and never repeat it back to back.
`
}

async function writeStrengths({ company, productName, strengthFacts }) {
  if (!strengthFacts || Object.values(strengthFacts).every((v) => !v)) {
    return 'Other factors also influence which sellers AI cites, including product-level reviews, brand recognition and overall site authority — this page was not evaluated on any of those beyond what is noted elsewhere in this report.'
  }
  const prompt = `Write 2-3 sentences on what a product page already does well, using ONLY these real measured facts —
do not add anything not given. End with one sentence noting other factors (reviews, brand recognition, site
authority) also influence AI citation.
${companyNameRule(company)}
PRODUCT: ${productName}
FACTS: ${JSON.stringify(strengthFacts)}

Return strict JSON: { "strengths": string }`
  try {
    const result = await callGemini(prompt)
    return result?.strengths || ''
  } catch {
    return ''
  }
}

/**
 * Finds the manufacturer's own published specs for this exact product via live web search, then
 * extracts them into a structured label/value list — used to build a real enriched spec table and
 * mock-up (not plausible-sounding placeholders) for the before/after section. Returns [] if the
 * manufacturer page can't be found or nothing is confidently extractable — the caller falls back
 * to the specs already visible on the prospect's own page rather than inventing any.
 */
export async function findManufacturerSpecs({ manufacturerBrand, manufacturerCode, productName, category }) {
  if (!manufacturerBrand && !manufacturerCode) return []
  const query = [manufacturerBrand, manufacturerCode, productName].filter(Boolean).join(' ')
  const searchPrompt = `Find the manufacturer's own official product page for "${query}" (category: ${category || 'unknown'}).
List its published technical specifications as plain sentences — dimensions, capacity, material, ratings, certifications,
whatever the manufacturer itself states. Only include specs you actually find stated; do not estimate or infer typical
values for this category.`

  let searchText = ''
  try {
    searchText = await askGeminiTextWithSearch(searchPrompt)
  } catch {
    return []
  }
  if (!searchText?.trim()) return []

  const extractPrompt = `Extract manufacturer-published specifications from this text into label/value pairs.
Only include specs explicitly stated in the text — never infer or estimate a value.

TEXT:
"""
${searchText}
"""

Return strict JSON: { "specs": [ { "label": string, "value": string } ] }. At most 10, most important first.`

  try {
    const result = await callGemini(extractPrompt)
    return Array.isArray(result?.specs) ? result.specs.slice(0, 10) : []
  } catch {
    return []
  }
}

/**
 * Checks whether the manufacturer sells a different product in the same line with a code close
 * enough to this one to cause buyer/AI confusion (e.g. 1002 vs 7004 in the same range) — a real,
 * named risk, not a generic "make sure your code is clear" gap. Web-search-grounded so the
 * sibling code is a real product, never invented. Returns no-risk on any failure or when nothing
 * concrete is found — this gap should never fire from a guess.
 */
export async function checkSiblingCodeRisk({ manufacturerBrand, manufacturerCode, productName, category }) {
  if (!manufacturerBrand || !manufacturerCode) return { hasSiblingRisk: false, siblingCode: '', note: '' }

  const searchPrompt = `Does manufacturer "${manufacturerBrand}" sell a DIFFERENT product in the same line/category
(${category || 'unknown category'}) as "${productName}" (code ${manufacturerCode}), whose own model/part code is close
enough in spelling or numbering to "${manufacturerCode}" that a buyer or an AI assistant could easily confuse the two
(e.g. transposed digits, one differing digit, a "/A" "/B" variant suffix)? Only answer yes if you can name that
specific other product and its specific code — do not guess or generalize.`

  let searchText = ''
  try {
    searchText = await askGeminiTextWithSearch(searchPrompt)
  } catch {
    return { hasSiblingRisk: false, siblingCode: '', note: '' }
  }
  if (!searchText?.trim()) return { hasSiblingRisk: false, siblingCode: '', note: '' }

  const extractPrompt = `From this research text, determine if it names a REAL, SPECIFIC sibling product code (not
"${manufacturerCode}" itself) close enough to cause confusion.

TEXT:
"""
${searchText}
"""

Return strict JSON: { "hasSiblingRisk": boolean, "siblingCode": string, "siblingProductName": string }.
Only set hasSiblingRisk true if siblingCode is a real, specific code actually named in the text — "" otherwise.`

  try {
    const result = await callGemini(extractPrompt)
    if (!result?.hasSiblingRisk || !result?.siblingCode?.trim()) return { hasSiblingRisk: false, siblingCode: '', note: '' }
    return {
      hasSiblingRisk: true,
      siblingCode: result.siblingCode.trim(),
      note: result.siblingProductName ? String(result.siblingProductName).trim() : '',
    }
  } catch {
    return { hasSiblingRisk: false, siblingCode: '', note: '' }
  }
}
