import { captureCurrentPageAndHeader, captureEnrichedMockupScreenshot } from '../src/services/pageScreenshots.js'
import fs from 'node:fs'

const t0 = Date.now()
const { fullScreenshot, headerCrop } = await captureCurrentPageAndHeader('https://shop.bearingheadquarters.com/item/B83IT37290/C40-16-BROWNING/')
console.log(`captureCurrentPageAndHeader: ${Date.now() - t0}ms, fullScreenshot=${fullScreenshot?.length ?? 'null'} bytes, headerCrop=${headerCrop?.length ?? 'null'} bytes`)

if (fullScreenshot) fs.writeFileSync('test_full.png', fullScreenshot)
if (headerCrop) fs.writeFileSync('test_header.png', headerCrop)

const composited = await captureEnrichedMockupScreenshot({
  productName: 'C40 16 BROWNING V-Belt Sheave',
  manufacturerBrand: 'Browning',
  manufacturerCode: 'C40-16',
  price: '$344.64',
  specs: [{ label: 'Bore diameter', value: '1.4375 in' }, { label: 'Outside diameter', value: '4.25 in' }],
  description: 'Browning C40-16 cast iron sheave for V-belt power transmission.',
  headerCrop,
})
console.log(`captureEnrichedMockupScreenshot (with header): ${composited?.length ?? 'null'} bytes`)
if (composited) fs.writeFileSync('test_composited.png', composited)

console.log(`Total: ${Date.now() - t0}ms`)
