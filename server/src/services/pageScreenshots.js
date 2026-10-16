import { chromium } from 'playwright'
import { launchBrowserFor } from './browserLaunch.js'
import sharp from 'sharp'

// Same navy/orange palette as src/templates/reportTemplate.js, reused here so the
// mock-up screenshot reads as part of the same report.
const NAVY = '#0b1f3a'
const NAVY_2 = '#122b52'
const ORANGE = '#ff6a1a'
const ORANGE_2 = '#e85a0c'
const STEEL = '#48566b'
const STEEL_2 = '#8291a6'
const LIGHT = '#dde3ec'
const PAPER = '#f4f6fa'
const CREAM = '#fbf1e6'

const VIEWPORT = { width: 1280, height: 900 }
const HEADER_CROP_HEIGHT = 130

// Before/after screenshots for the PDF are the WHOLE page, top to bottom, like the reference
// reports: the current page as it is, and the same page with its content corrected. Captured at
// 1.5x pixel density so they stay sharp when the PDF is zoomed; very long pages are cut at
// SHOT_MAX_HEIGHT CSS px so one report never carries an enormous image.
const SHOT_SCALE = 1.5
const SHOT_MAX_HEIGHT = 6000

/**
 * Hides everything on the page that is not part of the page itself: cookie/consent banners, chat
 * widgets, newsletter / discount pop-ups with their dimming backdrops, and bottom notices. Runs
 * inside the page and must stay self-contained (it is serialised into the browser).
 */
function hideOverlaysInPage() {
  try {
    if (!document.body) return
    const kill = '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="onetrust" i],[class*="onetrust" i],[class*="cc-window" i],[id*="gdpr" i],[class*="gdpr" i],[aria-label*="cookie" i],[id*="intercom" i],[class*="intercom" i],[id*="drift" i],[id*="livechat" i],[class*="chat-widget" i],[id*="chat-widget" i],[class*="whatsapp" i],[id*="whatsapp" i],[role="dialog"],[aria-modal="true"],[class*="popup" i],[id*="popup" i],[class*="modal-backdrop" i],[class*="overlay" i],[class*="klaviyo" i],[id*="klaviyo" i],[class*="privy" i],[class*="newsletter-modal" i],[class*="subscribe-modal" i]'
    document.querySelectorAll(kill).forEach((el) => {
      // a plain page container that merely mentions "overlay" in a class must stay
      if (el === document.body || el === document.documentElement || el.querySelector('h1')) return
      el.style.setProperty('display', 'none', 'important')
    })
    // Anything pinned to the window that is not the page: bottom notices and corner widgets,
    // full-window backdrops, and centred pop-ups.
    for (const el of document.querySelectorAll('body *')) {
      const s = getComputedStyle(el)
      if (s.position !== 'fixed') continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const bottomBanner = r.top > window.innerHeight * 0.55 && r.width > window.innerWidth * 0.5
      const cornerWidget = r.width < 120 && r.height < 120 && r.left > window.innerWidth * 0.8 && r.top > window.innerHeight * 0.5
      const backdrop = r.width > window.innerWidth * 0.9 && r.height > window.innerHeight * 0.6
      const centredDialog = r.top > 40 && r.height > 100 && r.width < window.innerWidth * 0.85 && Math.abs(r.left + r.width / 2 - window.innerWidth / 2) < 90
      if (bottomBanner || cornerWidget || backdrop || centredDialog) el.style.setProperty('display', 'none', 'important')
    }
    // Pop-ups lock scrolling and dim the page; undo both so the page photographs normally.
    for (const el of [document.documentElement, document.body]) {
      el.style.setProperty('overflow', 'visible', 'important')
      el.style.setProperty('filter', 'none', 'important')
    }
  } catch (e) { /* never let cleanup break the page */ }
}

/** Keeps the clean-up running for the whole visit, so a pop-up that appears several seconds after
 *  load (newsletter / discount dialogs usually do) is removed the moment it shows. */
async function installOverlayKiller(page) {
  await page.addInitScript(`(${hideOverlaysInPage.toString()}); setInterval(hideOverlaysInPage, 300);`)
}

/** Gets the page ready to be photographed: clears overlays, and scrolls the whole page once so
 *  lazy-loaded images (related products, galleries) load. */
async function prepareForShot(page) {
  await page.evaluate(hideOverlaysInPage).catch(() => {})
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8))
    const max = Math.min(document.documentElement.scrollHeight, 12000)
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 80))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 250))
  }).catch(() => {})
  await page.waitForTimeout(1500) // let late pop-ups appear, then sweep once more
  await page.evaluate(hideOverlaysInPage).catch(() => {})
}

/** Opens the page and waits for it to settle. A site that never goes quiet within the limit (a slow store, a chat
 *  widget that keeps polling) is photographed as it has loaded so far, instead of failing the whole capture. */
