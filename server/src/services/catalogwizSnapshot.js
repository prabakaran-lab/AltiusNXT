import sharp from 'sharp'
import { launchBrowserFor } from './browserLaunch.js'

/**
 * The before / after view of the CatalogWiz demo, as pictures of the visitor's real page.
 *
 * BEFORE is the product page photographed exactly as a visitor sees it: nothing added, nothing redrawn.
 * AFTER is the same live page with the enrichment placed into it in the site's own layout and fonts: the enriched
 * title in place of the page's heading, and one section under the product with the description, the category path
 * and the full specification table (rows CatalogWiz added or tidied are marked). Everything else on the page is
 * left exactly as it was. Returns null when the page cannot be photographed; the caller then shows the drawn view.
 */

const WIDTH = 1280
const MAX_BEFORE = 4200
const MAX_AFTER = 6000

/** Runs inside the live page: hides pop-ups and floating layers so the page itself is photographed as it loads. */
function preparePage() {
  // cookie bars, chat bubbles, pop-ups and other floating layers are not part of the page
  const OVERLAY = '[role="dialog"], [aria-modal="true"], [id*="consent" i], [class*="consent" i], [class*="gdpr" i], [id*="onetrust" i], [class*="onetrust" i], [id*="cookie" i], [class*="cookie" i], [class*="newsletter-popup" i], [class*="modal" i][style*="display: block"]'
  for (const el of document.querySelectorAll(OVERLAY)) el.style.setProperty('display', 'none', 'important')
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.position === 'fixed') {
      const r = el.getBoundingClientRect()
      // a fixed site header stays; anything else floating is hidden
      if (r.top > 10 || r.height > innerHeight * 0.4) el.style.setProperty('display', 'none', 'important')
      else el.style.setProperty('position', 'absolute', 'important')
    } else if (cs.position === 'sticky') el.style.setProperty('position', 'relative', 'important')
  }
  document.documentElement.style.setProperty('overflow', 'visible', 'important')
  document.body.style.setProperty('overflow', 'visible', 'important')
  window.scrollTo(0, 0)
}

/** Runs inside the live page: how far down the product's own content goes (heading, description, features, specs). */
function productBottom({ markers, title }) {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase()
  const titleText = clean(title).toLowerCase()
  const h1 = [...document.querySelectorAll('h1')].find((h) => clean(h.textContent).length > 2 && h.getClientRects().length && !h.closest('nav, footer, aside'))
    || (titleText ? [...document.querySelectorAll('body *')].find((n) => n.children.length <= 1 && clean(n.textContent).toLowerCase() === titleText && n.getClientRects().length && !n.closest('a, nav, footer, [data-catalogwiz]')) : null)
  const h1Box = h1?.getBoundingClientRect()
  const top = h1Box ? h1Box.top + scrollY : 0
  let bottom = h1Box ? h1Box.bottom + scrollY : 0
  const want = markers.map(clean).filter((m) => m.length >= 4)
  if (want.length) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = clean(n.textContent)
      if (t.length < 4 || !want.some((m) => t.includes(m.slice(0, 40)) || m.includes(t.slice(0, 40)))) continue
      const el = n.parentElement
      if (!el || el.closest('footer, nav, [class*="related" i], [class*="recommend" i]')) continue
      const r = el.getBoundingClientRect()
      if (!r.height) continue
      const b = r.bottom + scrollY
      if (b > bottom && b < top + 5000) bottom = b
    }
  }
  return { top, bottom, height: document.documentElement.scrollHeight }
}

/**
 * Runs inside the live page: places the enrichment into the page in its own style, each change where it belongs and
 * marked with a badge beside it:
 *   breadcrumb -> the enriched taxonomy (new levels highlighted)        "Enriched taxonomy"
 *   heading    -> the enriched title                                    "Enriched title"
 *   below the page's own content -> description and full specification table, added rows badged
 * Returns where the enrichment section went.
 */
