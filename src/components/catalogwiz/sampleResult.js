/* Turns one of the catalog sample products into the same data shape the live enrichment returns, so the samples are
   shown in the same interactive Before / After window as a visitor's own page.
   Nothing is written per product: the raw supplier listing, the enriched title / description / taxonomy, and the
   attribute values all come from the existing sample data (catalogSamples.js, the circuit-breaker sample, and the
   Category Attribute Guide), and the attribute order follows the catalog's own published order. */
import { TESYS } from '../sampleProduct.js'
import { SAMPLES } from '../catalogSamples.js'
import { CATEGORIES } from '../../pages/attributeLibraryData.js'
import { PRODUCT } from '../walkthrough/data.js'

// Category Attribute Guide id -> key in SAMPLES (the circuit breaker has its own data in TESYS)
const SAMPLE_KEY = { industrial: 'bearings', ppe: 'gloves' }
const BRAND_RE = /^(brand|manufacturer|mfr|make)\b/i

/** 'SKU: 2120-2500 | Brand: Abbott Rubber | MPN: 2120-2500' -> { SKU, Brand, MPN } */
function parseMeta(meta = '') {
  const out = {}
  for (const part of meta.split('|')) {
    const i = part.indexOf(':')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

/** `p` is one of EnrichDemo's sample products ({ id, sku, img, raw: [[label, supplier value]], changes: [{ k: 'norm' | 'fill', ... }] }). */
export function buildSampleResult(p) {
  const category = CATEGORIES.find((c) => c.id === p.id)
  const s = p.id === 'electronic' ? null : SAMPLES[SAMPLE_KEY[p.id] || p.id]
  const meta = s ? parseMeta(s.rich.meta) : { Brand: TESYS.brand, MPN: TESYS.sku }
  const title = s ? s.rich.title : TESYS.title
  const description = s ? s.description : TESYS.description
  const taxonomy = s ? s.rich.taxonomy : TESYS.taxonomy
  const rawTitle = s ? s.raw.title : PRODUCT.raw
  const displayUrl = s ? s.slug.replace(/\s*›\s*/g, '/') : PRODUCT.url

  const rawMap = new Map(p.raw)
  const tidied = new Map(p.changes.filter((c) => c.k === 'norm').map((c) => [c.l, c]))
  const filled = new Map(p.changes.filter((c) => c.k === 'fill').map((c) => [c.l, c]))
  const supplierBrand = p.raw.find(([l]) => BRAND_RE.test(l))

  // Identity first, in a fixed order: manufacturer name, manufacturer part number, SKU. Then the catalog's own order.
  const attributes = [
    { label: 'Mfr. Name', value: meta.Brand, before: supplierBrand ? supplierBrand[1] : '', group: 'general', source: 'web' },
    { label: 'Mfr. Part Number', value: meta.MPN, before: '', group: 'general', source: 'web' },
    { label: 'SKU', value: p.sku, before: rawMap.get('SKU') || '', group: 'general', source: 'page' },
  ].filter((a) => a.value)
  for (const [label] of category.attrs) {
    if (BRAND_RE.test(label)) continue // already the "Mfr. Name" row
    if (tidied.has(label)) attributes.push({ label, value: tidied.get(label).to, before: tidied.get(label).from, group: 'general', source: 'page' })
    else if (rawMap.has(label)) attributes.push({ label, value: rawMap.get(label), before: rawMap.get(label), group: 'general', source: 'page' })
    else if (filled.has(label)) attributes.push({ label, value: filled.get(label).to, before: '', group: 'general', source: 'web' })
  }

  return {
    sample: true,
    host: 'Sample Industrial Supply',
    displayUrl,
    image: p.img,
    before: {
      title: rawTitle,
      description: '',
      attributes: p.raw, // the raw supplier listing, exactly as sent
      crumbs: ['Home', taxonomy[1] || taxonomy[0]].filter(Boolean), // a supplier file only has one flat category
    },
    after: { title, description, attributes, taxonomy },
    stats: { before: p.raw.length, after: attributes.length, technical: null },
    sources: [],
  }
}
