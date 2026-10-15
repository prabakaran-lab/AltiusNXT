import fs from 'node:fs'
import { callGemini } from './gemini.js'
import { config, isAnthropicConfigured } from '../config.js'

/**
 * Report writer — turns the evidence the pipeline already collected (live buyer queries,
 * cross-engine research, page ground truth, same-region competitor prices, crawler access) into
 * the narrative of the 6-page AI Readiness Outreach Report, following the AltiusNxt generation
 * prompt. It writes; it does not research. Revenue figures are never written by the model —
 * revenueRisk.js computes them from the category share / trust-loss share returned here.
 *
 * Engines: ChatGPT, Claude and Gemini only. Perplexity is not queried anywhere in this pipeline,
 * so the prompt forbids citing it.
 *
 * Output is checked before use: pull-quotes must appear verbatim in that engine's raw response,
 * KPI numbers must appear in the input data. Returns null on any failure so the caller falls back
 * to the deterministic text the pipeline builds itself.
 */

const PROMPT_RULES = `ROLE
You are writing an AI Readiness Outreach Report for AltiusNxt Technologies. The report tells a prospect what ChatGPT,
Claude and Gemini actually said when asked to find and review their product page, and what that means commercially.
Every claim must trace to evidence in INPUT DATA — you are writing it up, not researching or inventing it.

ENGINES: only ChatGPT, Claude and Gemini were queried. Perplexity was NOT queried — never mention Perplexity results.
CITATION_SUMMARY.engines lists the engines that actually returned answers: name and count only those (if one engine
returned nothing, say "2 AI LLMs" and name the two), never claim an engine's view that was not returned.

THE REPORT (6 pages; you write the text fields, the system lays them out and inserts every number it computes):
1. Cover — a 2-3 line headline (last line shown in orange) stating the single sharpest finding in plain language; one
   paragraph explaining what was tested and the one finding that matters most; two KPI tiles (the third tile, revenue
   at risk, is inserted by the system); a "Full Audit Available" paragraph; three feature footnotes ("N buyer queries",
   "N AI LLMs, tested live", "Verified at source").
2. AI search results — the query tables are rendered from ORGANIC_QUERIES exactly as returned (you write only the
   bold uppercase headline sentence, a one-sentence intro and a short footnote under the tables). Up to three short
   verbatim pull-quotes from the page-review step of CROSS_ENGINE_RESEARCH (one per engine, different engines), each
   one or two sentences, copied character-for-character, each tagged "positive" when the engine said something
   favourable about the page or "negative" when it flagged a problem. A "how to read these results" paragraph (2-4
   sentences): that this is one run per engine on one day, which engines opened the page and which could not
   (engine_status / page_read_reliability), what the crawler test showed (only when it was conclusive), and any place
   where an engine's statement about the page disagrees with the page itself. A short "commercial implications"
   paragraph connecting the query results to a real buying moment for this product category in the prospect's region.
3. Gaps — exactly 5 numbered findings ordered by severity, each one short paragraph citing specific evidence (a
   quote, a byte-level fact, a specific missing field) from GROUND_TRUTH, FIRED_GAP_RULES or CROSS_ENGINE_RESEARCH.
   If the evidence genuinely supports fewer than 5, write fewer — never invent one to reach five. Then an "Existing
   strengths" paragraph — real, specific positives, not filler. Then "fieldComparison": up to nine key product fields
   (brand, model / part number, the main dimensions, ratings and capacities, what is in the box, ...) set side by side —
   what the seller's page states (PAGE_TEXT, LISTING_CLAIMS, GROUND_TRUTH) against what the manufacturer's own
   documentation says (synthesis.manufacturer_specs and the engines' answers). Each row: field, pageSays ("Not stated"
   when the page does not state it), sourceSays (only a value that appears in INPUT DATA — leave the field out when the
   source value is not established), result = "match" (same value), "missing" (page does not state it), "differs"
   (the page states something different) or "two names" (the page uses more than one name for it). "source" names the
   comparison source in two to four words (e.g. "your own manual", "the manufacturer's documentation"). Then a
   one-sentence caption for the specification-depth chart (it counts buying-decision fields visible without
   interaction, prospect vs. cited competitors vs. median).
4. Before/after — 3-4 short red bullets (current problems) and 3-4 short teal bullets (what the enriched page fixes),
   one caveat line that mock-up content would be confirmed before publishing, and 3-4 "Expected business impact"
   items ending with an explicit "No guarantee of citation." item.
5. Commercial impact — one intro sentence, a caption for the same-region price chart, an optional finding callout
   (e.g. when price is genuinely competitive, say so plainly), the revenue-model parameters described below, and a
   closing callout on where the clearest gap is.
6. Next steps — body text for "20-Minute Walkthrough" (option A) and "Three Products of Your Choice" (option B).

ENRICHED PAGE: the report shows the seller's own page twice, as it is and with its content corrected and completed.
Return "enrichedPage" — content that can sit on a real product page in the page's own voice (never mention AltiusNxt,
AI, engines or this report in it). Use ONLY facts in INPUT DATA: manufacturer-published values in
synthesis.manufacturer_specs and in the engines' answers. mpnLabel = "<manufacturer brand> MPN" (just "MPN" if the
brand is unknown); mpnValue = the true manufacturer part number as the manufacturer prints it, "" if not established.
title = the product title as the page should state it: the brand, what the product is, its key attribute and the true
manufacturer part number, in the pattern the manufacturer itself uses, at most 110 characters, built only from facts in
INPUT DATA ("" only when the page's own title is already complete and correct). A title that shows unfilled template
placeholders (e.g. "$!itemData.brandName") must always be replaced.
description = 2-3 sentences rewriting the page's own description: keep what the page says that checked out, drop or
correct any claim whose claim_checks verdict is "contradicted", and add nothing the evidence does not support. When the
page has no description at all, write one from the manufacturer-published facts in INPUT DATA.
beforeAfterCaption must say that the enriched page is a
mock-up, and that the content would be confirmed against the manufacturer's documentation before anything is published.
It starts "To confirm before publishing:" and names the specific items the evidence leaves open (a value two sources
state differently, text that is cut off, a figure that needs a qualifier), then says what stays for the seller to add
(for example warranty, returns, stock) because the mock-up does not invent it.
bullets = 3-5 short factual bullets under the same rule. specs = up to 24 label/value rows, manufacturer-published
values only. packageContents = what is in the box if the data states it, else "". faqs = 2-3 question/answer pairs
answering what buyers (and the engines) were unsure about — disputed or contradicted claims, which part number is the
real one — with answers drawn only from the evidence. Leave a field empty ("" or []) rather than guess.

REVENUE: the system computes every revenue figure. NEVER write a revenue, turnover or money-at-risk number yourself.
Return only: categoryLabel (the product category this sits in, e.g. "Power Tools (corded + cordless)"),
categoryShareLow and categoryShareHigh (that category's estimated share of the business's total revenue, as a range
between 0.05 and 0.30 — typically 0.10-0.20 for a distributor or retailer selling many categories; low and high must
differ, e.g. 0.15 and 0.20), categoryRationale (short, e.g. "industry-typical share for a diversified
building-materials retailer"), trustLossShare (0.25-0.40: share of AI-researched new-buyer decisions lost where trust
breaks down; higher only when engines independently flagged serious errors) and trustLossReason (short, evidence-based).
If REVENUE.mode is "illustrative", every text you write about money must make clear the figures are a worked example,
not a finding about the prospect.

STYLE RULES — do not deviate
- Use only facts present in INPUT DATA. If a fact isn't there, don't state it. Never estimate a product spec.
- When two engines disagree on a verifiable fact, report both positions and say so plainly — never silently pick one.
- Quotes from engines must be copied verbatim, never paraphrased, and attributed by engine name.
- Match the prospect's actual market region (PRODUCT.region) for every competitor and price comparison. Data outside
  that region (COMPETITOR_PRICES entries marked supplementary) may only be mentioned as supplementary, never primary.
- Price being competitive is a real strength — say so plainly when true; don't manufacture urgency where price isn't the issue.
- No invented urgency language, no fake scarcity, no unverifiable superlatives.
- Headlines and KPI tiles must be the most specific, surprising, true thing in the data — not generic template filler.
- Refer to the prospect only by PRODUCT.seller (its company name); never call the product's manufacturer the prospect.
- Use the prospect's regional spelling and currency as shown in INPUT DATA.
- Headline: 2-3 short lines in sentence case, each ending with a full stop, at most 8 words each (e.g. "Found on price.
  Fairly stocked." / "Undermined by a fabricated part number.").
- Lede: one or two sentences starting "What happened when we asked ChatGPT, Claude and Gemini the way buyers in
  <region> search for <the product>" and ending with "— and why <the one finding that matters most>". No boilerplate.
- KPI tiles are findings, not methodology: never "AI LLMs tested", "buyer queries run" or similar counts of what we did.
  Each label is a complete upper-case phrase of 6-14 words that explains the number on its own (e.g. "BUYER SEARCH
  ANSWERS THAT NAMED CASHBUILD FOR THIS SAW") — never a placeholder letter such as "N".
- Whether the price is competitive is PRICE_POSITION.price_is_competitive — follow it; never contradict it.
- LISTING_CLAIMS are the claims the seller's page makes; CROSS_ENGINE_RESEARCH.synthesis.claim_checks holds what the
  engines found when they checked each one against the manufacturer's documentation. A claim with verdict
  "contradicted" is your sharpest gap: lead the gaps with it (several engines catching the same claims may be one
  combined gap), name the engines that agreed, and quote the manufacturer evidence from "detail". Call a claim false
  ONLY when its verdict is "contradicted". For "engines_disagree" give each position and say they disagree. Never
  present "not_verifiable" as an error on the page. If claim_checks is empty, do not mention claim verification.
- synthesis.recommendations holds each engine's answer to "would you be confident recommending a buyer purchase from
  this page?" — when the engines agree on "no" or "with_caveats", say so plainly and give the reason (e.g. in the
  cover paragraph or the commercial implications); never invent a verdict an engine did not give.
- If a CRAWLER_ACCESS entry has test_inconclusive true, the site's bot protection refused our own test request: say
  nothing about whether AI crawlers can or cannot fetch the page (a 403 there is not a finding), and rely only on what the
  robots.txt verdicts show.
- COMPETITOR_PRICES entries with verified_on_seller_page true were seen on that seller's own product page; the others
  are as reported by live AI web search. Never call a price "confirmed", "verified" or "as displayed on the seller's
  site" unless that flag is true for it, and never state a precise claim about prices beyond what the entries show.
- COMPETITOR_PRICES are per single item: where a seller sold a pack, its pack price was divided by the pack size
  (shown in listed_price / pack_size). Compare only these per-item figures, and mention a conversion only when it
  explains an apparent price gap.
- SPEC_DEPTH holds only sellers whose product page was actually read. If it contains just the prospect, competitor
  specification depth could not be measured: make no spec-depth comparison with competitors anywhere in the report.
- The reader never sees INPUT DATA: never name its sections or fields (FIRED_GAP_RULES, GROUND_TRUTH, ...), and don't
  describe how the data was processed or truncated. Cite the evidence itself (the quote, the field, the value).
- An engine saying it could not open or access the page is a limitation of that engine's browsing tool, not evidence
  about the page — unless CRAWLER_ACCESS shows that agent blocked. Never make it a gap, headline, KPI or quote.
- CROSS_ENGINE_RESEARCH.engine_status says which engines answered the research brief. If one has ok:false, say once,
  plainly and without apology, that it did not return an answer (a usage limit when usageCap is true) and base the
  cross-engine statements only on the engines that did answer; never describe a view for an engine that did not.
- synthesis.agreements are findings that two or more engines confirmed independently — use them as the strongest
  evidence for a gap and name the engines. GROUND_TRUTH.robots_txt_verdicts is what the site's own robots.txt says
  for this page, agent by agent; when FIRED_GAP_RULES includes a robots.txt block, quote the rule and name the agents.
  GROUND_TRUTH.schema_conflicts lists places the page's structured data contradicts the real manufacturer; mention
  one only when it is listed.`

