/**
 * Illustrative revenue-at-stake table — pure arithmetic, no AI involved and no claim of being an
 * estimate (the report is explicit that these are scale illustrations, not a sales forecast).
 * Mirrors the reference reports' four volume tiers, scaled to the price point: a $4 bearing is
 * bought by the hundred per month, a $4,450 plasma power supply a few times a quarter.
 */
export function tiersForPrice(unitPrice) {
  if (unitPrice >= 1000) return { period: 'quarter', periodsPerYear: 4, units: [1, 2, 4, 8] }
  if (unitPrice >= 100) return { period: 'month', periodsPerYear: 12, units: [2, 5, 10, 25] }
  if (unitPrice >= 25) return { period: 'month', periodsPerYear: 12, units: [5, 10, 25, 50] }
  return { period: 'month', periodsPerYear: 12, units: [50, 100, 250, 500] }
}

export function buildRevenueAtStakeTable({ unitPrice, currency, unitLabel = 'units', tiers }) {
  const fmt = (n) => `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const scale = tiersForPrice(unitPrice)
  const units = tiers || scale.units

  return {
    unitLabel,
    unitPrice: fmt(unitPrice),
    currency,
    period: scale.period,
    tiers: units.map((unitsPerPeriod) => {
      const perPeriod = unitsPerPeriod * unitPrice
      const perYear = perPeriod * scale.periodsPerYear
      return {
        unitsPerPeriod,
        // Kept under the historical names too so older template code keeps working.
        unitsPerMonth: unitsPerPeriod,
        perPeriod: fmt(perPeriod),
        perMonth: fmt(perPeriod),
        perYear: fmt(Math.round(perYear)),
      }
    }),
    caption: `Illustrative scenarios for a single product at ${fmt(unitPrice)}. These are revenue figures, not profit, and not a sales forecast. They exclude repeat orders and associated product lines.`,
  }
}
