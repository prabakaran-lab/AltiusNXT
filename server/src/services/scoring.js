/**
 * Deterministic scoring for the full audit report's three pillars.
 * Kept out of the LLM entirely — the number itself should be reproducible and defensible;
 * only the narrative *text* describing it comes from Gemini, grounded in these same inputs.
 */
export function computeAuditScores({ quickScan, liveAudit, liveSearchCheck }) {
  const q = quickScan || {}

  // Pillar 1: Can AI find you? (30%) — crawlability + structured data + brand identity + search visibility
  let find = 0
  find += q.hasStructuredData ? 40 : 0
  find += q.brandStated ? 30 : 0
  find += liveSearchCheck?.mentioned ? 30 : 10 // fetch always succeeds by this point, so baseline 10 for crawl access
  find = Math.min(find, 100)

  // Pillar 2: Can AI understand you? (30%) — spec depth + application copy
  const specDepthScore = Math.min((q.specsCount || 0) / 15, 1) * 60
  let understand = specDepthScore + (q.hasApplicationCopy ? 40 : 0)
  understand = Math.min(Math.round(understand), 100)

  // Pillar 3: Will AI recommend you? (40%) — commercial signals + live recommendation outcome
  const auditResults = liveAudit?.results || []
  const totalQuestions = auditResults.length || 1
  const mentionedCount = auditResults.filter((r) => r.mentioned).length
  const liveOutcomeScore = (mentionedCount / totalQuestions) * 60
  let recommend = liveOutcomeScore + (q.priceVisible ? 20 : 0) + (q.stockVisible ? 20 : 0)
  recommend = Math.min(Math.round(recommend), 100)

  const overall = Math.round(find * 0.3 + understand * 0.3 + recommend * 0.4)

  return {
    overall,
    find: Math.round(find),
    understand,
    recommend,
    mentionedCount,
    totalQuestions,
  }
}