const OUTPUT_SHAPE = `Return strict JSON with exactly this shape:
{
  "headline": { "line1": string, "line2": string, "line3": string },   // line3 may be "" for a 2-line headline; the last non-empty line is orange
  "lede": string,
  "kpis": [ { "value": string, "label": string, "evidence": string } ],  // exactly 2 tiles; value is a short specific number ("3 of 6", "0 of 3", "2 listings"); label is upper-case; evidence names the INPUT DATA field it comes from
  "fullAuditText": string,                // "This summary sits on top of a fuller technical audit of your product page: ..."
  "methodology": [ { "title": string, "body": string } ],                 // exactly 3: "N buyer queries", "N AI LLMs, tested live", "Verified at source"
  "resultsHeadline": string,              // one upper-case sentence for page 2
  "resultsIntro": string,
  "resultsFootnote": string,
  "quotes": [ { "engine": "chatgpt" | "claude" | "gemini", "quote": string, "tone": "positive" | "negative" } ],   // up to 3, verbatim
  "howToRead": string,
  "commercialImplications": string,
  "gapsIntro": string,
  "gaps": [ { "title": string, "detail": string } ],                      // up to 5, most severe first
  "strengths": string,
  "fieldComparison": { "source": string, "rows": [ { "field": string, "pageSays": string, "sourceSays": string, "result": "match" | "missing" | "differs" | "two names" } ] },
  "specDepthCaption": string,
  "currentBullets": string[],
  "enrichedBullets": string[],
  "beforeAfterCaption": string,
  "businessImpact": [ { "title": string, "detail": string } ],            // 3-4, last one titled "No guarantee of citation."
  "commercialIntro": string,
  "priceCaption": string,
  "priceFinding": { "lead": string, "body": string } | null,
  "enrichedPage": { "mpnLabel": string, "mpnValue": string, "title": string, "description": string, "bullets": string[], "specs": [ { "label": string, "value": string } ], "packageContents": string, "faqs": [ { "q": string, "a": string } ] },
  "revenueModel": { "categoryLabel": string, "categoryShareLow": number, "categoryShareHigh": number, "categoryRationale": string, "trustLossShare": number, "trustLossReason": string },
  "closingNote": { "lead": string, "body": string },
  "nextSteps": { "intro": string, "optionA": string, "optionB": string }
}`