async function gotoSettled(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
  } catch (err) {
    if (!/timeout/i.test(String(err?.message))) throw err
    if (page.url() === 'about:blank') await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    else console.warn(`[screenshot] ${url} did not go quiet within 20s; using the page as loaded so far`)
  }
}

/** Whole-page capture (see SHOT_* above): the full page top to bottom. The report template scales the
 *  "current" and "enriched" shots by the same factor so they stay comparable (see page 4 of the template). */
async function captureFullPageShot(page) {
  await prepareForShot(page)
  const pageHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0))
  const height = Math.max(VIEWPORT.height, Math.min(SHOT_MAX_HEIGHT, pageHeight))
  return page.screenshot({ type: 'png', fullPage: true, clip: { x: 0, y: 0, width: VIEWPORT.width, height } })
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

/**
 * Captures a viewport screenshot of a live, arbitrary, unknown prospect page exactly as it
 * renders today, plus a crop of just its top strip (header/nav/branding) for reuse in the
 * enriched mock-up — one navigation, two screenshots, since re-visiting the page a second time
 * just for the crop would double the load time for no benefit. No DOM rewriting of the content
 * itself — that's fragile across templates we've never seen; the header crop is just pixels.
 * Returns { fullScreenshot: Buffer|null, headerCrop: Buffer|null } — each independently null on
 * failure so a header-crop problem doesn't take down the full screenshot or vice versa.
 */
export async function captureCurrentPageAndHeader(url) {
  let browser
  const result = { fullScreenshot: null, headerCrop: null, renderedText: '' }
  try {
    browser = await launchBrowserFor(url)
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SHOT_SCALE })
    await installOverlayKiller(page)
    await gotoSettled(page, url)

    // The browser-rendered text, which includes script-injected content (store-wide notice
    // banners, tabs filled client-side) that a static HTML fetch never sees.
    result.renderedText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 20000)).catch(() => '')

    result.fullScreenshot = await captureFullPageShot(page).catch((err) => {
      console.warn(`captureCurrentPageAndHeader: full screenshot failed for ${url}: ${err.message}`)
      return null
    })

    // The header crop feeds the composited fallback mock-up, which is laid out in 1x pixels —
    // scale it back down from the 2x capture so that path is unchanged.
    result.headerCrop = await page
      .screenshot({ type: 'png', clip: { x: 0, y: 0, width: VIEWPORT.width, height: HEADER_CROP_HEIGHT } })
      .then((buf) => sharp(buf).resize({ width: VIEWPORT.width }).png().toBuffer())
      .catch((err) => {
        console.warn(`captureCurrentPageAndHeader: header crop failed for ${url}: ${err.message}`)
        return null
      })
  } catch (err) {
    console.warn(`captureCurrentPageAndHeader failed for ${url}: ${err.message}`)
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
  return result
}

/** Back-compat single-purpose wrapper — some callers only want the full screenshot. */
export async function captureCurrentPageScreenshot(url) {
  const { fullScreenshot } = await captureCurrentPageAndHeader(url)
  return fullScreenshot
}

