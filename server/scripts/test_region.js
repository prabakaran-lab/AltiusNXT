// Offline tests for region inference and the region-aware prompts (no network, no API keys needed).
//   node scripts/test_region.js
import assert from 'node:assert/strict'
import { inferRegion, regionIsActive, regionBuyerClause, regionSellerClause, userLocationFor } from '../src/services/region.js'
import { buildResearchPrompt } from '../src/services/crossEngineResearch.js'
import { searchPrompt } from '../src/services/outreachPipeline.js'
import { buildQueriesPrompt } from '../src/services/gemini.js'
import { openAiSearchTools, anthropicSearchTool } from '../src/services/liveEngines.js'
import { extractPriceSignals, prospectNameMatcher } from '../src/services/competitorBenchmark.js'

let failed = 0
const test = (name, fn) => {
  try { fn(); console.log(`  ok   ${name}`) } catch (err) { failed++; console.log(`  FAIL ${name}\n       ${String(err.message).split('\n')[0]}`) }
}
const ld = (cur) => `{"@type":"Product","offers":{"priceCurrency":"${cur}"}}`
const unknown = () => inferRegion({ url: 'https://x.com/p', html: '', pageText: '' })

console.log('inferRegion')
test('.co.nz domain -> NZ / NZD (medium alone, high with an NZD price)', () => {
  const alone = inferRegion({ url: 'https://x.co.nz/p', html: '', pageText: '' })
  assert.equal(alone.countryCode, 'NZ'); assert.equal(alone.currency, 'NZD'); assert.equal(alone.confidence, 'medium')
  assert.equal(inferRegion({ url: 'https://x.co.nz/p', html: ld('NZD'), pageText: '' }).confidence, 'high')
})
test('.com.au + AUD JSON-LD -> AU high', () => {
  const r = inferRegion({ url: 'https://x.com.au/p', html: ld('AUD'), pageText: '' })
  assert.equal(r.countryCode, 'AU'); assert.equal(r.confidence, 'high')
})
test('.co.uk -> GB', () => assert.equal(inferRegion({ url: 'https://x.co.uk/p', html: '', pageText: '' }).countryCode, 'GB'))
test('.co.za -> ZA', () => assert.equal(inferRegion({ url: 'https://x.co.za/p', html: '', pageText: '' }).countryCode, 'ZA'))
test('.com + USD JSON-LD + US address -> US high', () => {
  const r = inferRegion({ url: 'https://x.com/p', html: ld('USD'), pageText: '', placeInfo: { formattedAddress: '1 Main St, Austin, TX 78701, USA' } })
  assert.equal(r.countryCode, 'US'); assert.equal(r.confidence, 'high')
})
test('.com with no currency, address or phone -> unknown, no country assumed', () => {
  const r = inferRegion({ url: 'https://x.com/p', html: '<html lang="en">', pageText: 'Hello' })
  assert.equal(r.confidence, 'unknown'); assert.equal(r.country, ''); assert.equal(regionIsActive(r), false)
})
test('conflicting signals (.com.au domain, GBP price) -> low, not acted on', () => {
  const r = inferRegion({ url: 'https://x.com.au/p', html: ld('GBP'), pageText: '' })
  assert.equal(r.confidence, 'low'); assert.equal(r.country, ''); assert.equal(regionIsActive(r), false)
})
test('USD on a country domain is not read as the United States', () => {
  assert.notEqual(inferRegion({ url: 'https://x.co.nz/p', html: ld('USD'), pageText: '' }).countryCode, 'US')
})
test('EUR alone is ambiguous -> no country', () => {
  assert.equal(inferRegion({ url: 'https://x.com/p', html: ld('EUR'), pageText: '' }).country, '')
})
test('phone code and page language agree -> high', () => {
  const r = inferRegion({ url: 'https://x.com/p', html: '<html lang="en-NZ">', pageText: 'Call +64 9 123 4567' })
  assert.equal(r.countryCode, 'NZ'); assert.equal(r.confidence, 'high')
})
test('city is read from a business address', () => {
  const r = inferRegion({ url: 'https://x.co.nz/p', html: '', pageText: '', placeInfo: { formattedAddress: '12 Main St, Parnell, Auckland 1052, New Zealand' } })
  assert.equal(r.city, 'Auckland')
})
test('a suburb written beside its state is not used as the city; a US "City, ST zip" gives the city', () => {
  const au = inferRegion({ url: 'https://x.com.au/p', html: '', pageText: '', placeInfo: { formattedAddress: '1 Example Rd, Greenacre NSW 2190, Australia' } })
  assert.equal(au.city, '')
  const us = inferRegion({ url: 'https://x.com/p', html: ld('USD'), pageText: '', placeInfo: { formattedAddress: '1 Main St, Austin, TX 78701, USA' } })
  assert.equal(us.city, 'Austin')
})

