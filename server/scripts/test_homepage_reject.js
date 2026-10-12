import { buildOutreachReportData } from '../src/services/outreachPipeline.js'

const urls = [
  'https://www.matcotools.com/',
  'https://www.matcotools.com',
]

for (const url of urls) {
  console.log(`\n--- Testing: ${url} ---`)
  try {
    await buildOutreachReportData({ company: 'Antlabs', productUrl: url })
    console.log('  FAILED: pipeline did NOT reject the homepage URL')
  } catch (err) {
    console.log(`  OK rejected as expected: ${err.message}`)
  }
}
