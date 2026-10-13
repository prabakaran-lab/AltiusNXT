import { config } from '../config.js'
import { callGemini } from './gemini.js'
import { scrapeProductPage, fetchProductImage } from './catalogwizScrape.js'

/**
 * CatalogWiz live demo: enriches one product page (title, description, 15+ attributes).
 *
 * Two steps, in this order:
 *  1. SCRAPE (catalogwizScrape.js): the page is fetched through Scrape.do and parsed into data: title, every labelled
 *     attribute, identifiers, breadcrumbs, description and the product image. This is the page's ground truth.
 *  2. ENRICH (this file): the AI works on that data and may only
 *       - tidy the units / spacing of a value the page already states (checked in code: same numbers, no new words),
 *       - drop shop clutter that was scraped as an attribute (stock, cart), never a real specification,
 *       - add NEW attributes, each with a verbatim quote from the page or from manufacturer research.
 *     Manufacturer research is used only if it is shown to be about THIS product (it must contain one of the page's
 *     own identifiers); otherwise it is discarded, so another vendor's product can never leak in.
 * Anything the code cannot verify is dropped, never shown.
 */

export const MIN_ATTRIBUTES = 15
export const MIN_TECHNICAL = 5
// A second search for more verified attributes runs below this, so a result lands comfortably above the minimum.
const COMFORT_ATTRIBUTES = 18
const MAX_ATTRIBUTES = 26

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const alnum = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const padded = (s) => ` ${norm(s)} `
const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// Sales wording is not a product attribute, whatever the page says.
const MARKETING = /\b(sleek|optimi[sz]ed?|improved|powerful|premium|superior|innovative|advanced|cutting[- ]edge|state[- ]of[- ]the[- ]art|ergonomic|high[- ]quality|best[- ]in[- ]class|ultimate|exceptional|unmatched)\b/i
const VAGUE = /^(n\/?a|none|unknown|not (?:specified|stated|available|applicable)|various|varies|tbc|tbd|-+)$/i
const hasDigit = (t) => /\d/.test(t)
const ID_LABEL = /\b(part|sku|mpn|model|item|catalog(?:ue)?|style|upc|ean|gtin|isbn|product code|stock code|article)\b/i

/** Numbers in a text ("18", "0.1303", "8,500"), as plain digit strings. */
const numbersIn = (s) => (String(s || '').match(/\d+(?:[.,]\d+)*/g) || []).map((n) => n.replace(/,(?=\d{3}\b)/g, '').replace(',', '.'))
/** True when the number appears in the raw text as its own number, so "25" is found in "25x52x15mm" but not in "125" or "2.5". */
const numberIn = (rawText, n) => new RegExp(`(?<![\\d.,])${n.replace(/\./g, '[.,]')}(?![\\d]|[.,]\\d)`).test(String(rawText).toLowerCase().replace(/(\d),(?=\d{3}\b)/g, '$1'))

// Words that may appear when a value's units are written out or abbreviated ("7"" -> "7 in"), never a new fact.
const UNIT_WORDS = new Set(['in', 'inch', 'inches', 'mm', 'cm', 'm', 'ft', 'foot', 'feet', 'yd', 'kg', 'g', 'lb', 'lbs', 'oz', 'v', 'a', 'w', 'kw', 'hp', 'rpm', 'hz', 'khz', 'psi', 'bar', 'kn', 'n', 'nm', 'pa', 'kpa', 'mpa', 'l', 'ml', 'ah', 'mah', 'db', 'min', 's', 'h', 'c', 'f', 'deg', 'degrees', 'ac', 'dc', 'x', 'mph', 'kph', 'gpm', 'cfm', 'dia', 'od', 'id'])