console.log('prompts with NO region are identical to the code before this change')
const research = { productName: 'Test Widget 100', manufacturerBrand: 'Acme', knownCodes: ['AC-100'], sellerSku: '', unitOfSale: 'each', category: 'widget', dimensions: '100mm', price: '$10.00', url: 'https://shop.example/p/ac-100', country: '', currencyCode: '', claims: ['Claim one is stated here'], pageText: 'Sample page text' }
const queries = { productName: 'Test Widget 100', manufacturerBrand: 'Acme', manufacturerCode: 'AC-100', category: 'widget', location: '', attributes: ['100mm', 'steel'], country: '', avoid: [] }
// Captured from the code immediately before the region change, for the inputs above.
const GOLDEN = {
  "research": "I'm comparing a product listing against the manufacturer's real specifications and retailer prices. Please use web search for all of this.\n\nPRODUCT (as listed by the seller):\n- Product: Test Widget 100\n- Category: widget\n- Brand shown on the page: Acme\n- Part number shown on the page: AC-100\n- Pack / unit of sale (as far as the page shows): each\n- Attributes stated on the page: 100mm\n- Listed price: $10.00\n\nPART 1 — Manufacturer and part number. Find the real manufacturer/brand and the true manufacturer part number for this exact product, checking the manufacturer's own website or documentation where one exists. Quote what you find. If the number on the page is an industry-standard designation made by many brands rather than one maker's part number, say so.\n\nPART 2 — Check the listing's claims against the manufacturer's own documentation. For each numbered claim, answer CONFIRMED, CONTRADICTED or NOT VERIFIABLE, and support it with a direct quote from the manufacturer's documentation or another reliable source:\n1. \"Claim one is stated here\"\n\nPART 3 — Sellers. Find at least 4-6 current retailers selling this exact product, with each one's listed price in the listing's currency, whether it is in stock, and the exact configuration or pack size the price is for. Do not include sellers from other countries; if you cannot find enough, say how many you found rather than adding overseas retailers.\n\nPART 4 — The seller's own page. Open this exact page: https://shop.example/p/ac-100\nThe text retrieved from it is below. Use it, plus anything more you can see by opening the page. Tell me what the page states, what is missing or wrong for a buyer (including any site notice, naming inconsistency or checkout problem), and whether you would be confident recommending a buyer purchase from this page — yes, no, or with caveats — and why. Do not reply that you cannot access the page; if you cannot open it, review the retrieved text.\nPAGE TEXT:\n\"\"\"\nSample page text\n\"\"\"\n\nAnswer under the headings PART 1, PART 2, PART 3 and PART 4, with direct quotes and findings for each part.",
  "search": "A customer searches: \"test widget price\". Using current, real information you can find via web search, answer naturally (2-4 sentences) recommending specific real sellers or suppliers where relevant, with approximate current pricing if you find it. Plain text only — no markdown formatting.",
  "queries": "You are drafting buyer search queries for an AI-discoverability audit of a specific product.\n\nPRODUCT: Test Widget 100\nMANUFACTURER BRAND: Acme\nMANUFACTURER CODE: AC-100\nCATEGORY: widget\nDISTINGUISHING ATTRIBUTES (actually stated on the page): 100mm, steel\nBUYER COUNTRY / MARKET: unknown\nBUYER LOCATION: unknown\n\nPhrase every query the way a real buyer in the prospect's market types it — local spelling, local\nterms, and the country name where a buyer there would naturally add it (e.g. \"... price South Africa\"). Never name the\nseller's own store or website.\n\nWrite exactly 4 \"named\" queries (name the brand/model/product) covering these distinct intents, one each:\n1. The exact product, as a buyer would type it, with price intent (\"<product> price <country>\")\n2. Specifications confirmation (\"<product> specifications <key attribute> <country>?\")\n3. Where to buy (\"Where to buy <product> <country>?\")\n4. Cheapest / lowest price (\"Cheapest <product> for sale <country>?\")\n\nWrite exactly 2 \"category\" queries that do NOT name the brand or model at all — build these FROM THE DISTINGUISHING\nATTRIBUTES above, phrased around a real buying SITUATION a buyer would actually type, not just the attributes\nconcatenated. Prefer naming a plausible end-use or application when the category supports one (e.g. for a bearing:\n\"ball bearing, 7/8 OD x 5/16 bore, for an electric motor\" or \"bulk sealed ball bearings for electric motor\nmanufacturing\" rather than just \"2RS sealed ball bearing OD 0.875\"). If no attributes were given, fall back to the\ncategory name plus a buyer qualifier (location, bulk/volume, a typical use case) — never just the bare category name\nalone, and never a query that's just the brand/code rephrased.\n\nEvery query must be genuinely distinct in intent from every other query in its list — no near-duplicates (e.g.\n\"buy X\" and \"where to buy X\" count as the same intent; only include one).\n\nMake the second category query a local supplier / dealer search for this category in the buyer's market\n(e.g. \"<category> supplier <city or country>, <brand> dealer?\") — the one exception allowed to name the brand, as a\ndealer search, but never the model or code. Locate it at the level a buyer would type — the country, the state, or the\nnearest major city — never at suburb or street level, because a query that names the seller's own suburb mostly\nreturns the seller and says nothing about how AI treats it among competitors.\n\nReturn strict JSON with this exact shape:\n{ \"named\": string[], \"category\": string[] }\nExactly 4 named, exactly 2 category. Keep each query realistic and short, the way someone actually types it."
}
test('research prompt', () => assert.equal(buildResearchPrompt(research), GOLDEN.research))
test('research prompt, low-confidence region object', () => assert.equal(buildResearchPrompt({ ...research, region: unknown() }), GOLDEN.research))
test('buyer search prompt', () => assert.equal(searchPrompt('test widget price', ''), GOLDEN.search))
test('buyer search prompt, undefined region', () => assert.equal(searchPrompt('test widget price', '', undefined), GOLDEN.search))
test('buyer-query prompt', () => assert.equal(buildQueriesPrompt(queries), GOLDEN.queries))
test('buyer-query prompt, low-confidence region object', () => assert.equal(buildQueriesPrompt({ ...queries, region: unknown() }), GOLDEN.queries))

