// Compares report writers on IDENTICAL evidence (no research, no new web searches).
//
//   1. Generate one report, keeping the writer's input:
//        WRITER_INPUT_DUMP=writer-input-X.json node scripts/run-mts.mjs "<url>" "<Company>"
//   2. Run the writers on that same input and render one PDF per writer:
//        node scripts/compare-writers.mjs writer-input-X.json outreach-<Company>-data.json writer-compare/X [model,model,...]
//
// Models: 'gemini' or any Claude model id. Default: gemini, claude-haiku-4-5-20251001, claude-sonnet-5-5.
import fs from 'node:fs'
import path from 'node:path'
import { writeOutreachReport } from '../src/services/reportWriter.js'
import { applyWriterText } from '../src/services/outreachPipeline.js'
import { buildRevenueRisk } from '../src/services/revenueRisk.js'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'

const [inputFile, dataFile, outDir, modelArg] = process.argv.slice(2)
if (!inputFile || !dataFile || !outDir) {
  console.error('usage: node scripts/compare-writers.mjs <writer-input.json> <report-data.json> <out-dir> [model,model,...]')
  process.exit(1)
}
const models = (modelArg || 'gemini,claude-haiku-4-5-20251001,claude-sonnet-5-5').split(',').map((s) => s.trim()).filter(Boolean)
fs.mkdirSync(outDir, { recursive: true })

const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'))
const base = JSON.parse(fs.readFileSync(dataFile, 'utf8'), (k, v) =>
  v && typeof v === 'object' && typeof v.__buffer === 'string' ? Buffer.from(v.__buffer, 'base64') : v)
const revenueBracket = base.revenueRisk?.basis?.mode === 'disclosed' ? undefined : ''

const summary = []
for (const model of models) {
  console.log(`\n=== ${model}`)
  const writer = await writeOutreachReport(input, { model })
  if (!writer) { console.log('writer failed'); summary.push({ model, failed: true }); continue }

  const data = { ...base }
  if (writer.gaps?.length) { data.gaps = writer.gaps; data.strengths = writer.strengths || data.strengths }
  data.revenueRisk = buildRevenueRisk({ revenueBracket, region: base.region, model: writer.revenueModel })
  const merged = applyWriterText(data, writer, { fallbackKpis: base.kpis.slice(0, 2), pageReaction: {} })

  const label = model.replace(/[^a-z0-9.]+/gi, '-')
  fs.writeFileSync(path.join(outDir, `${label}.pdf`), await generateOutreachReportPdf(merged))
  fs.writeFileSync(path.join(outDir, `${label}.txt`), [
    `HEADLINE: ${[merged.headline.line1, merged.headline.line2, merged.headline.line3].filter(Boolean).join(' / ')}`,
    `LEDE: ${merged.lede}`,
    `KPIS: ${merged.kpis.map((k) => `${k.value} — ${k.label}`).join(' || ')}`,
    `RESULTS HEADLINE: ${merged.resultsHeadline}`,
    `QUOTES: ${merged.quotes.map((q) => `${q.engine}: ${q.quote}`).join(' || ')}`,
    `COMMERCIAL IMPLICATIONS: ${merged.commercialImplications}`,
    ...merged.gaps.map((g, i) => `GAP ${i + 1}: ${g.title} — ${g.detail}`),
    `STRENGTHS: ${merged.strengths}`,
    ...merged.businessImpact.map((b) => `IMPACT: ${b.title} ${b.detail}`),
    `PRICE FINDING: ${merged.priceFinding ? `${merged.priceFinding.lead} ${merged.priceFinding.body}` : ''}`,
    `REVENUE: ${merged.revenueRisk.category.name} ${merged.revenueRisk.category.shareLow * 100}-${merged.revenueRisk.category.shareHigh * 100}% | trust ${merged.revenueRisk.assumptions.trustLossShare} (${merged.revenueRisk.trustLossReason}) | TOTAL ${merged.revenueRisk.total.label}`,
  ].join('\n'))

  const m = writer._meta
  console.log(`time ${(m.ms / 1000).toFixed(0)}s | ${m.usage ? `tokens in ${m.usage.inputTokens} / out ${m.usage.outputTokens}` : `prompt ${Math.round(m.promptChars / 4)} tokens (est.)`} | gaps ${merged.gaps.length} | quotes ${merged.quotes.length}`)
  summary.push({ model, ms: m.ms, usage: m.usage, gaps: merged.gaps.length, quotes: merged.quotes.length })
}
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(`\nWrote PDFs + .txt per writer to ${outDir}`)
