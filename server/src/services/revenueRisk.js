/**
 * 12-month revenue at risk / "cost of doing nothing" — pure arithmetic, no AI involved in the
 * numbers, so the report can show every step. Same model as the reference reports:
 *
 *   base revenue → category base (base × category share)
 *   new buyers        = category × 15% first-time buyers × 25% AI-researched × trust-loss share (35% default)
 *   existing accounts = category × 85% existing accounts × 10% annual re-decision × 20% switching
 *   12-month revenue at risk = the two added together, as a rounded range
 *
 * Two modes, like the reference reports:
 *   "disclosed"    — the visitor chose an annual revenue band on the request form (self-reported)
 *   "illustrative" — no revenue given: a 5M placeholder in the prospect's own currency, labelled
 *                    as a worked example everywhere it appears
 * The category share and trust-loss share may be tuned per report by the report writer, within bounds.
 */

export const DEFAULT_ANNUAL_REVENUE = 5_000_000

// Keys match the lead form's revenueBracket values (src/components/LeadFormModal.jsx), which
// are US-dollar bands. The open ends ("under $5M", "$100M+") need a bound — these are assumed.
const REVENUE_BRACKETS = {
  under_5m: { low: 1_000_000, high: 5_000_000, label: 'under $5M' },
  '5m_25m': { low: 5_000_000, high: 25_000_000, label: '$5M–$25M' },
  '25m_100m': { low: 25_000_000, high: 100_000_000, label: '$25M–$100M' },
  over_100m: { low: 100_000_000, high: 250_000_000, label: '$100M+' },
}

export const RISK_ASSUMPTIONS = {
  newBuyerShare: 0.15, // share of category revenue from first-time buyers
  aiResearchedShare: 0.25, // share of those decisions now AI-researched
  trustLossShare: 0.35, // share lost where the page fails verification (writer may set 0.25–0.40)
  existingShare: 0.85, // share of category revenue from existing accounts
  reDecisionRate: 0.10, // existing accounts that re-decide their supplier each year
  switchingShare: 0.20, // share of those re-decisions lost to a better-documented competitor
}

// The product category's estimated share of the business's total revenue (step 2).
export const CATEGORY_SHARE = { min: 0.05, max: 0.30, defaultLow: 0.15, defaultHigh: 0.20 }

const clamp = (v, lo, hi, fallback) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : fallback)

// 3 significant figures, lower-case k/m/bn like the reference reports ("R12.7m", "$11.3k").
export function formatMoney(n, symbol = '$') {
  const v = Number(n) || 0
  const sig = (x) => Number(x.toPrecision(3))
  if (v >= 1e9) return `${symbol}${sig(v / 1e9)}bn`
  if (v >= 1e6) return `${symbol}${sig(v / 1e6)}m`
  if (v >= 1e3) return `${symbol}${sig(v / 1e3)}k`
  return `${symbol}${Math.round(v)}`
}

// Banner-style rounding to 2 significant figures: "$24k–$32k", "R29m–R44m", "$1m–$1.5m".
function roundRange(low, high, symbol) {
  const fmt2 = (v) => {
    const unit = v >= 1e9 ? 1e9 : v >= 1e6 ? 1e6 : 1e3
    const suffix = unit === 1e9 ? 'bn' : unit === 1e6 ? 'm' : 'k'
    return `${symbol}${Number((v / unit).toPrecision(2))}${suffix}`
  }
  const lo = fmt2(low)
  const hi = fmt2(high)
  return lo === hi ? lo : `${lo}–${hi}`
}

function amount(low, high, symbol) {
  return {
    low,
    high,
    label: formatMoney(low, symbol) === formatMoney(high, symbol) ? formatMoney(low, symbol) : `${formatMoney(low, symbol)}–${formatMoney(high, symbol)}`,
  }
}

/**
 * Resolves the base revenue. A chosen form band → "disclosed" (self-reported, US dollars);
 * nothing chosen → "illustrative" 5M placeholder in the prospect's own currency.
 */
