import { buildOutreachReportData } from '../src/services/outreachPipeline.js'
import { generateOutreachReportPdf } from '../src/services/reportPdf.js'
import fs from 'node:fs'

const t0 = Date.now()
const data = await buildOutreachReportData({
  company: 'Better Office Supplies',
  productUrl: 'https://betteroffice.store/products/toilet-tissue-livi-essentials-2ply-700s',
  contactName: 'The Owner',
  contactTitle: '',
  contactEmail: 'test-not-a-real-send@example.com',
  location: '',
  timezoneLabel: '',
  senderName: 'Govind',
  senderTitle: 'Business Unit Head',
  senderEmail: 'govind@altiusnxt.com',
})
console.log(`Data built in ${Date.now() - t0}ms`)
console.log('product:', data.product)
console.log('stats:', data.stats)
console.log('headline:', data.headline)

const pdfBuffer = await generateOutreachReportPdf(data)
fs.writeFileSync('selfserve-test.pdf', pdfBuffer)
console.log(`PDF saved, ${pdfBuffer.length} bytes, total ${Date.now() - t0}ms`)
