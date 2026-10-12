/* CatalogWiz AI walkthrough: sample data and the schedule.
   One circuit breaker (Schneider Electric TeSys Deca, TELGV3P73) travels through all five stages. All values are illustrative sample data.
   Content is a pure function of (stage, seconds into the stage), so pause, replay and jumping to a stage can never disagree. */

import { TESYS } from '../sampleProduct.js'

export const STAGES = [
  { id: 'connect', n: '01', label: 'Connect', dur: 8.5 },
  { id: 'enrich', n: '02', label: 'Enrich', dur: 15.5 },
  { id: 'review', n: '03', label: 'Review', dur: 10.5 },
  { id: 'approve', n: '04', label: 'Approve', dur: 7.5 },
  { id: 'publish', n: '05', label: 'Publish', dur: 10.5 },
]
export const HOLD = 3 // seconds the finished storefront stays before the loop restarts

export const PRODUCT = {
  raw: 'GV3P73 MOTOR CB 3P',
  sku: TESYS.sku,
  rawCategory: 'Circuit Breakers',
  title: TESYS.title,
  maker: TESYS.brand,
  taxonomy: TESYS.taxonomy,
  description: TESYS.description,
  metaTitle: 'Motor Circuit Breaker 3P | 73 A, 690 V ac, 65 kA | TeSys Deca',
  metaDescription: 'Schneider Electric TeSys Deca motor circuit breaker, 3 poles, 62-73 A, 690 V ac, DIN rail mount.',
  url: 'store.example.com/circuit-breakers/telgv3p73',
}

export const SOURCES = [
  { id: 'xls', kind: 'xls', title: 'Supplier Excel', file: 'supplier_pricelist.xlsx', line: 'Incomplete attributes' },
  { id: 'pdf', kind: 'pdf', title: 'Technical PDF', file: 'TELGV3P73_datasheet.pdf', line: 'Ratings, standards, mounting' },
  { id: 'img', kind: 'img', title: 'Product Image', file: 'TELGV3P73.jpg', line: 'Physical product reference' },
]

/* Attributes animated in detail. `supplier` = what the Excel gave (null = missing). `ai` = what AI suggests. */
export const ATTRS = [
  { id: 'voltage', label: 'AC voltage rating', supplier: null, ai: '690 V ac', src: 'PDF p.2', conf: 96, quote: 'Rated operational voltage Ue 690 V ac' },
  { id: 'breaking', label: 'Interrupting rating', supplier: null, ai: '65 kA', src: 'PDF p.3', conf: 94, quote: 'Breaking capacity Icu 65 kA at 230/240 V ac' },
  { id: 'poles', label: 'Number of poles', supplier: '3P / 3 pole', ai: '3', src: 'Excel + PDF p.2', conf: 99, quote: 'Poles 3P (three poles)' },
  { id: 'mounting', label: 'Mounting type', supplier: null, ai: 'DIN Rail', src: 'PDF p.4', conf: 92, quote: 'Mounting: DIN rail or screw fixing' },
]
export const EXTRA = [['Brand', 'Schneider Electric'], ['Trip type', 'Type F'], ['Terminals', 'Screw Clamp'], ['Trip unit', 'Thermal Magnetic'], ['Operating temp.', '-20 to 60 °C'], ['IP rating', 'IP20'], ['Width', '55 mm'], ['Weight', '0.96 kg'], ['Insulation voltage', '690 V ac'], ['Frequency', '50/60 Hz'], ['Application', 'Motor Protection'], ['Series', 'TeSys Deca']]
export const ALL_ATTRS = [['Current rating', '73 A'], ...ATTRS.map((a) => [a.label, a.ai]), ...EXTRA]
export const CHANNELS = ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Amazon', 'Flipkart']

const at = (t, ...marks) => marks.filter((m) => t >= m).length // how many of an ascending list of times have passed
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/* ---------- per-stage content as a function of time ---------- */
export function stateAt(stage, t) {
  switch (stage) {
    case 0: return connect(t)
    case 1: return enrich(t)
    case 2: return review(t)
    case 3: return approve(t)
    default: return publish(t)
  }
}

