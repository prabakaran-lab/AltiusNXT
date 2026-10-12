// Focused check of the cross-engine research + synthesis step for the EPCO bearing: does it
// surface the real manufacturer (General Bearing Corp / SKF, MPN 21405-88) or the seller's
// internal SKU "B1603-2RS"?
import { runCrossEngineResearch, synthesizeCrossEngineFindings } from '../src/services/crossEngineResearch.js'

const url = 'https://www.epco-sales.com/power-transmission-supplies/bearings/ball-bearings/ball-bearings/b1603-2rs'
const t0 = Date.now()
const research = await runCrossEngineResearch({
  productName: '1603-2RS Radial Ball Bearing',
  knownCodes: ['B1603-2RS'],
  dimensions: 'OD 0.8750, Shaft Size 0.3125, Width 0.3438',
  url,
})
console.log(`research done in ${Math.round((Date.now() - t0) / 1000)}s; engines: ${research.engines.join(', ')}`)
const probe = /21405|general bearing|\bGBC\b|\bSKF\b|bearings limited|\bBL\b|B1603|1603-?2RS/gi
for (const [engine, text] of Object.entries(research.responses)) {
  console.log(`\n=== ${engine.toUpperCase()} (${text ? text.length : 0} chars) ===`)
  if (!text) { console.log('(no response)'); continue }
  const hits = [...new Set((text.match(probe) || []).map((h) => h.toUpperCase()))]
  console.log('identifier mentions:', hits.join(', ') || 'none')
  const mfr = text.match(/[^.\n]*(manufactur|brand|part number|MPN)[^.\n]*/gi) || []
  console.log('manufacturer lines:\n  ' + mfr.slice(0, 6).join('\n  '))
}
const synth = await synthesizeCrossEngineFindings({
  responses: research.responses,
  groundTruth: { priceVisibleOnPage: true, priceShown: '$4.06', manufacturerCodeShownOnPage: false, specCountOnPage: 1, hasStructuredData: true },
})
console.log('\n=== SYNTHESIS ===')
console.log(JSON.stringify({ manufacturerBrand: synth.manufacturerBrand, manufacturerCode: synth.manufacturerCode, sellers: (synth.sellers || []).length, specs: (synth.manufacturerSpecs || []).length, conflicts: synth.conflicts }, null, 2))
