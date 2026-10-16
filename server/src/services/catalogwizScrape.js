import { chromium } from 'playwright'
import sharp from 'sharp'
import { fetchPageHtml, extractJsonLdObjects, isBotChallengeText, BOT_BLOCKED_MESSAGE } from './scrapeDo.js'
import { launchBrowserFor } from './browserLaunch.js'

/**
 * Step one of the CatalogWiz demo: read the product page as DATA, before any AI is involved.
 *
 * The page is fetched through Scrape.do (rendered HTML; a real browser is the fallback), then parsed in an
 * offline browser DOM with no scripts and no network, so every spec-table row, definition list, "Label: value"
 * line, feature bullet, identifier, breadcrumb and product image is read from the page's own structure.
 * Nothing here is specific to one site or product. The result is the page's ground truth: the AI later
 * enriches it, and what the page already says is never rewritten from memory.
 */

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const stripTags = (s) => clean(String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/* ---------------------------------------------------------------------------------------------------------
   Runs inside the parsed page (self-contained: no outside references). Returns plain data.
   --------------------------------------------------------------------------------------------------------- */
function extractInPage() {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const cls = (el) => `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`
  const meta = (k) => clean(document.querySelector(`meta[property="${k}"], meta[name="${k}"]`)?.getAttribute('content'))
  const out = { title: '', pairs: [], bullets: [], breadcrumbs: [], description: '', lines: [], priceLines: [], images: [], meta: {} }

  out.meta = {
    ogTitle: meta('og:title'), docTitle: clean(document.title), description: meta('description') || meta('og:description'),
    ogImage: meta('og:image'), twitterImage: meta('twitter:image'),
    linkImage: document.querySelector('link[rel="image_src"]')?.getAttribute('href') || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
  }

  // ---- the product heading: the h1 that best matches the page title
  const titleHay = norm(`${out.meta.ogTitle} ${out.meta.docTitle}`)
  const h1s = [...document.querySelectorAll('h1')].filter((h) => clean(h.textContent).length > 2 && !h.closest('nav, footer, aside'))
  const score = (h) => norm(h.textContent).split(' ').filter((t) => t && titleHay.includes(t)).length
  const h1 = h1s.sort((a, b) => score(b) - score(a))[0] || null
  out.title = h1 ? clean(h1.textContent) : ''

  // ---- breadcrumbs (read before anything is hidden)
  const bc = document.querySelector('[class*="breadcrumb" i], [id*="breadcrumb" i], nav[aria-label*="breadcrumb" i], [itemtype*="BreadcrumbList"]')
  if (bc) out.breadcrumbs = clean(bc.innerText || bc.textContent).split(/\s*(?:>|›|»|→|\n)\s*|\s+\/\s*|\s*\/\s+/).map(clean).filter(Boolean)

  // ---- images: collect candidates with a score, before hiding the page's non-product regions
  const all = [...document.querySelectorAll('*')]
  const index = new Map(all.map((e, i) => [e, i]))
  const h1i = h1 ? index.get(h1) : -1
  const titleTokens = new Set(norm(out.title).split(' ').filter((t) => t.length > 2))
  const BAD_IMG = /logo|sprite|icon|badge|banner|payment|visa|mastercard|paypal|amex|flag|facebook|twitter|linkedin|instagram|youtube|avatar|placeholder|blank|spacer|pixel|loading|spinner|star|rating|arrow|button|trust|seal|ssl|captcha|header|footer|nav/i
  const bigSrcset = (set) => String(set || '').split(',').map((p) => p.trim().split(/\s+/)).filter((p) => p[0]).sort((a, b) => parseFloat(b[1] || 0) - parseFloat(a[1] || 0))[0]?.[0]
  const REGION_BAD = 'nav, footer, aside, [class*="related" i], [class*="recommend" i], [class*="upsell" i], [class*="cross-sell" i], [class*="best-seller" i], [class*="bestseller" i], [class*="recently" i], [class*="also" i], [class*="menu" i], [class*="logo" i]'
  for (const el of document.querySelectorAll('img, [itemprop="image"]')) {
    const urls = []
    const add = (u) => { if (u && !/^data:/i.test(u) && !/\.svg(\?|$)/i.test(u)) urls.push(u) }
    for (const a of ['data-zoom-image', 'data-large', 'data-large_image', 'data-full', 'data-original', 'data-hires', 'data-image']) add(el.getAttribute?.(a))
    add(bigSrcset(el.getAttribute?.('data-srcset'))); add(bigSrcset(el.getAttribute?.('srcset')))
    const imgExt = (u) => (/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(u || '') ? u : '')
    add(el.getAttribute?.('data-src')); add(el.getAttribute?.('data-lazy-src')); add(el.getAttribute?.('src'))
    add(imgExt(el.getAttribute?.('content'))); add(imgExt(el.getAttribute?.('href')))
    const a = el.closest?.('a[href]'); if (a && /\.(jpe?g|png|webp)(\?|$)/i.test(a.getAttribute('href'))) add(a.getAttribute('href'))
    if (!urls.length) continue
    const text = `${el.getAttribute?.('alt') || ''} ${el.getAttribute?.('title') || ''} ${el.getAttribute?.('name') || ''} ${cls(el)} ${urls[0]}`
    let s = 0
    if (el.hasAttribute?.('itemprop') || el.closest?.('[itemprop="image"]')) s += 5
    s += Math.min(4, 2 * norm(text).split(' ').filter((t) => titleTokens.has(t)).length)
    if (/product|main|zoom|primary|gallery|viewer|large|detail|hero|photo/i.test(cls(el))) s += 2
    if (BAD_IMG.test(urls[0]) || BAD_IMG.test(cls(el))) s -= 6
    const w = parseFloat(el.getAttribute?.('width')), hgt = parseFloat(el.getAttribute?.('height'))
    if ((w && w <= 90) || (hgt && hgt <= 90)) s -= 4
    if (el.closest?.(REGION_BAD)) s -= 5
    if (h1i >= 0) s += 3 * Math.max(0, 1 - Math.abs((index.get(el) ?? 0) - h1i) / 500)
    out.images.push({ urls: [...new Set(urls)].slice(0, 4), score: Math.round(s * 10) / 10 })
  }
  out.images.sort((a, b) => b.score - a.score)
  out.images = out.images.slice(0, 10)

  // ---- hide everything that is not the product's own content, so innerText skips it
  const HIDE = 'nav, footer, aside, select, option, button, script, style, template, noscript, [role="navigation"], [role="contentinfo"], [aria-hidden="true"], [hidden]'
  const HIDE_CLS = /(^|[\s_-])(related|recommend\w*|upsell|cross-?sell|best-?sell\w*|carousel|slick|recently|also-?(viewed|bought)|footer|menu|mega\w*|navbar|breadcrumbs?|cookie|modal|popup|newsletter|social|share|reviews?|testimonials?|sidebar)([\s_-]|$)/i
  for (const el of all) {
    if (!el.isConnected) continue
    const hideHeader = el.tagName === 'HEADER' && !el.querySelector('h1')
    if (hideHeader || el.matches(HIDE) || (el !== document.body && HIDE_CLS.test(cls(el)) && !(h1 && el.contains(h1)))) el.style.display = 'none'
  }

  // ---- text lines after the heading
  let lines = (document.body.innerText || '').split('\n').map(clean).filter(Boolean)
  const hi = h1 ? lines.findIndex((l) => l === out.title || l.includes(out.title)) : -1
  if (hi >= 0) lines = lines.slice(hi + 1)
  lines = lines.slice(0, 500)
  const PRICE = /(?:[$€£₹]\s?\d|\b(?:USD|AUD|GBP|EUR|CAD|INR)\s?\d)|\bprice\b|\bin stock\b|\bout of stock\b|\bstock\b\s*:?\s*\d|\bavailability\b|\badd to (?:cart|quote|basket)\b|\bdiscount/i
  out.priceLines = lines.filter((l) => PRICE.test(l) && l.length <= 140)
  out.lines = lines.filter((l) => !(PRICE.test(l) && l.length <= 140))

  // ---- "Label: value" pairs: tables, definition lists, then lines
  const seen = new Set()
  const afterH1 = (el) => !h1 || !!(h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
  const visible = (el) => el.getClientRects().length > 0
  const push = (label, value, source) => {
    label = clean(label).replace(/\s*[:：]\s*$/, ''); value = clean(value)
    // not a pair: no real label, an empty value ("-"), or a value that is itself another "Label: value" (a heading above a list)
    if (label.length < 2 || label.length > 48 || !value || value.length > 220 || !/[a-z]/i.test(label) || /https?:|www\./i.test(label)) return
    if (!/[a-z0-9]/i.test(value) || /^[A-Za-z#][^:：]{1,44}[:：]\s+\S/.test(value)) return
    // short labels are case-sensitive: "d2" and "D2" are different measurements
    const k = label.length <= 4 ? label : norm(label)
    if (!k || seen.has(k)) return
    seen.add(k); out.pairs.push({ label, value, source })
  }
  for (const t of document.querySelectorAll('table')) {
    if (!visible(t) || !afterH1(t)) continue
    for (const row of t.rows) {
      const cells = [...row.cells].map((c) => clean(c.innerText || c.textContent))
      if (cells.length === 2) push(cells[0], cells[1], 'table')
      else if (cells.length >= 4 && cells.length <= 6 && cells.length % 2 === 0 && cells.every((c, i) => i % 2 || /[:：]$/.test(c) || row.cells[i].tagName === 'TH')) for (let i = 0; i < cells.length; i += 2) push(cells[i], cells[i + 1], 'table')
    }
  }
  for (const dl of document.querySelectorAll('dl')) {
    if (!visible(dl) || !afterH1(dl)) continue
    const dts = [...dl.querySelectorAll('dt')]
    dts.forEach((dt) => { const dd = dt.nextElementSibling; if (dd?.tagName === 'DD') push(dt.textContent, dd.textContent, 'list') })
  }
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const m = l.match(/^([A-Za-z#][^:：]{1,44}?)\s*[:：]\s+(\S.{0,200})$/)
    if (m && m[1].split(' ').length <= 6 && !PRICE.test(l)) { push(m[1], m[2], 'text'); continue }
    const lone = l.match(/^([A-Za-z#][^:：]{1,44}?)\s*[:：]$/)
    if (lone && lines[i + 1] && lines[i + 1].length <= 200 && !/[:：]\s*$|[:：]\s+\S/.test(lines[i + 1]) && !PRICE.test(lines[i + 1])) push(lone[1], lines[i + 1], 'text')
  }

  // ---- feature bullets under a heading such as "Features" / "Benefits" / "Includes"
  const HEAD = /^(product )?(key )?(features?|benefits?|highlights?|specifications?|details|includes?|what'?s included|in the box|applications?|advantages)\b/i
  for (const ul of document.querySelectorAll('ul, ol')) {
    if (!visible(ul) || !afterH1(ul)) continue
    let head = ''
    for (let p = ul.previousElementSibling, n = 0; p && n < 2 && !head; p = p.previousElementSibling, n++) { const t = clean(p.textContent); if (t.length <= 40 && HEAD.test(t)) head = t.replace(/[:：]\s*$/, '') }
    if (!head) continue
    const items = [...ul.children].map((li) => clean(li.textContent)).filter((t) => t.length >= 6 && t.length <= 220 && !/^([A-Za-z#][^:：]{1,44}?)\s*[:：]\s+\S/.test(t))
    if (items.length) out.bullets.push({ label: head, items })
  }

  // ---- the page's own description: the longest prose block after the heading
  const prose = lines.filter((l) => l.length >= 80 && !/^([A-Za-z#][^:：]{1,44}?)\s*[:：]\s+\S/.test(l)).slice(0, 2)
  out.description = clean(document.querySelector('[itemprop="description"]')?.textContent) || clean(prose.join(' '))
  out.description = out.description.slice(0, 900)
  return out
}

/* ---------------------------------------------------------------------------------------------------------
   Node side
   --------------------------------------------------------------------------------------------------------- */

/** Parses HTML in a script-free, network-free browser page and returns the extracted data. */
async function parseOffline(html) {
  const safe = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<link\b[^>]*rel=["']?stylesheet[^>]*>/gi, ' ')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, ' ')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.route('**/*', (r) => r.abort())
    await page.setContent(safe, { waitUntil: 'domcontentloaded' })
    return await page.evaluate(extractInPage)
  } finally {
    await browser.close().catch(() => {})
  }
}

/** The rendered HTML from a real browser: the fallback when Scrape.do could not give a usable page. */
async function browserHtml(url) {
  const browser = await launchBrowserFor(url)
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(1200)
    return { html: await page.content(), finalUrl: page.url() }
  } finally {
    await browser.close().catch(() => {})
  }
}

const isProduct = (o) => { const t = o?.['@type']; return t === 'Product' || (Array.isArray(t) && t.includes('Product')) }
const absUrl = (u, base) => {
  try {
    const x = new URL(String(u).replace(/&amp;/g, '&').trim(), base)
    // a broken template value ("undefined", "null") or the page itself is not an image address
    if (!/^https?:$/.test(x.protocol) || /\/(undefined|null|false|nan)$/i.test(x.pathname) || x.toString() === base) return ''
    return x.toString()
  } catch { return '' }
}

// Labels that belong to the shop, not to the product.
const SHOP_LABEL = /^(product )?stock$|^in stock$|^availability$|^qty$|^quantity$|^price\b|^your .*price|^add to\b|^sort\b|^filter\b|^shipping|^ships?\b|^delivery|^email|^password|^search|^sign in|^log ?in|^phone|^fax|^tel\b|^cart\b|^total\b|^subtotal\b|^save\b|^you save|^discount|^sku\/|^reviews?\b|^rating/i
const ID_LABEL = /\b(part|sku|mpn|model|item|catalog(?:ue)?|style|upc|ean|gtin|isbn|product code|stock code|article)\b/i

/** Structured data's own product facts, as attributes. */
function markupFacts(product) {
  if (!product) return []
  const facts = []
  const add = (label, value) => { value = clean(typeof value === 'object' ? value?.name || value?.value || '' : value); if (value && value.length <= 200) facts.push({ label, value, source: 'structured data' }) }
  add('Brand', product.brand); add('Manufacturer', product.manufacturer)
  add('MPN', product.mpn); add('SKU', product.sku)
  add('GTIN', product.gtin || product.gtin8 || product.gtin12 || product.gtin13 || product.gtin14)
  add('Model', product.model); add('Color', product.color); add('Material', product.material); add('Size', product.size)
  for (const p of Array.isArray(product.additionalProperty) ? product.additionalProperty : []) if (p?.name) add(p.name, p.value)
  return facts
}

/** Reads one product page. Returns the page's own data; throws a readable error when it cannot be read. */
export async function scrapeProductPage(url, onStage = () => {}) {
  onStage('Reading your product page')
  let fetched = null
  try { fetched = await fetchPageHtml(url) } catch { /* the browser fallback below */ }
  let html = fetched?.html || ''
  let via = fetched?.source || ''
  let data = null
  const usable = (d) => d && d.title && (d.pairs.length >= 2 || d.bullets.length || d.description)

  if (html && !isBotChallengeText(html.replace(/<[^>]+>/g, ' ').slice(0, 3000))) data = await parseOffline(html).catch(() => null)
  if (!usable(data)) {
    // Scrape.do gave nothing usable (blocked, empty or script-only): read it in a real browser instead.
    try {
      const b = await browserHtml(url)
      const d2 = await parseOffline(b.html).catch(() => null)
      if (d2 && (!data || (d2.pairs.length + (d2.title ? 3 : 0)) > (data.pairs.length + (data.title ? 3 : 0)))) { data = d2; html = b.html; via = 'browser' }
    } catch { /* keep what we have */ }
  }
  if (!data || !data.title) {
    if (html && isBotChallengeText(html.replace(/<[^>]+>/g, ' ').slice(0, 3000))) throw new Error(BOT_BLOCKED_MESSAGE)
    throw new Error('that page could not be read, please check the link and try again')
  }

  const product = extractJsonLdObjects(html).find(isProduct) || null
  const markup = markupFacts(product)

  // Existing attributes: exactly what the page states. Shop labels are dropped; structured data fills gaps only.
  const seen = new Set()
  const attributes = []
  const keyOf = (label) => (label.length <= 4 ? label : norm(label))
  const add = (a) => { const k = keyOf(a.label); if (!k || seen.has(k) || SHOP_LABEL.test(a.label)) return; seen.add(k); attributes.push(a) }
  data.pairs.forEach(add)
  for (const b of data.bullets) add({ label: b.label, value: b.items.join('; ').slice(0, 400), source: 'list' })
  markup.forEach((m) => { if (!attributes.some((a) => norm(a.value) === norm(m.value))) add(m) })
  const crumbs = data.breadcrumbs.filter((c) => !/^home$/i.test(c) && norm(c) !== norm(data.title))
  if (crumbs.length) add({ label: 'Category', value: crumbs.join(' > ').slice(0, 160), source: 'breadcrumb' })

  const identifiers = attributes.filter((a) => ID_LABEL.test(a.label) && /[0-9]/.test(a.value) && a.value.length <= 40).map((a) => ({ label: a.label, value: a.value }))

  const landed = absUrl(data.meta.canonical, url) || url
  const imageCandidates = []
  const push = (u, bonus = 0) => { const a = absUrl(u, url); if (a) imageCandidates.push({ url: a, score: bonus }) }
  const ldImage = Array.isArray(product?.image) ? product.image[0] : product?.image
  push(typeof ldImage === 'object' ? ldImage?.url : ldImage, 9)
  push(data.meta.ogImage, 8); push(data.meta.twitterImage, 6); push(data.meta.linkImage, 6)
  for (const im of data.images) im.urls.forEach((u, i) => push(u, im.score - i * 0.5))
  const seenImg = new Set()
  const images = imageCandidates.filter((c) => !seenImg.has(c.url) && seenImg.add(c.url)).sort((a, b) => b.score - a.score).map((c) => c.url).slice(0, 8)

  const title = data.title
  const description = clean(stripTags(product?.description) || (norm(data.meta.description) !== norm(title) ? data.meta.description : '') || data.description).slice(0, 900)
  console.log(`[catalogwiz] scraped ${new URL(url).hostname} via ${via || 'unknown'}: ${attributes.length} attributes, ${identifiers.length} identifiers, ${images.length} image candidates`)
  return {
    url,
    pageUrl: landed,
    via,
    title,
    description: norm(description) === norm(title) ? '' : description,
    attributes,
    identifiers,
    brand: clean(typeof product?.brand === 'object' ? product.brand?.name : product?.brand) || attributes.find((a) => /^(brand|manufacturer|mfr|make)\b/i.test(a.label))?.value || '',
    breadcrumbs: crumbs,
    lines: data.lines,
    priceLines: data.priceLines,
    images,
  }
}

/** Downloads the product image on the server (so hot-link blocks and referrer rules do not matter) and returns a
 *  small, clean data URL, or null when no usable picture can be fetched. */
export async function fetchProductImage(candidates, pageUrl) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
  for (const url of candidates.slice(0, 6)) {
    for (const referer of [pageUrl, null]) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8', ...(referer ? { Referer: referer } : {}) }, signal: AbortSignal.timeout(15000) })
        if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) continue
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < 1500 || buf.length > 12 * 1024 * 1024) continue
        const info = await sharp(buf).metadata()
        if (!info.width || !info.height || info.width < 120 || info.height < 120) continue
        const jpeg = await sharp(buf).flatten({ background: '#ffffff' }).resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
        return { dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}`, sourceUrl: url }
      } catch { /* try the next way / candidate */ }
    }
  }
  return null
}

/** Last-resort product picture: the page is opened in a browser and the product's main picture is photographed exactly as a visitor sees it.
 *  Used only when none of the page's image addresses could be downloaded (hot-link protection, script-built galleries, CSS backgrounds).
 *  Returns { dataUrl, sourceUrl } or null. */
export async function captureProductImage(pageUrl) {
  let browser
  try {
    browser = await launchBrowserFor(pageUrl)
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
    await page.waitForTimeout(1500)
    // lazy pictures load as they scroll into view
    await page.evaluate(async () => { for (let y = 0; y < 1800; y += 450) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)) } window.scrollTo(0, 0) }).catch(() => {})
    await page.waitForTimeout(500)

    const picked = await page.evaluate(() => {
      const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
      const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      const BAD = /logo|sprite|icon|badge|banner|payment|visa|mastercard|paypal|flag|facebook|twitter|linkedin|instagram|youtube|avatar|placeholder|blank|spacer|pixel|loading|spinner|star|rating/i
      const REGION_BAD = 'nav, footer, aside, header:not(:has(h1)), [class*="related" i], [class*="recommend" i], [class*="upsell" i], [class*="cross-sell" i], [class*="carousel" i], [class*="recent" i], [class*="newsletter" i], [class*="cookie" i], [class*="modal" i], [class*="popup" i]'
      const h1 = [...document.querySelectorAll('h1')].find((h) => clean(h.textContent).length > 2 && !h.closest('nav, footer, aside')) || null
      const h1Top = h1 ? h1.getBoundingClientRect().top + window.scrollY : 0
      const titleTokens = new Set(norm(h1?.textContent || document.title).split(' ').filter((t) => t.length > 2))
      let best = null
      let bestScore = 0
      const OVERLAY = '[role="dialog"], [aria-modal="true"], [id*="consent" i], [class*="consent" i], [class*="gdpr" i], [id*="onetrust" i], [class*="onetrust" i], [id*="cookie" i], [class*="cookie" i]'
      const floating = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true } return false }
      const consider = (el, src) => {
        const r = el.getBoundingClientRect()
        if (r.width < 160 || r.height < 160) return
        if (el.closest(OVERLAY) || floating(el)) return
        // a picture that did not load (a broken link shows only its alt text) is not a product picture
        if (el.tagName === 'IMG' && (!el.complete || el.naturalWidth < 50)) return
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return
        const ratio = r.width / r.height
        const hay = `${el.getAttribute('alt') || ''} ${el.id} ${typeof el.className === 'string' ? el.className : ''} ${src}`
        let score = Math.min(30, (r.width * r.height) / 10000)
        if (BAD.test(hay)) score -= 12
        if (el.closest(REGION_BAD)) score -= 12
        if (ratio > 4 || ratio < 0.25) score -= 6
        score += 3 * norm(hay).split(' ').filter((t) => titleTokens.has(t)).length
        if (/product|main|zoom|primary|gallery|viewer|large|detail|hero|photo|image/i.test(hay)) score += 3
        if (h1) score += 5 * Math.max(0, 1 - Math.abs(r.top + window.scrollY - h1Top) / 900)
        if (score > bestScore) { bestScore = score; best = el }
      }
      for (const img of document.querySelectorAll('img')) consider(img, img.currentSrc || img.src)
      for (const el of document.querySelectorAll('div, span, a, figure')) {
        const bg = getComputedStyle(el).backgroundImage
        if (bg && bg !== 'none' && /url\(/.test(bg) && !el.children.length) consider(el, bg)
      }
      if (!best || bestScore < 4) return false
      best.setAttribute('data-altiusnxt-photo', '1')
      // pop-ups, cookie bars and sticky bars must not sit on top of the picture when it is photographed
      for (const el of document.querySelectorAll('body *')) {
        if (el === best || el.contains(best) || best.contains(el)) continue
        const p = getComputedStyle(el).position
        if (p === 'fixed' || p === 'sticky' || el.matches(OVERLAY)) el.style.setProperty('visibility', 'hidden', 'important')
      }
      return true
    })
    if (!picked) return null
    const shot = await (await page.$('[data-altiusnxt-photo="1"]'))?.screenshot({ type: 'png' }).catch(() => null)
    if (!shot) return null
    const info = await sharp(shot).metadata()
    if (!info.width || !info.height || info.width < 120 || info.height < 120) return null
    const spread = (await sharp(shot).flatten({ background: '#ffffff' }).stats()).channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3
    if (spread < 12) return null
    const jpeg = await sharp(shot).flatten({ background: '#ffffff' }).resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
    return { dataUrl: `data:image/jpeg;base64,${jpeg.toString('base64')}`, sourceUrl: pageUrl }
  } catch {
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