function connect(t) {
  const shown = [0.2, 0.5, 0.8].map((m) => t >= m)
  const link = [1.0, 2.7, 4.4].map((m) => t >= m) // connector drawn and lit
  const imported = [2.0, 3.7, 5.4].map((m) => t >= m)
  const importing = [1.0, 2.7, 4.4].map((m, i) => t >= m && !imported[i])
  return {
    shown, link, imported, importing,
    count: imported.filter(Boolean).length,
    title: t >= 2.3, thumb: t >= 5.7, attrs: at(t, 3.0, 3.4, 4.0) , // supplier-provided rows appear
    missing: at(t, 6.2, 6.5, 6.8, 7.1), // missing indicators one by one
    ready: t >= 7.2,
  }
}

const FIND = [1.8, 3.3, 4.8, 6.3] // an attribute starts being analysed; it resolves 1 s later
function enrich(t) {
  const rows = ATTRS.map((_, i) => (t >= FIND[i] + 1 ? 'found' : t >= FIND[i] ? 'scan' : 'idle'))
  const found = rows.filter((r) => r === 'found').length
  const extra = clamp(Math.floor((t - 7.6) / 0.35) + 1, 0, EXTRA.length)
  return {
    rows, found, extra,
    active: t >= 1.0 && t < 14.0,
    pct: Math.min(98, 22 + found * 5 + extra * 4 + (t >= 13.0 ? 4 : 0) + (t >= 13.5 ? 4 : 0)),
    images: clamp(Math.floor((t - 8.4) / 0.55) + 1, 0, 6),
    taxonomy: at(t, 11.9, 12.2, 12.5), title: t >= 12.4, desc: t >= 13.0, seo: t >= 13.5, done: t >= 14.2,
  }
}

/* review: each item is reviewing → decided. mounting is flagged, then edited. */
function review(t) {
  const item = (start, decide) => (t >= decide ? 'done' : t >= start ? 'checking' : 'idle')
  const voltage = item(0.8, 2.0)
  const breaking = item(2.4, 3.6)
  const taxonomy = item(4.0, 5.0)
  const mounting = t >= 8.2 ? 'done' : t >= 7.0 ? 'edit' : t >= 5.6 ? 'flag' : 'idle'
  const done = [voltage, breaking, taxonomy, mounting].filter((s) => s === 'done').length
  const active = voltage === 'checking' ? 0 : breaking === 'checking' ? 1 : taxonomy === 'checking' ? 2 : mounting === 'flag' || mounting === 'edit' ? 3 : -1
  const press = (m) => t >= m && t < m + 0.35
  return {
    voltage, breaking, taxonomy, mounting, done, active,
    pressApprove: press(1.8) || press(3.4) || press(4.8),
    pressEdit: press(7.0),
    pct: Math.round(92 + done * 2),
    complete: t >= 9.0,
  }
}

function approve(t) {
  return {
    card: t >= 0.2, specs: clamp(Math.floor((t - 0.4) / 0.18) + 1, 0, ALL_ATTRS.length), taxonomy: t >= 3.7, desc: t >= 3.9,
    checks: at(t, 2.0, 2.8, 3.6, 4.4), stamp: t >= 5.3, pct: 100,
  }
}

function publish(t) {
  return {
    checks: at(t, 0.4, 0.9, 1.4, 1.9), channels: t >= 2.2, selected: t >= 3.2,
    flow: t >= 3.7, store: t >= 3.9, image: t >= 4.8, title: t >= 5.3,
    specs: clamp(Math.floor((t - 5.8) / 0.1) + 1, 0, ALL_ATTRS.length), desc: t >= 7.7, docs: t >= 8.1,
    pct: Math.round(clamp((t - 3.7) / 5.2, 0, 1) * 100), success: t >= 8.9,
    fly: [[4.0, 4.8], [4.6, 5.3], [5.2, 5.9], [7.0, 7.7], [7.5, 8.1]].findIndex(([a, b]) => t >= a && t < b),
  }
}

/* is the clock's current state also what the section should look like when motion is reduced (everything settled)? */
export const settled = (stage) => STAGES[stage].dur
export { clamp }