function placeEnrichment(e) {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const norm = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const titleText = clean(e.pageTitle).toLowerCase()
  const h1 = [...document.querySelectorAll('h1')].find((h) => clean(h.textContent).length > 2 && h.getClientRects().length && !h.closest('nav, footer, aside'))
    || (titleText ? [...document.querySelectorAll('body *')].find((n) => n.children.length <= 1 && clean(n.textContent).toLowerCase() === titleText && n.getClientRects().length && !n.closest('a, nav, footer, [data-catalogwiz]')) : null)
  if (!h1) return null
  const ORANGE = '#ea580c'
  const GREEN = '#16a34a'
  const mark = (node) => { node.style.setProperty('box-shadow', 'inset 0 -0.42em rgba(249,115,22,.22)'); node.style.setProperty('border-radius', '2px') }
  const el = (tag, css, text) => { const n = document.createElement(tag); if (css) n.style.cssText = css; if (text != null) n.textContent = text; return n }
  const badge = (t, bg = ORANGE) => el('span', `display:inline-block;margin-left:10px;padding:2px 9px;border-radius:999px;font:700 11px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.02em;text-transform:none;vertical-align:middle;white-space:nowrap;color:#fff;background:${bg};box-shadow:0 2px 6px -2px rgba(234,88,12,.5);`, t)
  // the last text of an element replaced, so its links, spans and styling stay as the site made them
  // separators ("/", "›", "»"...) and hidden decoration are kept as they are; only the label text changes
  const SEP = /^[\s/\\›»>|→·•\-–—]+$/
  const isSep = (t) => SEP.test(t.nodeValue) || t.parentElement?.closest('[aria-hidden="true"]')
  const setText = (node, text) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const texts = []
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if (clean(t.nodeValue) && !isSep(t)) texts.push(t)
    if (!texts.length) { node.textContent = text; return }
    texts.forEach((t, i) => { t.nodeValue = i === texts.length - 1 ? text : '' })
  }

  // ---- title: the enriched title takes the place of the page's heading, keeping its style
  if (e.title && clean(e.title) !== clean(h1.textContent)) {
    h1.textContent = e.title
    mark(h1)
    h1.appendChild(badge('Enriched title'))
  }

  // ---- taxonomy: the page's breadcrumb shows the enriched path, in the site's own breadcrumb style
  let taxonomyShown = false
  const levels = (e.taxonomy || []).filter(Boolean)
  const bc = document.querySelector('nav[aria-label*="breadcrumb" i], [itemtype*="BreadcrumbList"], ol[class*="breadcrumb" i], ul[class*="breadcrumb" i], [class*="breadcrumb" i]')
  const items = bc ? [...bc.querySelectorAll('li')].filter((li) => clean(li.textContent) && !li.querySelector('li')) : []
  if (levels.length >= 2 && items.length >= 2) {
    const home = items[0]
    const last = items[items.length - 1]
    // the trail's last item is the product itself when it is marked current, names the product, or is hidden by the site
    const lastText = norm(last.textContent)
    const docName = norm(document.title.split('|')[0])
    const lastIsProduct = Boolean(lastText) && (
      /\b(current|active|is-active)\b/i.test(`${last.className} ${last.querySelector('[class]')?.className || ''}`) || last.hasAttribute('aria-current') || last.querySelector('[aria-current]')
      || norm(h1.textContent).includes(lastText.slice(0, 20)) || norm(e.pageTitle || '').includes(lastText.slice(0, 20)) || (docName && lastText === docName)
      || !last.getClientRects().length)
    const middle = items.slice(1, lastIsProduct ? -1 : items.length)
    // a visible level is copied for the new ones, so they look like the site's own breadcrumb links
    const template = middle.find((li) => li.getClientRects().length) || middle[0] || home
    const before = new Set(middle.map((li) => norm(li.textContent)))
    const same = levels.length === middle.length && levels.every((l, i) => norm(l) === norm(middle[i].textContent))
    if (!same) {
      const parent = (lastIsProduct ? last : template).parentElement
      const ref = lastIsProduct ? last : null
      middle.forEach((li) => li.remove())
      let lastLevel = null
      for (const level of levels) {
        const li = template.cloneNode(true)
        li.classList.remove('is-active', 'active', 'current')
        li.removeAttribute('aria-current')
        setText(li, level)
        // the highlight goes on the level's own label (its link, or its text element), never on the separator
        const label = li.querySelector('a') || [...li.querySelectorAll('span')].reverse().find((s) => clean(s.textContent) && !SEP.test(s.textContent) && !s.closest('[aria-hidden="true"]')) || li
        if (!before.has(norm(level))) mark(label)
        // the full level name is shown, even where the site shortens breadcrumb links ("Grinding & Finishin...")
        for (const n of [label, li]) { n.style.setProperty('max-width', 'none', 'important'); n.style.setProperty('text-overflow', 'clip', 'important'); n.style.setProperty('overflow', 'visible', 'important') }
        parent.insertBefore(li, ref)
        lastLevel = li
      }
      // the badge goes at the very end of the trail: after the product's own item when the site shows it, else after the deepest level
      ;(lastIsProduct && last.getClientRects().length ? last : lastLevel || parent.lastElementChild).appendChild(badge('Enriched taxonomy'))
      taxonomyShown = true
    }
  }

  // ---- description: the enriched description takes the place of the page's own description, so the original text is
  // not shown twice. The block keeps its heading and container; only its text changes, written in the site's own type.
  let descBox = null
  const pd = norm(e.pageDescription)
  if (e.description && pd.length >= 40) {
    const head = pd.slice(0, 25)
    const tail = pd.slice(-22)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let t = walker.nextNode(); t && !descBox; t = walker.nextNode()) {
      const p = t.parentElement
      if (!p || !norm(t.nodeValue) || p.closest('head, script, style, nav, footer, header, [data-catalogwiz], h1')) continue
      if (!norm(t.nodeValue).includes(head.slice(0, Math.min(head.length, norm(t.nodeValue).length)))) continue
      if (!norm(p.textContent).includes(head) && !head.startsWith(norm(t.nodeValue))) continue
      // the smallest block that holds the whole description (its first and last words)
      let box2 = p
      while (box2 && box2 !== document.body && !norm(box2.textContent).includes(tail)) box2 = box2.parentElement
      // only a block that is just the description: visible, no section headings of its own, and not much other text
      // (on pages whose description sits in a collapsed panel, the smallest visible block is the whole tab area: left alone)
      const fits = box2 && box2 !== document.body && !box2.contains(h1) && box2.getClientRects().length && box2.getBoundingClientRect().height < 3000
        && !box2.querySelector('h1, h2, h3, h4, table, [role="tab"], summary, button') && norm(box2.textContent).length <= pd.length * 1.5 + 200
      if (fits) descBox = box2
    }
    if (descBox) {
      const textEl = descBox.querySelector('p, li, span') || descBox
      const cs = getComputedStyle(textEl)
      const para = el('p', `margin:0 0 4px;font-family:${cs.fontFamily};font-size:${cs.fontSize};line-height:1.7;color:${cs.color};text-align:left;`, e.description)
      const lab = el('p', 'margin:0 0 10px;padding:0;')
      lab.appendChild(badge('Enriched description'))
      lab.firstChild.style.marginLeft = '0'
      descBox.replaceChildren(lab, para)
    }
  }

  // ---- the product's own block: the smallest box around the heading that also holds the main product picture
  const imgs = [...document.querySelectorAll('img')].filter((i) => { const r = i.getBoundingClientRect(); return r.width >= 160 && r.height >= 120 && !i.closest('header, nav, footer') })
  const h1Top = h1.getBoundingClientRect().top
  const main = imgs.sort((a, b) => Math.abs(a.getBoundingClientRect().top - h1Top) - Math.abs(b.getBoundingClientRect().top - h1Top))[0]
  let box = h1.parentElement
  if (main) { while (box && box !== document.body && !box.contains(main)) box = box.parentElement }
  if (!box || box === document.body || box === document.documentElement || box.getBoundingClientRect().height > 2600 || box.querySelector('footer')) box = h1.parentElement
  // the enrichment section goes after the page's own description / feature sections, so the page's own content stays above it
  const h1Bottom = h1.getBoundingClientRect().bottom
  const boxBottom = box.getBoundingClientRect().bottom
  const descs = [...document.querySelectorAll('[itemprop="description"], .productView-description, .product-description, .product__description, #description, #tab-description, .woocommerce-Tabs-panel--description, [class*="description" i]')]
    .filter((d) => { const r = d.getBoundingClientRect(); return r.height > 20 && r.top > h1Bottom && r.top - boxBottom < 1500 && !d.closest('footer, nav, header, [class*="related" i], [class*="recommend" i]') })
  let anchor = box
  if (descs.length) {
    anchor = descs.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a))
    while (anchor.parentElement && anchor.parentElement !== document.body && anchor.parentElement.getBoundingClientRect().bottom - anchor.getBoundingClientRect().bottom < 4 && !anchor.parentElement.contains(h1)) anchor = anchor.parentElement
  }

  const font = getComputedStyle(document.body).fontFamily
  const headColor = getComputedStyle(h1).color
  const sec = el('section', `display:block;box-sizing:border-box;width:100%;max-width:${Math.max(640, Math.round(box.getBoundingClientRect().width))}px;margin:32px auto 40px;padding:0 4px;font-family:${font};color:#1f2937;flex:0 0 100%;grid-column:1/-1;clear:both;text-align:left;`)
  sec.setAttribute('data-catalogwiz', 'enriched')
  const h = (t) => el('h2', `font-family:inherit;font-size:22px;line-height:1.3;font-weight:700;color:${headColor};margin:28px 0 12px;padding:0;text-transform:none;letter-spacing:0;`, t)

  // a page without a breadcrumb list gets the enriched category path here
  if (!taxonomyShown && levels.length >= 2) {
    const p = el('p', 'margin:0 0 6px;font-size:13.5px;color:#4b5563;')
    p.textContent = ['Home', ...levels].join('  ›  ')
    p.appendChild(badge('Enriched taxonomy'))
    sec.appendChild(p)
  }
  // a page whose own description could not be found gets the enriched description here instead
  if (e.description && !descBox) {
    const hd = h('Product description'); hd.appendChild(badge('Enriched description')); sec.appendChild(hd)
    sec.appendChild(el('p', 'margin:0;font-size:15.5px;line-height:1.7;color:#374151;', e.description))
  }
  if (e.attributes?.length) {
    const addedN = e.attributes.filter((a) => a.kind === 'add').length
    const hd = h('Specifications')
    hd.appendChild(badge(`${e.attributes.length} attributes`, GREEN))
    if (addedN) hd.appendChild(badge(`${addedN} added enrichment`))
    sec.appendChild(hd)
    const table = el('table', 'width:100%;border-collapse:collapse;font-size:14.5px;line-height:1.45;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;')
    const body = el('tbody')
    e.attributes.forEach((a, i) => {
      const tr = el('tr', `border-top:1px solid #e5e7eb;background:${a.kind === 'add' ? '#fff7ed' : a.kind === 'fix' ? '#fefce8' : i % 2 ? '#fafafa' : '#fff'};`)
      const th = el('th', `width:34%;text-align:left;vertical-align:top;padding:10px 14px;font-weight:600;color:#374151;${a.kind === 'add' ? `border-left:3px solid ${ORANGE};` : ''}`, a.label)
      const td = el('td', 'padding:10px 14px;color:#111827;vertical-align:top;', a.value)
      if (a.kind === 'add') td.appendChild(badge('Added enrichment'))
      else if (a.kind === 'fix') td.appendChild(badge('Tidied value', '#ca8a04'))
      tr.append(th, td); body.appendChild(tr)
    })
    table.appendChild(body); sec.appendChild(table)
  }
  // The enrichment belongs to this product, so it always goes ABOVE the shop's other-products sections ("Related products",
  // "You may also like", "Recently viewed"...), even when those sit inside the same block as the product.
  const RELATED_TEXT = /^(related|similar|recommended|you (may|might) also|customers (also|who)|frequently bought|recently viewed|also (bought|viewed)|people also|more from|complete the|have you considered|other products)/i
  const RELATED_SEL = '[class*="related" i], [id*="related" i], [class*="recommend" i], [class*="upsell" i], [class*="cross-sell" i], [class*="crosssell" i], [class*="also-bought" i], [class*="recently-viewed" i], [class*="you-may" i]'
  const h1Text = clean(h1.textContent)
  // the related section's own wrapper: grow from its heading only while the wrapper still starts at that heading, so a larger
  // block that also holds the page's own product information above it is never taken for the related section
  const outermost = (n) => {
    const top = n.getBoundingClientRect().top
    let x = n
    while (x.parentElement && x.parentElement !== document.body && !x.parentElement.contains(h1) && !clean(x.parentElement.textContent).includes(h1Text)
      && x.parentElement.getBoundingClientRect().top >= top - 80) x = x.parentElement
    return x
  }
  const below = (n) => n.getClientRects().length && n.getBoundingClientRect().top > h1Bottom && !n.closest('footer, nav, header, [data-catalogwiz]') && !n.contains(h1)
  const related = [
    ...[...document.querySelectorAll('h2, h3, h4, [role="heading"]')].filter((hd) => RELATED_TEXT.test(clean(hd.textContent)) && clean(hd.textContent).length < 60),
    ...document.querySelectorAll(RELATED_SEL),
  ].filter(below).map(outermost).filter((n) => !n.contains(h1) && n !== document.body)
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0]
  if (related && related.getBoundingClientRect().top < anchor.getBoundingClientRect().bottom + 4) related.before(sec)
  else anchor.after(sec)
  const r = sec.getBoundingClientRect()
  // the window glides to the first enriched block below the product: the replaced description, else the new section
  const d = descBox?.getBoundingClientRect()
  const focusTop = d && d.top < r.top ? d.top - 60 : r.top
  return { top: Math.round(focusTop + scrollY), bottom: Math.round(r.bottom + scrollY), titleTop: Math.round(h1.getBoundingClientRect().top + scrollY) }
}

