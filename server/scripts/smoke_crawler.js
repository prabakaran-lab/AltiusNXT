import { findThinProductPages } from '../src/services/siteCrawler.js'
import { selectWeakProductAndIdentity } from '../src/services/gemini.js'

const domain = process.argv[2] || 'https://betteroffice.store'

console.log(`Crawling ${domain}...`)
const t0 = Date.now()
const result = await findThinProductPages(domain)
console.log(`\nDone in ${Date.now() - t0}ms. usedSitemap=${result.usedSitemap}, totalCandidatesScored=${result.totalCandidatesScored}`)
console.log('\nShortlist (thinnest first):')
result.shortlist.forEach((c, i) => console.log(`  ${i + 1}. score=${c.score}  ${c.url}`))

console.log('\nAsking Gemini to pick the weakest-but-identifiable one (with retry on failure)...')
const excludeIndexes = []
let picked = null
for (let attempt = 0; attempt < result.shortlist.length; attempt++) {
  const r = await selectWeakProductAndIdentity({ shortlist: result.shortlist, excludeIndexes })
  console.log(`  attempt ${attempt + 1}: identifiable=${r.identifiable}  ${r.identifiable ? `${r.manufacturerBrand} / ${r.manufacturerCode} (${r.url})` : r.reasoning}`)
  if (r.identifiable) { picked = r; break }
  if (r.originalIndex !== undefined) excludeIndexes.push(r.originalIndex)
  else break // no more candidates to exclude, selector gave up entirely
}

if (picked) {
  console.log('\nFINAL PICK:')
  console.log(JSON.stringify({ ...picked, pageText: picked.pageText.slice(0, 120) + '...' }, null, 2))
} else {
  console.log('\nNo identifiable product found on this site at all.')
}
