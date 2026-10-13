// Rebuilds a report's PDF from saved evidence — no new research, so it costs a few cents
// (one writer call), not a full run. For iterating on the template or the page screenshots.
//
//   1. Generate once, keeping the writer's input:
//        WRITER_INPUT_DUMP=writer-input-X.json node scripts/run-mts.mjs "<url>" "<Company>"
//   2. Rebuild:
//        REPORT_WRITER_MODEL=claude-sonnet-5-5 node scripts/rebuild-report.mjs writer-input-X.json outreach-<Company>-data.json out.pdf
import fs from 'node:fs'
import { writeOutreachReport } from '../src/services/reportWriter.js'
import { applyWriterText } from '../src/services/outreachPipeline.js'
import { buildRevenueRisk } from '../src/services/revenueRisk.js'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'
import { captureCurrentPageAndHeader, captureEnrichedMockupScreenshot } from '../src/services/pageScreenshots.js'

const [inputFile, dataFile, outFile] = process.argv.slice(2)
if (!inputFile || !dataFile || !outFile) {
  console.error('usage: node scripts/rebuild-report.mjs <writer-input.json> <report-data.json> <out.pdf>')
  process.exit(1)
}
const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
const base = JSON.parse(fs.readFileSync(dataFile, 'utf8'), (k, v) =>
  v && typeof v === 'object' && typeof v.__buffer === 'string' ? Buffer.from(v.__buffer, 'base64') : v)

const t0 = Date.now()
// REUSE_WRITER=1 reuses the last writer output saved beside the PDF (layout-only iterations).
const cacheFile = outFile.replace(/\.pdf$/i, '.writer.json')
let writer
if (process.env.REUSE_WRITER && fs.existsSync(cacheFile)) {
  writer = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  console.log('writer: reused cached output')
} else {
  writer = await writeOutreachReport(input)
  if (writer) fs.writeFileSync(cacheFile, JSON.stringify(writer, null, 2))
  console.log(`writer ${((Date.now() - t0) / 1000).toFixed(0)}s | model ${writer?._meta?.model} | enrichedPage: ${writer?.enrichedPage ? JSON.stringify({ mpn: writer.enrichedPage.mpnValue, desc: !!writer.enrichedPage.description, bullets: writer.enrichedPage.bullets.length, specs: writer.enrichedPage.specs.length, pkg: !!writer.enrichedPage.packageContents, faqs: writer.enrichedPage.faqs.length }) : 'none'}`)
}
if (!writer) process.exit(1)

const url = base.product.url
const { fullScreenshot, headerCrop } = await captureCurrentPageAndHeader(url)
const enrichedShot = await captureEnrichedMockupScreenshot({
  url, enriched: writer.enrichedPage, productName: base.product.name, category: base.product.category,
  manufacturerBrand: base.product.manufacturerBrand, manufacturerCode: base.product.manufacturerCode,
  price: input.PRODUCT?.listed_price, specs: input.CROSS_ENGINE_RESEARCH?.synthesis?.manufacturer_specs || [],
  description: '', headerCrop,
})
const dataUrl = (buf) => (buf ? `data:image/png;base64,${buf.toString('base64')}` : null)

const data = { ...base }
if (writer.gaps?.length) { data.gaps = writer.gaps; data.strengths = writer.strengths || data.strengths }
data.revenueRisk = buildRevenueRisk({ revenueBracket: base.revenueRisk?.basis?.mode === 'disclosed' ? undefined : '', region: base.region, model: writer.revenueModel })
data.beforeAfter = { ...base.beforeAfter, currentScreenshot: dataUrl(fullScreenshot), enrichedScreenshot: dataUrl(enrichedShot) }
data.enrichedInjected = enrichedShot?.injected || null
const merged = applyWriterText(data, writer, { fallbackKpis: base.kpis.slice(0, 2), pageReaction: {} })

const pdf = await generateOutreachReportPdf(merged)
fs.writeFileSync(outFile, pdf)
fs.writeFileSync(outFile.replace(/\.pdf$/i, '.json'), JSON.stringify({ ...merged, beforeAfter: { ...merged.beforeAfter, currentScreenshot: '(image)', enrichedScreenshot: '(image)' } }, null, 2))
console.log(`wrote ${outFile} (${Math.round(pdf.length / 1024)} KB)`)
