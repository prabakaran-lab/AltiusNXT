import { callOpenAIWithSearch, callClaudeWithSearch } from './liveEngines.js'
import { askGeminiTextWithSearch, callGemini } from './gemini.js'
import { isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured } from '../config.js'

// The one research prompt, sent identically to all three engines via their real web-search APIs
// — this is deliberately a single, open-ended ask rather than a chain of narrow extraction
// calls. A narrow "extract JSON: {mpn, sellers}" prompt gets a narrow answer; this gets each
// engine's own research and reasoning, the same way a person asking it directly would, which is
// what actually produced the richer, better-grounded findings this report design depends on.
function buildResearchPrompt({ productName, knownCodes, dimensions, url }) {
  const altNames = (knownCodes || []).filter(Boolean)
  const altClause = altNames.length ? ` (also sold as ${altNames.join(', ')})` : ''
  const dimClause = dimensions ? `, ${dimensions}` : ''
  return `I'm researching the ${productName}${altClause}${dimClause}. Please: 1) find the real ` +
    `manufacturer/brand and its true manufacturer part number, 2) find 3-4 other real sellers ` +
    `with current prices (say for each whether it is in stock or sold out, and which exact configuration the price is for), ` +
    `3) then open this exact page and tell me what it states and what's missing for a buyer to trust it — ` +
    `including any site notice, naming inconsistency or checkout problem you see: ${url}`
}

/**
 * Runs the single research prompt against ChatGPT, Claude and Gemini in parallel via their real
 * web-search-enabled APIs — replaces the old approach of many narrow per-field extraction calls
 * chained together. Returns each engine's raw response text (never throws per-engine; a failed
 * engine just comes back null so the other two still count) plus which engines actually ran.
 */
export async function runCrossEngineResearch({ productName, knownCodes, dimensions, url }) {
  const prompt = buildResearchPrompt({ productName, knownCodes, dimensions, url })

  const engines = []
  if (isOpenAIConfigured()) engines.push('chatgpt')
  if (isAnthropicConfigured()) engines.push('claude')
  if (isGeminiConfigured()) engines.push('gemini')

  const [chatgpt, claude, gemini] = await Promise.all([
    isOpenAIConfigured() ? callOpenAIWithSearch(prompt).catch((err) => ({ error: err.message })) : Promise.resolve(null),
    isAnthropicConfigured() ? callClaudeWithSearch(prompt).catch((err) => ({ error: err.message })) : Promise.resolve(null),
    isGeminiConfigured() ? askGeminiTextWithSearch(prompt).catch((err) => ({ error: err.message })) : Promise.resolve(null),
  ])

  return {
    prompt,
    engines,
    responses: {
      chatgpt: typeof chatgpt === 'string' ? chatgpt : null,
      claude: typeof claude === 'string' ? claude : null,
      gemini: typeof gemini === 'string' ? gemini : null,
    },
  }
}

/**
 * Synthesizes the three raw research responses into structured findings — this is the one place
 * an LLM reads everything together and reasons about it, mirroring what a person manually
 * cross-checking three browser tabs would do: reconcile manufacturer/MPN claims, merge seller
 * lists, and — critically — flag any claim that directly contradicts the page's own real data
 * (passed in as groundTruth) rather than silently trusting whichever engine sounded confident.
 * This is what catches cases like an engine claiming a page has no public price when it does.
 */
export async function synthesizeCrossEngineFindings({ responses, groundTruth }) {
  const engineTexts = Object.entries(responses)
    .filter(([, text]) => text)
    .map(([engine, text]) => `=== ${engine.toUpperCase()} ===\n${text}`)
    .join('\n\n')

  if (!engineTexts.trim()) {
    return { manufacturerBrand: '', manufacturerCode: '', isStandardDesignation: false, standardDesignation: '', sellers: [], pageReviewFindings: [], conflicts: [], chatgptQuote: '', claudeQuote: '', manufacturerSpecs: [] }
  }

  const prompt = `Three AI engines (ChatGPT, Claude, Gemini) were each independently asked to research a product and
review its seller's page. Below are their raw responses, followed by what the page ACTUALLY contains (verified by
directly reading it — this is ground truth, not another opinion).

${engineTexts}

GROUND TRUTH (verified directly from the live page):
${JSON.stringify(groundTruth, null, 2)}

Synthesize this into strict JSON:
{
  "manufacturerBrand": string,       // the real manufacturer, only if at least one engine found it confidently — "" if genuinely unclear or engines disagree without resolution
  "manufacturerCode": string,        // the real manufacturer part number (not a generic interchange designation) — "" if unclear
  "isStandardDesignation": boolean,  // true when the engines agree the product's number (e.g. "1603-2RS", "6205-2RS") is an industry-standard / interchange designation made by many manufacturers rather than one maker's part number
  "standardDesignation": string,     // that industry-standard designation when isStandardDesignation is true, else ""
  "sellers": [ { "seller": string, "price": string, "inStock": boolean | null } ],  // merged, deduped list across all engines that gave a real price; inStock false ONLY if an engine said that listing is sold out / unavailable / discontinued, true if said in stock, else null
  "pageReviewFindings": string[],    // 3-6 short, specific findings about what's missing from the page, drawn from what the engines actually said when reviewing it
  "conflicts": [ { "topic": string, "detail": string } ],  // any case where an engine's claim directly contradicts the GROUND TRUTH above, or where engines disagree with each other on something checkable (a spec, a price, whether the page has X). Empty array if none. Never silently drop a contradiction — that's the one thing this synthesis must not do.
  "chatgptQuote": string,            // one short (1-2 sentence) direct quote lifted verbatim from the CHATGPT response's page-review portion — "" if it didn't review the page
  "claudeQuote": string,             // same, lifted verbatim from the CLAUDE response — "" if it didn't review the page
  "manufacturerSpecs": [ { "label": string, "value": string } ]  // real manufacturer-published specs mentioned anywhere in the responses (load rating, speed, material, seal type, etc.) — at most 10, most important first. [] if none were stated.
}
Only include a seller/manufacturer/finding that's actually stated in the engine responses above — never invent or infer beyond what they said. Quotes must be copied verbatim, not paraphrased.`

  try {
    return await callGemini(prompt)
  } catch {
    return { manufacturerBrand: '', manufacturerCode: '', sellers: [], pageReviewFindings: [], conflicts: [], manufacturerSpecs: [] }
  }
}