const norm = (s) => String(s || '').toLowerCase().replace(/[“”"'‘’`]/g, '').replace(/\s+/g, ' ').trim()

// A quote passes when every fragment between ellipses appears verbatim in that engine's own text.
function isVerbatim(quote, source) {
  const src = norm(source)
  if (!src) return false
  const fragments = String(quote || '').split(/…|\.\.\./).map(norm).filter((f) => f.length >= 12)
  return fragments.length > 0 && fragments.every((f) => src.includes(f))
}

// An engine apologising that it couldn't open the page is not an assessment of the page.
const APOLOGY_RE = /\b(cannot|can't|unable to|couldn't|could not|not able to|wasn't able to|was unable to)\s+(?:\w+\s+){0,3}(access|open|load|fetch|retrieve|browse|view|reach|examine|visit)\b|\bno access to\b|\bI don't have access\b|\bunfortunately,? I\b/i

// A KPI tile passes when every number in its value appears somewhere in the input data, and its
// label is a finding (no placeholder letters, no counts of the method itself).
function kpiGrounded(kpi, inputText) {
  const label = String(kpi?.label || '')
  if (/\bN\b/.test(label) || /\b(tested|queries run|llms?)\b/i.test(label) || label.trim().split(/\s+/).length < 4) return false
  const nums = String(kpi?.value || '').match(/\d+(?:[.,]\d+)?/g) || []
  return nums.length > 0 && nums.every((n) => new RegExp(`(^|[^\\d.])${n.replace('.', '\\.')}([^\\d]|$)`).test(inputText))
}

// Strips references to the input's own section/field names ("as noted in FIRED_GAP_RULES.x") that
// the model sometimes leaves in — the reader never sees INPUT DATA.
const INPUT_REF_RE = /,?\s*(?:(?:as|which (?:is|was))\s+)?(?:noted|identified|detailed|highlighted|flagged|shown|stated|reported|seen|listed|recorded|indicated)?\s*(?:in|by|under)\s+(?:the\s+)?[A-Z][A-Z_]{3,}(?:\.[A-Za-z_]\w*)*/g
const BARE_REF_RE = /\(?\b[A-Z][A-Z_]{3,}(?:\.[A-Za-z_]\w*)+\)?/g
const cleanText = (s) => s.replace(INPUT_REF_RE, '').replace(BARE_REF_RE, '').replace(/\s+([.,;])/g, '$1').replace(/\s{2,}/g, ' ').trim()
const str = (v) => (typeof v === 'string' ? cleanText(v.trim()) : '')
const arr = (v) => (Array.isArray(v) ? v : [])

// Corrected page content must trace back to the evidence: every number in it appears in the input
// data, and most of its words do too. Anything that fails is dropped rather than shown on a page.
function makeGrounding(inputText) {
  const hay = String(inputText || '').toLowerCase()
  const hayNorm = hay.replace(/[^a-z0-9]+/g, ' ')
  const words = (s) => String(s || '').toLowerCase().match(/[a-z]{4,}/g) || []
  return (text, minWordShare = 0.6) => {
    const s = String(text || '')
    if (!s.trim()) return false
    const nums = s.match(/\d[\d.,]*/g) || []
    if (!nums.every((n) => hay.includes(n.replace(/[.,]+$/, '')) || hayNorm.includes(n.replace(/[^0-9a-z]+/gi, ' ').trim()))) return false
    const w = words(s)
    if (!w.length) return nums.length > 0
    return w.filter((x) => hayNorm.includes(x)).length / w.length >= minWordShare
  }
}

function cleanEnrichedPage(raw, inputText) {
  if (!raw || typeof raw !== 'object') return null
  const grounded = makeGrounding(inputText)
  const specs = arr(raw.specs)
    .map((s) => ({ label: str(s?.label), value: str(s?.value) }))
    .filter((s) => s.label && s.value && grounded(s.value, 0.5))
    .filter((s, i, all) => all.findIndex((o) => o.label.toLowerCase() === s.label.toLowerCase()) === i)
    .slice(0, 24)
  const faqs = arr(raw.faqs)
    .map((f) => ({ q: str(f?.q), a: str(f?.a) }))
    .filter((f) => f.q && f.a && grounded(f.a, 0.5))
    .slice(0, 3)
  const page = {
    mpnLabel: str(raw.mpnLabel) || 'MPN',
    mpnValue: grounded(str(raw.mpnValue), 0.5) ? str(raw.mpnValue) : '',
    // A title must be short and built from the evidence, like every other fact put on the page.
    title: str(raw.title).length <= 140 && grounded(str(raw.title), 0.6) ? str(raw.title) : '',
    description: grounded(str(raw.description), 0.5) ? str(raw.description) : '',
    bullets: arr(raw.bullets).map(str).filter((b) => b && grounded(b, 0.5)).slice(0, 5),
    specs,
    packageContents: grounded(str(raw.packageContents), 0.5) ? str(raw.packageContents) : '',
    faqs,
  }
  const hasContent = page.mpnValue || page.title || page.description || page.bullets.length || page.specs.length || page.packageContents || page.faqs.length
  return hasContent ? page : null
}

// Writer model: 'gemini' (default) or a Claude model id such as 'claude-haiku-4-5-20251001' or
// 'claude-sonnet-5-5'. Set per call ({ model }) or with REPORT_WRITER_MODEL in server/.env.
async function generateJson(prompt, model) {
  if (!model || model === 'gemini') return { json: await callGemini(prompt, { timeoutMs: 150000 }), usage: null }
  if (!isAnthropicConfigured()) throw new Error('ANTHROPIC_API_KEY is not configured on the server')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': config.anthropic.apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: 24000, // larger Claude models spend ~9k tokens thinking before the ~4k-token answer
      messages: [{ role: 'user', content: `${prompt}\n\nRespond with the JSON object only — no commentary, no code fence.` }],
    }),
    signal: AbortSignal.timeout(240000),
  })
  if (!res.ok) throw new Error(`Claude (${model}) writer request failed (${res.status}): ${(await res.text().catch(() => '')).slice(0, 300)}`)
  const data = await res.json()
  const text = (data?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  const body = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  let json
  try {
    json = JSON.parse(body)
  } catch {
    json = JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1))
  }
  return { json, usage: { inputTokens: data?.usage?.input_tokens ?? null, outputTokens: data?.usage?.output_tokens ?? null } }
}