/** A tidied value is accepted only if it says the same thing: identical numbers, and no word the page did not use (units aside). */
function equivalent(orig, cleaned) {
  const nums = (s) => numbersIn(s).sort().join(',')
  if (nums(orig) !== nums(cleaned)) return false
  const words = (s) => norm(s).split(' ').filter((t) => /[a-z]/.test(t) && !hasDigit(t))
  const ow = new Set(words(orig))
  const cw = new Set(words(cleaned))
  const has = (set, t) => set.has(t) || set.has(t.replace(/s$/, '')) || set.has(`${t}s`)
  // two-way: nothing new may appear (units aside), and nothing the page said may be lost ("7/8 open" must keep "open")
  return [...cw].every((t) => has(ow, t) || UNIT_WORDS.has(t)) && [...ow].every((t) => has(cw, t) || UNIT_WORDS.has(t))
}

/** Gemini's web-search tool for manufacturer data on this exact product; the text counts only if it names one of the page's own identifiers. */
async function researchManufacturer({ queries, identifiers }) {
  // One focused search; if it returns little, one more with different wording. Each result is checked on its own.
  const merged = { text: '', sources: [] }
  for (const query of queries.filter(Boolean).slice(0, 2)) {
    const r = await researchOnce({ query, identifiers })
    if (r.text) {
      merged.text = `${merged.text} ${r.text}`.trim().slice(0, 6000)
      for (const s of r.sources) if (!merged.sources.some((m) => m.title === s.title)) merged.sources.push(s)
    }
    if (merged.text.length >= 1200) break
  }
  return merged
}

async function researchOnce({ query, identifiers }) {
  if (!query || !identifiers.length) return { text: '', sources: [] }
  const prompt = `Find the manufacturer's own official product page or datasheet for this exact product: ${query}
It is identified on the seller's page by: ${identifiers.join(' / ')}.
List the specifications the manufacturer publishes for exactly this product, as plain sentences with their values: dimensions, ratings, weight, capacity, speed, power, materials, grades, certifications, compatibility, warranty, what is in the pack.
Only include values you actually find stated for this exact product. Do not estimate, do not give typical values for the category, and never mix in a different model or a different manufacturer's product. If you cannot find a page that shows one of the identifiers above, reply only with: NOT FOUND`
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.1 } }),
      signal: AbortSignal.timeout(50000),
    })
    if (!res.ok) throw new Error(`status ${res.status}`)
    const cand = (await res.json())?.candidates?.[0]
    const text = (cand?.content?.parts || []).map((p) => p.text).filter(Boolean).join(' ').trim()
    if (!text || /^NOT FOUND\b/i.test(text)) return { text: '', sources: [] }
    // The guard against another product's data: the research must contain one of this page's own identifiers.
    const hay = alnum(text)
    if (!identifiers.some((id) => alnum(id).length >= 4 && hasDigit(id) && hay.includes(alnum(id)))) {
      console.log('[catalogwiz] manufacturer research discarded: it does not mention any identifier from the page')
      return { text: '', sources: [] }
    }
    const seen = new Set()
    const sources = (cand?.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter(Boolean)
      .map((w) => ({ title: clean(w.title) || 'web source' }))
      .filter((s) => !seen.has(s.title) && seen.add(s.title))
      .slice(0, 5)
    return { text: text.slice(0, 5000), sources }
  } catch (err) {
    console.warn(`[catalogwiz] manufacturer research failed (${err.message}); continuing with the page only`)
    return { text: '', sources: [] }
  }
}

/** Reads text printed on the product photo (brand mark, part number). Used only to aim the search, never shown as a fact. */
async function readPhoto(dataUrl) {
  try {
    const [, b64] = dataUrl.split(',')
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { text: 'This is a product photo. Read the text printed on the product, its label or its packaging. Return strict JSON: {"brand": string, "partNumber": string}. "brand" is the manufacturer brand name or logo text you can clearly read, "" if none. "partNumber" is a part or model number printed on it, "" if none. Only text you can clearly read; never guess.' },
          { inline_data: { mime_type: 'image/jpeg', data: b64 } },
        ] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return { brand: '', partNumber: '' }
    const j = JSON.parse((await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || '{}')
    return { brand: clean(j.brand).slice(0, 40), partNumber: clean(j.partNumber).slice(0, 30) }
  } catch {
    return { brand: '', partNumber: '' }
  }
}