export function resolveRevenueBasis(revenueBracket, region = {}) {
  const bracket = REVENUE_BRACKETS[String(revenueBracket || '').trim()]
  if (bracket) {
    // Form bands are in US dollars; outside USD markets say so explicitly.
    const symbol = !region.currencyCode || region.currencyCode === 'USD' ? '$' : 'US$'
    return { mode: 'disclosed', low: bracket.low, high: bracket.high, symbol, currencyCode: 'USD', label: bracket.label, source: 'self-reported on the AltiusNxt report request form' }
  }
  const symbol = region.currencySymbol || '$'
  const currencyCode = region.currencyCode || 'USD'
  // "AUD $5 million": the code already names the currency, so drop the letters from "A$" ("RM" stays).
  const bareSymbol = symbol.trim().replace(/^[A-Za-z]+(?=[^A-Za-z])/, '') || symbol.trim()
  return { mode: 'illustrative', low: DEFAULT_ANNUAL_REVENUE, high: DEFAULT_ANNUAL_REVENUE, symbol, currencyCode, label: `${currencyCode} ${bareSymbol}5 million`, source: 'illustrative placeholder — not researched, not disclosed by the prospect' }
}

/**
 * @param revenueBracket  form value ('' → illustrative)
 * @param region          { currencyCode, currencySymbol } from region.js
 * @param model           optional writer-tuned { categoryLabel, categoryShareLow, categoryShareHigh, categoryRationale, trustLossShare, trustLossReason }
 */
export function buildRevenueRisk({ revenueBracket, region, model } = {}) {
  const basis = resolveRevenueBasis(revenueBracket, region || {})
  const s = basis.symbol
  const a = { ...RISK_ASSUMPTIONS, trustLossShare: clamp(model?.trustLossShare, 0.25, 0.40, RISK_ASSUMPTIONS.trustLossShare) }

  // Category share: the slice of the business this product category represents — always a
  // range, like the reference reports ("~15–20% of that total"). Bounded to 5–30% so one
  // product's category can't be modelled as the whole business; 15–20% when the writer gives none.
  // A writer estimate outside that band (e.g. 1 = "the whole business") is discarded, not clamped.
  const inBand = (v) => Number.isFinite(Number(v)) && Number(v) >= CATEGORY_SHARE.min && Number(v) <= CATEGORY_SHARE.max
  const useWriterShare = inBand(model?.categoryShareLow) && inBand(model?.categoryShareHigh)
  let shareLow = useWriterShare ? Number(model.categoryShareLow) : CATEGORY_SHARE.defaultLow
  let shareHigh = useWriterShare ? Number(model.categoryShareHigh) : CATEGORY_SHARE.defaultHigh
  if (shareHigh < shareLow) [shareLow, shareHigh] = [shareHigh, shareLow]
  if (shareHigh === shareLow) shareHigh = Math.min(CATEGORY_SHARE.max, shareLow + 0.05)
  const categoryLabel = String(model?.categoryLabel || '').trim()

  const category = amount(basis.low * shareLow, basis.high * shareHigh, s)
  const newRate = a.newBuyerShare * a.aiResearchedShare * a.trustLossShare
  const existingRate = a.existingShare * a.reDecisionRate * a.switchingShare
  const newBuyers = amount(category.low * newRate, category.high * newRate, s)
  const existingAccounts = amount(category.low * existingRate, category.high * existingRate, s)
  const totalLow = newBuyers.low + existingAccounts.low
  const totalHigh = newBuyers.high + existingAccounts.high

  return {
    mode: basis.mode,
    basis: { ...basis, rangeLabel: amount(basis.low, basis.high, s).label },
    category: {
      ...category,
      name: categoryLabel,
      shareLow,
      shareHigh,
      applied: true,
      rationale: String(model?.categoryRationale || '').trim(),
    },
    assumptions: a,
    trustLossReason: String(model?.trustLossReason || '').trim(),
    newBuyers,
    existingAccounts,
    total: { low: totalLow, high: totalHigh, label: roundRange(totalLow, totalHigh, s) },
    isRange: totalLow !== totalHigh,
  }
}