function buildMockupHtml({ productName, manufacturerBrand, manufacturerCode, price, specs, description, includeTopbar, bodyHeight }) {
  const rows = (Array.isArray(specs) ? specs : [])
    .map((s, i) => `
      <tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td class="spec-label">${esc(s?.label)}</td>
        <td class="spec-value">${esc(s?.value)}</td>
      </tr>
    `)
    .join('')

  const priceLine = price !== undefined && price !== null && price !== ''
    ? `<div class="price">${typeof price === 'number' ? `$${price.toLocaleString('en-US')}` : esc(price)}</div>`
    : ''

  const badges = [
    rows ? 'Full specifications' : null,
    description ? 'AI-readable description' : null,
    'Structured data (schema.org)',
  ].filter(Boolean)

  const badgeHtml = badges
    .map((b) => `<span class="badge">&#10003; ${esc(b)}</span>`)
    .join('')

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            width: ${VIEWPORT.width}px;
            height: ${bodyHeight}px;
            font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
            background: ${PAPER};
            color: ${NAVY};
          }
          .page {
            width: ${VIEWPORT.width}px;
            height: ${bodyHeight}px;
            display: flex;
            flex-direction: column;
          }
          .topbar {
            background: ${NAVY};
            background: linear-gradient(90deg, ${NAVY}, ${NAVY_2});
            color: #fff;
            padding: 18px 40px;
            font-size: 14px;
            letter-spacing: 0.08em;
            font-weight: 600;
          }
          .content {
            flex: 1;
            padding: 32px 48px;
            overflow: hidden;
          }
          .breadcrumb {
            font-size: 12px;
            color: ${STEEL_2};
            margin-bottom: 18px;
          }
          .breadcrumb span.sep {
            margin: 0 6px;
            color: ${LIGHT};
          }
          .layout {
            display: flex;
            gap: 36px;
          }
          .media-col {
            width: 280px;
            flex: 0 0 280px;
          }
          .media-box {
            width: 280px;
            height: 280px;
            border-radius: 10px;
            background: linear-gradient(145deg, #eef1f6, #e2e7ef);
            border: 1px solid ${LIGHT};
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${STEEL_2};
          }
          .badges {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #eaf7ee;
            color: #1f8a4c;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 10px;
            border-radius: 5px;
          }
          .info-col {
            flex: 1;
            min-width: 0;
          }
          .brand-line {
            color: ${ORANGE_2};
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .product-name {
            font-size: 26px;
            font-weight: 700;
            color: ${NAVY};
            margin: 0 0 10px 0;
            line-height: 1.3;
          }
          .code-line {
            color: ${STEEL};
            font-size: 13px;
            margin-bottom: 16px;
          }
          .price-row {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;
          }
          .price {
            color: ${ORANGE_2};
            font-size: 26px;
            font-weight: 700;
          }
          .cta-btn {
            background: ${NAVY};
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.03em;
            padding: 10px 20px;
            border-radius: 6px;
          }
          .stock-line {
            color: #1f8a4c;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
          }
          table.specs {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: #fff;
            border: 1px solid ${LIGHT};
            border-radius: 6px;
            overflow: hidden;
          }
          table.specs td {
            padding: 9px 16px;
            border-bottom: 1px solid ${LIGHT};
            font-size: 13px;
          }
          table.specs tr:last-child td {
            border-bottom: none;
          }
          table.specs tr.alt td {
            background: ${PAPER};
          }
          .spec-label {
            width: 200px;
            color: ${STEEL_2};
            font-weight: 600;
          }
          .spec-value {
            color: ${NAVY};
            font-weight: 500;
          }
          .description {
            font-size: 13px;
            line-height: 1.6;
            color: ${STEEL};
          }
          .section-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: ${NAVY_2};
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${includeTopbar ? `<div class="topbar">PRODUCT DETAIL</div>` : ''}
          <div class="content">
            <div class="breadcrumb">Home <span class="sep">/</span> ${esc((manufacturerBrand || 'Products'))} <span class="sep">/</span> ${esc(productName) || 'Product'}</div>
            <div class="layout">
              <div class="media-col">
                <div class="media-box">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div class="badges">${badgeHtml}</div>
              </div>
              <div class="info-col">
                <div class="brand-line">${esc(manufacturerBrand) || 'MANUFACTURER'}</div>
                <h1 class="product-name">${esc(productName) || 'Product name unavailable'}</h1>
                <div class="code-line">${manufacturerCode ? `Mfr. Code: ${esc(manufacturerCode)}` : ''}</div>
                <div class="price-row">
                  ${priceLine}
                  <div class="cta-btn">ADD TO CART</div>
                </div>
                <div class="stock-line">&#9679; In stock — ships today</div>
                ${rows ? `<div class="section-label">Specifications</div><table class="specs">${rows}</table>` : ''}
                ${description ? `<div class="section-label">Description</div><div class="description">${esc(description)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Fallback mock-up: composites a real header-pixel crop on top of a generic content block below
 * it, without ever touching the real page's actual DOM. Used only when the DOM-injection approach
 * (captureDomInjectedMockup, tried first — see captureEnrichedMockupScreenshot below) can't find
 * anywhere sane to inject into, or fails outright. Falls back further to the fully-generic layout
 * (own topbar, full height) if no header crop is given either. Returns a PNG Buffer, or null.
 */
async function captureCompositeMockupScreenshot({ productName, manufacturerBrand, manufacturerCode, price, specs, description, headerCrop }) {
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: VIEWPORT })

    const useRealHeader = Boolean(headerCrop)

    async function renderContent({ includeTopbar, bodyHeight }) {
      const html = buildMockupHtml({ productName, manufacturerBrand, manufacturerCode, price, specs, description, includeTopbar, bodyHeight })
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 20000 })
      return page.screenshot({ type: 'png', fullPage: false })
    }

    if (!useRealHeader) {
      return await renderContent({ includeTopbar: true, bodyHeight: VIEWPORT.height })
    }

    const contentBuffer = await renderContent({ includeTopbar: false, bodyHeight: VIEWPORT.height - HEADER_CROP_HEIGHT })
    try {
      return await sharp({
        create: { width: VIEWPORT.width, height: VIEWPORT.height, channels: 3, background: { r: 255, g: 255, b: 255 } },
      })
        .composite([
          { input: headerCrop, top: 0, left: 0 },
          { input: contentBuffer, top: HEADER_CROP_HEIGHT, left: 0 },
        ])
        .png()
        .toBuffer()
    } catch (err) {
      // Composite failed — properly re-render the full generic layout (own topbar, full height)
      // rather than returning the shorter, header-less content screenshot as-is.
      console.warn(`captureCompositeMockupScreenshot: header composite failed, falling back to generic layout: ${err.message}`)
      return await renderContent({ includeTopbar: true, bodyHeight: VIEWPORT.height })
    }
  } catch (err) {
    console.warn(`captureCompositeMockupScreenshot failed: ${err.message}`)
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

// ---------------------------------------------------------------------------------------------
// Enriched page: the seller's REAL page with its content corrected and completed.
//
// The reference reports show the live page twice — as it is, and the same page with its content
// fixed: a manufacturer-part-number line beside the SKU, the description and bullet points
// rewritten to match the manufacturer's documentation, and Specifications / Package contents /
// FAQ sections added in the page's own fonts and colours. This reproduces that by editing the
// live DOM in place. Each step is best-effort and independent, because the page is arbitrary
// and unknown; nothing here is specific to one site or product.
// ---------------------------------------------------------------------------------------------

/** What to put on the page: the report writer's corrected content, with the manufacturer specs
 *  found by the research as a fallback for the specification table. */
function buildEnrichedContent({ enriched, specs, manufacturerBrand }) {
  const e = enriched || {}
  const fallbackSpecs = (Array.isArray(specs) ? specs : []).filter((s) => s?.label && s?.value)
  return {
    // The identity strip reads "Mfr. Name: <brand> | Mfr. Part Number: <MPN>" (the name only when it is known).
    mfrName: manufacturerBrand || String(e.mpnLabel || '').replace(/\s*MPN\s*$/i, '').trim(),
    mpnLabel: 'Mfr. Part Number',
    mpnValue: e.mpnValue || '',
    title: e.title || '',
    description: e.description || '',
    bullets: Array.isArray(e.bullets) ? e.bullets : [],
    specs: Array.isArray(e.specs) && e.specs.length ? e.specs : fallbackSpecs,
    packageContents: e.packageContents || '',
    faqs: Array.isArray(e.faqs) ? e.faqs : [],
  }
}

async function captureDomInjectedMockup({ url, content, getImage }) {
  const hasContent = content.mpnValue || content.title || content.description || content.bullets.length || content.specs.length || content.packageContents || content.faqs.length
  if (!hasContent) return null

  let browser
  try {
    browser = await launchBrowserFor(url)
    const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SHOT_SCALE })
    await installOverlayKiller(page)
    await gotoSettled(page, url)
    // Same preparation as the "current page" shot, so hidden banners / lazy images match and
    // the injection only ever sees what a visitor sees.
    await prepareForShot(page)

    const done = await page.evaluate((c) => {
      const INLINE = new Set(['A', 'B', 'STRONG', 'EM', 'I', 'SPAN', 'BR', 'SMALL', 'U', 'MARK', 'SUP', 'SUB', 'FONT'])
      const isVisible = (el) => {
        if (!el || !(el instanceof Element)) return false
        const r = el.getBoundingClientRect()
        if (r.width < 10 || r.height < 6) return false
        const s = getComputedStyle(el)
        return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) !== 0
      }
      const inChrome = (el) => !!el.closest('header, nav, footer, aside, form, select, [role="navigation"], [role="banner"], [role="contentinfo"], [id*="cookie" i], [class*="cookie" i]')
      const precedes = (a, b) => !!(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING) // a comes before b
      const textOf = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim()
      const setText = (el, text) => {
        // keep icon-only children (bullets drawn with <svg>/<i>), replace the words
        const keep = [...el.children].filter((ch) => !ch.textContent.trim())
        el.textContent = ''
        keep.forEach((k) => el.appendChild(k))
        el.appendChild(document.createTextNode(text))
      }
      const out = { title: false, mpn: false, description: false, bullets: false, sections: false, image: false }
      // The enriched page is shown the way it would really look once published, so new and corrected
      // content is not outlined or tinted; only the identity strip and the new tables carry their own styling.
      const mark = () => {}
      let h1 = [...document.querySelectorAll('h1')].find(isVisible) || null

      // 0. Title. The page's own heading is rewritten in place. A page whose heading is empty gets
      //    its (empty) heading filled; a page with none gets a new one above the price / buy block.
      if (c.title) {
        const emptyH1 = h1 ? null : [...document.querySelectorAll('h1')].find((h) => !textOf(h) && !inChrome(h))
        if (h1 || emptyH1) {
          const el = h1 || emptyH1
          setText(el, c.title)
          mark(el)
          h1 = el
          out.title = true
        } else {
          const buy = [...document.querySelectorAll('button, input[type="submit"], input[type="button"], a')]
            .find((b) => isVisible(b) && /add to (cart|basket|bag)|buy now/i.test(b.innerText || b.value || ''))
          const bigPicture = (n) => [...n.querySelectorAll('img')].some((i) => i.getBoundingClientRect().width > 140)
          let blk = buy
          // climb to the block that holds the price beside the buy button, but never into a
          // container that also holds the product picture
          for (let hops = 0; blk && hops < 8; hops++) {
            if (/price|\$\s?\d/i.test(textOf(blk))) break
            const parent = blk.parentElement
            if (!parent || parent === document.body || bigPicture(parent)) break
            blk = parent
          }
          if (blk && blk.parentElement && /price|\$\s?\d/i.test(textOf(blk))) {
            const t = document.createElement('div')
            const bs = getComputedStyle(document.body)
            Object.assign(t.style, { fontFamily: bs.fontFamily, color: bs.color, fontSize: '26px', fontWeight: '700', lineHeight: '1.25', margin: '0 0 12px' })
            t.textContent = c.title
            blk.parentElement.insertBefore(t, blk)
            mark(t)
            h1 = t
            out.title = true
          }
        }
      }

      // 1. SKU line → add the manufacturer part number right beside it, in the same style.
      if (c.mpnValue) {
        const labelRe = /^\s*(sku|item\s*(no\.?|number|#)|part\s*(no\.?|number|#)|model(\s*(no\.?|number))?|product\s*code|upc)\b\s*[:#]?/i
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let skuEl = null
        for (let n = walker.nextNode(); n && !skuEl; n = walker.nextNode()) {
          if (!labelRe.test(n.nodeValue || '')) continue
          let el = n.parentElement
          while (el && el.parentElement && el.parentElement !== document.body && textOf(el.parentElement).length < 70) el = el.parentElement
          if (el && isVisible(el) && !inChrome(el) && textOf(el).length < 90 && (!h1 || precedes(h1, el))) skuEl = el
        }
        // Identity strip under the title: "Mfr. Name: <brand> | Mfr. Part Number: <MPN> | SKU: <sku>" (each part only when known).
        const anchorEl = h1 || skuEl
        if (anchorEl) {
          const skuValue = (skuEl && textOf(skuEl).match(/\bsku\b\s*[:#]?\s*([A-Za-z0-9][\w\-./]*)/i)?.[1]) || ''
          const bodyStyle = getComputedStyle(document.body)
          const strip = document.createElement('div')
          strip.id = '__altiusnxt_mpn'
          const part = (label, value) => {
            const s = document.createElement('span')
            const b = document.createElement('b')
            b.textContent = `${label}: `
            s.appendChild(b)
            s.appendChild(document.createTextNode(value))
            return s
          }
          const parts = [c.mfrName && part('Mfr. Name', c.mfrName), part(c.mpnLabel, c.mpnValue), skuValue && part('SKU', skuValue)].filter(Boolean)
          parts.forEach((p, i) => {
            if (i) {
              const sep = document.createElement('span')
              sep.textContent = '  |  '
              sep.style.opacity = '0.45'
              strip.appendChild(sep)
            }
            strip.appendChild(p)
          })
          Object.assign(strip.style, {
            display: 'block', margin: '8px 0 10px', padding: '5px 10px', background: '#fdecea', border: '1px solid #f6d3cf', borderRadius: '3px',
            fontFamily: bodyStyle.fontFamily, color: bodyStyle.color, fontSize: `${Math.max(11, parseFloat(bodyStyle.fontSize) * 0.82)}px`, lineHeight: '1.4',
          })
          anchorEl.after(strip)
          out.mpn = true
        }
      }

      // 2. The page's own description (the longest plain text block after the title) and the bullet
      //    list that follows it are rewritten in place — same elements, so same fonts and colours.
      // The bullet points that follow a description: a real <ul>/<ol>, or consecutive short lines
      // that start with a bullet glyph (many stores draw their bullets as plain lines).
      const GLYPH = /^\s*[•◆▪●■‣⁃◦✓✔*\-–—]\s+/
      const bulletsAfter = (el) => {
        for (let s = el.nextElementSibling, hops = 0; s && hops < 3; s = s.nextElementSibling, hops++) {
          if (/^(UL|OL)$/.test(s.tagName) && s.querySelectorAll(':scope > li').length >= 2 && isVisible(s)) {
            return { kind: 'list', list: s, rows: [...s.children].filter((n) => n.tagName === 'LI'), last: s }
          }
        }
        const rows = []
        for (let s = el.nextElementSibling; s && rows.length < 8; s = s.nextElementSibling) {
          const t = textOf(s)
          if (!isVisible(s) || t.length < 8 || t.length > 220 || !GLYPH.test(t)) break
          rows.push(s)
        }
        if (rows.length >= 2) return { kind: 'rows', rows, last: rows[rows.length - 1] }
        if (!el.parentElement) return null
        const u = [...el.parentElement.querySelectorAll('ul, ol')].find((x) => isVisible(x) && !inChrome(x) && precedes(el, x) && x.querySelectorAll(':scope > li').length >= 2)
        return u ? { kind: 'list', list: u, rows: [...u.children].filter((n) => n.tagName === 'LI'), last: u } : null
      }
      // The main description is the long text block under a "Product information / Details /
      // Description" heading (and followed by bullets), not the short intro beside the price.
      const DESC_HEADING = /(information|details?|description|overview|about|summary|features|highlights)/i
      const scoreOf = (el, b) => {
        const heads = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((h) => isVisible(h) && precedes(h, el))
        const nearest = heads[heads.length - 1]
        const underDescHeading = nearest && nearest !== h1 && DESC_HEADING.test(textOf(nearest))
        return (underDescHeading ? 4 : 0) + (b ? 2 : 0) + Math.min(textOf(el).length, 2000) / 2000
      }
      let descEl = null
      let found = null
      let bestScore = -1
      for (const el of document.querySelectorAll('p, div')) {
        if (!isVisible(el) || inChrome(el) || el.closest('#__altiusnxt_mpn')) continue
        if (h1 && !precedes(h1, el)) continue
        if ([...el.children].some((ch) => !INLINE.has(ch.tagName))) continue
        if (el.querySelector('button, input, select, textarea')) continue
        const len = textOf(el).length
        if (len < 120 || len > 2500) continue
        const b = bulletsAfter(el)
        const sc = scoreOf(el, b)
        if (sc > bestScore) { bestScore = sc; descEl = el; found = b }
      }
      if (descEl && c.description) {
        setText(descEl, c.description)
        mark(descEl)
        out.description = true
      } else if (!descEl && c.description) {
        // The page has no description at all: add one under the title / part number, in the page's body style.
        const anchor = document.getElementById('__altiusnxt_mpn') || h1
        if (anchor && anchor.parentElement) {
          const bs = getComputedStyle(document.body)
          const d = document.createElement('div')
          Object.assign(d.style, { fontFamily: bs.fontFamily, color: bs.color, fontSize: '15px', lineHeight: '1.6', margin: '0 0 14px', maxWidth: '640px' })
          const dh = document.createElement('div')
          dh.textContent = 'Product Description'
          Object.assign(dh.style, { fontFamily: bs.fontFamily, color: bs.color, fontSize: '15px', fontWeight: '700', margin: '12px 0 4px' })
          d.textContent = c.description
          anchor.after(dh)
          dh.after(d)
          out.description = true
        }
      }
      let list = found ? found.last : null
      if (found && c.bullets.length) {
        const rows = found.rows
        const tpl = rows[0]
        const glyph = (textOf(tpl).match(GLYPH) || [''])[0]
        const write = (el, text) => setText(el, found.kind === 'rows' ? `${glyph}${text}` : text)
        c.bullets.forEach((b, i) => {
          let row = rows[i]
          if (!row) {
            row = tpl.cloneNode(true)
            rows[rows.length - 1].after(row)
            rows.push(row)
            list = found.kind === 'rows' ? row : list
          }
          write(row, b)
        })
        rows.slice(c.bullets.length).forEach((row) => row.remove())
        if (found.kind === 'list') mark(found.list)
        else rows.slice(0, c.bullets.length).forEach(mark)
        out.bullets = true
      }

      // 3. New sections after the description: Specifications, Package contents, FAQ — styled from
      //    the page's own body text and nearest section heading.
      const hasSections = c.specs.length || c.packageContents || c.faqs.length
      if (hasSections) {
        let ref = list || descEl
        if (!ref) {
          // no description block found: land after the title's block instead
          ref = h1 ? (h1.closest('div, section, article') || h1) : null
        }
        if (ref && ref.parentElement) {
          const bodyRef = descEl || ref
          const bs = getComputedStyle(bodyRef)
          const body = { fontFamily: bs.fontFamily, fontSize: bs.fontSize, color: bs.color, lineHeight: bs.lineHeight === 'normal' ? '1.6' : bs.lineHeight }
          const apply = (el, st) => { Object.assign(el.style, st); return el }
          // Small bold section titles in the page's own body font, like a finished product page.
          const heading = (text) => apply(Object.assign(document.createElement('div'), { textContent: text }), {
            ...body, fontWeight: '700', margin: '18px 0 7px',
          })
          const para = (text, extra = {}) => apply(Object.assign(document.createElement('div'), { textContent: text }), { ...body, margin: '0', ...extra })

          const wrap = apply(document.createElement('div'), { margin: '16px 0 8px', maxWidth: '100%' })
          wrap.id = '__altiusnxt_sections'
          const specRows = []
          const faqItems = []
          let faqHeading = null
          let packageParts = []
          let specHeading = null
          if (c.specs.length) {
            specHeading = heading('Technical Specifications')
            wrap.appendChild(specHeading)
            // A bordered attribute table with two label/value pairs per row: labels on a light tint, values on white.
            const edge = '1px solid #f0d2ce'
            const table = apply(document.createElement('table'), {
              borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed', fontFamily: body.fontFamily, color: body.color,
              fontSize: `${Math.max(10, parseFloat(body.fontSize) * 0.88)}px`,
            })
            const tbody = document.createElement('tbody')
            table.appendChild(tbody)
            const cell = (text, isLabel) => apply(Object.assign(document.createElement('td'), { textContent: text }), {
              border: edge, padding: '4px 8px', verticalAlign: 'top', lineHeight: '1.35',
              ...(isLabel ? { background: '#fdf1ef', fontWeight: '700', color: '#7a1f1a', width: '17%' } : { background: '#fff', width: '33%' }),
            })
            let tr = null
            c.specs.forEach((s, i) => {
              if (i % 2 === 0) { tr = document.createElement('tr'); tbody.appendChild(tr) }
              const a = cell(s.label, true)
              const b = cell(s.value, false)
              tr.append(a, b)
              specRows.push([a, b])
            })
            wrap.appendChild(table)
          }
          if (c.packageContents) {
            packageParts = [heading('Package contents'), para(c.packageContents)]
            packageParts.forEach((el) => wrap.appendChild(el))
          }
          if (c.faqs.length) {
            faqHeading = heading('Frequently Asked Questions')
            wrap.appendChild(faqHeading)
            for (const f of c.faqs) {
              const q = para(f.q, { fontWeight: '700', marginTop: '9px', fontSize: `${parseFloat(body.fontSize) * 0.92}px` })
              const a = para(f.a, { opacity: '0.9', marginTop: '2px', fontSize: `${parseFloat(body.fontSize) * 0.92}px` })
              wrap.appendChild(q)
              wrap.appendChild(a)
              faqItems.push([q, a])
            }
          }
          // A narrow product column (a details panel beside the picture) would squeeze a specification
          // table into a sliver, so the new sections go below the whole product row instead, at full width.
          let anchor = ref
          while (anchor.parentElement && anchor.parentElement !== document.body && anchor.getBoundingClientRect().width < window.innerWidth * 0.5) anchor = anchor.parentElement
          // The sections belong directly under the product description. When the wide container found above
          // also holds a "Related products"-style block, they go in front of that block (not after it).
          const RELATED_TEXT = /^\s*(related|similar|you (may|might) (also )?like|customers (who )?(also )?(viewed|bought)|also (viewed|bought)|frequently bought|recommended|recently viewed|people also|more (from|like)|upsell|cross[- ]?sell)\b/i
          const RELATED_CLASS = '[class*="related" i], [id*="related" i], [class*="upsell" i], [class*="cross-sell" i], [class*="crosssell" i], [class*="similar-products" i], [class*="recommended" i]'
          const relatedAfter = (from) => {
            const hits = []
            for (const h of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
              if (isVisible(h) && !h.contains(from) && precedes(from, h) && textOf(h).length <= 60 && RELATED_TEXT.test(textOf(h))) hits.push(h)
            }
            for (const el of document.querySelectorAll(RELATED_CLASS)) {
              if (isVisible(el) && !el.contains(from) && precedes(from, el) && el.querySelector('img, a')) hits.push(el)
            }
            hits.sort((a, b) => (precedes(a, b) ? -1 : 1))
            return hits[0] || null
          }
          const related = relatedAfter(ref)
          if (related && anchor.contains(related)) {
            let common = ref
            while (common && (!common.contains(related) || common.getBoundingClientRect().width < window.innerWidth * 0.5)) common = common.parentElement
            let branch = related
            while (common && branch.parentElement && branch.parentElement !== common) branch = branch.parentElement
            if (common && branch.parentElement === common) {
              Object.assign(wrap.style, { clear: 'both', width: '100%', flex: '0 0 100%', gridColumn: '1 / -1' })
              branch.before(wrap)
            } else anchor.after(wrap)
          } else anchor.after(wrap)
          out.sections = true

          // Everything added must be visible inside the report's frame (c.limitBottom is its bottom edge
          // in page pixels). If it runs past that, the least important content is trimmed until it fits —
          // the report only ever lists what the screenshot really shows.
          const bottom = () => wrap.getBoundingClientRect().bottom + window.scrollY
          // removing a table cell also removes its row once the row is empty
          const drop = (els) => els.forEach((el) => {
            const row = el.parentElement
            el.remove()
            if (row && row.tagName === 'TR' && !row.children.length) row.remove()
          })
          let guard = 40
          while (c.limitBottom && bottom() > c.limitBottom && guard-- > 0) {
            if (faqItems.length > 1) drop(faqItems.pop())
            else if (specRows.length > 6) drop(specRows.pop())
            else if (packageParts.length) { drop(packageParts); packageParts = [] }
            else if (faqItems.length) { drop(faqItems.pop()); faqHeading?.remove(); faqHeading = null }
            else if (specRows.length > 3) drop(specRows.pop())
            else break
          }
          out.specRows = specRows.filter(([a]) => a.isConnected).length
          if (specHeading && out.specRows) {
            const count = document.createElement('span')
            count.textContent = ` (${out.specRows} attributes)`
            Object.assign(count.style, { fontWeight: '400', opacity: '0.6', fontSize: '0.85em' })
            specHeading.appendChild(count)
          }
          out.faqCount = faqItems.filter(([q]) => q.isConnected).length
          out.packageContents = packageParts.length > 0
        }
      }
      window.scrollTo(0, 0)
      return out
    }, content)

    // 4. Product image. When the page shows a "no image" placeholder, a real image of this product from
    //    the manufacturer's own page (found and checked by getImage) takes its place.
    if (getImage) {
      const missing = await page.evaluate(() => {
        const PLACEHOLDER = /no[-_ ]?(image|photo|picture|img)|placeholder|image[-_ ]?(not|coming|unavailable|missing)|coming[-_ ]?soon|default[-_ ]?(image|product)/i
        const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
        const pics = [...document.querySelectorAll('img')]
          .filter((i) => visible(i) && !i.closest('header, nav, footer, [role="navigation"], [role="banner"], [role="contentinfo"]'))
          .map((i) => ({ i, r: i.getBoundingClientRect() }))
          .filter((x) => x.r.width >= 120 && x.r.height >= 120)
          .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)
        if (!pics.length) return false
        const main = pics[0].i
        const hay = [main.currentSrc, main.src, main.alt, main.className, main.id, main.getAttribute('data-src'), main.parentElement && main.parentElement.className].join(' ')
        if (!PLACEHOLDER.test(hay)) return false
        main.setAttribute('data-altiusnxt-img', '1')
        return true
      })
      console.log(`[mockup] product image: ${missing ? 'the page shows a no-image placeholder' : 'the page has its own image (left as is)'}`)
      if (missing) {
        const img = await getImage().catch(() => null)
        if (!img) console.log('[mockup] product image: no verified manufacturer image found')
        if (img?.dataUrl) {
          const placed = await page.evaluate(async (dataUrl) => {
            const el = document.querySelector('img[data-altiusnxt-img]')
            if (!el) return false
            el.parentElement?.querySelectorAll('source').forEach((x) => x.remove())
            ;['srcset', 'sizes', 'data-src', 'data-srcset', 'loading'].forEach((a) => el.removeAttribute(a))
            el.src = dataUrl
            el.style.objectFit = 'contain'
            await el.decode().catch(() => {})
            return true
          }, img.dataUrl)
          if (placed) { done.image = true; done.imageSource = img.host }
        }
      }
    }

    console.log(`[mockup] injected: ${Object.entries(done).filter(([, v]) => v).map(([k]) => k).join(', ') || 'nothing'}`)
    if (!Object.values(done).some(Boolean)) return null

    await page.waitForTimeout(250)
    const shot = await captureFullPageShot(page)
    // What was really put on the page, so the report only lists fixes the screenshot shows.
    return Object.assign(shot, { injected: done })
  } catch (err) {
    console.warn(`captureDomInjectedMockup failed for ${url}: ${err.message}`)
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * Renders the enriched page: the seller's real page with its content corrected (see above).
 * Falls back to header-crop compositing, then to a generic layout, only if the live page can't be
 * edited. Returns a PNG Buffer, or null on total failure.
 */
export async function captureEnrichedMockupScreenshot({ url, enriched, productName, category, manufacturerBrand, manufacturerCode, price, specs, description, headerCrop, getProductImage }) {
  if (url) {
    const injected = await captureDomInjectedMockup({ url, content: { ...buildEnrichedContent({ enriched, specs, manufacturerBrand }), limitBottom: SHOT_MAX_HEIGHT - 20 }, getImage: getProductImage })
    if (injected) return injected
  }
  // The composited fallback always shows a spec table, so give it a row when none were found.
  const compositeSpecs = Array.isArray(specs) && specs.length ? specs : [{ label: 'Category', value: category || '—' }]
  const composite = await captureCompositeMockupScreenshot({ productName, manufacturerBrand, manufacturerCode, price, specs: compositeSpecs, description, headerCrop })
  // The composited layout only shows a spec table and a description line.
  if (composite) Object.assign(composite, { injected: { sections: true, description: true, specsOnly: true } })
  return composite
}
