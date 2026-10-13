import { callOpenAIWithSearch, callClaudeWithSearch, withTransientRetry, isUsageCapError } from './liveEngines.js'
import { askGeminiTextWithSearch, callGemini } from './gemini.js'
import { isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured } from '../config.js'
import { regionSellerClause, userLocationFor, regionIsActive, isForeignCurrencyPrice } from './region.js'

// The one research prompt, sent identically to all three engines via their real web-search APIs
// — this is deliberately a single, open-ended ask rather than a chain of narrow extraction
// calls. A narrow "extract JSON: {mpn, sellers}" prompt gets a narrow answer; this gets each
// engine's own research and reasoning, the same way a person asking it directly would, which is
// what actually produced the richer, better-grounded findings this report design depends on.
// Structured like an analyst's own research brief: the exact product, then (1) the real
// manufacturer + part number, (2) each claim the listing makes checked against the manufacturer's
// documentation, (3) same-country sellers with prices, (4) a review of the seller's actual page —
// with direct quotes demanded for each part, so the findings are evidence rather than impressions.
// Everything is built from what the page itself showed; nothing is specific to one product.
export function buildResearchPrompt({ productName, manufacturerBrand, knownCodes, sellerSku, unitOfSale, category, dimensions, price, url, country, currencyCode, claims, pageText, region }) {
  // Present only when the region is known with confidence; otherwise this prompt is unchanged.
  const sellerRegion = regionSellerClause(region)
  const codes = (knownCodes || []).filter(Boolean)
  const currency = currencyCode || 'the listing\'s currency'
  const claimList = (claims || []).filter(Boolean)
  const productLines = [
    `- Product: ${productName}`,
    category ? `- Category: ${category}` : '',
    `- Brand shown on the page: ${manufacturerBrand || 'none stated'}`,
    `- Part number shown on the page: ${codes.length ? codes.join(', ') : 'none that looks like a manufacturer part number'}`,
    sellerSku ? `- The seller's own item code: ${sellerSku} (an internal code, not necessarily the manufacturer's part number)` : '',
    unitOfSale ? `- Pack / unit of sale (as far as the page shows): ${unitOfSale}` : '',
    dimensions ? `- Attributes stated on the page: ${dimensions}` : '',
    price ? `- Listed price: ${price}` : '',
  ].filter(Boolean).join('\n')

  const part2 = claimList.length
    ? `PART 2 — Check the listing's claims against the manufacturer's own documentation. For each numbered claim, answer CONFIRMED, CONTRADICTED or NOT VERIFIABLE, and support it with a direct quote from the manufacturer's documentation or another reliable source:\n` +
      claimList.map((c, i) => `${i + 1}. "${c}"`).join('\n')
    : `PART 2 — List the key specifications a buyer needs for this product, and say which of them the listing's page text (below) states and which it leaves out. Support each with a direct quote.`

  return `I'm comparing a product listing against the manufacturer's real specifications and ${country ? `retailer prices in ${country}` : 'retailer prices'}. Please use web search for all of this.

PRODUCT (as listed by the seller):
${productLines}

PART 1 — Manufacturer and part number. Find the real manufacturer/brand and the true manufacturer part number for this exact product, checking the manufacturer's own ${country ? `${country} ` : ''}website or documentation where one exists. Quote what you find. If the number on the page is an industry-standard designation made by many brands rather than one maker's part number, say so.

${part2}

PART 3 — Sellers${country ? ` in ${country}` : ''}. Find at least 4-6 current retailers selling this exact product${country ? ` to buyers in ${country}` : ''}, with each one's listed price in ${currency}, whether it is in stock, and the exact configuration or pack size the price is for. Do not include sellers from other countries; if you cannot find enough${country ? ` in ${country}` : ''}, say how many you found rather than adding overseas retailers.${sellerRegion ? ` ${sellerRegion}` : ''}

PART 4 — The seller's own page. Open this exact page: ${url}
The text retrieved from it is below. Use it, plus anything more you can see by opening the page. Tell me what the page states, what is missing or wrong for a buyer (including any site notice, naming inconsistency or checkout problem), and whether you would be confident recommending a buyer purchase from this page — yes, no, or with caveats — and why. Do not reply that you cannot access the page; if you cannot open it, review the retrieved text.
PAGE TEXT:
"""
${String(pageText || '').slice(0, 3500)}
"""

Answer under the headings PART 1, PART 2, PART 3 and PART 4, with direct quotes and findings for each part.`
}

/**
 * Runs the single research prompt against ChatGPT, Claude and Gemini in parallel via their real
 * web-search-enabled APIs — replaces the old approach of many narrow per-field extraction calls
 * chained together. Returns each engine's raw response text (never throws per-engine; a failed
 * engine just comes back null so the other two still count) plus which engines actually ran.
 */
