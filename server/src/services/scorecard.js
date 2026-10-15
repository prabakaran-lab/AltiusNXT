// The 15-point AI-readiness scorecard: 3 pillars x 5 criteria, each scored Pass(100) / Partial(50)
// / Fail(0), pillar score = mean of its five, overall = 0.30*Pillar1 + 0.30*Pillar2 + 0.40*Pillar3.
// Every criterion is scored from evidence already gathered elsewhere in the pipeline (crawler
// test, structured-data checks, spec counts, citation results) — never from a fresh LLM guess,
// so the score can't drift from what the rest of the report actually says.

const PASS = 100
const PARTIAL = 50
const FAIL = 0

function verdict(score) {
  return score === PASS ? 'Pass' : score === PARTIAL ? 'Partial' : 'Fail'
}

/**
 * @param {object} evidence - everything the rest of the pipeline already computed:
 *   crawlerAccess, titleCheck, breadcrumbCheck, structuredDataFields, prospectHasJsonLd,
 *   prospectHasCodeOnPage, manufacturerCode, prospectSpecCount, competitorSpecMedian,
 *   unitOfSale, unitStatedOnPage, description, priceRank, sellerCount, prospectPrice,
 *   googleRating, googleReviewCount, hasAddToCart, totalCitedCount, totalAskedCount,
 *   namedCitedCount, namedQueryCount
 */
