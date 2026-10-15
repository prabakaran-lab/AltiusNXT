import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Real brand assets (not a reconstruction) — base64-embedded directly in the HTML so Puppeteer
// never needs a running static file server to resolve them.
function loadAssetDataUri(relativePath) {
  try {
    const buf = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', relativePath))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
// The trimmed logo has no transparent padding, so its size on the page is its real size (the
// original file is 1600x600 with wide empty margins).
const LOGO_DATA_URI = loadAssetDataUri('altiusnxt_logo_trimmed.png') || loadAssetDataUri('altiusnxt_logo.png')
// The three certification badges, placed side by side like the reference report; the single
// combined image is only a fallback if any of the three files is missing.
const CERT_BADGES = ['certification_tuv_iso9001.png', 'certification_tuv_iso27001.png', 'certification_b2b_member.png'].map(loadAssetDataUri)
const CERT_FALLBACK_URI = loadAssetDataUri('altiusnxt_certification.png')
const B2B_MEMBER_YEAR = 2026 // matches the year printed on the B2B Ecommerce Association badge

// Palette and type sizes measured from the reference report (Electroweld sample).
const HERO = '#0f1b33'
const NAVY = '#13294b'
const ORANGE = '#f0922b'
const CORAL = '#d9534f'
const TEAL = '#16a394'
const TEAL_BG = '#e8f5f3'
const PINK_BG = '#fbe9e7'
const CREAM = '#fdf6ea'
const INK = '#212121'
const GREY = '#666666'
const GREY_LIGHT = '#8a8f98'
const LIGHT = '#e3e6ec'
const TRACK = '#eef0f3'
const MEDIAN = '#8795ab'
const GREY_BOX = '#f3f4f6'

// Pixel size of a PNG data URL (read from its header), so both page screenshots can be scaled by the same factor.
function pngSize(dataUrl) {
  try {
    const b = Buffer.from(String(dataUrl || '').split(',')[1].slice(0, 64), 'base64')
    if (b.readUInt32BE(0) !== 0x89504e47) return null
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
  } catch {
    return null
  }
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
function numberWord(n) {
  const num = Number(n)
  return Number.isInteger(num) && num >= 0 && num <= 10 ? NUMBER_WORDS[num] : String(n)
}
const capitalize = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1)
const pct = (x) => `${Math.round((Number(x) || 0) * 100)}%`
const ENGINE_NAMES = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' }

/**
 * buildOutreachReportHtml(params) — AI Readiness Outreach Report, 6 pages, laid out after the
 * reference report: (1) cover — hero, 3 evidence tiles, full-audit offer, what was tested;
 * (2) AI search results — the buyer queries and who each AI named, plus the engines' page reviews;
 * (3) the gaps on the page and a spec-depth comparison; (4) the live page before and after its
 * content is corrected; (5) same-country prices and the cost of doing nothing; (6) next steps and
 * certifications.
 *
 * params (from outreachPipeline.buildOutreachReportData):
 *   lead { company, contactName, contactTitle, website, domain, location, timezoneLabel }
 *   region { country, currencyCode }
 *   product { name, url }
 *   headline { line1, line2, line3 }      last non-empty line renders orange
 *   lede, kpis [ {value,label} x3 ]       third tile = revenue at risk
 *   fullAuditText, methodology [3], engineNames, methodologyDate, methodologyMonthYear
 *   queries { named[], category[] }       each { query, sellersCited[], prospectCited, citedPrice, note }
 *   resultsHeadline, resultsIntro, resultsFootnote, categoryQueryCausalNote
 *   quotes [ {engine, quote} ]  (or legacy { chatgpt, claude })
 *   commercialImplications, gapsIntro, gaps [ {title, detail} ], strengths
 *   specDepth [ {label, count, highlight} ], specDepthCaption
 *   beforeAfter { currentScreenshot, enrichedScreenshot, currentBullets[], enrichedBullets[], caption }
 *   businessImpact [ {title, detail} ]
 *   commercialIntro, priceComparison [ {seller, price, isProspect} ], priceComparisonCaption, priceFinding {lead, body}
 *   revenueRisk (revenueRisk.js), closingNote {lead, body}, refSummaryNote
 *   nextSteps { intro, optionA {title, body, contact}, optionB {title, body, note}, ctaHeadline, ctaBody }
 *   availableOnRequest, sender { name, title, company, email }, unsubscribeEmail
 *   qrDataUrl                              cover QR (set by reportPdf.js)
 */

const LOGO_HTML = LOGO_DATA_URI
  ? `<img class="brand-logo" src="${LOGO_DATA_URI}" alt="AltiusNxt" />`
  : `<span class="brand-wordmark">AltiusNxt</span>`

export function buildOutreachReportHtml(params = {}) {
  const lead = params.lead || {}
  const region = params.region || {}
  const product = params.product || {}
  const stats = params.stats || {}
  const sender = params.sender || {}
  const queries = params.queries || {}
  const namedQueries = Array.isArray(queries.named) ? queries.named : []
  const categoryQueries = Array.isArray(queries.category) ? queries.category : []
  const gaps = Array.isArray(params.gaps) ? params.gaps : []
  const specDepth = Array.isArray(params.specDepth) ? params.specDepth : []
  const beforeAfter = params.beforeAfter || {}
  const businessImpact = Array.isArray(params.businessImpact) ? params.businessImpact : []
  const priceComparison = Array.isArray(params.priceComparison) ? params.priceComparison : []
  const methodology = Array.isArray(params.methodology) ? params.methodology.slice(0, 3) : []
  const nextSteps = params.nextSteps || {}
  const optionA = nextSteps.optionA || {}
  const optionB = nextSteps.optionB || {}
  const risk = params.revenueRisk && params.revenueRisk.total ? params.revenueRisk : null

  const company = lead.company || 'Prospect'
  const domain = lead.domain || String(lead.website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || company
  const domainLabel = capitalize(domain)
  const productName = product.name || 'the product assessed'
  const country = region.country || ''
  const fullDate = params.methodologyDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const monthYear = params.methodologyMonthYear || fullDate
  const engineNames = Array.isArray(params.engineNames) && params.engineNames.length ? params.engineNames : ['ChatGPT', 'Claude', 'Gemini']
  const enginesSentence = engineNames.length === 1 ? engineNames[0] : `${engineNames.slice(0, -1).join(', ')} and ${engineNames[engineNames.length - 1]}`
  const totalQueries = namedQueries.length + categoryQueries.length
  const citedCount = [...namedQueries, ...categoryQueries].filter((q) => q && q.prospectCited).length
  const TOTAL_PAGES = 6

  // ---------- shells ----------
  const innerPage = (n, body) => `
    <section class="page">
      <div class="page-header">
        <div class="brand">${LOGO_HTML}</div>
        <div class="prepared-for">PREPARED FOR ${esc(domain.toUpperCase())}</div>
      </div>
      <div class="rule"></div>
      <div class="page-body">${body}</div>
      <div class="page-footer"><span>AltiusNxt · Prepared for ${esc(domainLabel)}</span><span>Page ${n} of ${TOTAL_PAGES}</span></div>
    </section>`

  // ---------- Page 1: cover ----------
  const headlineLines = [params.headline?.line1, params.headline?.line2, params.headline?.line3].map((l) => String(l || '').trim()).filter(Boolean)
  const headlineHtml = headlineLines
    .map((l, i) => (i === headlineLines.length - 1 && headlineLines.length > 1 ? `<span class="accent">${esc(l)}</span>` : esc(l)))
    .join('<br>')

  const kpis = Array.isArray(params.kpis) && params.kpis.length
    ? params.kpis.slice(0, 3)
    : [
        { value: `${citedCount} of ${totalQueries}`, label: `BUYER SEARCH ANSWERS THAT NAMED ${String(company).toUpperCase()}` },
        { value: stats.priceRank || '—', label: 'PRICE RANK AMONG SELLERS OF THIS PRODUCT' },
        ...(risk ? [{ value: risk.total.label, label: 'EST. ANNUAL REVENUE AT RISK (SEE P.5)' }] : []),
      ]
  const tileClasses = ['tile-red', 'tile-navy', 'tile-orange']
  const tilesHtml = kpis.map((k, i) => `
    <div class="tile ${tileClasses[i] || 'tile-navy'}">
      <div class="tile-num${String(k.value || '').length > 11 ? ' tile-num-sm' : ''}">${esc(k.value)}</div>
      <div class="tile-label">${esc(k.label)}</div>
    </div>`).join('')

  const senderFirst = String(sender.name || '').split(/\s+/)[0] || 'us'
  const titleCase = (t) => String(t || '').replace(/\b([a-z])/g, (m) => m.toUpperCase())
  const recipient = [lead.contactName, lead.contactTitle].filter(Boolean).join(', ') || 'The Product Manager'
  const preparedForLine = `${esc(recipient)}, ${esc(company)}${product.category ? ` · ${esc(titleCase(product.category))}` : ''} · ${esc(domain)}`
  const featureHtml = methodology.map((m) => `<div class="feature"><h4>${esc(m && m.title)}</h4><p>${esc(m && m.body)}</p></div>`).join('')

  const page1 = `
    <section class="page cover">
      <div class="cover-header">
        <div class="brand">${LOGO_HTML}</div>
        <div class="cover-header-right">
          <div class="prepared-for cover-prepared">PREPARED FOR ${esc(domain.toUpperCase())}</div>
          <div class="cover-tag">Anyone can fill your fields. We engineer your catalog for AI discovery.</div>
        </div>
      </div>
      <div class="cover-rule"></div>
      <div class="hero">
        <div class="eyebrow">AI READINESS REPORT · ${esc(String(monthYear).toUpperCase())}</div>
        <h1>${headlineHtml}</h1>
        <p class="lede">${esc(params.lede)}</p>
        <div class="tiles">${tilesHtml}</div>
        <p class="hero-fine">Search results: ${esc(enginesSentence)} with live web search, run ${esc(fullDate)}. AI answers vary between runs and engines, so this is a snapshot. Prices as displayed on each seller's site on ${esc(fullDate)}.</p>
      </div>

      <div class="cover-body">
        <div class="audit-row">
          <div class="audit-box">
            <div class="audit-heading">FULL AUDIT AVAILABLE</div>
            <p>${esc(params.fullAuditText || `This summary sits on top of a fuller technical audit of your product page: ${String(params.availableOnRequest || '').replace(/\.$/, '')}.`)}</p>
          </div>
          <div class="request-box">
            <p class="request-label">Request a copy:</p>
            <p class="request-email">${esc(sender.email)}</p>
            <p class="request-call">Prefer a call? Reply with a time that suits you${lead.timezoneLabel ? ` (${esc(lead.timezoneLabel)})` : ''}.</p>
          </div>
        </div>

        <div class="features">${featureHtml}</div>

        <div class="cover-footer">
          <div class="cover-footer-text">
            <p><strong>PREPARED FOR</strong> ${preparedForLine}</p>
            <p><strong>PREPARED BY</strong> ${esc(sender.name)}${sender.title ? `, ${esc(sender.title)}` : ''} · ${esc(sender.company)} · ${esc(sender.email)}</p>
            <p class="unsub">AltiusNxt sends this report to businesses whose public product listings we have assessed. If you would rather not hear from us again, reply "unsubscribe" to ${esc(params.unsubscribeEmail)} and we will stop.</p>
          </div>
          ${params.qrDataUrl ? `<div class="cover-qr"><img src="${esc(params.qrDataUrl)}" alt="QR code: email ${esc(sender.name)}" /><span>Scan to email ${esc(senderFirst)}</span></div>` : ''}
        </div>
      </div>
    </section>`

  // ---------- Page 2: AI search results ----------
  const noteMarkers = []
  const markerFor = (note) => {
    if (!note) return ''
    let idx = noteMarkers.indexOf(note)
    if (idx === -1) { noteMarkers.push(note); idx = noteMarkers.length - 1 }
    return '*'.repeat(idx + 1)
  }
  const queryRows = (rows) => rows.map((r) => {
    const marker = markerFor(r && r.note)
    const sellers = Array.isArray(r && r.sellersCited) ? r.sellersCited : []
    const cell = r && r.prospectCited
      ? `<span class="cited-yes">Cited${r.citedPrice ? `<br>(${esc(r.citedPrice)})` : ''}</span>`
      : `<span class="cited-no">Not cited${marker ? marker : ''}</span>`
    return `<tr><td>${esc(r && r.query)}</td><td>${sellers.length ? esc(sellers.join(', ')) : '—'}</td><td>${cell}</td></tr>`
  }).join('')
  const queryTable = (rows) => `
    <table class="qtable">
      <colgroup><col style="width:31%"><col style="width:55%"><col style="width:14%"></colgroup>
      <thead><tr><th>Buyer query</th><th>What AI returned</th><th>${esc(company)}</th></tr></thead>
      <tbody>${queryRows(rows) || '<tr><td colspan="3">No queries recorded.</td></tr>'}</tbody>
    </table>`
  const namedTable = queryTable(namedQueries)
  const categoryTable = queryTable(categoryQueries)
  const footnotes = [
    ...noteMarkers.map((n, i) => `${'*'.repeat(i + 1)}${n}`),
    params.resultsFootnote,
    params.resultsFootnote ? '' : params.categoryQueryCausalNote,
  ].filter(Boolean)

  const quoteList = Array.isArray(params.quotes)
    ? params.quotes
    : Object.entries(params.quotes || {}).filter(([, q]) => q).map(([engine, quote]) => ({ engine, quote }))
  const shownQuotes = quoteList.slice(0, 3)
  const quotesHtml = shownQuotes.map((q) => `
    <div class="quote-card${q.tone === 'positive' ? ' quote-positive' : ''}">
      <blockquote>"${esc(q.quote)}"</blockquote>
      <footer>${esc(ENGINE_NAMES[q.engine] || q.engine)}</footer>
    </div>`).join('')

  const page2 = innerPage(2, `
    <h2>AI search results for your product</h2>
    <p class="results-headline">${esc(params.resultsHeadline || `${company} was named in ${numberWord(citedCount)} of ${numberWord(totalQueries)} buyer queries.`).toUpperCase()}</p>
    <p class="intro">${esc(params.resultsIntro || `We ran these queries with live web search on ${fullDate}. ${capitalize(numberWord(namedQueries.length))} name the product; ${numberWord(categoryQueries.length)} are broader category searches${country ? ` phrased the way buyers in ${country} search` : ''}.`)}</p>
    <h3 class="caps">Queries that name the product</h3>
    ${namedTable}
    <h3 class="caps">${lead.location ? 'Broader category and local queries' : 'Broader category queries'}</h3>
    ${categoryTable}
    ${footnotes.map((f) => `<p class="footnote">${esc(f)}</p>`).join('')}
    ${quotesHtml ? `<div class="quote-grid quote-grid-${shownQuotes.length}">${quotesHtml}</div>
    <p class="fine">These are AI-generated assessments, not verified facts. We quote them because they are what each engine said when it reviewed the page.</p>` : ''}
    <div class="callout callout-cream"><p><strong>How to read these results.</strong> ${params.howToRead ? esc(params.howToRead) : `One run on each of ${numberWord(engineNames.length)} AI engines on one day — answers change between runs and engines, so treat this as a snapshot, not a ranking. We keep the full transcripts and will re-run any query live with you.`}</p></div>
    <h3>Commercial implications</h3>
    <p class="body-text">${esc(params.commercialImplications)}</p>
  `)

  // ---------- Page 3: gaps + spec depth ----------
  const gapsHtml = gaps.map((g, i) => `
    <div class="gap"><div class="gap-num">${i + 1}</div><div><h4>${esc(g && g.title)}</h4><p>${esc(g && g.detail)}</p></div></div>`).join('')
  const maxSpec = Math.max(1, ...specDepth.map((s) => Number(s && s.count) || 0))
  const specBars = specDepth.map((s) => {
    const count = Number(s && s.count) || 0
    const isMedian = /^median/i.test(String(s && s.label))
    const cls = s && s.highlight ? 'is-prospect' : isMedian ? 'is-median' : ''
    return `
      <div class="bar-row spec-row ${cls}">
        <div class="bar-label">${esc(s && s.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max((count / maxSpec) * 100, 2)}%"></div></div>
        <div class="bar-value">${esc(count)}</div>
      </div>`
  }).join('')

  // Key fields set side by side (page vs the manufacturer's documentation) when the writer produced
  // them; otherwise the page keeps the specification-depth bars.
  const fc = params.fieldComparison && Array.isArray(params.fieldComparison.rows) && params.fieldComparison.rows.length >= 3 ? params.fieldComparison : null
  let fieldTableHtml = ''
  if (fc) {
    const source = String(fc.source || "the manufacturer's documentation")
    const n = fc.rows.length
    const count = (r) => fc.rows.filter((x) => x.result === r).length
    const resultClass = { Match: 'res-match', Missing: 'res-missing', Differs: 'res-differs', 'Two names': 'res-differs' }
    const parts = [
      `${capitalize(numberWord(count('Match')))} of ${numberWord(n)} fields match`,
      count('Missing') ? `${numberWord(count('Missing'))} ${count('Missing') === 1 ? 'is' : 'are'} missing from the page` : '',
      count('Differs') ? `${numberWord(count('Differs'))} ${count('Differs') === 1 ? 'differs' : 'differ'} from ${source}` : '',
      count('Two names') ? `${numberWord(count('Two names'))} ${count('Two names') === 1 ? 'appears' : 'appear'} under more than one name` : '',
    ].filter(Boolean)
    fieldTableHtml = `
    <h3 class="spec-title">${capitalize(numberWord(n))} key product fields: your page vs ${esc(source)}</h3>
    <table class="ftable">
      <colgroup><col style="width:17%"><col style="width:30%"><col style="width:39%"><col style="width:14%"></colgroup>
      <thead><tr><th>Field</th><th>Your page says</th><th>${esc(capitalize(source))} says</th><th>Result</th></tr></thead>
      <tbody>${fc.rows.map((r) => `<tr><td>${esc(r.field)}</td><td>${esc(r.pageSays)}</td><td>${esc(r.sourceSays)}</td><td class="${resultClass[r.result] || ''}">${esc(r.result)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="field-summary">${esc(parts.join('; '))}.</p>`
  }

  const page3 = innerPage(3, `
    <h2>${gaps.length ? `${capitalize(numberWord(gaps.length))} gap${gaps.length === 1 ? '' : 's'} on the product page` : 'No on-page gaps found'}</h2>
    <p class="intro">${esc(params.gapsIntro || `We reviewed ${company}'s listing for ${productName} against what AI assistants and buyers need to recommend and compare it.`)}</p>
    ${gapsHtml}
    ${params.strengths ? `<div class="callout callout-teal"><p><strong>Existing strengths.</strong> ${esc(params.strengths)}</p></div>` : ''}
    ${fieldTableHtml || (specBars && specDepth.length >= 2 ? `<h3 class="spec-title">Specification depth compared with the sellers AI cited</h3>
    <div class="bars">${specBars}</div>
    <p class="fine plain">${esc(params.specDepthCaption)}</p>` : '')}
  `)

  // ---------- Page 4: the live page, before and after ----------
  // Both screenshots are the WHOLE page. They share one scale: as wide as the frame allows, narrower only when
  // the taller of the two pages would otherwise not fit the frame's height (frame = 88.9 mm x 140 mm).
  const dims = [pngSize(beforeAfter.currentScreenshot), pngSize(beforeAfter.enrichedScreenshot)].filter(Boolean)
  const tallest = dims.length ? Math.max(...dims.map((d) => d.h / d.w)) : 0
  const shotWidth = tallest ? Math.min(100, ((140 / 88.9) / tallest) * 100) : 100
  const shotStyle = `width:${shotWidth.toFixed(2)}%`
  const bulletList = (items, cls) => `<ul class="ba-list ${cls}">${(items || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
  const page4 = innerPage(4, `
    <h2>Product page: current and enriched</h2>
    <p class="intro">The product, store template and price are unchanged. The enriched version is an illustrative mock-up built from AltiusNxt's enriched product record, not a live page.</p>
    <div class="ba-grid">
      <div class="ba-card">
        <div class="ba-head ba-head-current">CURRENT PAGE</div>
        <div class="ba-frame">${beforeAfter.currentScreenshot ? `<img class="ba-shot" style="${shotStyle}" src="${esc(beforeAfter.currentScreenshot)}" alt="Current page" />` : '<div class="ba-missing">Screenshot unavailable for this page</div>'}</div>
      </div>
      <div class="ba-card">
        <div class="ba-head ba-head-enriched">AFTER ENRICHMENT PAGE</div>
        <div class="ba-frame">${beforeAfter.enrichedScreenshot ? `<img class="ba-shot" style="${shotStyle}" src="${esc(beforeAfter.enrichedScreenshot)}" alt="Enriched mock-up" />` : '<div class="ba-missing">Mock-up unavailable</div>'}</div>
      </div>
    </div>
    <div class="ba-grid ba-lists">
      ${bulletList(beforeAfter.currentBullets, 'ba-red')}
      ${bulletList(beforeAfter.enrichedBullets, 'ba-teal')}
    </div>
    <p class="mock-caption">${esc(beforeAfter.caption)}</p>
    <h3 class="impact-title">Expected business impact</h3>
    ${businessImpact.map((b) => `<p class="impact"><strong>${esc(b && b.title)}</strong> ${esc(b && b.detail)}</p>`).join('')}
  `)

  // ---------- Page 5: commercial impact ----------
  const priceVal = (p) => parseFloat(String(p && p.price).replace(/[^0-9.]/g, '')) || 0
  // Sellers listing the identical price share one row ("Total Tools / Sydney Tools"), like the
  // reference report; the prospect always keeps its own highlighted row.
  const priceGroups = []
  for (const p of priceComparison) {
    if (p && p.isProspect) {
      priceGroups.push({ label: `${company} (audited)`, price: p.price, val: priceVal(p), isProspect: true })
      continue
    }
    const name = `${p && p.seller}${p && p.supplementary ? ' (other region)' : ''}`
    const group = priceGroups.find((g) => !g.isProspect && g.price === (p && p.price))
    if (group) {
      if (group.names.length < 3) group.names.push(name)
      else group.more += 1
    } else {
      priceGroups.push({ names: [name], more: 0, price: p && p.price, val: priceVal(p), isProspect: false })
    }
  }
  const maxPrice = Math.max(1, ...priceGroups.map((g) => g.val))
  const priceBars = priceGroups.map((g) => {
    const label = g.isProspect ? g.label : `${g.names.join(' / ')}${g.more ? ` +${g.more}` : ''}`
    return `
      <div class="bar-row price-row ${g.isProspect ? 'is-audited' : ''}">
        <div class="bar-label">${esc(label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max((g.val / maxPrice) * 100, 2)}%"></div></div>
        <div class="bar-value">${esc(g.price)}</div>
      </div>`
  }).join('')

  let revenueHtml = ''
  if (risk) {
    const a = risk.assumptions || {}
    const basis = risk.basis || {}
    const cat = risk.category || {}
    const illustrative = risk.mode === 'illustrative'
    const ill = illustrative ? ' (illustrative)' : ''
    const base = basis.mode === 'disclosed' ? basis.rangeLabel : basis.label
    const steps = [
      illustrative
        ? `<strong>Step 1 — Illustrative base:</strong> Example annual revenue ${esc(basis.label)} (not researched; a placeholder scale only).`
        : `<strong>Step 1 — Revenue base:</strong> Annual revenue ${esc(basis.rangeLabel)}, ${esc(basis.source)}.`,
      cat.applied
        ? `<strong>Step 2 — Category base:</strong> ${esc(cat.name || 'This product category')} estimated at ~${pct(cat.shareLow)}${cat.shareHigh !== cat.shareLow ? `–${pct(cat.shareHigh)}` : ''} of that ${illustrative ? 'illustrative ' : ''}total${cat.rationale ? ` (${esc(cat.rationale)})` : ''} = <strong>${esc(cat.label)}</strong>${ill}.`
        : `<strong>Step 2 — Category base:</strong> the full revenue base is used (no category split applied) = <strong>${esc(cat.label)}</strong>${ill}.`,
      `<strong>Step 3 — New buyers:</strong> ~${pct(a.newBuyerShare)} of category revenue from new accounts × ~${pct(a.aiResearchedShare)} of those decisions now AI-researched × ~${pct(a.trustLossShare)} lost where trust breaks down${risk.trustLossReason ? ` (${esc(risk.trustLossReason)})` : ''} — ≈ <strong>${esc(risk.newBuyers.label)}/year${ill}</strong>.`,
      `<strong>Step 4 — Existing accounts:</strong> ~${pct(a.existingShare)} of category revenue × ~${pct(a.reDecisionRate)} annual re-decision rate × ~${pct(a.switchingShare)} switching to a better-documented supplier — ≈ <strong>${esc(risk.existingAccounts.label)}/year${ill}</strong>.`,
    ]
    revenueHtml = `
      <h3>${illustrative ? 'Illustrative cost of doing nothing for 12 months' : 'Revenue at risk across the category (illustrative)'}</h3>
      ${illustrative
        ? `<div class="callout callout-red"><p><strong>This section uses an example figure, not ${esc(company)}'s real revenue.</strong> No revenue figure was provided with this report request, and we have no researched or estimated figure for ${esc(company)}'s actual turnover. Everything below starts from an illustrative placeholder — <strong>${esc(basis.label)}</strong> — chosen only to demonstrate the shape of this calculation. Replace it with your real number on the walkthrough call; until then, treat every figure on this page as a worked example, not a finding about your business.</p></div>`
        : `<p>${esc(company)} put its annual revenue in the <strong>${esc(basis.label)}</strong> band on the report request form. That self-reported range is the one input in this model that came from you; everything below it is a clearly labelled estimate — swap in your own category and channel figures on the walkthrough call for a precise total.</p>`}
      <div class="callout callout-cream steps">${steps.map((s) => `<p>${s}</p>`).join('')}</div>
      <div class="banner">${illustrative
        ? `Roughly ${esc(risk.total.label)} a year on this illustrative ${esc(base)} scale — swap in your real revenue and the number changes; the method and the content fix don't.`
        : `Roughly ${esc(risk.total.label)} a year, on AltiusNxt's estimate — a modeled range, not a forecast.`}</div>
      <p class="fine">${illustrative
        ? `Revenue basis: illustrative example only, selected to demonstrate methodology at a ${esc(base)} scale — not researched, not disclosed by ${esc(company)}, and not a claim about your actual turnover. The category share, AI-influence rate and switching rate are modeled assumptions on top of that placeholder. We will not know a credible number until you give us one.`
        : `Revenue basis: the ${esc(basis.label)} band is self-reported on the AltiusNxt request form, not verified financial data. The category share, AI-research rate and switching rate are modeled estimates, not ${esc(company)}-disclosed figures — please correct them with your real category data so the total means something to you.`}</p>`
  }

  const closing = params.closingNote || (params.refSummaryNote ? { lead: '', body: params.refSummaryNote } : null)
  const page5 = innerPage(5, `
    <h2>The commercial impact</h2>
    <p class="intro">${esc(params.commercialIntro || `Being absent from AI answers costs orders that go to the sellers those answers do name, at the prices those sellers charge.`)}</p>
    ${priceBars ? `<h3 class="price-title">Listed price: ${esc([product.manufacturerBrand, product.manufacturerCode].filter(Boolean).join(' ') || productName)} at ${country ? `${esc(country)} ` : ''}sellers</h3>
    <div class="bars price-bars">${priceBars}</div>
    <p class="fine plain">${esc(params.priceComparisonCaption)}</p>` : ''}
    ${params.priceFinding ? `<div class="callout callout-teal"><p><strong>${esc(params.priceFinding.lead)}</strong> ${esc(params.priceFinding.body)}</p></div>` : ''}
    ${revenueHtml}
    ${closing && !params.priceFinding ? `<div class="callout callout-teal"><p>${closing.lead ? `<strong>${esc(closing.lead)}</strong> ` : ''}${esc(closing.body)}</p></div>` : ''}
  `)

  // ---------- Page 6: next steps + certifications ----------
  const badgesOk = CERT_BADGES.every(Boolean)
  const certHtml = badgesOk
    ? `<div class="certs">
        <div class="cert-badges">${CERT_BADGES.map((b, i) => `<img src="${b}" alt="${['TÜV Austria ISO 9001:2015 certified', 'TÜV Austria ISO/IEC 27001:2022 certified', 'B2B Ecommerce Association member'][i]}" />`).join('')}</div>
        <p class="cert-text">AltiusNxt Technologies is certified to ISO 9001:2015 (Quality Management) and ISO/IEC 27001:2022 (Information Security Management) by TÜV Austria, and is a ${B2B_MEMBER_YEAR} member of the B2B Ecommerce Association.</p>
      </div>`
    : CERT_FALLBACK_URI
      ? `<div class="certs"><div class="cert-badges"><img class="cert-combined" src="${CERT_FALLBACK_URI}" alt="AltiusNxt QMS and ISMS Certified — TÜV Austria ISO 9001:2015 and ISO/IEC 27001:2022" /></div></div>`
      : ''
  const page6 = innerPage(6, `
    <h2>Recommended next steps</h2>
    <p class="intro">${esc(nextSteps.intro || `An AltiusNxt product specialist completed this assessment using your live product page, manufacturer documentation and public seller listings. Your team would not need to do the technical work; we would agree with you what access we need to edit product content, and you control it.`)}</p>
    <div class="options">
      <div class="option option-a">
        <div class="option-tag">OPTION A · VIRTUAL</div>
        <h4>${esc(optionA.title || '20-Minute Walkthrough')}</h4>
        <p>${esc(optionA.body)}</p>
        <p class="option-strong">Reply with a time that suits you.</p>
        <p class="option-contact">Contact: <span class="option-link">${esc(sender.email)}</span></p>
      </div>
      <div class="option option-b">
        <div class="option-tag">OPTION B · COMPLIMENTARY ASSESSMENT</div>
        <h4>${esc(optionB.title || 'Three Products of Your Choice')}</h4>
        <p>${esc(optionB.body)}</p>
        <p><strong>No proposal or commitment required.</strong> Any enrichment work would be scoped and quoted separately, only if you ask for it.</p>
      </div>
    </div>
    <div class="cta">
      <h3>${esc(nextSteps.ctaHeadline || 'Send us three product pages.')}</h3>
      <p>${esc(nextSteps.ctaBody || 'We will show you how AI search currently responds to each one, and what enrichment would change.')}</p>
      <p class="cta-sign">${esc(sender.name)}${sender.title ? `, ${esc(sender.title)}` : ''} · ${esc(sender.email)}</p>
      <p class="cta-tag">"Anyone can fill your fields. We engineer your catalog for AI discovery."</p>
    </div>
    <div class="request-footer">
      <p><strong>Available on request:</strong> ${esc(params.availableOnRequest)}</p>
      <p class="unsub-italic">Sent by AltiusNxt Technologies to businesses whose public listings we have assessed. To stop hearing from us, reply "unsubscribe" to ${esc(params.unsubscribeEmail)}.</p>
    </div>
    ${certHtml}
  `)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  /* Arial regular/bold throughout; Arial Black only on the big tile numbers, the "Full audit"
     heading and the gap numbers — exactly the weights the reference uses. */
  body { font-family: Arial, 'Liberation Sans', Helvetica, sans-serif; color: ${INK}; }
  strong, b { font-weight: 700; }
  /* A fixed A4 page: content that runs long is shrunk to fit by the script at the end, so a page
     can never spill a footer or a paragraph onto an extra sheet. */
  .page { width: 210mm; height: 296.5mm; padding: 11mm 14mm 9mm; display: flex; flex-direction: column; page-break-after: always; position: relative; overflow: hidden; }
  .page:last-child { page-break-after: auto; }
  .page-body { flex: 1; min-height: 0; overflow: hidden; }
  p { font-size: 11.2px; line-height: 1.5; margin: 0 0 6px; }
  h2 { font-size: 20.7px; font-weight: 700; color: ${NAVY}; margin: 0 0 6px; line-height: 1.25; }
  h3 { font-size: 15.3px; font-weight: 700; color: ${NAVY}; margin: 16px 0 8px; line-height: 1.25; }
  h3.caps { text-transform: uppercase; margin-top: 18px; }
  h4 { font-size: 12.4px; font-weight: 700; color: ${NAVY}; margin: 0 0 3px; line-height: 1.3; }
  .intro { font-size: 11.5px; line-height: 1.45; color: ${GREY}; margin-bottom: 12px; }
  .body-text { font-size: 10.8px; }
  .fine { font-size: 9.9px; line-height: 1.45; color: ${GREY}; font-style: italic; }
  .fine.plain { font-style: normal; }
  .footnote { font-size: 9.9px; line-height: 1.45; color: ${GREY}; margin: 3px 0; }
  .unsub { font-size: 9.3px; color: #999999; }

  /* header / footer */
  .brand-logo { height: 27px; width: auto; display: block; }
  .brand-wordmark { font-weight: 700; font-size: 18px; color: ${NAVY}; }
  .page-header { display: flex; justify-content: space-between; align-items: center; height: 30px; }
  .prepared-for { font-size: 10.2px; color: ${GREY}; letter-spacing: .01em; }
  .rule { height: 3px; background: ${ORANGE}; margin: 11px 0 18px; }
  .page-footer { display: flex; justify-content: space-between; font-size: 9.7px; color: ${GREY_LIGHT}; border-top: 1px solid ${LIGHT}; padding-top: 7px; margin-top: 8px; }

  /* page 1 — cover */
  .cover { padding: 0; }
  .cover-header { display: flex; justify-content: space-between; align-items: flex-start; height: 88px; padding: 24px 14mm 0; }
  .cover .brand-logo { height: 30px; }
  .cover-header-right { text-align: right; }
  .cover-prepared { color: #545454; font-size: 10.4px; }
  .cover-tag { font-size: 10.4px; font-weight: 700; color: ${ORANGE}; margin-top: 4px; }
  /* +2px so the full-bleed bands reach the page edge despite A4 rounding in the PDF */
  .cover-rule { height: 8px; background: ${CORAL}; width: calc(100% + 2px); }
  .hero { background: #d6e0f1; color: ${INK}; padding: 28px 14mm 34px; width: calc(100% + 2px); }
  .eyebrow { font-size: 10.7px; letter-spacing: .04em; color: #4a5a78; margin-bottom: 14px; }
  .hero h1 { font-size: 24.7px; line-height: 1.3; font-weight: 700; margin: 0 0 14px; color: ${NAVY}; }
  .hero h1 .accent { color: #c8500a; }
  .lede { font-size: 11.7px; line-height: 1.5; color: #26334d; max-width: 640px; margin: 0 0 24px; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 13px; margin-bottom: 16px; }
  .tile { border-radius: 3px; padding: 13px 15px; min-height: 103px; }
  .tile-num { font-size: 22.7px; font-weight: 900; line-height: 1.1; margin-bottom: 8px; }
  .tile-num-sm { font-size: 19px; }
  .tile-label { font-size: 9.3px; line-height: 1.3; text-transform: uppercase; }
  .tile-red { background: #a35252; color: #111; }
  .tile-red .tile-num { color: #111; }
  .tile-navy { background: #44648c; color: #111; }
  .tile-navy .tile-num { color: #111; }
  .tile-orange { background: #f6be7d; color: #111; }
  .tile-orange .tile-num { color: #111; }
  .hero-fine { font-size: 9.6px; line-height: 1.45; color: #4a5a78; font-style: italic; margin: 0; }
  .cover-body { padding: 26px 14mm 0; flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
  .audit-row { display: grid; grid-template-columns: 1.95fr 1fr; gap: 19px; margin-bottom: 24px; }
  .audit-box { background: ${CREAM}; padding: 17px 19px; border-radius: 3px; }
  .audit-heading { font-size: 11px; font-weight: 900; color: ${ORANGE}; letter-spacing: .03em; margin-bottom: 9px; }
  .audit-box p { font-size: 11.5px; line-height: 1.5; color: ${INK}; margin: 0; }
  .request-box { background: ${HERO}; color: #fff; padding: 17px 19px; border-radius: 3px; }
  .request-label { font-weight: 700; font-size: 12px; color: #fff; margin-bottom: 5px; }
  .request-email { font-weight: 700; font-size: 12px; color: ${ORANGE}; word-break: break-all; margin-bottom: 11px; }
  .request-call { font-size: 10.7px; line-height: 1.45; color: #c7d1e3; margin: 0; }
  .features { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 19px; margin-bottom: 28px; }
  .feature { border-top: 3px solid ${ORANGE}; padding-top: 11px; }
  .feature h4 { font-size: 11.7px; margin-bottom: 8px; }
  .feature p { font-size: 10.4px; line-height: 1.5; color: ${GREY}; }
  .cover-footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; border-top: 1px solid ${LIGHT}; padding: 14px 0 8mm; margin-top: 14px; }
  .cover-footer-text { flex: 1; }
  .cover-footer p { font-size: 10.1px; color: #545454; margin-bottom: 4px; }
  .cover-footer strong { color: #545454; }
  .cover-footer .unsub { font-size: 9.3px; color: #999999; margin: 6px 0 0; }
  .cover-qr { flex: 0 0 auto; text-align: center; }
  .cover-qr img { width: 64px; height: 64px; display: block; margin: 0 auto 3px; }
  .cover-qr span { font-size: 8.6px; color: ${GREY}; }

  /* page 2 */
  .results-headline { font-size: 11.5px; line-height: 1.4; font-weight: 700; color: ${NAVY}; margin-bottom: 12px; }
  .qtable { width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed; }
  .qtable th { background: ${NAVY}; color: #fff; font-size: 11.1px; font-weight: 700; text-align: left; padding: 7px 11px; }
  .qtable td { font-size: 11.1px; line-height: 1.45; padding: 9px 11px; border-bottom: 1px solid ${LIGHT}; vertical-align: top; }
  .cited-yes { color: ${TEAL}; font-weight: 700; }
  .cited-no { color: ${CORAL}; font-weight: 700; }
  .quote-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 19px; margin: 14px 0 6px; }
  .quote-grid-1 { grid-template-columns: 1fr; }
  .quote-grid-3 { grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .quote-grid-3 .quote-card { padding: 11px 13px; }
  .quote-grid-3 blockquote { font-size: 10.6px; }
  .quote-card.quote-positive { background: ${TEAL_BG}; border-left-color: ${TEAL}; }
  .quote-card { background: ${PINK_BG}; border-left: 4px solid ${CORAL}; padding: 13px 16px; }
  .quote-card blockquote { margin: 0 0 9px; font-size: 11.5px; font-style: italic; color: ${INK}; line-height: 1.5; }
  .quote-card footer { font-size: 11.5px; font-weight: 700; color: ${INK}; line-height: 1.4; }
  .callout { border-left: 4px solid ${ORANGE}; padding: 10px 16px; margin: 12px 0; }
  .callout p { font-size: 10.9px; line-height: 1.5; margin: 0; color: ${INK}; }
  .callout-cream { background: ${CREAM}; }
  .callout-teal { background: ${TEAL_BG}; border-left-color: ${TEAL}; }
  .callout-red { background: ${PINK_BG}; border-left-color: ${CORAL}; }
  .steps p { margin-bottom: 2px; font-size: 11.2px; line-height: 1.5; }

  /* page 3 */
  .gap { display: flex; gap: 13px; margin-bottom: 14px; }
  .gap-num { flex: none; width: 21px; height: 21px; border-radius: 50%; background: ${ORANGE}; color: #fff; font-size: 11.3px; font-weight: 900; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
  .gap p { font-size: 11px; line-height: 1.55; margin: 0; }
  .spec-title { margin-top: 20px; }
  .ftable { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 4px; }
  .ftable th { background: ${NAVY}; color: #fff; font-size: 10.6px; font-weight: 700; text-align: left; padding: 6px 10px; }
  .ftable td { font-size: 10.6px; line-height: 1.4; padding: 6px 10px; border-bottom: 1px solid ${LIGHT}; vertical-align: top; }
  .ftable td.res-match { color: ${TEAL}; font-weight: 700; }
  .ftable td.res-missing { color: ${GREY}; font-weight: 700; }
  .ftable td.res-differs { color: ${CORAL}; font-weight: 700; }
  .field-summary { font-size: 10.9px; font-weight: 700; color: ${INK}; margin: 8px 0 0; }
  .bars { margin: 8px 0 6px; }
  .bar-row { display: grid; align-items: center; margin-bottom: 9.7px; }
  .bar-label { font-size: 11.5px; color: ${INK}; }
  .bar-track { background: ${TRACK}; }
  .bar-fill { height: 100%; background: ${NAVY}; }
  .bar-value { font-size: 11.5px; font-weight: 700; color: ${INK}; text-align: right; }
  .spec-row { grid-template-columns: 181px 1fr 37px; }
  .spec-row .bar-track { height: 18.7px; }
  .is-median .bar-fill { background: ${MEDIAN}; }
  .is-prospect .bar-label, .is-prospect .bar-value { color: ${CORAL}; font-weight: 700; }
  .is-prospect .bar-fill { background: ${CORAL}; }

  /* page 4 */
  .ba-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .ba-card { border: 1px solid ${LIGHT}; border-top: none; }
  .ba-head { color: #fff; font-size: 10.7px; font-weight: 700; padding: 6px 13px; height: 26.7px; line-height: 15px; margin: 0 -1px; }
  .ba-head-current { background: ${CORAL}; }
  .ba-head-enriched { background: ${TEAL}; }
  /* The whole live page is shown top to bottom at the card's width; when the corrected page is
     longer than the card, its bottom is simply cut off, as in the reference. */
  .ba-frame { height: 140mm; overflow: hidden; background: #fff; }
  .ba-shot { width: 100%; height: auto; display: block; margin: 0 auto; }
  .ba-missing { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${GREY}; font-style: italic; }
  .ba-lists { margin: 12px 0 8px; }
  .ba-list { margin: 0; padding-left: 15px; }
  .ba-list li { font-size: 10.4px; line-height: 1.5; margin-bottom: 2px; }
  .ba-red li { color: ${CORAL}; }
  .ba-teal li { color: ${TEAL}; }
  .mock-caption { font-size: 10.4px; line-height: 1.5; color: ${GREY}; margin: 8px 0 0; }
  .impact-title { margin-top: 14px; }
  .impact { font-size: 11.2px; line-height: 1.5; margin-bottom: 8px; }
  .impact strong { color: ${INK}; }

  /* page 5 */
  .price-title { margin-top: 4px; }
  .price-row { grid-template-columns: 189px 1fr 120px; margin-bottom: 8.6px; }
  .price-row .bar-track { height: 17.3px; }
  .price-row .bar-value { font-size: 11.5px; }
  .is-audited .bar-label, .is-audited .bar-value { color: ${ORANGE}; font-weight: 700; }
  .is-audited .bar-fill { background: ${ORANGE}; }
  .banner { background: ${NAVY}; color: #fff; font-size: 13.3px; font-weight: 700; text-align: center; padding: 16px 22px; border-radius: 3px; margin: 12px 0 8px; line-height: 1.5; }

  /* page 6 */
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0 26px; }
  .option { border-radius: 3px; padding: 24px 24px 20px; color: #fff; min-height: 229px; }
  .option-a { background: ${NAVY}; }
  .option-a p { color: #d6dfef; }
  .option-b { background: ${ORANGE}; color: #2a1700; }
  .option-b p { color: #2a1700; }
  .option-tag { font-size: 10.1px; letter-spacing: .02em; color: #9eb0cc; margin-bottom: 12px; }
  .option-b .option-tag { color: #2a1700; }
  .option h4 { font-size: 16px; color: #fff; margin-bottom: 14px; }
  .option-b h4 { color: #2a1700; }
  .option p { font-size: 11.1px; line-height: 1.5; }
  .option-strong { font-weight: 700; color: #fff !important; margin: 12px 0 0 !important; }
  .option-contact { color: #fff !important; }
  .option-link { color: ${ORANGE}; text-decoration: underline; }
  .cta { text-align: center; margin: 4px 0 28px; }
  .cta h3 { font-size: 17.3px; margin: 0 0 10px; }
  .cta p { font-size: 11.5px; color: ${GREY}; }
  .cta .cta-sign { font-weight: 700; color: #212121; margin-top: 16px; font-size: 12px; }
  .cta .cta-tag { color: ${ORANGE}; font-style: italic; margin-top: 18px; }
  .request-footer { background: ${GREY_BOX}; padding: 16px 24px; border-radius: 3px; }
  .request-footer p { font-size: 10.4px; line-height: 1.5; margin-bottom: 6px; color: ${INK}; }
  .request-footer .unsub-italic { font-size: 10.4px; font-style: italic; color: ${GREY}; margin-bottom: 0; }
  .certs { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 30px; }
  .cert-badges { display: flex; align-items: center; gap: 23px; }
  .cert-badges img { height: 76px; width: auto; display: block; }
  .cert-badges img.cert-combined { height: 72px; }
  .cert-text { font-size: 10.1px; line-height: 1.5; color: ${GREY}; max-width: 215px; margin: 0; }
</style>
</head>
<body>
  ${page1}
  ${page2}
  ${page3}
  ${page4}
  ${page5}
  ${page6}
  <script>
    // Shrink any page whose content is taller than the page (down to 80%) so nothing is cut or
    // pushed onto a new sheet. Pages that already fit are untouched.
    function fitPages() {
      document.querySelectorAll('.page-body, .cover-body').forEach(function (body) {
        var z = 1;
        while (body.scrollHeight > body.clientHeight + 1 && z > 0.8) { z = Math.round((z - 0.02) * 100) / 100; body.style.zoom = z; }
      });
    }
    window.addEventListener('load', fitPages);
  </script>
</body>
</html>`
}