export async function runCrossEngineResearch(context) {
  const prompt = buildResearchPrompt(context)
  // Gemini has no location parameter: the region reaches it through the prompt text only.
  const userLocation = userLocationFor(context.region)

  const engines = []
  if (isOpenAIConfigured()) engines.push('chatgpt')
  if (isAnthropicConfigured()) engines.push('claude')
  if (isGeminiConfigured()) engines.push('gemini')

  // A transient failure (rate-limit burst, 5xx, overloaded) is retried up to three times; a real
  // usage cap or auth problem is not retried and is recorded as such, so the report can say that
  // an engine was unavailable instead of silently going without it.
  const run = (configured, call) => configured
    ? withTransientRetry(call).then((text) => ({ text })).catch((err) => ({ error: err.message, usageCap: isUsageCapError(err) }))
    : Promise.resolve(null)

  // A four-part research brief needs more room than a one-line buyer question: longer answers,
  // more searches per engine and a longer timeout than the short-query calls use.
  const [chatgpt, claude, gemini] = await Promise.all([
    run(isOpenAIConfigured(), () => callOpenAIWithSearch(prompt, { timeoutMs: 150000, userLocation })),
    run(isAnthropicConfigured(), () => callClaudeWithSearch(prompt, { timeoutMs: 150000, maxTokens: 4000, maxSearches: 6, userLocation })),
    run(isGeminiConfigured(), () => askGeminiTextWithSearch(prompt, { timeoutMs: 150000 })),
  ])

  const results = { chatgpt, claude, gemini }
  const engineStatus = {}
  for (const [engine, r] of Object.entries(results)) {
    if (!r) engineStatus[engine] = { ok: false, reason: 'not configured' }
    else if (r.text) engineStatus[engine] = { ok: true }
    else {
      engineStatus[engine] = { ok: false, usageCap: Boolean(r.usageCap), reason: r.usageCap ? 'usage limit or access problem' : 'request failed' }
      console.warn(`[outreach] cross-engine research: ${engine} unavailable (${r.error})`)
    }
  }

  return {
    prompt,
    engines,
    engineStatus,
    responses: {
      chatgpt: chatgpt?.text || null,
      claude: claude?.text || null,
      gemini: gemini?.text || null,
    },
  }
}

const normText = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

// A quote is "verbatim" only if its words appear, in order, in that engine's own response.
function quoteIsVerbatim(quote, source) {
  const q = normText(quote)
  return q.length >= 20 && normText(source).includes(q)
}

// A manufacturer spec is kept only if its value is stated in what the engines actually returned.
function specIsStated(spec, corpus) {
  const value = normText(spec?.value)
  return Boolean(spec?.label && value) && corpus.includes(value)
}

/**
 * Synthesizes the three raw research responses into structured findings — this is the one place
 * an LLM reads everything together and reasons about it, mirroring what a person manually
 * cross-checking three browser tabs would do: reconcile manufacturer/MPN claims, merge seller
 * lists, and — critically — flag any claim that directly contradicts the page's own real data
 * (passed in as groundTruth) rather than silently trusting whichever engine sounded confident.
 * This is what catches cases like an engine claiming a page has no public price when it does.
 */
