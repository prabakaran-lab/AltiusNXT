import { chromium } from 'playwright'
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
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: VIEWPORT })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })

    // The browser-rendered text, which includes script-injected content (store-wide notice
    // banners, tabs filled client-side) that a static HTML fetch never sees.
    result.renderedText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 20000)).catch(() => '')

    result.fullScreenshot = await page.screenshot({ type: 'png', fullPage: false }).catch((err) => {
      console.warn(`captureCurrentPageAndHeader: full screenshot failed for ${url}: ${err.message}`)
      return null
    })

    result.headerCrop = await page
      .screenshot({ type: 'png', clip: { x: 0, y: 0, width: VIEWPORT.width, height: HEADER_CROP_HEIGHT } })
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

// Inline-styled (not class-based) so the injected panel's own look can't be overridden by the
// host page's CSS cascade (resets, `* { all: unset }` frameworks, aggressive specificity, etc.).
// Every rule here is written directly on a `style` attribute for that reason.
// Deliberately plain/native-looking — no brand border, no "AI-OPTIMIZED" badge, no colored
// pills. The report's own surrounding layout already labels this image "ENRICHED PAGE
// (MOCK-UP)"; a loud overlay on the screenshot itself only made it read as a foreign widget
// bolted onto the real page instead of the real page's own content, genuinely improved — which
// is the whole point of injecting into the live DOM rather than compositing a separate card.
function buildInjectedSpecTableHtml(specs) {
  const rows = (Array.isArray(specs) ? specs : []).slice(0, 10).map((s, i) => `
    <tr>
      <td style="padding:9px 14px;border-bottom:1px solid ${LIGHT};font-size:13px;font-weight:600;color:${STEEL_2};width:40%;background:${i % 2 ? PAPER : '#fff'};">${esc(s?.label)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid ${LIGHT};font-size:13px;color:${NAVY};background:${i % 2 ? PAPER : '#fff'};">${esc(s?.value)}</td>
    </tr>
  `).join('')
  if (!rows) return ''
  return `<table id="__altiusnxt_spec_table" style="all:initial;display:table;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;width:100%;max-width:640px;border-collapse:collapse;margin:14px 0;border:1px solid ${LIGHT};font-size:13px;">${rows}</table>`
}

function buildInjectedDescriptionHtml(description) {
  if (!description) return ''
  return `<div id="__altiusnxt_description" style="all:initial;display:block;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${STEEL};max-width:640px;margin:10px 0;">${esc(description)}</div>`
}

/**
 * Primary mock-up path: loads the prospect's real, live product page and edits its DOM in place
 * — same header, same nav, same real images and layout chrome as the actual page — then
 * screenshots that. This matches what the reference report actually does: a genuinely edited
 * real page, not a separate card appended alongside the untouched original content.
 *
 * Three things happen, each independently best-effort:
 * 1. The real, visible <h1> (if found) has its own text replaced with the enriched product name
 *    in place — it keeps the page's own real font/size/color since it's the same element, no
 *    new styling needed.
 * 2. A real <table> near the title/price (if found) is hidden and a new, richer spec table is
 *    inserted in the same spot — avoids the old behavior of showing both the thin original table
 *    AND a new one. If no table is found, the new one is appended after whatever anchor was
 *    located instead.
 * 3. A plain description paragraph is appended near the spec table.
 *
 * Finding a safe, generic anchor on an arbitrary unknown site is the real risk here. Three
 * strategies are tried in order of reliability: (1) the element containing the page's own
 * displayed price text; (2) the page's first visible <h1>; (3) the largest real product-sized
 * image. Returns null (never throws) if no anchor is found or anything goes wrong, so the caller
 * can fall back to the composited layout.
 */