export function computeScorecard(evidence) {
  const pillar1 = [
    {
      ref: '1.1', metric: 'Crawler access',
      // Loading the page is not the whole story: robots.txt can tell an AI crawler to stay away from it.
      score: evidence.crawlerAccess?.inconclusive ? (evidence.crawlerAccess.robotsBlockedAiAgents?.length ? FAIL : PARTIAL)
        : evidence.crawlerAccess?.fullyAccessible && !evidence.crawlerAccess?.robotsBlockedAiAgents?.length ? PASS
        : evidence.crawlerAccess?.accessibleCount > 0 ? PARTIAL : FAIL,
      finding: evidence.crawlerAccess?.inconclusive
        ? `Could not be measured: the site's bot protection refused our own test request, so nothing is shown about what AI crawlers can fetch.${evidence.crawlerAccess.robotsBlockedAiAgents?.length ? ` robots.txt disallows this page for ${evidence.crawlerAccess.robotsBlockedAiAgents.map((b) => b.agent).join(', ')}.` : ''}`
        : evidence.crawlerAccess
        ? `${evidence.crawlerAccess.accessibleCount} of ${evidence.crawlerAccess.totalBots} bot user-agents could load the page.` +
          (evidence.crawlerAccess.robotsBlockedAiAgents?.length
            ? ` robots.txt disallows this page for ${evidence.crawlerAccess.robotsBlockedAiAgents.map((b) => b.agent).join(', ')}.`
            : '')
        : 'Crawler access not tested.',
    },
    {
      ref: '1.2', metric: 'URL / title / schema integrity',
      score: (!evidence.titleCheck?.hasDuplication && !evidence.breadcrumbCheck?.hasDuplication) ? PASS
        : (evidence.titleCheck?.hasDuplication && evidence.breadcrumbCheck?.hasDuplication) ? FAIL : PARTIAL,
      finding: [
        evidence.titleCheck?.hasDuplication ? 'Title tag repeats the product name.' : null,
        evidence.breadcrumbCheck?.hasDuplication ? 'Breadcrumb repeats a level.' : null,
      ].filter(Boolean).join(' ') || 'Title and breadcrumb are clean.',
    },
    {
      ref: '1.3', metric: 'Structured data quality',
      score: !evidence.prospectHasJsonLd ? FAIL
        : (evidence.structuredDataFields?.missingFields?.length > 0 || evidence.structuredDataFields?.brandIsSeller) ? PARTIAL : PASS,
      finding: !evidence.prospectHasJsonLd
        ? 'No structured data (JSON-LD) found on the page.'
        : evidence.structuredDataFields?.missingFields?.length
          ? `Structured data present but missing: ${evidence.structuredDataFields.missingFields.join(', ')}.`
          : 'Structured data present and complete.',
    },
    {
      ref: '1.4', metric: 'Identifier resolution (real MPN vs internal SKU)',
      score: evidence.prospectHasCodeOnPage ? PASS : evidence.manufacturerCode ? FAIL : PARTIAL,
      finding: evidence.prospectHasCodeOnPage
        ? 'The manufacturer part number is displayed on the page.'
        : evidence.manufacturerCode
          ? `Only an internal SKU is shown — the real manufacturer code (${evidence.manufacturerCode}) is not on the page.`
          : 'No manufacturer part number could be confidently identified.',
    },
    {
      ref: '1.5', metric: 'Off-domain citation surface (organic query results)',
      score: evidence.totalCitedCount > 0 && evidence.totalCitedCount === evidence.totalAskedCount ? PASS
        : evidence.totalCitedCount > 0 ? PARTIAL : FAIL,
      finding: `Cited in ${evidence.totalCitedCount} of ${evidence.totalAskedCount} live buyer queries that never named the business.`,
    },
  ]

  const pillar2 = [
    {
      ref: '2.1', metric: 'Attribute / spec completeness',
      score: evidence.competitorSpecMedian == null ? (evidence.prospectSpecCount >= 2 ? PASS : PARTIAL)
        : evidence.prospectSpecCount >= evidence.competitorSpecMedian ? PASS
          : evidence.prospectSpecCount > 0 ? PARTIAL : FAIL,
      finding: `${evidence.prospectSpecCount} spec field(s) stated on the page${evidence.competitorSpecMedian != null ? `, vs a median of ${evidence.competitorSpecMedian} among cited competitors` : ''}.`,
    },
    {
      ref: '2.2', metric: 'Units and normalization',
      score: evidence.unitStatedOnPage ? PASS : evidence.unitOfSale ? PARTIAL : FAIL,
      finding: evidence.unitStatedOnPage
        ? 'Unit of sale is explicitly stated on the page.'
        : evidence.unitOfSale
          ? `Unit of sale (${evidence.unitOfSale}) is inferred, not explicitly stated on the page.`
          : 'No unit of sale could be determined.',
    },
    {
      ref: '2.3', metric: 'Taxonomy / breadcrumb placement',
      score: (evidence.breadcrumbCheck?.crumbs?.length > 0 && !evidence.breadcrumbCheck?.hasDuplication) ? PASS
        : evidence.breadcrumbCheck?.crumbs?.length > 0 ? PARTIAL : FAIL,
      finding: evidence.breadcrumbCheck?.crumbs?.length
        ? `Breadcrumb present (${evidence.breadcrumbCheck.crumbs.length} levels)${evidence.breadcrumbCheck.hasDuplication ? ', with a duplicated level' : ''}.`
        : 'No breadcrumb trail found.',
    },
    {
      ref: '2.4', metric: 'Semantic depth of description',
      score: (evidence.description?.length ?? 0) >= 200 ? PASS : (evidence.description?.length ?? 0) > 0 ? PARTIAL : FAIL,
      finding: evidence.description?.length ? `Description is ${evidence.description.length} characters.` : 'No product description found.',
    },
    {
      ref: '2.5', metric: 'Variant / related-product clarity',
      score: evidence.hasVariantInfo ? PASS : PARTIAL,
      finding: evidence.hasVariantInfo ? 'Page distinguishes this item from related variants.' : 'No explicit variant/related-product differentiation found on the page.',
    },
  ]

  const pillar3 = [
    {
      ref: '3.1', metric: 'Price differentiation vs competitors',
      score: evidence.sellerCount > 0 && evidence.priceRank != null
        ? (evidence.priceRank <= Math.ceil(evidence.sellerCount / 2) ? PASS : PARTIAL)
        : FAIL,
      finding: evidence.priceRank != null && evidence.sellerCount
        ? `Ranked ${evidence.priceRank} of ${evidence.sellerCount} sellers found.`
        : 'No price comparison was possible.',
    },
    {
      ref: '3.2', metric: 'Trust signals',
      score: evidence.googleRating != null && evidence.googleReviewCount > 0 ? PASS : evidence.googleRating != null ? PARTIAL : FAIL,
      finding: evidence.googleRating != null
        ? `Google rating ${evidence.googleRating} from ${evidence.googleReviewCount ?? 0} review(s).`
        : 'No independent trust signals (reviews/ratings) found.',
    },
    {
      ref: '3.3', metric: 'Buying-decision content (price / stock / cart)',
      score: [Boolean(evidence.prospectPrice), Boolean(evidence.hasStockIndicator), Boolean(evidence.hasAddToCart)].filter(Boolean).length === 3 ? PASS
        : [Boolean(evidence.prospectPrice), Boolean(evidence.hasStockIndicator), Boolean(evidence.hasAddToCart)].filter(Boolean).length > 0 ? PARTIAL : FAIL,
      finding: `Price ${evidence.prospectPrice ? 'shown' : 'not shown'}, stock ${evidence.hasStockIndicator ? 'shown' : 'not shown'}, add-to-cart ${evidence.hasAddToCart ? 'present' : 'not found'}.`,
    },
    {
      ref: '3.4', metric: 'Buyer-question coverage',
      score: evidence.hasFaqOrFullDescription ? PASS : (evidence.description?.length ?? 0) > 0 ? PARTIAL : FAIL,
      finding: evidence.hasFaqOrFullDescription ? 'Page addresses likely buyer questions (FAQ or detailed description).' : 'No FAQ and little descriptive content to anticipate buyer questions.',
    },
    {
      ref: '3.5', metric: 'Live citation outcome',
      score: evidence.totalCitedCount > 0 && evidence.totalCitedCount === evidence.totalAskedCount ? PASS
        : evidence.totalCitedCount > 0 ? PARTIAL : FAIL,
      finding: `Cited live by AI engines in ${evidence.totalCitedCount} of ${evidence.totalAskedCount} buyer queries tested.`,
    },
  ]

  const pillarScore = (rows) => rows.reduce((sum, r) => sum + r.score, 0) / rows.length
  const p1 = pillarScore(pillar1)
  const p2 = pillarScore(pillar2)
  const p3 = pillarScore(pillar3)
  const overall = 0.30 * p1 + 0.30 * p2 + 0.40 * p3

  const withVerdict = (rows) => rows.map((r) => ({ ...r, verdict: verdict(r.score) }))

  return {
    pillars: [
      { name: 'Can AI find you?', weight: 0.30, score: Math.round(p1), criteria: withVerdict(pillar1) },
      { name: 'Can AI understand you?', weight: 0.30, score: Math.round(p2), criteria: withVerdict(pillar2) },
      { name: 'Will AI recommend you?', weight: 0.40, score: Math.round(p3), criteria: withVerdict(pillar3) },
    ],
    overall: Math.round(overall),
  }
}