export async function synthesizeCrossEngineFindings({ responses, groundTruth: baseTruth, country, claims, region }) {
  // The region is extra context for judging the engines' claims, added only when it is known with confidence.
  const groundTruth = regionIsActive(region) ? { ...baseTruth, regionCountry: region.country, regionCurrency: region.currencyCode } : baseTruth
  const engineTexts = Object.entries(responses)
    .filter(([, text]) => text)
    .map(([engine, text]) => `=== ${engine.toUpperCase()} ===\n${text}`)
    .join('\n\n')
  const claimList = (claims || []).filter(Boolean)

  if (!engineTexts.trim()) {
    return { manufacturerBrand: '', manufacturerCode: '', isStandardDesignation: false, standardDesignation: '', sellers: [], pageReviewFindings: [], conflicts: [], chatgptQuote: '', claudeQuote: '', manufacturerSpecs: [], claimChecks: [], recommendations: [] }
  }

  const prompt = `Three AI engines (ChatGPT, Claude, Gemini) were each independently asked to research a product and
review its seller's page. Below are their raw responses, followed by what the page ACTUALLY contains (verified by
directly reading it — this is ground truth, not another opinion).

${engineTexts}

GROUND TRUTH (verified directly from the live page):
${JSON.stringify(groundTruth, null, 2)}
${claimList.length ? `
CLAIMS THE LISTING MAKES (each engine was asked to check every one against the manufacturer's documentation):
${claimList.map((c, i) => `${i + 1}. "${c}"`).join('\n')}
` : ''}
Synthesize this into strict JSON:
{
  "manufacturerBrand": string,       // the real manufacturer, only if at least one engine found it confidently — "" if genuinely unclear or engines disagree without resolution
  "manufacturerCode": string,        // the real manufacturer part number (not a generic interchange designation) — "" if unclear
  "isStandardDesignation": boolean,  // true when the engines agree the product's number (e.g. "1603-2RS", "6205-2RS") is an industry-standard / interchange designation made by many manufacturers rather than one maker's part number
  "standardDesignation": string,     // that industry-standard designation when isStandardDesignation is true, else ""
  "sellers": [ { "seller": string, "price": string, "inStock": boolean | null, "inRegion": boolean | null } ],  // merged, deduped list across all engines that gave a real price; inStock false ONLY if an engine said that listing is sold out / unavailable / discontinued, true if said in stock, else null; inRegion true if the seller sells in ${country || 'the page\'s own market'}, false if clearly another country, else null
  "pageReviewFindings": string[],    // 3-6 short, specific findings about what's missing from the page, drawn from what the engines actually said when reviewing it
  "conflicts": [ { "topic": string, "detail": string } ],  // any case where an engine's claim directly contradicts the GROUND TRUTH above, or where engines disagree with each other on something checkable (a spec, a price, whether the page has X). Empty array if none. Never silently drop a contradiction — that's the one thing this synthesis must not do.
  "chatgptQuote": string,            // one short (1-2 sentence) direct quote lifted verbatim from the CHATGPT response's page-review portion — "" if it didn't review the page
  "claudeQuote": string,             // same, lifted verbatim from the CLAUDE response — "" if it didn't review the page
  "agreements": string[],            // claims that two or more engines confirmed independently (a part number, a spec, a price band, a verdict on the page) — one short sentence each, naming the engines. [] if none.
  "pageReadReliability": [ { "engine": "chatgpt" | "claude" | "gemini", "status": "read_page" | "declined" | "contradicts_ground_truth", "note": string } ],  // one per engine that responded: "declined" if it said it could not open/read the page, "contradicts_ground_truth" if it reported something about the page that the GROUND TRUTH disproves (say what), else "read_page"
  "manufacturerSpecs": [ { "label": string, "value": string } ],  // real manufacturer-published specs mentioned anywhere in the responses (load rating, speed, material, seal type, etc.) — only specs actually stated, never an estimated typical value; at most 18, most important first. [] if none were stated.
  "claimChecks": [ { "claim": string, "verdict": "contradicted" | "confirmed" | "engines_disagree" | "not_verifiable", "detail": string, "engines": string[], "source": string } ],  // one entry per CLAIM THE LISTING MAKES above ([] if none were listed). "contradicted" ONLY when at least one engine quoted the manufacturer's documentation or another reliable source that contradicts the claim and no engine confirmed it; "confirmed" when the sources support it; "engines_disagree" when engines reach opposite verdicts (say who said what in detail); "not_verifiable" when no engine found evidence either way. detail = one or two sentences on what the manufacturer's documentation says, quoting it. engines = the engines that checked this claim, lower-case ("chatgpt", "claude", "gemini"). source = the source named for the evidence ("" if none).
  "recommendations": [ { "engine": "chatgpt" | "claude" | "gemini", "verdict": "yes" | "no" | "with_caveats" | "not_stated", "reason": string }  // each engine's answer to "would you be confident recommending a buyer purchase from this page?", with its stated reason in one sentence; "not_stated" when the engine gave no verdict. One entry per engine that responded.
}
Only include a seller/manufacturer/finding that's actually stated in the engine responses above — never invent or infer beyond what they said. Quotes must be copied verbatim, not paraphrased.`

  try {
    const out = await callGemini(prompt, { timeoutMs: 120000 })
    const corpus = normText(engineTexts)
    // The synthesis is a reader, not a source: a quote that isn't word-for-word in that engine's own
    // answer is dropped, and so is any spec whose value no engine actually stated.
    const verbatim = (quote, engine) => (quoteIsVerbatim(quote, responses[engine]) ? String(quote).trim() : '')
    // A seller outside the buyer's region is reported as a conflict, never dropped without a trace
    // (it is kept out of the same-region comparison further down the pipeline).
    const conflicts = Array.isArray(out?.conflicts) ? [...out.conflicts] : []
    if (regionIsActive(region)) {
      for (const s of Array.isArray(out?.sellers) ? out.sellers : []) {
        if (!s?.seller || !(s.inRegion === false || isForeignCurrencyPrice(s.price, region.currencyCode))) continue
        conflicts.push({ topic: `Seller outside ${region.country}`, detail: `${s.seller}${s.price ? ` (${s.price})` : ''} was listed by the engines but sells outside ${region.country}; it is excluded from the ${region.country} comparison.` })
      }
    }
    const specs = (Array.isArray(out?.manufacturerSpecs) ? out.manufacturerSpecs : []).filter((s) => specIsStated(s, corpus)).slice(0, 18)
    return {
      ...out,
      conflicts,
      chatgptQuote: verbatim(out?.chatgptQuote, 'chatgpt'),
      claudeQuote: verbatim(out?.claudeQuote, 'claude'),
      manufacturerSpecs: specs,
      agreements: Array.isArray(out?.agreements) ? out.agreements.filter((a) => typeof a === 'string' && a.trim()).slice(0, 8) : [],
      pageReadReliability: Array.isArray(out?.pageReadReliability) ? out.pageReadReliability : [],
      claimChecks: Array.isArray(out?.claimChecks) ? out.claimChecks : [],
      recommendations: Array.isArray(out?.recommendations) ? out.recommendations : [],
    }
  } catch {
    return { manufacturerBrand: '', manufacturerCode: '', sellers: [], pageReviewFindings: [], conflicts: [], manufacturerSpecs: [], agreements: [], pageReadReliability: [], claimChecks: [], recommendations: [] }
  }
}
