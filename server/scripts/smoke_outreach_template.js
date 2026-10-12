import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOutreachReportHtml } from '../src/templates/outreachReportTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const params = {
  lead: {
    company: 'Better Office Supplies',
    contactName: 'Livi',
    contactTitle: 'Operations Manager',
    website: 'betterofficesupplies.com.au',
    location: 'Sydney, Australia',
    timezoneLabel: 'AEST',
    email: 'livi@betterofficesupplies.com.au',
  },
  product: {
    name: 'A4 Copy Paper 80gsm Carton',
    manufacturerBrand: 'Reflex',
    manufacturerCode: 'R0400101',
    url: 'https://betterofficesupplies.com.au/products/reflex-a4-copy-paper-80gsm-carton',
    category: 'Copy Paper',
  },
  stats: {
    citedCount: 0,
    totalQueries: 5,
    priceRank: '2nd lowest',
    priceRankLabel: 'of 8 sellers',
    sellerCount: 8,
    priceLow: 'A$67.00',
    priceHigh: 'A$90.75',
    currency: 'AUD',
  },
  headline: {
    line1: 'Competitively priced.',
    line2: 'Available to order.',
    line3: 'Not cited by AI LLMs.',
  },
  methodology: [
    { title: '8 buyer queries', body: 'Worded the way a real buyer would ask them, across named-product and broader category phrasings.' },
    { title: '3 AI LLMs, tested live', body: 'ChatGPT, Claude and Gemini were queried directly, in real time, on the audit date.' },
    { title: 'Verified at source', body: 'Every seller citation and price point was checked against the live page at the time of the audit.' },
  ],
  queries: {
    named: [
      { query: 'Where can I buy Reflex A4 copy paper 80gsm in bulk?', sellersCited: ['Officeworks', 'Winc'], prospectCited: false, note: null },
      { query: 'Best price on Reflex A4 copy paper carton Australia', sellersCited: ['Winc', 'Staples'], prospectCited: false, note: 'Price comparison limited to sellers with visible stock status.' },
      { query: 'Who sells Reflex 80gsm copy paper near Sydney?', sellersCited: ['Officeworks'], prospectCited: false, note: null },
      { query: 'Reflex A4 copy paper 80gsm carton supplier', sellersCited: ['Winc', 'Lyreco'], prospectCited: false, note: null },
      { query: 'Cheapest Reflex A4 copy paper 80gsm carton online', sellersCited: ['Staples', 'Winc'], prospectCited: false, note: null },
    ],
    category: [
      { query: 'Best office copy paper supplier in Australia', sellersCited: ['Officeworks', 'Winc', 'Staples'], prospectCited: false, note: null },
      { query: 'Where to buy bulk A4 copy paper for an office', sellersCited: ['Officeworks', 'Winc'], prospectCited: false, note: 'Category queries do not name a specific brand or SKU.' },
      { query: 'Reliable copy paper supplier for small business Sydney', sellersCited: ['Lyreco'], prospectCited: false, note: null },
    ],
  },
  quotes: {
    chatgpt: 'The page confirms the product is in stock and priced competitively, but it gives me no specification detail or brand assurance I could use to recommend it over a seller I already recognise.',
    claude: 'There is no structured data on this page I can use to compare it against other listings — just a title, a price, and an add-to-cart button.',
  },
  commercialImplications: 'Every one of these queries is a real purchase moving through an AI assistant today. Because Better Office Supplies is competitively priced and in stock, the gap costing them orders is not price or availability — it is that AI assistants have no evidence on the page strong enough to cite them by name.',
  gaps: [
    { title: 'No brand or manufacturer code shown', detail: 'The page does not surface "Reflex" or the manufacturer SKU, so AI assistants cannot confidently match this listing to the specific product a buyer asked about.' },
    { title: 'No structured product data', detail: 'There is no JSON-LD or schema.org markup, so search engines and AI crawlers have nothing machine-readable to index beyond the visible text.' },
    { title: 'No specification detail', detail: 'Sheet count, weight, brightness rating and FSC certification are not listed, all of which buyers and AI assistants use to compare equivalent cartons.' },
    { title: 'No comparison or equivalence content', detail: 'The page does not mention comparable products or alternatives, so it cannot be cited as an authority on this product category.' },
    { title: 'Thin page content overall', detail: 'At under 40 words of body copy, the page gives both search engines and AI assistants very little first-party evidence to work with.' },
  ],
  strengths: 'The page loads quickly, shows accurate live stock status, and is priced second-lowest of the eight sellers we found listing this product — a genuinely strong commercial position. Note that price and availability are only two of many factors AI assistants and search engines weigh when deciding which page to cite.',
  specDepth: [
    { label: 'Better Office Supplies', count: 2, highlight: true },
    { label: 'Officeworks', count: 9 },
    { label: 'Winc', count: 11 },
    { label: 'Staples', count: 7 },
    { label: 'Lyreco', count: 8 },
  ],
  specDepthCaption: 'Spec count = number of distinct product attributes (weight, brightness, sheet count, certification, etc.) visible on each seller\'s page at the time of the audit.',
  beforeAfter: {
    currentBullets: [
      'Title: "Reflex A4 Copy Paper Carton"',
      'Brand: not stated',
      'Price: A$67.00 · Stock: in stock',
      'Specs shown: 2',
      'Structured data: none',
    ],
    enrichedBullets: [
      'Title: "Reflex A4 Copy Paper 80gsm, FSC-Certified, 5 Reams/Carton (2500 Sheets)"',
      'Brand: Reflex (manufacturer code R0400101)',
      'Price: A$67.00 · Stock: in stock, same-day dispatch',
      'Specs shown: 9 (weight, brightness, sheet count, ream count, certification, size, colour, opacity, recycled content)',
      'Structured data: Product schema with price, availability and brand',
    ],
    caption: 'Mock-up only — same price and stock position, rebuilt with the attributes AI assistants and buyers use to compare equivalent cartons.',
  },
  businessImpact: [
    { title: 'Citation in AI answers:', detail: 'a page with full specification and structured data gives AI assistants the evidence needed to name Better Office Supplies instead of a generic recommendation.' },
    { title: 'Higher conversion from existing traffic:', detail: 'buyers who do land on the page can confirm suitability without leaving to check a competitor\'s spec sheet.' },
    { title: 'Reduced price-only competition:', detail: 'differentiated specification content gives buyers a reason to choose this listing beyond price alone.' },
  ],
  priceComparison: [
    { seller: 'Better Office Supplies', price: 'A$67.00', isProspect: true },
    { seller: 'Staples', price: 'A$69.50', isProspect: false },
    { seller: 'Lyreco', price: 'A$74.00', isProspect: false },
    { seller: 'Winc', price: 'A$81.25', isProspect: false },
    { seller: 'Officeworks', price: 'A$90.75', isProspect: false },
  ],
  priceComparisonCaption: 'Listed carton prices as shown on each seller\'s live page at the time of the audit; excludes membership or bulk-tier discounts not visible without an account.',
  revenueTable: {
    unitLabel: 'cartons',
    unitPrice: 'A$72.95',
    currency: 'AUD',
    tiers: [
      { unitsPerMonth: 10, perMonth: 'A$729.50', perYear: 'A$8,754' },
      { unitsPerMonth: 25, perMonth: 'A$1,823.75', perYear: 'A$21,885' },
      { unitsPerMonth: 50, perMonth: 'A$3,647.50', perYear: 'A$43,770' },
    ],
    caption: 'Illustrative scenarios at the average listed price across the sellers AI cited (A$72.95) — not an estimate of Better Office Supplies\' actual order volume or lost revenue.',
  },
  methodologyDate: 'September 2026',
  refSummaryNote: 'The clearest gap here is in content, not price. Better Office Supplies is already competitive on cost and stock — closing the specification and structured-data gap is the fastest lever to being cited where buyers are already asking.',
  nextSteps: {
    optionA: {
      title: '20-Minute Technical Walkthrough',
      body: 'A focused screen-share with our catalog engineering team to review the raw query logs, a JSON-LD schema prototype for this exact product, and a remediation path for your top SKUs.',
      contact: 'Contact: govind@altiusnxt.com',
    },
    optionB: {
      title: 'Self-Serve Audit Review',
      body: 'We send the full audit (all queries, all engines, the complete 15-point scorecard) for your team to review on your own schedule, no call required.',
      note: 'Just reply to request it.',
    },
  },
  availableOnRequest: 'full query transcripts, the 15-point AEO scorecard, and a JSON-LD schema prototype for this product.',
  sender: {
    name: 'Govind',
    title: 'Business Unit Head',
    company: 'AltiusNxt Technologies',
    email: 'govind@altiusnxt.com',
  },
  unsubscribeEmail: 'unsubscribe@altiusnxt.com',
}

