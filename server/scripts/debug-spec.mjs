import fs from 'node:fs'
import { extractReadableText } from '../src/services/scrapeDo.js'

const html = fs.readFileSync(process.argv[2], 'utf8')
const t = extractReadableText(html, 10000).toLowerCase()
const labels = ['brand', 'manufacturer', 'part number', 'mpn', 'model', 'sku', 'upc', 'voltage', 'input voltage', 'amperage', 'amps',
  'output', 'duty cycle', 'phase', 'power', 'wattage', 'horsepower', 'torch', 'lead length', 'cable length', 'cut capacity',
  'cut thickness', 'capacity', 'weight', 'dimensions', 'length', 'width', 'height', 'depth', 'diameter', 'bore', 'outer diameter',
  'inner diameter', 'thread', 'material', 'finish', 'color', 'colour', 'size', 'load rating', 'speed', 'rpm', 'temperature',
  'pressure', 'flow rate', 'seal', 'warranty', 'certification', 'includes', "what's included", 'in the box', 'compatibility',
  'ply', 'sheets', 'pack', 'quantity', 'country of origin']
for (const label of labels) {
  const l = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${l}\\b\\s*[:\\-–|]|\\b${l}\\b[^.\\n]{0,30}\\d`)
  const m = t.match(re)
  if (m) console.log(label.padEnd(16), '=>', JSON.stringify(t.slice(Math.max(0, m.index - 25), m.index + 55)))
}
console.log('readable length', t.length)
