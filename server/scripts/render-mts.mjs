// Re-render the PDF from the data saved by run-mts.mjs — template iteration without re-running
// the live research pipeline.
import fs from 'node:fs'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'

const data = JSON.parse(fs.readFileSync('outreach-MyToolSupply-data.json', 'utf8'), (k, v) =>
  v && typeof v === 'object' && typeof v.__buffer === 'string' ? Buffer.from(v.__buffer, 'base64') : v)
const out = process.argv[2] || 'outreach-MyToolSupply-v2.pdf'
const pdf = await generateOutreachReportPdf(data)
fs.writeFileSync(out, pdf)
console.log(`rendered ${out} (${pdf.length} bytes)`)