async function captureDomInjectedMockup({ url, productName, manufacturerBrand, manufacturerCode, price, specs, description }) {
  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: VIEWPORT })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })

    const specTableHtml = buildInjectedSpecTableHtml(specs)
    const descriptionHtml = buildInjectedDescriptionHtml(description)
    const priceRaw = typeof price === 'string' ? price : null

    const anchorFound = await page.evaluate(({ specTableHtml, descriptionHtml, priceRaw, productName }) => {
      // A hidden SEO-only <h1> or an off-screen element would make scrollIntoView a no-op and
      // leave the injected content invisible in the screenshot without anchorFound ever
      // noticing — this is what made an earlier version of this function silently do nothing on
      // sites that keep an invisible <h1> for accessibility/SEO ahead of the real, visible title.
      function isVisible(el) {
        if (!el || !(el instanceof Element)) return false
        const rect = el.getBoundingClientRect()
        if (rect.width < 10 || rect.height < 10) return false
        const style = window.getComputedStyle(el)
        return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0
      }

      function findPriceAnchor() {
        if (!priceRaw) return null
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          if (node.nodeValue && node.nodeValue.includes(priceRaw)) {
            let el = node.parentElement
            for (let i = 0; i < 2 && el && el.parentElement && el.parentElement !== document.body; i++) el = el.parentElement
            if (isVisible(el)) return el
          }
        }
        return null
      }
      const h1 = [...document.querySelectorAll('h1')].find(isVisible) || null
      function findImageAnchor() {
        const imgs = [...document.querySelectorAll('img')]
          .filter((img) => img.naturalWidth >= 150 && img.naturalHeight >= 150 && isVisible(img))
          .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))
        return imgs[0] || null
      }

      const anchor = findPriceAnchor() || h1 || findImageAnchor()
      if (!anchor || !anchor.parentElement) return false

      // 1. Replace the real title's own text in place, if we found one — same element, so it
      // keeps the page's real typography rather than needing its own styling.
      if (h1 && productName) h1.textContent = productName

      // 2. Look for a real spec table near the anchor (within a few ancestor levels, a generous
      // but bounded search) to hide-and-replace rather than leaving both tables visible.
      let container = anchor
      for (let i = 0; i < 4 && container.parentElement; i++) container = container.parentElement
      const existingTable = [...container.querySelectorAll('table')].find(isVisible)

      const wrapper = document.createElement('div')
      wrapper.innerHTML = specTableHtml + descriptionHtml
      const nodes = [...wrapper.childNodes]

      if (existingTable) {
        existingTable.style.display = 'none'
        for (const node of nodes) existingTable.parentElement.insertBefore(node, existingTable)
      } else {
        let insertAfter = anchor
        for (const node of nodes) {
          insertAfter.parentElement.insertBefore(node, insertAfter.nextSibling)
          insertAfter = node
        }
      }

      const scrollTarget = document.getElementById('__altiusnxt_spec_table') || document.getElementById('__altiusnxt_description') || anchor
      scrollTarget.scrollIntoView({ block: 'center', behavior: 'instant' })
      return true
    }, { specTableHtml, descriptionHtml, priceRaw, productName })

    // scrollIntoView can still land a fraction of a pixel short of actually bringing the new
    // content into the viewport on some sticky-header layouts — verify after the fact and
    // force-scroll if it's not actually visible, rather than trusting the DOM call blindly.
    const contentVisible = await page.evaluate(() => {
      const el = document.getElementById('__altiusnxt_spec_table') || document.getElementById('__altiusnxt_description')
      if (!el) return true // nothing to place beyond the title rewrite — that's fine
      const rect = el.getBoundingClientRect()
      return rect.top < window.innerHeight && rect.bottom > 0 && rect.width > 0
    })
    if (anchorFound && !contentVisible) {
      await page.evaluate(() => {
        const el = document.getElementById('__altiusnxt_spec_table') || document.getElementById('__altiusnxt_description')
        el?.scrollIntoView({ block: 'center', behavior: 'instant' })
      })
    }

    if (!anchorFound) return null

    await page.waitForTimeout(200)
    return await page.screenshot({ type: 'png', fullPage: false })
  } catch (err) {
    console.warn(`captureDomInjectedMockup failed for ${url}: ${err.message}`)
    return null
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}

/**
 * Renders the enriched product mock-up. Tries DOM injection into the real live page first (see
 * captureDomInjectedMockup) since that's the most faithful to "your actual page, enriched" — real
 * header, nav, images, everything. Falls back to header-crop compositing, then to a fully generic
 * layout, if injection can't find anywhere safe to land or fails for any reason. Returns a PNG
 * Buffer, or null on total failure across every strategy.
 */
export async function captureEnrichedMockupScreenshot({ url, productName, manufacturerBrand, manufacturerCode, price, specs, description, headerCrop }) {
  if (url) {
    const injected = await captureDomInjectedMockup({ url, productName, manufacturerBrand, manufacturerCode, price, specs, description })
    if (injected) return injected
  }
  return captureCompositeMockupScreenshot({ productName, manufacturerBrand, manufacturerCode, price, specs, description, headerCrop })
}
