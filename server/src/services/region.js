/**
 * Works out which market a product page sells into — country + currency — so buyer queries,
 * competitor research and the price benchmark compare the prospect against sellers in its own
 * region. Deterministic, from evidence on the page itself, in this order:
 *   1. country-code domain (".co.za", ".com.au")
 *   2. the page's own price currency (JSON-LD / meta), when it maps to one country
 *   3. the business address (Google Places)
 *   4. a USD price on a generic domain → United States
 */

const COUNTRIES = {
  US: { country: 'United States', currencyCode: 'USD' },
  ZA: { country: 'South Africa', currencyCode: 'ZAR' },
  AU: { country: 'Australia', currencyCode: 'AUD' },
  NZ: { country: 'New Zealand', currencyCode: 'NZD' },
  GB: { country: 'United Kingdom', currencyCode: 'GBP' },
  IE: { country: 'Ireland', currencyCode: 'EUR' },
  CA: { country: 'Canada', currencyCode: 'CAD' },
  IN: { country: 'India', currencyCode: 'INR' },
  SG: { country: 'Singapore', currencyCode: 'SGD' },
  MY: { country: 'Malaysia', currencyCode: 'MYR' },
  AE: { country: 'United Arab Emirates', currencyCode: 'AED' },
  DE: { country: 'Germany', currencyCode: 'EUR' },
  FR: { country: 'France', currencyCode: 'EUR' },
  NL: { country: 'Netherlands', currencyCode: 'EUR' },
  ES: { country: 'Spain', currencyCode: 'EUR' },
  IT: { country: 'Italy', currencyCode: 'EUR' },
  BR: { country: 'Brazil', currencyCode: 'BRL' },
  MX: { country: 'Mexico', currencyCode: 'MXN' },
  PH: { country: 'Philippines', currencyCode: 'PHP' },
  NG: { country: 'Nigeria', currencyCode: 'NGN' },
  KE: { country: 'Kenya', currencyCode: 'KES' },
  JP: { country: 'Japan', currencyCode: 'JPY' },
}

export const CURRENCY_SYMBOLS = {
  USD: '$', ZAR: 'R', AUD: 'A$', NZD: 'NZ$', GBP: '£', EUR: '€', CAD: 'CA$', INR: '₹', SGD: 'S$',
  MYR: 'RM', AED: 'AED ', BRL: 'R$', MXN: 'MX$', PHP: '₱', NGN: '₦', KES: 'KSh ', JPY: '¥',
}

// Currencies used by exactly one country in COUNTRIES (EUR and USD are deliberately absent).
const SINGLE_COUNTRY_CURRENCY = { ZAR: 'ZA', AUD: 'AU', NZD: 'NZ', GBP: 'GB', CAD: 'CA', INR: 'IN', SGD: 'SG', MYR: 'MY', AED: 'AE', BRL: 'BR', MXN: 'MX', PHP: 'PH', NGN: 'NG', KES: 'KE', JPY: 'JP' }

const ADDRESS_COUNTRY = [
  [/\b(usa|united states)\b/i, 'US'], [/\bsouth africa\b/i, 'ZA'], [/\baustralia\b/i, 'AU'], [/\bnew zealand\b/i, 'NZ'],
  [/\b(uk|united kingdom|england|scotland|wales)\b/i, 'GB'], [/\bireland\b/i, 'IE'], [/\bcanada\b/i, 'CA'], [/\bindia\b/i, 'IN'],
  [/\bsingapore\b/i, 'SG'], [/\bmalaysia\b/i, 'MY'], [/\b(united arab emirates|uae)\b/i, 'AE'], [/\bgermany|deutschland\b/i, 'DE'],
  [/\bfrance\b/i, 'FR'], [/\bnetherlands\b/i, 'NL'], [/\bspain|españa\b/i, 'ES'], [/\bitaly|italia\b/i, 'IT'], [/\bbrazil|brasil\b/i, 'BR'],
  [/\bmexico|méxico\b/i, 'MX'], [/\bphilippines\b/i, 'PH'], [/\bnigeria\b/i, 'NG'], [/\bkenya\b/i, 'KE'], [/\bjapan\b/i, 'JP'],
]

