// Runs the 15-point AI-readiness scan on one product page and prints each check and the score.
//   node scripts/scan15.mjs <product-url> [--json]
import { runScan15 } from '../src/services/quickScan15.js'

const [url, flag] = process.argv.slice(2)
if (!url) {
  console.error('Usage: node scripts/scan15.mjs <product-url> [--json]')
  process.exit(1)
}

const r = await runScan15(url)
if (flag === '--json') {
  console.log(JSON.stringify(r, null, 2))
} else {
  console.log(`\n${r.url}\nlanded on: ${r.landedOn}  (read via: ${r.source})\n`)
  for (const c of r.checks) {
    console.log(`${String(c.n).padStart(2)}. ${c.status.toUpperCase().padEnd(10)} ${c.label.padEnd(34)} [${c.decidedBy}]  ${c.evidence}`)
  }
  console.log(`\nSCORE: ${r.score}/100  —  ${r.headline}`)
}