// Claude Sonnet 5.5 is the default writer whenever an Anthropic key is configured (it wrote the most
// accurate, least padded reports in side-by-side tests); Gemini is the fallback.
const DEFAULT_CLAUDE_WRITER = 'claude-sonnet-5-5'

export async function writeOutreachReport(input, { model } = {}) {
  const writerModel = model || process.env.REPORT_WRITER_MODEL || (isAnthropicConfigured() ? DEFAULT_CLAUDE_WRITER : 'gemini')
  const inputText = JSON.stringify(input, null, 1)
  // Dev aid: keep the exact evidence the writer saw, so writers can be compared on identical input
  // (scripts/compare-writers.mjs).
  if (process.env.WRITER_INPUT_DUMP) {
    try { fs.writeFileSync(process.env.WRITER_INPUT_DUMP, inputText) } catch (err) { console.warn(`[reportWriter] could not save writer input: ${err.message}`) }
  }
  const prompt = `${PROMPT_RULES}\n\nINPUT DATA\n${inputText}\n\n${OUTPUT_SHAPE}`

  let out
  let usage = null
  let usedModel = writerModel
  const startedAt = Date.now()
  try {
    ;({ json: out, usage } = await generateJson(prompt, writerModel))
  } catch (err) {
    console.warn(`[reportWriter] writer (${writerModel}) failed: ${err.message}`)
    // A failed Claude call must not cost the whole report: try Gemini once before giving up.
    if (writerModel === 'gemini') return null
    try {
      ;({ json: out, usage } = await generateJson(prompt, 'gemini'))
      usedModel = 'gemini'
      console.warn('[reportWriter] fell back to Gemini')
    } catch (err2) {
      console.warn(`[reportWriter] Gemini fallback failed: ${err2.message}`)
      return null
    }
  }
  if (!out || typeof out !== 'object') return null

  const raw = input?.CROSS_ENGINE_RESEARCH?.raw_responses || {}
  const quotes = arr(out.quotes)
    .map((q) => ({ engine: String(q?.engine || '').toLowerCase(), quote: str(q?.quote), tone: String(q?.tone || '').toLowerCase() === 'positive' ? 'positive' : 'negative' }))
    .filter((q) => ['chatgpt', 'claude', 'gemini'].includes(q.engine) && q.quote && !APOLOGY_RE.test(q.quote) && isVerbatim(q.quote, raw[q.engine]))
    .filter((q, i, all) => all.findIndex((o) => o.engine === q.engine) === i)
    .slice(0, 3)
  const dropped = arr(out.quotes).length - quotes.length
  if (dropped > 0) console.warn(`[reportWriter] dropped ${dropped} quote(s) not found verbatim in the engine responses`)

  // Field comparison: the source column must come from the evidence (same grounding test as the
  // corrected page content); the page column is either "Not stated" or a value found in the input.
  const grounded = makeGrounding(inputText)
  const RESULTS = { match: 'Match', missing: 'Missing', differs: 'Differs', 'two names': 'Two names' }
  const fieldRows = arr(out.fieldComparison?.rows)
    .map((r) => ({ field: str(r?.field), pageSays: str(r?.pageSays), sourceSays: str(r?.sourceSays), result: RESULTS[String(r?.result || '').toLowerCase().trim()] || '' }))
    .filter((r) => r.field && r.pageSays && r.sourceSays && r.result && grounded(r.sourceSays, 0.5) && (/^not stated$/i.test(r.pageSays) || grounded(r.pageSays, 0.5)))
    .filter((r, i, all) => all.findIndex((o) => o.field.toLowerCase() === r.field.toLowerCase()) === i)
    .slice(0, 9)
  const fieldComparison = fieldRows.length >= 3 ? { source: str(out.fieldComparison?.source) || "the manufacturer's documentation", rows: fieldRows } : null

  const kpis = arr(out.kpis).filter((k) => str(k?.value) && str(k?.label) && kpiGrounded(k, inputText)).slice(0, 2)

  const headline = out.headline || {}
  const result = {
    headline: { line1: str(headline.line1), line2: str(headline.line2), line3: str(headline.line3) },
    lede: str(out.lede),
    kpis: kpis.map((k) => ({ value: str(k.value), label: str(k.label).toUpperCase() })),
    fullAuditText: str(out.fullAuditText),
    methodology: arr(out.methodology).filter((m) => str(m?.title) && str(m?.body)).slice(0, 3).map((m) => ({ title: str(m.title), body: str(m.body) })),
    resultsHeadline: str(out.resultsHeadline),
    resultsIntro: str(out.resultsIntro),
    resultsFootnote: str(out.resultsFootnote),
    quotes,
    howToRead: str(out.howToRead),
    fieldComparison,
    commercialImplications: str(out.commercialImplications),
    gapsIntro: str(out.gapsIntro),
    gaps: arr(out.gaps).filter((g) => str(g?.title) && str(g?.detail)).slice(0, 5).map((g) => ({ title: str(g.title), detail: str(g.detail) })),
    strengths: str(out.strengths),
    specDepthCaption: str(out.specDepthCaption),
    currentBullets: arr(out.currentBullets).map(str).filter(Boolean).slice(0, 4),
    enrichedBullets: arr(out.enrichedBullets).map(str).filter(Boolean).slice(0, 4),
    beforeAfterCaption: str(out.beforeAfterCaption),
    businessImpact: arr(out.businessImpact).filter((b) => str(b?.title) && str(b?.detail)).slice(0, 4).map((b) => ({ title: str(b.title), detail: str(b.detail) })),
    commercialIntro: str(out.commercialIntro),
    priceCaption: str(out.priceCaption),
    priceFinding: out.priceFinding && str(out.priceFinding.lead) ? { lead: str(out.priceFinding.lead), body: str(out.priceFinding.body) } : null,
    enrichedPage: cleanEnrichedPage(out.enrichedPage, inputText),
    revenueModel: out.revenueModel && typeof out.revenueModel === 'object' ? out.revenueModel : null,
    closingNote: out.closingNote && str(out.closingNote.lead) ? { lead: str(out.closingNote.lead), body: str(out.closingNote.body) } : null,
    nextSteps: {
      intro: str(out.nextSteps?.intro),
      optionA: str(out.nextSteps?.optionA),
      optionB: str(out.nextSteps?.optionB),
    },
  }
  // Not rendered — read by scripts/compare-writers.mjs.
  Object.defineProperty(result, '_meta', { enumerable: false, value: { model: usedModel, ms: Date.now() - startedAt, usage, promptChars: prompt.length } })
  return result
}