function countryFromDomain(hostname) {
  const host = String(hostname || '').toLowerCase()
  const tld = host.split('.').pop()
  if (tld === 'uk') return 'GB'
  const code = tld.toUpperCase()
  return COUNTRIES[code] ? code : null
}

/** The page's own declared price currency (JSON-LD offers.priceCurrency, or Open Graph / itemprop meta). */
export function pageCurrency(html) {
  const s = String(html || '')
  const m = s.match(/"priceCurrency"\s*:\s*"([A-Za-z]{3})"/) ||
    s.match(/<meta[^>]+(?:property|itemprop|name)=["'](?:product:price:currency|og:price:currency|priceCurrency)["'][^>]+content=["']([A-Za-z]{3})["']/i) ||
    s.match(/<meta[^>]+content=["']([A-Za-z]{3})["'][^>]+(?:property|itemprop|name)=["'](?:product:price:currency|og:price:currency|priceCurrency)["']/i)
  return m ? m[1].toUpperCase() : null
}

export function detectRegion({ url, html, address } = {}) {
  let hostname = ''
  try { hostname = new URL(url).hostname } catch { /* keep '' */ }
  const declaredCurrency = pageCurrency(html)
  const addressCode = (ADDRESS_COUNTRY.find(([re]) => re.test(String(address || ''))) || [])[1] || null

  let countryCode = countryFromDomain(hostname)
  let source = countryCode ? `domain (${hostname})` : ''
  if (!countryCode && declaredCurrency && SINGLE_COUNTRY_CURRENCY[declaredCurrency]) {
    countryCode = SINGLE_COUNTRY_CURRENCY[declaredCurrency]
    source = `page price currency (${declaredCurrency})`
  }
  if (!countryCode && addressCode) {
    countryCode = addressCode
    source = 'business address'
  }
  if (!countryCode && declaredCurrency === 'USD') {
    countryCode = 'US'
    source = 'page price currency (USD)'
  }
  if (!countryCode) return { country: '', countryCode: '', currencyCode: declaredCurrency || '', currencySymbol: CURRENCY_SYMBOLS[declaredCurrency] || '', source: 'not determinable' }

  const base = COUNTRIES[countryCode]
  const currencyCode = declaredCurrency || base.currencyCode
  return { country: base.country, countryCode, currencyCode, currencySymbol: CURRENCY_SYMBOLS[currencyCode] || '', source }
}

// Explicit currency markers in a price string → ISO code. A bare "$" is ambiguous (USD, AUD,
// CAD, NZD all write it that way locally), so it maps to nothing rather than to USD.
const PRICE_MARKERS = [
  [/^\s*(US\$|USD)/i, 'USD'], [/^\s*(A\$|AU\$|AUD)/i, 'AUD'], [/^\s*(NZ\$|NZD)/i, 'NZD'], [/^\s*(CA\$|C\$|CAD)/i, 'CAD'],
  [/^\s*(S\$|SGD)/i, 'SGD'], [/^\s*(R\$|BRL)/i, 'BRL'], [/^\s*(MX\$|MXN)/i, 'MXN'], [/^\s*(ZAR|R)\s?\d/i, 'ZAR'],
  [/^\s*(£|GBP)/i, 'GBP'], [/^\s*(€|EUR)/i, 'EUR'], [/^\s*(₹|INR|Rs\.?)/i, 'INR'], [/^\s*(RM|MYR)/i, 'MYR'],
  [/^\s*AED/i, 'AED'], [/^\s*(₱|PHP)/i, 'PHP'], [/^\s*(₦|NGN)/i, 'NGN'], [/^\s*(KSh|KES)/i, 'KES'], [/^\s*(¥|JPY)/i, 'JPY'],
]
export function priceCurrencyCode(price) {
  const p = String(price || '')
  return (PRICE_MARKERS.find(([re]) => re.test(p)) || [])[1] || null
}

/** True when a price is explicitly written in a different currency than the prospect's market. */
export function isForeignCurrencyPrice(price, currencyCode) {
  const code = priceCurrencyCode(price)
  return Boolean(code && currencyCode && code !== currencyCode)
}

// ---------------------------------------------------------------------------------------------
// inferRegion — the evidence-weighed version of detectRegion: every signal found is kept, signals
// that disagree lower the confidence instead of one silently winning, and nothing is guessed.
// ---------------------------------------------------------------------------------------------

// International dialling codes that identify one country ("+1" is shared by the US and Canada, so
// it is deliberately absent). Longer codes are tried first.
const PHONE_CODES = [
  ['971', 'AE'], ['353', 'IE'], ['234', 'NG'], ['254', 'KE'],
  ['61', 'AU'], ['64', 'NZ'], ['27', 'ZA'], ['44', 'GB'], ['91', 'IN'], ['65', 'SG'], ['60', 'MY'], ['81', 'JP'],
  ['63', 'PH'], ['49', 'DE'], ['33', 'FR'], ['31', 'NL'], ['34', 'ES'], ['39', 'IT'], ['55', 'BR'], ['52', 'MX'],
]

// Countries that sit in a single time zone (so a timezone can be stated without guessing). Larger
// countries are left out: their time zone depends on the city, which may not be known.
const SINGLE_TIMEZONE = {
  GB: 'Europe/London', IE: 'Europe/Dublin', IN: 'Asia/Kolkata', ZA: 'Africa/Johannesburg', SG: 'Asia/Singapore',
  MY: 'Asia/Kuala_Lumpur', AE: 'Asia/Dubai', NG: 'Africa/Lagos', KE: 'Africa/Nairobi', JP: 'Asia/Tokyo',
  PH: 'Asia/Manila', NZ: 'Pacific/Auckland', DE: 'Europe/Berlin', FR: 'Europe/Paris', NL: 'Europe/Amsterdam',
  ES: 'Europe/Madrid', IT: 'Europe/Rome',
}

const GENERIC_TLDS = new Set(['com', 'net', 'org', 'us'])

// Signal strength: "strong" signals state the country outright; "weak" ones only hint at it.
const STRONG = 'strong'
const WEAK = 'weak'

function cityFromAddress(address, countryCode) {
  const parts = String(address || '').split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3) return ''
  const countryRe = (ADDRESS_COUNTRY.find(([, code]) => code === countryCode) || [])[0]
  let i = parts.length - 1
  if (countryRe && countryRe.test(parts[i])) i -= 1
  // The part before the country is "<locality> [state] <postcode>".
  const tokens = (parts[i] || '').split(/\s+/)
  const hasState = tokens.some((w) => /^[A-Z]{2,3}$/.test(w))
  const words = tokens.filter((w) => !/\d/.test(w) && !/^[A-Z]{2,3}$/.test(w))
  // "Suburb NSW 2190": a locality written next to its state is a suburb or town, not a city, and a
  // suburb is not a good place to centre a search — leave the city empty rather than guess.
  if (hasState && words.length) return ''
  // "TX 78701": only the state and postcode are here, so the city is the part before it.
  const city = (words.length ? words.join(' ') : parts[i - 1] || '').trim()
  return city.length >= 3 && !/\d/.test(city) ? city : ''
}

function phoneCountry(text) {
  const m = String(text || '').match(/(?:^|[^\d])\+\s?(\d{1,3})(?=[\s().-]*\d)/)
  if (!m) return null
  const digits = m[1]
  const hit = PHONE_CODES.find(([code]) => digits.startsWith(code))
  return hit ? hit[1] : null
}

function textAddressCountry(text) {
  // A country name only counts as an address when it sits near the end of the page together with a
  // number (postcode / phone) — not when it is merely mentioned in a product description.
  const tail = String(text || '').slice(-700)
  if (!/\d{3,}/.test(tail)) return null
  return (ADDRESS_COUNTRY.find(([re]) => re.test(tail)) || [])[1] || null
}

function localeCountry(html) {
  const s = String(html || '')
  const lang = (s.match(/<html[^>]+\blang=["'][a-z]{2,3}[-_]([A-Za-z]{2})["']/i) || [])[1]
  const og = (s.match(/<meta[^>]+property=["']og:locale["'][^>]+content=["'][a-z]{2,3}[-_]([A-Za-z]{2})["']/i) ||
    s.match(/<meta[^>]+content=["'][a-z]{2,3}[-_]([A-Za-z]{2})["'][^>]+property=["']og:locale["']/i) || [])[1]
  const norm = (c) => { const code = String(c || '').toUpperCase(); return COUNTRIES[code] ? code : null }
  return { lang: norm(lang), og: norm(og) }
}

function priceSymbolCountry(text) {
  const t = String(text || '')
  const m = t.match(/(A\$|NZ\$|CA\$|S\$|MX\$|£|₹|₱|₦|RM)\s?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?/) ||
    t.match(/(?<![A-Za-z$])(R)\s?\d{1,3}(?:[,\s]\d{3})*\.\d{2}\b/)
  if (!m) return null
  const code = priceCurrencyCode(`${m[1]}1`)
  return code && SINGLE_COUNTRY_CURRENCY[code] ? SINGLE_COUNTRY_CURRENCY[code] : null
}

/**
 * Deterministic region inference (no model call). Returns
 * { countryCode, country, currency, city, timezone, confidence, signals } plus the fields the rest of
 * the pipeline already reads from detectRegion (currencyCode, currencySymbol, source).
 * confidence: high = two or more signals agree; medium = one strong signal; low = conflicting or only
 * a weak hint; unknown = no signal. Only high / medium should be acted on (see regionIsActive).
 */
export function inferRegion({ url, html, pageText, placeInfo, explicitCountry } = {}) {
  let hostname = ''
  try { hostname = new URL(url).hostname.toLowerCase() } catch { /* keep '' */ }
  const tld = hostname.split('.').pop()
  const signals = []
  const add = (type, countryCode, strength, detail) => { if (countryCode && COUNTRIES[countryCode]) signals.push({ type, countryCode, strength, detail }) }

  // a) a country the caller already knows
  const explicit = String(explicitCountry || '').trim()
  if (explicit) {
    const upper = explicit.toUpperCase()
    const byCode = COUNTRIES[upper] ? upper : null
    const byName = Object.entries(COUNTRIES).find(([, v]) => v.country.toLowerCase() === explicit.toLowerCase())?.[0]
    add('explicit', byCode || byName, STRONG, explicit)
  }
  // b) the currency the page itself declares. USD / EUR are shared by many countries, so they are
  // handled after the other signals are known.
  const declared = pageCurrency(html)
  if (declared && SINGLE_COUNTRY_CURRENCY[declared]) add('page-currency', SINGLE_COUNTRY_CURRENCY[declared], STRONG, declared)
  // c) country-code domain, including second-level forms (.com.au, .co.nz, .co.uk, .co.za)
  const domainCode = countryFromDomain(hostname)
  if (domainCode) add('domain', domainCode, STRONG, hostname)
  // d) business address from Google Places
  const address = placeInfo?.formattedAddress || ''
  const addressCode = (ADDRESS_COUNTRY.find(([re]) => re.test(String(address))) || [])[1] || null
  if (addressCode) add('business-address', addressCode, STRONG, address)
  // e) hints on the page itself
  const loc = localeCountry(html)
  if (loc.lang) add('html-lang', loc.lang, WEAK, loc.lang)
  if (loc.og) add('og-locale', loc.og, WEAK, loc.og)
  const phone = phoneCountry(pageText)
  if (phone) add('phone-code', phone, WEAK, phone)
  const textAddr = textAddressCountry(pageText)
  if (textAddr) add('page-address', textAddr, WEAK, textAddr)
  const symbol = priceSymbolCountry(pageText)
  if (symbol) add('price-symbol', symbol, WEAK, symbol)
  // USD means the United States only on a generic domain and only when nothing points elsewhere.
  if (declared === 'USD' && (!hostname || GENERIC_TLDS.has(tld)) && signals.every((s) => s.countryCode === 'US')) {
    add('page-currency', 'US', STRONG, 'USD')
  }

  const codes = [...new Set(signals.map((s) => s.countryCode))]
  const strongCodes = [...new Set(signals.filter((s) => s.strength === STRONG).map((s) => s.countryCode))]
  let confidence = 'unknown'
  let countryCode = ''
  if (signals.length) {
    if (strongCodes.length > 1) {
      confidence = 'low'
    } else if (strongCodes.length === 1) {
      countryCode = strongCodes[0]
      const against = signals.filter((s) => s.countryCode !== countryCode)
      const supporting = signals.filter((s) => s.countryCode === countryCode).length
      // Two hints pointing at a different country outweigh a single strong signal.
      confidence = against.length >= 2 && against.length >= supporting ? 'low' : supporting >= 2 ? 'high' : 'medium'
    } else if (codes.length === 1) {
      countryCode = codes[0]
      confidence = signals.length >= 2 ? 'high' : 'low'
    } else {
      confidence = 'low'
    }
  }
  if (confidence === 'low' || confidence === 'unknown') {
    // Not acted on: report what was seen, but state no country.
    return { countryCode: '', country: '', currency: declared || '', currencyCode: declared || '', currencySymbol: CURRENCY_SYMBOLS[declared] || '', city: '', timezone: '', confidence, signals, source: 'not determinable' }
  }

  const base = COUNTRIES[countryCode]
  const currency = declared || base.currencyCode
  const first = signals.find((s) => s.countryCode === countryCode && s.strength === STRONG) || signals.find((s) => s.countryCode === countryCode)
  const source = first.type === 'domain' ? `domain (${hostname})` : first.type === 'page-currency' ? `page price currency (${first.detail})` : first.type === 'business-address' ? 'business address' : first.type
  return {
    countryCode, country: base.country, currency, currencyCode: currency, currencySymbol: CURRENCY_SYMBOLS[currency] || '',
    city: addressCode === countryCode ? cityFromAddress(address, countryCode) : '',
    timezone: SINGLE_TIMEZONE[countryCode] || '',
    confidence, signals, source,
  }
}

/** True when a region may be used to shape prompts and requests (high or medium confidence). */
export function regionIsActive(region) {
  return Boolean(region?.country && (region.confidence === 'high' || region.confidence === 'medium'))
}

/** One buyer-region sentence, reused by every prompt that phrases a buyer query. '' when not active. */
export function regionBuyerClause(region) {
  if (!regionIsActive(region)) return ''
  const place = region.city ? `${region.city}, ${region.country}` : region.country
  return `BUYER REGION: ${place}. Phrase every query the way a real buyer in ${region.country} would type it. Prices in ${region.currencyCode || region.currency}.`
}

/** One seller-region sentence, reused by every prompt that asks for sellers or prices. '' when not active. */
export function regionSellerClause(region) {
  if (!regionIsActive(region)) return ''
  const cur = region.currencyCode || region.currency
  return `Only consider sellers that operate in and ship within ${region.country}, with prices in ${cur}. Do not use sellers from other countries as the comparison set. Mention a foreign seller only if no ${region.country} seller exists, and label it clearly as foreign.`
}

/** The approximate-location object the OpenAI / Anthropic web-search tools accept, or undefined. */
export function userLocationFor(region) {
  if (!regionIsActive(region) || !region.countryCode) return undefined
  return {
    country: region.countryCode,
    ...(region.city ? { city: region.city } : {}),
    ...(region.timezone ? { timezone: region.timezone } : {}),
  }
}
