import { config } from '../config.js'
import { callGemini } from './gemini.js'
import { scrapeProductPage, fetchProductImage, captureProductImage } from './catalogwizScrape.js'
import { findProductImage } from './manufacturerImage.js'

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
export const MIN_TECHNICAL = 6
const MAX_TECHNICAL_TARGET = 10
// A second search for more verified attributes runs below this, so a result lands comfortably above the minimum.
const COMFORT_ATTRIBUTES = 20
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

// ---- what counts as a real technical attribute, and what is filler -------------------------------------------------
// Decided in code, not by the AI's own label, so the "technical" count means genuine specifications only.
const NOT_TECHNICAL_LABEL = /\b(part|sku|mpn|catalog(?:ue)?|upc|ean|gtin|isbn|barcode|product code|stock code|article|brand|manufacturer|categor(?:y|ies)|tags?|warranty|country|origin|condition|colou?rs?|included|includes|contents|packag\w*|shipping|purpose|benefits?|features?|name|description|recommendation)\b/i
// these words only mean "identifier / wording" when no measurement is named too ("Item Weight" is a specification, "Item Number" is not)
const SOFT_NOT_TECHNICAL_LABEL = /\b(item|model|style|series|use|usage)\b/i
const MEASURE_LABEL = /(weight|dimensions?|length|width|height|diameter|capacity|volume|size|power|voltage|current|thickness|speed|pressure|temperature)/i
const TECH_LABEL = /\b(dimensions?|length|width|height|depth|thickness|diameter|od|id|bore|size|weight|capacity|volume|voltage|current|amperage|amps?|power|wattage|speed|rpm|torque|pressure|temperature|flow|frequency|resistance|material|grade|finish|rating|thread|pitch|load|force|life|efficiency|phase|poles?|duty|cycle|range|tolerance|hardness|viscosity|density|compatib\w*|standards?|certifications?|approvals?|class|protection|slots?|sheets?|count|quantity|number of|type|construction|coating|mounting|connection|fit|filter|cartridge|seal|enclosure)\b/i
const TECH_LABEL_STRICT = /\b(material|grade|finish|standards?|certifications?|approvals?|compatib\w*|thread|protection|class|construction|coating|mounting|connection|seal|enclosure|type|fit)\b/i
const UNIT_VALUE = /\d\s*(?:mm|cm|m|km|in(?:ch(?:es)?)?|"|ft|feet|yd|µm|um|microns?|gauge|awg|kg|g|lbs?|oz|mg|v|kv|mv|a|ma|amps?|volts?|w|kw|mw|hp|va|kva|hz|khz|mhz|rpm|psi|bar|mpa|kpa|pa|n|kn|nm|ft[- ]?lbs?|in[- ]?lbs?|l|ml|gal|gpm|cfm|lpm|db|°|deg|°c|°f|c|f|k|%|gsm|ohms?|Ω|mah|ah|wh|kwh|mesh|grit|teeth|tpi|npt|bsp|sheets?|rolls?|pcs|pieces?|slots?|poles?|phase|cycles?|lumens?|lm|m²|cm²|mm²|m³|cm³)\b/i
const STANDARD_VALUE = /\b(ISO|ASTM|ANSI|NIOSH|UL|CSA|CE|IEC|DIN|EN|NSF|FDA|RoHS|REACH|NEMA|IP\d\d|MIL-?[A-Z]+|SAE|API|ASME|OSHA|PEFC|FSC|NPT|BSP)\b/
// A value that is only a sales adjective says nothing a buyer can compare ("Lightweight", "Soft", "Professional-grade").
const FLUFF_VALUE = /^(?:(?:very|highly|extra|super)\s+)?(lightweight|light|soft|easy(?:[- ]to[- ][a-z]+)?|professional(?:[- ]grade)?|durable|reliable|sturdy|robust|comfortable|safety|safe|versatile|quality|premium|heavy[- ]duty|strong|tough|secure|efficient|effective|convenient|simple|portable|compact|flexible|general|standard|regular|normal|good|great|excellent|perfect|ideal)$/i
const GENERIC_LABEL = /^(purpose|benefits?|features?(?: and benefits)?|advantages?|usage|use|uses|application|applications|description|details?|info|information|notes?|maintenance|care|ease of use|comfort|appearance|quality|performance|suitability)$/i

// Store policy and sales lines are not properties of the product ("Return Policy: Free 30-day return", "Shipping: 2 days").
const NOT_AN_ATTRIBUTE_LABEL = /\b(returns?|refunds?|policy|policies|shipping|delivery|payment|stock|availability|price|pricing|discount|coupon|reviews?|guarantee|ships?|sold)\b/i

function isFluff(label, value) {
  const v = clean(value)
  if (NOT_AN_ATTRIBUTE_LABEL.test(clean(label))) return true
  if (FLUFF_VALUE.test(v)) return true
  // a generic label with a short, number-free value ("Purpose: Safety") is not a specification
  return GENERIC_LABEL.test(clean(label)) && !hasDigit(v) && v.split(' ').length <= 3
}

/** True for a genuine technical specification: a measured / rated / named property of the product, not an identifier or sales wording. */
function isTechnical(label, value) {
  const l = clean(label)
  const v = clean(value)
  if (NOT_TECHNICAL_LABEL.test(l) || isFluff(l, v) || (SOFT_NOT_TECHNICAL_LABEL.test(l) && !MEASURE_LABEL.test(l))) return false
  if (hasDigit(v)) return UNIT_VALUE.test(v) || STANDARD_VALUE.test(v) || TECH_LABEL.test(l)
  return TECH_LABEL_STRICT.test(l) || STANDARD_VALUE.test(v)
}

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
async function researchManufacturer({ queries, identifiers, brand }) {
  // One focused search; if it returns little, one more with different wording. Each result is checked on its own.
  const merged = { text: '', sources: [] }
  for (const query of queries.filter(Boolean).slice(0, 3)) {
    const r = await researchOnce({ query, identifiers, brand })
    if (r.text) {
      merged.text = `${merged.text} ${r.text}`.trim().slice(0, 6000)
      for (const s of r.sources) if (!merged.sources.some((m) => m.title === s.title)) merged.sources.push(s)
    }
    if (merged.text.length >= 2200) break
  }
  return merged
}

async function researchOnce({ query, identifiers, brand }) {
  if (!query || !identifiers.length) return { text: '', sources: [] }
  const prompt = `Find the manufacturer's own official product page or datasheet for this exact product: ${query}
It is identified on the seller's page by: ${identifiers.join(' / ')}.
List the specifications the manufacturer publishes for exactly this product, as plain sentences with their values: what type of product it is, dimensions, ratings, weight, capacity, speed, power, voltage, operating temperature, materials, grades, standards and certifications, compatibility, what is in the pack.
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
    // a model number alone can be shared by unrelated makers, so when the page names its brand the research must name it too
    if (brand && alnum(brand).length >= 2 && !hay.includes(alnum(brand))) {
      console.log('[catalogwiz] manufacturer research discarded: it does not mention the page\'s brand')
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
  if (label.length < 2 || label.length > 40 || !value || value.length > 120 || VAGUE.test(value) || MARKETING.test(value) || (value.length > 12 && /^(no|not|none)\b/i.test(value)) || isFluff(label, value) || evidence.length < 4) return null

  const foreignPartInLabel = (label.match(/\b[A-Za-z]*\d{4,}[A-Za-z]*\b/g) || []).some((t) => !pageHay.includes(` ${norm(t)} `))
  if (foreignPartInLabel) return null

  const inPage = pageHay.includes(` ${evidence} `)
  const inWeb = !inPage && webHay.includes(` ${evidence} `)
  if (!inPage && !inWeb) return null

  const evHay = ` ${evidence} `
  const tokens = norm(value).split(' ').filter(Boolean)
  if (numbersIn(value).some((n) => !numberIn(evRaw, n))) return null
  // Unit words ("in", "mm") may be added when a bare number is written with its unit, so they are not held against the quote.
  const words = tokens.filter((t) => !hasDigit(t) && !UNIT_WORDS.has(t))
  if (words.length && words.filter((t) => evHay.includes(` ${t} `)).length < Math.ceil(words.length / 2)) return null
  // "over 12 lbs" must not become "12 lbs": the qualifier the quote states is put back in front of the value
  const qualifier = lostQualifier(evRaw, value)
  return {
    label,
    value: `${qualifier ? `${qualifier} ` : ''}${value}`.replace(/^[a-z]/, (c) => c.toUpperCase()),
    group: isTechnical(label, value) ? 'technical' : 'general',
    before: '',
    source: inPage ? 'page' : 'web',
    evidence: evRaw.slice(0, 160),
  }
}

/** The same fact written twice under different labels ("Compatibility: 2000, 6000 and 7000 Series filters" / "Compatible Filter Series: 2000 Series"). */
function sameFact(labelA, valueA, labelB, valueB) {
  const x = norm(valueA)
  const y = norm(valueB)
  if (!x || !y) return false
  if (x === y) return true
  if (x.length > 6 && y.length > 6 && (x.includes(y) || y.includes(x))) return true
  const tx = x.split(' ')
  const ty = y.split(' ')
  const [few, many] = tx.length <= ty.length ? [tx, ty] : [ty, tx]
  if (!few.every((t) => many.includes(t))) return false
  const labelWords = (l) => norm(l).split(' ').filter((t) => t.length > 3).map((t) => t.replace(/(ility|ible|able|ing|ed|s)$/, ''))
  const la = labelWords(labelA)
  const lb = labelWords(labelB)
  return few.length >= 3 || la.some((t) => lb.includes(t))
}

const QUALIFIER = /\b(over|under|up to|at least|at most|minimum|maximum|min|max|approx(?:imately)?|about|exceeding|more than|less than|greater than|below|above)\b/i
/** The qualifier ("over", "up to", "max") the quote puts directly before one of THIS value's own numbers, when the value has dropped it
 *  ("over 12 lbs" must not become "12 lbs"). A qualifier that belongs to some other number in the quote is ignored. '' when nothing was lost. */
function lostQualifier(evidence, value) {
  if (QUALIFIER.test(String(value || ''))) return ''
  const own = numbersIn(value)
  const bound = new RegExp(`${QUALIFIER.source}\\.?\\s*(\\d+(?:[.,]\\d+)*)`, 'gi')
  for (const m of String(evidence || '').matchAll(bound)) {
    const n = numbersIn(m[2])[0]
    if (n && own.includes(n)) return m[1]
  }
  return ''
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
    ? `\nATTRIBUTES ALREADY COVERED (do not repeat these labels): ${have.map((a) => a.label).join('; ')}\nFind ADDITIONAL new attributes the sources support, technical specifications first (dimensions, ratings, capacity, power, voltage, material, grade, standards, compatibility). Return them in "attributes"; set "existing" to [] and leave enrichedTitle and enrichedDescription as empty strings.\n`
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
   b. SOURCE B counts only for this same product. It may describe the same model sold in another region (different units, thread standards, plugs, voltages): when SOURCE B disagrees with SOURCE A, SOURCE A wins and SOURCE B's value is skipped. Never give one property two different values. SOURCE B may also describe a close variant (a different size, voltage, model suffix, or an automated / CNC / manual version): skip any value that does not fit the product named on the page. SOURCE A's price lines are not attributes: a price break such as "25+ $5.08" is not a pack quantity.
   c. A title such as "7x3/32x7/8 A24R Type 27" states dimensions and grade: split it into attributes (diameter, thickness, bore, grade, type) and quote that part of the title.
   d. "evidence" is a short quote copied word for word (max 160 characters) from the source that states the value; "source" is "page" or "web".
   e. An attribute is a specific, checkable fact: a number with its unit, a named material / type / standard, a yes-or-no feature, or an included item. Skip marketing wording and never list the same fact twice under different labels. Give what is in the box as ONE attribute "Included items". Facts about the manufacturer as a company (company certifications such as ISO 9001, history, locations, awards) are not attributes of the product: leave them out.
   f. "value" is clean and standardised (consistent units and spacing, no marketing words); every number identical to the source.
   g. Aim for enough new attributes that the total, with the kept existing ones, is ${MIN_ATTRIBUTES} to ${MAX_ATTRIBUTES}, with ${MIN_TECHNICAL} to ${MAX_TECHNICAL_TARGET} genuine technical specifications (dimensions, ratings, capacity, weight, material, grade, speed, power, voltage, operating temperature, standards, certifications, compatibility). If the sources support fewer, return only what they support. Do not pad.
   h. Quality of every attribute: the label is a standard catalog attribute name (for example "Outside Diameter", "Rated Voltage", "Material"), and the value is something a buyer can compare: a number with its unit, a named material / type / standard, a yes-or-no feature or an included item. A sales adjective is never a value: "Weight: Lightweight", "Material: Soft", "Grade: Professional-grade" and "Purpose: Safety" are wrong, so skip them. Do not list an identifier (part number, SKU, GTIN) or the brand again as a technical attribute. Never split one fact into two attributes. A "Product Type" or "Type" attribute must use the same naming as the seller's own title or category, not a different phrase from another source.
4. "enrichedTitle": max 110 characters: the product type, then the model / part number and the 2 to 3 most decisive specifications. Use only words and numbers from the sources. Do not add a brand the sources do not state.
5. "enrichedDescription": 45 to 90 words of plain factual sentences from the sources: what it is, what it is for, key specifications, what is included. No superlatives, no brand or model the sources do not name.

Return strict JSON:
{ "isSingleProductPage": boolean,
  "existing": [ { "i": number, "keep": boolean, "value": string, "group": "technical" | "general" } ],
  "enrichedTitle": string, "enrichedDescription": string,
  "attributes": [ { "label": string, "value": string, "group": "technical" | "general", "source": "page" | "web", "evidence": string } ] }`
}

/** "Kustom Signals Inc" -> "Kustom Signals": the legal suffix is not part of how the brand appears in a product title. */
const brandCore = (b) => clean(b).replace(/[,.]?\s*\b(inc|llc|ltd|corp|co|company|corporation|gmbh|plc)\b\.?$/i, '')

/** "CORDLESS TOOL HOLDER CDH4" -> "Cordless Tool Holder CDH4": only an all-caps title is changed; words with digits (model numbers) and the brand keep their case. */
function tidyCase(title, brand) {
  const letters = title.replace(/[^A-Za-z]/g, '')
  if (letters.length < 6 || letters !== letters.toUpperCase()) return title
  const keep = new Set(String(brand || '').split(/\s+/).filter(Boolean))
  return title.split(' ').map((w) => (hasDigit(w) || keep.has(w) || w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ')
}

/** A title assembled from verified parts, used only when the AI's title fails the checks: the page's own title, plus the brand and
 *  part number if it lacks them, plus up to three short technical values. */
function composeTitle({ recTitle, brand, partNumber, attributes }) {
  const has = (text, part) => alnum(text).includes(alnum(part))
  let t = clean(recTitle)
  if (!t) return ''
  if (brand && alnum(brandCore(brand)).length >= 2 && !has(t, brandCore(brand))) t = `${brandCore(brand)} ${t}`
  if (partNumber && alnum(partNumber).length >= 3 && !has(t, partNumber)) t = `${t} ${partNumber.replace(/^\[|\]$/g, '')}`
  for (const a of attributes.filter((x) => x.group === 'technical' && x.value.length <= 24 && hasDigit(x.value) && x.label.split(' ').length <= 3 && !has(t, x.value)).slice(0, 3)) {
    const piece = `${a.value} ${a.label}`
    if (`${t}, ${piece}`.length > 110) break
    t = `${t}, ${piece}`
  }
  return t
}

// ---- taxonomy ----------------------------------------------------------------------------------------------------------
const GENERIC_NODE = /^(other|others|misc(?:ellaneous)?|general|products?|items?|all|uncategori[sz]ed|home|shop|catalog(?:ue)?|store)$/i
const GENERIC_HEAD = new Set(['products', 'product', 'supplies', 'supply', 'accessories', 'accessory', 'equipment', 'parts', 'part', 'systems', 'system', 'components', 'component', 'items', 'kits', 'kit'])
const singular = (w) => w.replace(/ies$/, 'y').replace(/(ches|shes|xes|sses)$/, (m) => m.slice(0, -2)).replace(/s$/, '')

/** The category path the seller's own page shows, cleaned: no "Home", no product name, nothing truncated. */
function pageCrumbs(breadcrumbs, title) {
  return (Array.isArray(breadcrumbs) ? breadcrumbs : []).map(clean).filter((c) => c && c.length <= 50 && !/\.\.\.|…/.test(c) && !GENERIC_NODE.test(c) && norm(c) !== norm(title))
}

/** A taxonomy stands only if it is a clean 3 to 6 level path and its last level names what the product actually is. */
function validTaxonomy(list, { brand, title, hay }) {
  const seen = new Set()
  const nodes = []
  for (const raw of Array.isArray(list) ? list : []) {
    const n = clean(raw).replace(/^[>\-–•\s]+|[>\s]+$/g, '')
    const key = norm(n)
    if (n.length < 2 || n.length > 40 || (n.match(/\d/g) || []).length >= 3 || GENERIC_NODE.test(n) || !key || seen.has(key)) continue
    if ((brand && key === norm(brand)) || key === norm(title)) continue
    seen.add(key)
    nodes.push(n)
  }
  const path = nodes.slice(0, 6)
  if (path.length < 3) return null
  const words = norm(path[path.length - 1]).split(' ').filter((w) => w.length >= 3)
  const head = [...words].reverse().find((w) => !GENERIC_HEAD.has(w)) || words[words.length - 1]
  if (!head || !(hay.includes(` ${head} `) || hay.includes(` ${singular(head)} `) || hay.includes(` ${singular(head)}s `) || hay.includes(` ${singular(head)}es `))) return null
  return path
}

/** Places the product in a broad-to-specific B2B taxonomy, based on what it IS (title and verified attributes), not on the seller's menu. */
async function buildTaxonomy({ rec, attributes, title, description, brand, hay }) {
  const seller = pageCrumbs(rec.breadcrumbs, rec.title)
  const out = await callGemini(`Classify this product into a B2B product taxonomy, as an industrial distributor's catalog or UNSPSC / ETIM would.

PRODUCT TITLE: ${title}
BRAND: ${brand || '(not stated)'}
CATEGORY PATH ON THE SELLER'S PAGE (a hint only; it may be shallow or specific to that store): ${seller.join(' > ') || '(none)'}
VERIFIED ATTRIBUTES:
${attributes.slice(0, 20).map((a) => `${a.label}: ${a.value}`).join('\n')}
DESCRIPTION: ${description || '(none)'}

RULES
- 3 to 5 levels, broad to specific. Level 1 is the department (for example "Power Transmission", "Safety & PPE", "Abrasives", "Janitorial & Cleaning", "Welding & Cutting", "Electrical Components"). The last level is the product's own type, as a plural noun phrase (for example "Deep Groove Ball Bearings", "Half-Mask Respirators", "Plasma Cutters", "Toilet Tissue").
- Classify by what the product IS, using the title and attributes. If the seller's path is correct and specific, keep its levels; if it is shallow, add the missing levels.
- Never include the brand, a model or part number, a size, "Home", "All Products", or promotional wording. Title Case, each level 2 to 40 characters.

Return strict JSON: { "taxonomy": [string, ...] }`, { timeoutMs: 40000 })
  const path = validTaxonomy(out?.taxonomy, { brand, title: rec.title, hay })
  if (path) return path
  // the model's path failed the checks: fall back to the seller's own path when it is a clean one
  return seller.length >= 3 ? seller.slice(0, 6) : null
}

/** Runs the whole enrichment. `onStage(label)` reports progress for the polling client. */
export async function enrichProductPage(url, onStage = () => {}) {
  // ---- 1. SCRAPE (Scrape.do): the page as data
  const rec = await scrapeProductPage(url, onStage)

  onStage('Identifying the product')
  // The product picture is part of every enriched page. 1: the page's own picture, downloaded and checked. 2: if no address could be
  // downloaded (hot-link protection, script-built gallery), the picture is photographed from the page as a visitor sees it.
  // 3: the manufacturer's own picture for this part number (see manufacturerImage.js). The next one is tried only when the last found nothing.
  let image = await fetchProductImage(rec.images, rec.pageUrl)
  let imageHow = 'the page\'s own picture'
  if (!image) {
    onStage('Capturing the product picture')
    image = await captureProductImage(rec.pageUrl)
    imageHow = 'photographed from the page'
  }
  if (!image) {
    const code = (rec.identifiers.find((i) => /mpn|manufacturer|mfr/i.test(i.label)) || rec.identifiers[0])?.value
    const found = await findProductImage({ urls: [], brand: rec.brand, code, excludeDomain: new URL(rec.pageUrl).hostname.replace(/^www\./, '') }).catch(() => null)
    if (found?.dataUrl) { image = { dataUrl: found.dataUrl, sourceUrl: found.pageUrl || found.sourceUrl }; imageHow = `the manufacturer's page (${found.host})` }
  }
  console.log(`[catalogwiz] product image: ${image ? imageHow : 'none found'}`)

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
  // a model number the page shows only in its title or web address ("CDH4", "1603-2RS", "6000 Series") ties research to this product too
  const slugWords = (() => { try { return new URL(rec.pageUrl).pathname.split('/').filter(Boolean).slice(-3).flatMap((p) => p.split(/[^A-Za-z0-9-]+/)) } catch { return [] } })()
  const NOT_A_MODEL = /^\d+(ply|pk|pc|pcs|s|x|mm|cm|in|oz|gsm|g|kg|ml|l|ft|lb|lbs)$/i
  const looksLikeYear = (t) => /^(19|20)\d\d$/.test(t)
  for (const raw of [...String(rec.title || '').split(/\s+/), ...slugWords]) {
    const tok = raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
    if (alnum(tok).length >= 4 && alnum(tok).length <= 14 && /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+){0,2}$/.test(tok) && hasDigit(tok) && !NOT_A_MODEL.test(tok) && !looksLikeYear(tok) && alnum(pageRaw).includes(alnum(tok))) addId(tok)
  }

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
  // a third, plainer wording is tried only if the first two found nothing usable (the search is not deterministic)
  const query3 = [hint, rec.title, 'manufacturer official specifications datasheet'].filter(Boolean).join(' ')
  const web = await researchManufacturer({ queries: [query, query2 !== query ? query2 : '', query3], identifiers: idList, brand: hint })
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
    existing.push({ label: c.label, value, group: isTechnical(c.label, value) ? 'technical' : 'general', before: c.value, source: 'page', evidence: `${c.label}: ${c.value}`.slice(0, 160) })
  })

  const keyOf = (label) => (label.length <= 4 ? label : norm(label)) // short labels are case-sensitive: "d2" vs "D2"
  const kept = new Map(existing.map((a) => [keyOf(a.label), a]))
  const added = []
  const collect = (list) => {
    for (const a of Array.isArray(list) ? list : []) {
      const v = verifyAttribute(a, pageHay, webHay)
      if (!v || kept.has(keyOf(v.label))) continue
      // The same fact under two labels (same value, or one value inside the other) is shown once.
      const twin = [...kept.values()].some((k) => sameFact(k.label, k.value, v.label, v.value))
      if (twin) continue
      kept.set(keyOf(v.label), v)
      added.push(v)
    }
  }
  collect(first?.attributes)
  const total = () => existing.length + added.length
  const technical = () => [...existing, ...added].filter((a) => a.group === 'technical').length

  // Extra passes for more verified attributes: one below the comfortable size, and one more only while the result is still under the
  // minimum (the AI's first read of a page is not always complete). Each pass can only add attributes that pass the same checks.
  for (let pass = 1; pass <= 2; pass++) {
    const needed = pass === 1 ? total() < COMFORT_ATTRIBUTES || technical() < MIN_TECHNICAL + 2 : total() < MIN_ATTRIBUTES || technical() < MIN_TECHNICAL
    if (!needed) break
    onStage('Looking for more verified attributes')
    try {
      const more = await callGemini(buildPrompt({ rec, candidates, web, identity, have: [...existing, ...added] }), { timeoutMs: 70000 })
      collect(more?.attributes)
    } catch (err) {
      console.warn(`[catalogwiz] extra attribute pass ${pass} failed: ${err.message}`)
    }
  }
  if (total() < 3) throw new Error('there was not enough verifiable product information on that page to enrich it. Try a page with more product detail.')

  const attributes = [...existing, ...added].slice(0, MAX_ATTRIBUTES)

  // Title and description are written from the VERIFIED attributes only, so a number can never be attached to the wrong fact
  // ("Type 27" must not become "27 wheels"). Every number and every real word must come from the verified facts or the page.
  const stated = (re) => attributes.find((a) => re.test(a.label))?.value
  const brandKnown = rec.brand || stated(/^(brand|manufacturer)\b/i) || ''
  const facts = attributes.map((a) => `${a.label}: ${a.value}`).join('\n')
  const allowed = `${facts}\n${rec.title}\n${brandKnown}`
  const allowedHay = padded(allowed)
  const keepSupported = (text) => clean(text).split(/(?<=[.!?])\s+/).filter((sentence) => sentence && numbersSupported(sentence, allowed) && properNounsSupported(sentence, pageHay, webHay, allowedHay)).join(' ')
  const repeatsItself = (t) => { const w = norm(t).split(' '); const seen = new Set(); for (let i = 0; i < w.length - 1; i++) { const pair = `${w[i]} ${w[i + 1]}`; if (seen.has(pair)) return true; seen.add(pair) } return false }
  const titleSeed = tidyCase(rec.title, brandKnown)
  // why a title is refused ('' = accepted): wording or numbers that are not in the verified facts, repeats, no brand, wrong length
  const titleProblem = (t) => {
    if (!t) return 'empty'
    if (t.length < 8 || t.length > 110) return `length ${t.length}`
    if (MARKETING.test(t) || /[.!?:;,]$/.test(t)) return 'sales wording or trailing punctuation'
    if (repeatsItself(t)) return 'repeats a phrase'
    if (brandKnown && alnum(brandCore(brandKnown)).length >= 3 && !alnum(t).includes(alnum(brandCore(brandKnown)))) return 'brand missing'
    if (!numbersSupported(t, allowed, pageRaw, web.text)) return 'a number that is not in the facts'
    if (!wordsSupported(t, pageHay, webHay, allowedHay)) return 'a word that is not in the sources'
    return ''
  }
  const titleOk = (t) => !titleProblem(t)
  let copyTitle = ''
  let enrichedDescription = ''
  try {
    const d = await callGemini(`Write the catalog TITLE and DESCRIPTION for this product, for a buyer comparing industrial products.
Use ONLY the verified facts below. Every number must be copied from a fact or the original title and kept attached to the SAME fact (for example "Type 27" is a wheel type, not a quantity). Do not add any brand, model, material, standard or number that is not listed. No superlatives, no sales wording, no category path.

TITLE: at most 100 characters, no ALL CAPS, no trailing punctuation. Order: the brand first when one is given under BRAND, the product's own name and model exactly as the ORIGINAL TITLE gives it (for example "PT-Cut-Master A-80" stays in the title), the product type as the seller's page names it (not a different phrase from another source), then the 2 or 3 specifications a buyer filters on (size, capacity, rating, material, grade), separated by commas. Do not repeat the part number, and never write the same word or specification twice.
DESCRIPTION: 3 or 4 plain factual sentences, 50 to 100 words (shorter only if there are few facts). Sentence 1: what the product is, reading naturally ("The <brand> <product name> is a <product type> ..."), using the product's own name from the ORIGINAL TITLE. Sentence 2: its key technical specifications with units. Sentence 3: material, standards or compatibility. Sentence 4: what is included, only if a fact says so. Never restate a fact, never write filler such as "designed for safety" unless a fact says it, and do not describe the product's category or where it is sold.

ORIGINAL TITLE: ${titleSeed}
BRAND: ${brandKnown || '(not stated)'}
VERIFIED FACTS:
${facts}

Return strict JSON: { "title": string, "description": string }`, { timeoutMs: 50000 })
    copyTitle = clean(d?.title)
    enrichedDescription = keepSupported(d?.description)
  } catch (err) {
    console.warn(`[catalogwiz] title / description step failed: ${err.message}`)
  }
  // fallback: the first pass's description, accepted only under the same strict check
  if (!enrichedDescription) enrichedDescription = keepSupported(first?.enrichedDescription)

  // Title: the verified-facts title, else the first pass's title, else one assembled from the page's own title plus its verified brand,
  // part number and key specifications, else the page's own title.
  const trimTitle = (t) => { const c = clean(t); if (c.length <= 110) return c; const cut = c.slice(0, 110).lastIndexOf(', '); return cut > 20 ? c.slice(0, cut) : c }
  copyTitle = trimTitle(copyTitle)
  const firstTitle = trimTitle(first?.enrichedTitle)
  const bestPart = (rec.identifiers.find((i) => /mpn|manufacturer|mfr/i.test(i.label)) || rec.identifiers[0])?.value || stated(/^(part|model|mpn)\b.*(number|no\.?|#)?$/i) || ''
  const composedTitle = composeTitle({ recTitle: titleSeed, brand: brandKnown, partNumber: bestPart, attributes })
  const titleSource = titleOk(copyTitle) ? 'verified-facts title' : titleOk(firstTitle) ? 'first-pass title' : titleOk(composedTitle) ? 'assembled title' : 'page title'
  console.log(`[catalogwiz] title: ${titleSource}${titleSource === 'verified-facts title' ? '' : ` | verified-facts title refused (${titleProblem(copyTitle)}): "${copyTitle}"`}`)
  const enrichedTitle = tidyCase([copyTitle, firstTitle, composedTitle].find((t) => titleOk(t)) || rec.title, brandKnown)

  const bestId = rec.identifiers.find((i) => /mpn|manufacturer|mfr/i.test(i.label)) || rec.identifiers[0]
  const technicalN = attributes.filter((a) => a.group === 'technical').length
  onStage('Placing the product in its taxonomy')
  let taxonomy = null
  try {
    taxonomy = await buildTaxonomy({ rec, attributes, title: enrichedTitle, description: enrichedDescription, brand: brandKnown, hay: padded(`${enrichedTitle} ${rec.title} ${facts} ${rec.breadcrumbs.join(' ')} ${rec.description} ${web.text}`) })
  } catch (err) {
    console.warn(`[catalogwiz] taxonomy step failed: ${err.message}`)
  }
  const pathShown = (() => { const u = new URL(rec.pageUrl); return `${u.hostname.replace(/^www\./, '')}${u.pathname === '/' ? '' : u.pathname}` })()
  return {
    url,
    pageUrl: rec.pageUrl,
    displayUrl: pathShown,
    host: new URL(rec.pageUrl).hostname.replace(/^www\./, ''),
    productName: enrichedTitle,
    brand: brandKnown,
    partNumber: bestId?.value || '',
    identifiers: rec.identifiers,
    image: image?.dataUrl || '',
    imageSource: image?.sourceUrl || '',
    before: { title: rec.title, description: rec.description, attributes: existing.map((a) => [a.label, a.before]) },
    after: { title: enrichedTitle, description: enrichedDescription, attributes, ...(taxonomy ? { taxonomy } : {}) },
    stats: {
      before: existing.length,
      after: attributes.length,
      technical: technicalN,
      meetsTarget: attributes.length >= MIN_ATTRIBUTES && technicalN >= MIN_TECHNICAL,
    },
    sources: web.sources,
  }
}
