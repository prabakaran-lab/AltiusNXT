// One-off: regenerate the MyToolSupply report through the real pipeline (no HTTP, no rate limit)
// so the numbers can be compared against the Manoj/Aditya reference. Saves the full report data
// (screenshots base64-encoded) so the PDF template can be re-rendered without re-running the
// 2-minute pipeline: `node scripts/render-mts.mjs`.
import fs from 'node:fs'
import { buildOutreachReportData } from '../src/services/outreachPipeline.js'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'

const url = process.argv[2] || 'https://mytoolsupply.com/pt-cut-master-a-80/'
const slug = (process.argv[3] || 'Antlabs').replace(/[^a-z0-9]+/gi, '-')
const company = process.argv[3] || 'Antlabs'
const t0 = Date.now()
const data = await buildOutreachReportData({
  company,
  productUrl: url,
  contactName: 'Test Contact',
  contactTitle: 'Purchasing',
  contactEmail: 'sales@altiusnxt.com',
  location: '',
  timezoneLabel: '',
  senderName: 'Govind',
  senderTitle: 'Business Unit Head',
  senderEmail: 'govind@altiusnxt.com',
})
console.log(`data built in ${Math.round((Date.now() - t0) / 1000)}s`)
const encoded = JSON.stringify(data, (k, v) => (v && v.type === 'Buffer' && Array.isArray(v.data)) ? { __buffer: Buffer.from(v.data).toString('base64') } : v, 2)
fs.writeFileSync(`outreach-${slug}-data.json`, encoded)
const pdf = await generateOutreachReportPdf(data)
fs.writeFileSync(`outreach-${slug}-v2.pdf`, pdf)
console.log(`pdf written (${pdf.length} bytes) in ${Math.round((Date.now() - t0) / 1000)}s`)