// Taken at twice the pixel density (a retina-sharp picture of a 1280px-wide window), saved as WebP: sharp text at a small size.
async function shot(page, height) {
  const buf = await page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: WIDTH, height: Math.round(height) } })
  const webp = await sharp(buf).webp({ quality: 82, effort: 4 }).toBuffer()
  return `data:image/webp;base64,${webp.toString('base64')}`
}

/**
 * @param {string} url the product page
 * @param {{ markers: string[], title: string, description: string, taxonomy?: string[], attributes: {label,value,kind}[] }} enriched
 * @returns {Promise<{ before: string, after: string, width: number, afterFocus: number } | null>}
 */
export async function snapshotBeforeAfter(url, enriched) {
  let browser
  try {
    browser = await launchBrowserFor(url)
    const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 2 })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {})
    // lazy pictures and sections load as they scroll into view
    await page.evaluate(async () => { for (let y = 0; y < 4500; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)) } window.scrollTo(0, 0) })
    await page.waitForTimeout(800)
    await page.evaluate(preparePage)
    await page.waitForTimeout(300)

    const pb = await page.evaluate(productBottom, { markers: enriched.markers || [], title: enriched.pageTitle || '' })
    const beforeH = Math.min(MAX_BEFORE, pb.height, Math.max(pb.top + 900, pb.bottom + 80))
    if (beforeH < 300) return null
    const before = await shot(page, beforeH)

    const placed = await page.evaluate(placeEnrichment, { title: enriched.title, pageTitle: enriched.pageTitle, pageDescription: enriched.pageDescription, description: enriched.description, taxonomy: enriched.taxonomy, pageCrumbs: enriched.pageCrumbs, pageLabels: enriched.pageLabels, inline: enriched.inline, attributes: enriched.attributes })
    if (!placed) return null
    await page.waitForTimeout(200)
    const fullH = await page.evaluate(() => document.documentElement.scrollHeight)
    const afterH = Math.min(MAX_AFTER, fullH, placed.bottom + 60)
    const after = await shot(page, afterH)
    return { before, after, width: WIDTH, beforeHeight: Math.round(beforeH), afterHeight: Math.round(afterH), afterFocus: Math.max(0, placed.top - 40) / afterH }
  } catch (err) {
    console.warn(`[catalogwiz] before/after pictures failed for ${url}: ${err.message.split('\n')[0]}`)
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