const html = buildOutreachReportHtml(params)

const outPath = path.join(__dirname, '..', 'tmp_outreach_smoke.html')
fs.writeFileSync(outPath, html, 'utf8')
console.log('Wrote', outPath, `(${html.length} bytes)`)

const checks = []

checks.push(['contains "AI READINESS REPORT"', html.includes('AI READINESS REPORT')])
for (let i = 1; i <= 6; i++) {
  checks.push([`contains "Page ${i} of 6"`, html.includes(`Page ${i} of 6`)])
}

let ok = true
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${label}`)
  if (!pass) ok = false
}

const undefinedMatches = html.match(/undefined/g) || []
const nanMatches = html.match(/NaN/g) || []

if (undefinedMatches.length) {
  ok = false
  console.log(`FAIL - found ${undefinedMatches.length} literal "undefined" occurrence(s) in output`)
} else {
  console.log('PASS - no literal "undefined" in output')
}

if (nanMatches.length) {
  ok = false
  console.log(`FAIL - found ${nanMatches.length} literal "NaN" occurrence(s) in output`)
} else {
  console.log('PASS - no literal "NaN" in output')
}

console.log(ok ? '\nSMOKE TEST PASSED' : '\nSMOKE TEST FAILED')
process.exit(ok ? 0 : 1)
