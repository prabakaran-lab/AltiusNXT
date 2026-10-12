import fs from 'node:fs'
import { captureEnrichedMockupScreenshot } from '../src/services/pageScreenshots.js'

const buf = await captureEnrichedMockupScreenshot({
  url: 'https://betteroffice.store/products/toilet-tissue-livi-essentials-2ply-700s',
  productName: 'Toilet Tissue Livi Essentials 2ply 700s (BX48)',
  manufacturerBrand: 'Livi',
  manufacturerCode: 'Essentials 2ply 700s',
  price: '$72.95',
  specs: [
    { label: 'Ply', value: '2' },
    { label: 'Sheets per roll', value: '700' },
    { label: 'Rolls per carton', value: '48' },
    { label: 'Material', value: 'single ply paper' },
  ],
  description: 'Toilet tissue, Livi Essentials 2ply 700s (BX48) from Livi — toilet tissue carton.',
})

if (!buf) {
  console.log('FAILED: returned null')
  process.exit(1)
}
fs.writeFileSync('./tmp_render/dom_inject_test.png', buf)
console.log('OK, saved', buf.length, 'bytes')
