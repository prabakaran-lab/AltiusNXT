/**
 * CLI trigger for the outreach pipeline — run manually per prospect until this has a UI.
 * Usage:
 *   node scripts/send_outreach_report.js --input prospect.json
 *   node scripts/send_outreach_report.js --input prospect.json --dry-run   (build + save PDF locally, don't email)
 *
 * prospect.json shape:
 * {
 *   "company": "Better Office Supplies",
 *   "website": "https://betteroffice.store",
 *   "contactName": "The Owner",
 *   "contactTitle": "",
 *   "contactEmail": "owner@betteroffice.store",
 *   "location": "Forrestfield, WA",
 *   "timezoneLabel": "Perth time",
 *   "senderName": "Govind",
 *   "senderTitle": "Business Unit Head",
 *   "senderEmail": "govind@altiusnxt.com"
 * }
 */
import fs from 'node:fs'
import { buildOutreachReportData, runOutreachPipeline } from '../src/services/outreachPipeline.js'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'

const args = process.argv.slice(2)
const inputPath = args[args.indexOf('--input') + 1]
const dryRun = args.includes('--dry-run')

if (!inputPath) {
  console.error('Usage: node scripts/send_outreach_report.js --input prospect.json [--dry-run]')
  process.exit(1)
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))

console.log(`Building outreach report for ${input.company} (${input.website})...`)
const t0 = Date.now()

if (dryRun) {
  const data = await buildOutreachReportData(input)
  const pdfBuffer = await generateOutreachReportPdf(data)
  const outPath = `outreach-${input.company.replace(/\s+/g, '-')}.pdf`
  fs.writeFileSync(outPath, pdfBuffer)
  console.log(`\nDry run done in ${Date.now() - t0}ms. Saved to ${outPath} (not emailed).`)
  console.log(`Selected product: ${data.product.name} — ${data.product.manufacturerBrand} ${data.product.manufacturerCode}`)
  console.log(`Cited: ${data.stats.citedCount} of ${data.stats.totalQueries} named queries. Price rank: ${data.stats.priceRank} of ${data.stats.sellerCount}.`)
} else {
  await runOutreachPipeline(input)
  console.log(`\nDone in ${Date.now() - t0}ms. Report generated and emailed to ${input.contactEmail}.`)
}
