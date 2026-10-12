import fs from 'node:fs'
import { captureEnrichedMockupScreenshot } from '../src/services/pageScreenshots.js'

const buf = await captureEnrichedMockupScreenshot({
  url: 'https://www.epco-sales.com/power-transmission-supplies/bearings/ball-bearings/ball-bearings/b1603-2rs',
  productName: 'PEER 1603-2RS Radial Ball Bearing (5/16" x 7/8" x 11/32")',
  manufacturerBrand: 'PEER',
  manufacturerCode: '1603-2RS',
  price: '$4.06',
  specs: [
    { label: 'Bore diameter', value: '0.3125 in' },
    { label: 'Outside diameter', value: '0.8750 in' },
    { label: 'Width', value: '0.3438 in' },
    { label: 'Dynamic load rating', value: '450 lbf' },
    { label: 'Static load rating', value: '220 lbf' },
    { label: 'Speed rating', value: '32,000 rpm' },
    { label: 'Seal type', value: 'Double rubber seal (2RS)' },
    { label: 'Temperature range', value: '-20F to 250F' },
    { label: 'Material', value: 'Chrome steel' },
  ],
  description: 'PEER 1603-2RS Radial Ball Bearing — sealed deep-groove ball bearing for electric motors, conveyors and go-kart axles.',
})

if (!buf) {
  console.log('FAILED: returned null')
  process.exit(1)
}
fs.writeFileSync('./tmp_render/dom_inject_test3.png', buf)
console.log('OK, saved', buf.length, 'bytes')
