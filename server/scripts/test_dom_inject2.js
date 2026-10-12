import fs from 'node:fs'
import { captureEnrichedMockupScreenshot } from '../src/services/pageScreenshots.js'

const buf = await captureEnrichedMockupScreenshot({
  url: 'https://www.matcotools.com/catalog/product/cdh4/4-slot-cordless-tool-holder',
  productName: '4 Slot Cordless Tool Holder',
  manufacturerBrand: 'Matco Tools',
  manufacturerCode: 'CDH4',
  price: null,
  specs: [{ label: 'Category', value: 'Tool storage' }],
  description: '4 Slot Cordless Tool Holder from Matco Tools.',
})

if (!buf) {
  console.log('FAILED: returned null')
  process.exit(1)
}
fs.writeFileSync('./tmp_render/dom_inject_test2.png', buf)
console.log('OK, saved', buf.length, 'bytes')