/** A NEW attribute stands only if its quote is really in the source it names and the value matches the quote. */
function verifyAttribute(a, pageHay, webHay) {
  const evRaw = clean(a?.evidence)
  const label = clean(a?.label)
  const value = clean(a?.value)
  const evidence = norm(a?.evidence)
  // A long "no / not ..." sentence says the page lacks something; it is not an attribute of the product.
  if (label.length < 2 || label.length > 40 || !value || value.length > 120 || VAGUE.test(value) || MARKETING.test(value) || (value.length > 12 && /^(no|not|none)\b/i.test(value)) || evidence.length < 4) return null

  const inPage = pageHay.includes(` ${evidence} `)
  const inWeb = !inPage && webHay.includes(` ${evidence} `)
  if (!inPage && !inWeb) return null

  const evHay = ` ${evidence} `
  const tokens = norm(value).split(' ').filter(Boolean)
  if (numbersIn(value).some((n) => !numberIn(evRaw, n))) return null
  // Unit words ("in", "mm") may be added when a bare number is written with its unit, so they are not held against the quote.
  const words = tokens.filter((t) => !hasDigit(t) && !UNIT_WORDS.has(t))
  if (words.length && words.filter((t) => evHay.includes(` ${t} `)).length < Math.ceil(words.length / 2)) return null
  return {
    label,
    value: value.replace(/^[a-z]/, (c) => c.toUpperCase()),
    group: a?.group === 'technical' ? 'technical' : 'general',
    before: '',
    source: inPage ? 'page' : 'web',
    evidence: evRaw.slice(0, 160),
  }
}

function numbersSupported(text, ...raws) {
  return numbersIn(text).every((n) => raws.some((r) => numberIn(r, n)))
}

const COMMON_WORDS = new Set(['the', 'and', 'for', 'with', 'type', 'inch', 'inches', 'size', 'pack', 'set', 'kit', 'new', 'sealed', 'max', 'min', 'per', 'pcs', 'piece', 'pieces'])
/** Every real word of a title must come from the sources, so no brand or model can be invented or borrowed. */
function wordsSupported(text, ...hays) {
  return norm(text).split(' ').filter((t) => t.length >= 3 && /[a-z]/.test(t)).every((t) => COMMON_WORDS.has(t) || UNIT_WORDS.has(t) || hays.some((h) => h.includes(` ${t} `) || h.includes(` ${t.replace(/s$/, '')} `) || h.includes(` ${t}s `)))
}
/** A sentence of the description must not name a brand, model or proper noun that is absent from the sources. */
function properNounsSupported(sentence, ...hays) {
  const words = clean(sentence).split(' ')
  return words.every((w, i) => {
    const t = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
    if (i === 0 || t.length < 3 || !(/^[A-Z][a-z]+$/.test(t) || /^[A-Z0-9]{2,}$/.test(t))) return true
    const k = ` ${norm(t)} `
    return hays.some((h) => h.includes(k) || h.includes(` ${norm(t).replace(/s$/, '')} `))
  })
}

