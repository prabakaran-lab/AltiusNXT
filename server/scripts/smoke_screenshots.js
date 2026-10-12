import fs from 'node:fs'
import path from 'node:path'
import { captureCurrentPageScreenshot, captureEnrichedMockupScreenshot } from '../src/services/pageScreenshots.js'

const outDir = path.resolve('scripts', 'smoke_output')
fs.mkdirSync(outDir, { recursive: true })

const MIN_BYTES = 5 * 1024

function checkBuffer(label, buf) {
  if (!buf) {
    console.log(`FAIL  ${label}: got null`)
    return false
  }
  if (!Buffer.isBuffer(buf)) {
    console.log(`FAIL  ${label}: not a Buffer`)
    return false
  }
  if (buf.length <= MIN_BYTES) {
    console.log(`FAIL  ${label}: only ${buf.length} bytes (<= ${MIN_BYTES})`)
    return false
  }
  console.log(`PASS  ${label}: ${buf.length} bytes`)
  return true
}

console.log('Capturing live page screenshot (https://example.com)...')
const liveBuf = await captureCurrentPageScreenshot('https://example.com')
if (liveBuf) fs.writeFileSync(path.join(outDir, 'live_page.png'), liveBuf)
const livePass = checkBuffer('captureCurrentPageScreenshot', liveBuf)

console.log('\nCapturing enriched mock-up screenshot (fake data)...')
const mockBuf = await captureEnrichedMockupScreenshot({
  productName: '1/2" NPT Brass Ball Valve, Full Port, 600 WOG',
  manufacturerBrand: 'Apollo Valves',
  manufacturerCode: '77A-104-01',
  price: 24.99,
  specs: [
    { label: 'Material', value: 'Forged Brass' },
    { label: 'Port Type', value: 'Full Port' },
    { label: 'Connection', value: '1/2" NPT Threaded' },
    { label: 'Pressure Rating', value: '600 WOG / 150 SWP' },
    { label: 'Temperature Range', value: '-20°F to 400°F' },
  ],
  description:
    'Heavy-duty forged brass ball valve designed for water, oil, and gas shut-off applications. ' +
    'Full port design minimizes flow restriction. Features a blow-out proof stem and reinforced PTFE seats for a durable, long-lasting seal.',
})
if (mockBuf) fs.writeFileSync(path.join(outDir, 'mockup_page.png'), mockBuf)
const mockPass = checkBuffer('captureEnrichedMockupScreenshot', mockBuf)

console.log(`\nOutput written to ${outDir}`)
console.log(`\nOVERALL: ${livePass && mockPass ? 'PASS' : 'FAIL'}`)
process.exit(livePass && mockPass ? 0 : 1)
