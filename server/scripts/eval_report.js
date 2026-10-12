/**
 * Regression/eval harness for the outreach report pipeline. Runs buildOutreachReportData +
 * generateOutreachReportPdf against a real product URL, checks the output against structural
 * sanity rules (not exact numbers — live AI results vary run to run, same as the reference PDF's
 * own disclaimer), and reports pass/fail per check.
 *
 * Usage: node scripts/eval_report.js
 */
import { buildOutreachReportData } from '../src/services/outreachPipeline.js'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'
import fs from 'node:fs'

const CASES = [
  {
    name: 'Better Office Supplies (reference case)',
    company: 'Better Office Supplies',
    productUrl: 'https://betteroffice.store/products/toilet-tissue-livi-essentials-2ply-700s',
    expect: {
      brandContains: 'Livi',
      codeContains: null, // reference says "1002" but the page's own displayed code may differ run to run
    },
  },
  {
    name: 'Bearing Headquarters (new case)',
    company: 'Bearing Headquarters',
    productUrl: 'https://shop.bearingheadquarters.com/item/B83IT37290/C40-16-BROWNING/',
    expect: {
      brandContains: 'Browning',
      codeContains: 'C40',
    },
  },
]

function check(label, pass, detail) {
  console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  return pass
}

async function runCase(testCase) {
  console.log(`\n=== ${testCase.name} ===`)
  console.log(`URL: ${testCase.productUrl}`)
  const t0 = Date.now()
  let data
  try {
    data = await buildOutreachReportData({
      company: testCase.company,
      productUrl: testCase.productUrl,
      contactName: 'Test Contact',
      contactTitle: '',
      contactEmail: 'test-not-a-real-send@example.com',
      location: '',
      timezoneLabel: '',
      senderName: 'Govind',
      senderTitle: 'Business Unit Head',
      senderEmail: 'govind@altiusnxt.com',
    })
  } catch (err) {
    console.log(`  ✗ PIPELINE THREW: ${err.message}`)
    return { name: testCase.name, pass: false, failures: ['pipeline threw'] }
  }
  console.log(`  (built in ${Date.now() - t0}ms)`)

  const results = []
  results.push(check('Identity: manufacturerBrand is non-empty', Boolean(data.product.manufacturerBrand), data.product.manufacturerBrand))
  results.push(check('Identity: manufacturerCode is non-empty', Boolean(data.product.manufacturerCode), data.product.manufacturerCode))
  if (testCase.expect.brandContains) {
    results.push(check(
      `Identity: brand contains "${testCase.expect.brandContains}"`,
      (data.product.manufacturerBrand || '').toLowerCase().includes(testCase.expect.brandContains.toLowerCase()),
      data.product.manufacturerBrand
    ))
  }
  if (testCase.expect.codeContains) {
    results.push(check(
      `Identity: code contains "${testCase.expect.codeContains}"`,
      (data.product.manufacturerCode || '').toLowerCase().includes(testCase.expect.codeContains.toLowerCase()),
      data.product.manufacturerCode
    ))
  }
  results.push(check('Citation audit: 5 named + 3 category queries ran', data.queries.named.length === 5 && data.queries.category.length === 3,
    `named=${data.queries.named.length} category=${data.queries.category.length}`))
  results.push(check('Citation audit: citedCount <= totalQueries', data.stats.citedCount <= data.stats.totalQueries,
    `${data.stats.citedCount}/${data.stats.totalQueries}`))
  results.push(check('Competitor benchmark: found more than just the prospect itself', data.stats.sellerCount > 1,
    `sellerCount=${data.stats.sellerCount}`))
  // Gaps are now evidence-based (only fire when real measured facts support them), so the count
  // is legitimately variable — the reference's "exactly 5" was a coincidence, not a contract.
  results.push(check('Gaps: at least 1 fired, each with title+detail', Array.isArray(data.gaps) && data.gaps.length >= 1 && data.gaps.every((g) => g.title && g.detail), `count=${data.gaps?.length}`))
  results.push(check('Spec depth: more than one row (not degenerate)', data.specDepth.length > 1, `rows=${data.specDepth.length}`))
  // Informational only — some pages (login-gated B2B portals, "call for price") legitimately show
  // no price at all, and the report correctly omits the revenue table rather than fabricating one.
  console.log(`  ${data.revenueTable ? '✓' : 'ℹ'} Revenue table ${data.revenueTable ? 'present' : 'omitted — no price found on page (not a failure if the page genuinely has none)'}`)

  // Exclude screenshot data URIs — their base64 payload is effectively random text and will
  // coincidentally contain "NaN"/"undefined"-like substrings with no relation to real data.
  const { currentScreenshot, enrichedScreenshot, ...beforeAfterRest } = data.beforeAfter || {}
  const dataStr = JSON.stringify({ ...data, beforeAfter: beforeAfterRest })
  results.push(check('No literal "undefined" leaked into data', !dataStr.includes('"undefined"') && !/:\s*undefined/.test(dataStr)))
  const nanIndex = dataStr.indexOf('NaN')
  results.push(check('No literal "NaN" leaked into data', nanIndex === -1, nanIndex >= 0 ? `context: ...${dataStr.slice(Math.max(0, nanIndex - 80), nanIndex + 20)}...` : undefined))

  let pdfBuffer
  try {
    pdfBuffer = await generateOutreachReportPdf(data)
    results.push(check('PDF rendered', pdfBuffer.length > 10000, `${pdfBuffer.length} bytes`))
    const outPath = `eval-${testCase.name.replace(/[^a-z0-9]+/gi, '-')}.pdf`
    fs.writeFileSync(outPath, pdfBuffer)
    console.log(`  (saved to ${outPath})`)
  } catch (err) {
    results.push(check('PDF rendered', false, err.message))
  }

  const failures = results.filter((r) => !r).length
  return { name: testCase.name, pass: failures === 0, failureCount: failures, data }
}

const summary = []
for (const c of CASES) {
  summary.push(await runCase(c))
}

console.log('\n=== SUMMARY ===')
for (const s of summary) {
  console.log(`${s.pass ? 'PASS' : `FAIL (${s.failureCount} check(s))`} — ${s.name}`)
}
const allPass = summary.every((s) => s.pass)
console.log(allPass ? '\nAll cases passed.' : '\nSome cases failed — see detail above.')
process.exit(allPass ? 0 : 1)