console.log('prompts WITH a region')
const nz = inferRegion({ url: 'https://x.co.nz/p', html: ld('NZD'), pageText: '', placeInfo: { formattedAddress: '12 Main St, Parnell, Auckland 1052, New Zealand' } })
const nzResearch = buildResearchPrompt({ ...research, country: nz.country, currencyCode: nz.currencyCode, region: nz })
const nzSearch = searchPrompt('test widget price', nz.country, nz)
const nzQueries = buildQueriesPrompt({ ...queries, country: nz.country, region: nz })
for (const [name, text] of [['research', nzResearch], ['buyer search', nzSearch], ['buyer-query', nzQueries]]) {
  test(`${name} prompt names New Zealand and NZD`, () => { assert.ok(text.includes('New Zealand')); assert.ok(text.includes('NZD')) })
}
test('the same clause wording is used everywhere', () => {
  assert.ok(nzResearch.includes(regionSellerClause(nz))); assert.ok(nzQueries.includes(regionBuyerClause(nz)))
  assert.ok(regionBuyerClause(nz).includes('Auckland, New Zealand'))
})
test('clauses are empty without an active region', () => {
  assert.equal(regionBuyerClause(unknown()), ''); assert.equal(regionSellerClause(undefined), '')
})

console.log('search-tool request bodies')
test('no userLocation -> exactly the previous tool declarations', () => {
  assert.deepEqual(openAiSearchTools(undefined), [{ type: 'web_search_preview' }])
  assert.deepEqual(anthropicSearchTool(6, undefined), { type: 'web_search_20250305', name: 'web_search', max_uses: 6 })
  assert.equal(userLocationFor(unknown()), undefined)
})
test('with a region -> approximate user_location', () => {
  const loc = userLocationFor(nz)
  assert.deepEqual(loc, { country: 'NZ', city: 'Auckland', timezone: 'Pacific/Auckland' })
  assert.deepEqual(openAiSearchTools(loc)[0].user_location, { type: 'approximate', ...loc })
  assert.deepEqual(anthropicSearchTool(6, loc).user_location, { type: 'approximate', ...loc })
})

console.log('price detection')
test("a market's own currency marker is read only once the market is known", () => {
  assert.equal(extractPriceSignals('Now only R1 299.00').length, 0)
  assert.equal(extractPriceSignals('Now only R1 299.00', { currencyCode: 'ZAR' })[0].value, 1299)
  assert.equal(extractPriceSignals('Price: ₹1,299', { currencyCode: 'INR' })[0].value, 1299)
  assert.equal(extractPriceSignals('A$72.95', { currencyCode: 'AUD' }).length, 1)
})

console.log('prospect name variants')
test('a trading-name variant of the prospect is the prospect; a seller sharing one generic word is not', () => {
  const isProspect = prospectNameMatcher({ names: ['Acme Tools'], domain: 'acmetools.com' })
  for (const n of ['Acme Industrial Tools', 'Acme Tools Inc.', 'acmetools.com']) assert.equal(isProspect(n), true, n)
  for (const n of ['Industrial Tools', 'Tool Depot', 'Acme Hardware']) assert.equal(isProspect(n), false, n)
  const both = prospectNameMatcher({ names: ['Industrial Supply Co'], domain: 'industrialsupply.com' })
  assert.equal(both('Industrial Supply Inc'), true); assert.equal(both('Industrial Safety'), false)
})

console.log(failed ? `\n${failed} test(s) FAILED` : '\nall tests passed')
process.exit(failed ? 1 : 0)
