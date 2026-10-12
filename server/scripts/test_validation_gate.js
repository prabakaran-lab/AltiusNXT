import { buildOutreachReportData } from '../src/services/outreachPipeline.js'

const t0 = Date.now()
try {
  await buildOutreachReportData({
    company: 'Antlabs',
    productUrl: 'https://www.matcotools.com/',
    contactName: 'Test',
    contactEmail: 'test@example.com',
    senderName: 'Govind',
    senderEmail: 'govind@altiusnxt.com',
  })
  console.log(`FAIL: expected a rejection, got a result instead (${Date.now() - t0}ms)`)
} catch (err) {
  console.log(`PASS: rejected in ${Date.now() - t0}ms with message: "${err.message}"`)
}