function buildPrompt({ rec, candidates, web, identity, have = [] }) {
  const again = have.length
    ? `\nATTRIBUTES ALREADY COVERED (do not repeat these labels): ${have.map((a) => a.label).join('; ')}\nFind ADDITIONAL new attributes the sources support. Return them in "attributes"; set "existing" to [] and leave enrichedTitle and enrichedDescription as empty strings.\n`
    : ''
  return `You are a product-data specialist enriching ONE product listing for an industrial / B2B catalog. The seller's page has been scraped into data (SOURCE A). Treat it as ground truth.

PRODUCT PAGE: ${rec.pageUrl}
Title on the page: ${rec.title}
Identifiers shown on the page: ${rec.identifiers.map((i) => `${i.label}: ${i.value}`).join(' | ') || '(none)'}
Brand shown on the page: ${rec.brand || '(not stated)'}${identity.photoBrand ? `\nBrand mark read from the product photo (a hint only, not a fact): ${identity.photoBrand}` : ''}
Category on the page: ${rec.breadcrumbs.join(' > ') || '(none)'}
Description on the page: ${rec.description || '(none)'}

SOURCE A1, ATTRIBUTES SCRAPED FROM THE PAGE (numbered, verbatim):
${candidates.map((c, i) => `[${i}] ${c.label}: ${c.value}`).join('\n') || '(none)'}

SOURCE A2, OTHER TEXT ON THE PAGE:
"""
${rec.lines.join('\n').slice(0, 4500)}
"""

SOURCE B, MANUFACTURER RESEARCH (checked to be about this same product; may be empty):
"""
${web.text || '(none)'}
"""
${again}
TASKS
1. "isSingleProductPage": true if the page is one product's own page, false for a homepage, category or search listing.
2. "existing": one entry per numbered attribute in SOURCE A1: { "i": number, "keep": boolean, "value": string, "group": "technical" | "general" }.
   - "keep" is false ONLY for a scraped line that is shop clutter and not a property of the product (stock level, cart, shipping, login). Never drop a real specification or identifier.
   - "value" is the same value tidied: consistent unit spacing and capitalisation (for example 7" becomes 7 in). It must carry exactly the same numbers and meaning. Never add, remove or reinterpret information (for example do not expand "Ferrous metals" into specific metals). If it is already clean, repeat it unchanged.
3. "attributes": NEW attributes not already in SOURCE A1, each supported by SOURCE A or SOURCE B:
   a. Every value must be stated in SOURCE A or SOURCE B. Never use general knowledge, never estimate, never fill typical values for the category.
   b. SOURCE B counts only for this same product. It may describe the same model sold in another region (different units, thread standards, plugs, voltages): when SOURCE B disagrees with SOURCE A, SOURCE A wins and SOURCE B's value is skipped. Never give one property two different values. SOURCE A's price lines are not attributes: a price break such as "25+ $5.08" is not a pack quantity.
   c. A title such as "7x3/32x7/8 A24R Type 27" states dimensions and grade: split it into attributes (diameter, thickness, bore, grade, type) and quote that part of the title.
   d. "evidence" is a short quote copied word for word (max 160 characters) from the source that states the value; "source" is "page" or "web".
   e. An attribute is a specific, checkable fact: a number with its unit, a named material / type / standard, a yes-or-no feature, or an included item. Skip marketing wording and never list the same fact twice under different labels. Give what is in the box as ONE attribute "Included items". Facts about the manufacturer as a company (company certifications such as ISO 9001, history, locations, awards) are not attributes of the product: leave them out.
   f. "value" is clean and standardised (consistent units and spacing, no marketing words); every number identical to the source.
   g. Aim for enough new attributes that the total, with the kept existing ones, is ${MIN_ATTRIBUTES} to ${MAX_ATTRIBUTES}, with at least ${MIN_TECHNICAL + 1} technical (dimensions, ratings, weight, material, grade, speed, power, certifications, compatibility). If the sources support fewer, return only what they support. Do not pad.
4. "enrichedTitle": max 110 characters: the product type, then the model / part number and the 2 to 3 most decisive specifications. Use only words and numbers from the sources. Do not add a brand the sources do not state.
5. "enrichedDescription": 45 to 90 words of plain factual sentences from the sources: what it is, what it is for, key specifications, what is included. No superlatives, no brand or model the sources do not name.

Return strict JSON:
{ "isSingleProductPage": boolean,
  "existing": [ { "i": number, "keep": boolean, "value": string, "group": "technical" | "general" } ],
  "enrichedTitle": string, "enrichedDescription": string,
  "attributes": [ { "label": string, "value": string, "group": "technical" | "general", "source": "page" | "web", "evidence": string } ] }`
}

/** Runs the whole enrichment. `onStage(label)` reports progress for the polling client. */
export async function enrichProductPage(url, onStage = () => {}) {
  // ---- 1. SCRAPE (Scrape.do): the page as data
  const rec = await scrapeProductPage(url, onStage)

  onStage('Identifying the product')
  const image = await fetchProductImage(rec.images, rec.pageUrl)

  const pageRaw = [rec.title, rec.description, rec.breadcrumbs.join(' '), rec.identifiers.map((i) => `${i.label} ${i.value}`).join(' '), rec.attributes.map((a) => `${a.label} ${a.value}`).join(' '), rec.lines.join(' ')].join(' ')
  const pageHay = padded(pageRaw)

  // identifiers that tie any outside source to THIS product: the page's own, with the tail of a hyphenated code
  const ids = new Set()
  const addId = (v) => {
    const s = clean(v)
    if (alnum(s).length >= 4 && hasDigit(s)) ids.add(s)
    const tail = s.split(/[-/\s]+/).pop()
    if (tail && tail !== s && alnum(tail).length >= 4 && hasDigit(tail)) ids.add(tail)
  }
  rec.identifiers.forEach((i) => addId(i.value))

  // A page that never names its maker: the product photo often does (brand mark, printed part number).
  let photoBrand = ''
  if (!rec.brand && image) {
    const photo = await readPhoto(image.dataUrl)
    // a printed part number is trusted only if the page itself shows it too
    if (photo.partNumber && alnum(pageRaw).includes(alnum(photo.partNumber))) addId(photo.partNumber)
    photoBrand = photo.brand
  }

  // ---- manufacturer research, only about this product
  onStage('Checking the manufacturer’s published specifications')
  const idList = [...ids]
  const mpn = rec.identifiers.find((i) => /mpn|manufacturer|mfr/i.test(i.label))?.value
  const hint = rec.brand || photoBrand
  const query = [hint, mpn || idList[0], rec.title].filter(Boolean).join(' ')
  const query2 = [hint, idList[idList.length - 1], 'specifications datasheet'].filter(Boolean).join(' ')
  const web = await researchManufacturer({ queries: [query, query2 !== query ? query2 : ''], identifiers: idList })
  const webHay = padded(web.text)
  console.log(`[catalogwiz] identity: brand="${rec.brand}" photoBrand="${photoBrand}" ids=${JSON.stringify(idList)} | research ${web.text ? `used (${web.text.length} chars, ${web.sources.length} sources)` : 'none'} | query="${query.slice(0, 120)}"`)

  // ---- 2. ENRICH
  onStage('Writing the enriched title, description and attributes')
  const candidates = rec.attributes.slice(0, 40)
  const identity = { photoBrand }
  const first = await callGemini(buildPrompt({ rec, candidates, web, identity }), { timeoutMs: 70000 })
  if (first?.isSingleProductPage === false) throw new Error('that looks like a homepage or a category page. Please paste a single product page.')

  // Existing attributes: exactly the page's, with a tidied value only where the code confirms it says the same thing.
  const decisions = new Map((Array.isArray(first?.existing) ? first.existing : []).map((d) => [Number(d?.i), d]))
  const existing = []
  candidates.forEach((c, i) => {
    const d = decisions.get(i) || {}
    // Only a scraped text line can be dropped as clutter; table / list / structured-data rows and identifiers always stay.
    if (d.keep === false && c.source === 'text' && !ID_LABEL.test(c.label)) return
    const tidy = clean(d.value)
    const value = tidy && tidy !== c.value && equivalent(c.value, tidy) ? tidy : c.value
    existing.push({ label: c.label, value, group: d.group === 'technical' ? 'technical' : 'general', before: c.value, source: 'page', evidence: `${c.label}: ${c.value}`.slice(0, 160) })
  })

  const keyOf = (label) => (label.length <= 4 ? label : norm(label)) // short labels are case-sensitive: "d2" vs "D2"
  const kept = new Map(existing.map((a) => [keyOf(a.label), a]))
  const added = []
  const collect = (list) => {
    for (const a of Array.isArray(list) ? list : []) {
      const v = verifyAttribute(a, pageHay, webHay)
      if (!v || kept.has(keyOf(v.label))) continue
      // The same fact under two labels (same value, or one value inside the other) is shown once.
      const nv = norm(v.value)
      const twin = [...kept.values()].some((k) => { const o = norm(k.value); return o === nv || (nv.length > 6 && o.length > 6 && (o.includes(nv) || nv.includes(o))) })
      if (twin) continue
      kept.set(keyOf(v.label), v)
      added.push(v)
    }
  }
  collect(first?.attributes)
  const total = () => existing.length + added.length
  const technical = () => [...existing, ...added].filter((a) => a.group === 'technical').length

  if (total() < COMFORT_ATTRIBUTES || technical() < MIN_TECHNICAL + 2) {
    onStage('Looking for more verified attributes')
    try {
      const more = await callGemini(buildPrompt({ rec, candidates, web, identity, have: [...existing, ...added] }), { timeoutMs: 70000 })
      collect(more?.attributes)
    } catch (err) {
      console.warn(`[catalogwiz] second attribute pass failed: ${err.message}`)
    }
  }
  if (total() < 3) throw new Error('there was not enough verifiable product information on that page to enrich it. Try a page with more product detail.')

  const attributes = [...existing, ...added].slice(0, MAX_ATTRIBUTES)

  // Rewritten copy must use only the sources' own words and numbers; otherwise the page's own text is kept.
  const title = clean(first?.enrichedTitle)
  const enrichedTitle = title && title.length <= 140 && numbersSupported(title, pageRaw, web.text) && wordsSupported(title, pageHay, webHay) ? title : rec.title
  // The description is written from the VERIFIED attributes only, so a number can never be attached to the wrong fact
  // ("Type 27" must not become "27 wheels"). Every number in it must be one the verified facts or the title contain.
  const facts = attributes.map((a) => `${a.label}: ${a.value}`).join('\n')
  const allowed = `${facts}\n${enrichedTitle}\n${rec.title}`
  const allowedHay = padded(allowed)
  const keepSupported = (text) => clean(text).split(/(?<=[.!?])\s+/).filter((s) => s && numbersSupported(s, allowed) && properNounsSupported(s, pageHay, webHay, allowedHay)).join(' ')
  let enrichedDescription = ''
  try {
    const d = await callGemini(`Write a product description of 45 to 90 words, in plain factual sentences, for this product: what it is, what it is for, its key specifications, and what is included.
Use ONLY the verified facts below. Every number must be copied from a fact or the title and kept attached to the SAME fact (for example "Type 27" is a wheel type, not a quantity). Do not add any brand, model, material, standard or number that is not listed. No superlatives or marketing wording. A "Category" fact such as "Abrasives > Cut Off Wheels" is a navigation path: you may say the product is in the "Cut Off Wheels" category, but never write the path itself or use it as the product's description.

TITLE: ${enrichedTitle}
VERIFIED FACTS:
${facts}

Return strict JSON: { "description": string }`, { timeoutMs: 45000 })
    enrichedDescription = keepSupported(d?.description)
  } catch (err) {
    console.warn(`[catalogwiz] description step failed: ${err.message}`)
  }
  // fallback: the first pass's description, accepted only under the same strict check
  if (!enrichedDescription) enrichedDescription = keepSupported(first?.enrichedDescription)

  const stated = (re) => attributes.find((a) => re.test(a.label))?.value
  const bestId = rec.identifiers.find((i) => /mpn|manufacturer|mfr/i.test(i.label)) || rec.identifiers[0]
  const technicalN = attributes.filter((a) => a.group === 'technical').length
  const pathShown = (() => { const u = new URL(rec.pageUrl); return `${u.hostname.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}` })()
  return {
    url,
    pageUrl: rec.pageUrl,
    displayUrl: pathShown,
    host: new URL(rec.pageUrl).hostname.replace(/^www\./, ''),
    productName: enrichedTitle,
    brand: rec.brand || stated(/^(brand|manufacturer)\b/i) || '',
    partNumber: bestId?.value || '',
    identifiers: rec.identifiers,
    image: image?.dataUrl || '',
    imageSource: image?.sourceUrl || '',
    before: { title: rec.title, description: rec.description, attributes: existing.map((a) => [a.label, a.before]) },
    after: { title: enrichedTitle, description: enrichedDescription, attributes },
    stats: {
      before: existing.length,
      after: attributes.length,
      technical: technicalN,
      meetsTarget: attributes.length >= MIN_ATTRIBUTES && technicalN >= MIN_TECHNICAL,
    },
    sources: web.sources,
  }
}
