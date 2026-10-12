import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Real brand assets (not a reconstruction) — base64-embedded directly in the HTML so Puppeteer
// never needs a running static file server to resolve them, same pattern already used for the
// page screenshots elsewhere in this template.
function loadAssetDataUri(relativePath) {
  try {
    const buf = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', relativePath))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
const LOGO_DATA_URI = loadAssetDataUri('altiusnxt_logo.png')
const CERTIFICATION_DATA_URI = loadAssetDataUri('altiusnxt_certification.png')

const NAVY = '#0b1f3a'
const NAVY_2 = '#122b52'
const ORANGE = '#ff6a1a'
const ORANGE_2 = '#e85a0c'
const STEEL = '#48566b'
const STEEL_2 = '#8291a6'
const LIGHT = '#dde3ec'
const PAPER = '#f4f6fa'
const CREAM = '#fbf1e6'
const GREEN = '#1a8f5e'
const GREEN_BG = '#e9f7ef'
const RED = '#b93b2e'
const RED_BG = '#fdecea'

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
// Spells out small counts in report prose ("eight buyer queries", "five gaps") rather than
// using the numeral — matches the reference report's own convention. Falls back to the numeral
// above ten, where a spelled-out word reads awkwardly.
function numberWord(n) {
  const num = Number(n)
  return Number.isInteger(num) && num >= 0 && num <= 10 ? NUMBER_WORDS[num] : String(n)
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * buildOutreachReportHtml(params) — cold-outreach sales report, 6 pages.
 *
 * params = {
 *   lead: { company, contactName, contactTitle, website, location, timezoneLabel, email },
 *   product: { name, manufacturerBrand, manufacturerCode, url, category },
 *   lede: string,                                      // ADDED — page-1 narrative sentence, computed from real price/citation facts
 *   stats: { citedCount, totalQueries, priceRank, priceRankLabel, sellerCount, priceLow, priceHigh, currency },
 *   headline: { line1, line2, line3 },               // ADDED — page-1 hero 3-line headline
 *   methodology: [ { title, body }, ... exactly 3 ],  // ADDED — page-1 feature-row blurbs
 *   queries: {
 *     named: [ { query, sellersCited: [string,...], prospectCited: boolean, note: string|null } ],
 *     category: [ { query, sellersCited: [string,...], prospectCited: boolean, note: string|null } ],
 *   },
 *   quotes: { chatgpt: string, claude: string },
 *   commercialImplications: string,                  // ADDED — page-2 closing paragraph
 *   categoryQueryCausalNote: string|null,             // ADDED — page-2 footnote linking category-query misses to stated page attributes
 *   gaps: [ { title, detail } ],                      // variable count (evidence-based), numbered from 1
 *   strengths: string,
 *   specDepth: [ { label, count, highlight: boolean } ],
 *   specDepthCaption: string,
 *   beforeAfter: { currentBullets: [string,...], enrichedBullets: [string,...], caption: string },
 *   businessImpact: [ { title, detail } ],
 *   priceComparison: [ { seller, price, isProspect: boolean } ],
 *   priceComparisonCaption: string,
 *   revenueTable: {
 *     unitLabel: string, unitPrice: string, currency: string,
 *     tiers: [ { unitsPerMonth: number, perMonth: string, perYear: string } ],
 *     caption: string,
 *   },
 *   methodologyDate: string,              // full date, e.g. "4 October 2026" — used in fineprint/body text
 *   methodologyMonthYear: string,         // ADDED — month+year only, e.g. "October 2026" — used in the page-1 eyebrow
 *   engineNames: string[],                // ADDED — e.g. ["ChatGPT","Claude","Gemini"] — real engine names for table column headers
 *   refSummaryNote: string,
 *   nextSteps: {
 *     optionA: { title, body, contact },
 *     optionB: { title, body, note },
 *   },
 *   availableOnRequest: string,                       // ADDED — page-6 fineprint
 *   sender: { name, title, company, email },
 *   unsubscribeEmail: string,
 * }
 */

// The real company logo (logo + wordmark baked into one image), not a reconstruction. Falls
// back to a plain text wordmark in the unlikely event the asset file is missing, so a broken
// path never silently breaks report generation.
const BRAND_HEADER_HTML = LOGO_DATA_URI
  ? `<img class="brand-logo" src="${LOGO_DATA_URI}" alt="AltiusNxt" />`
  : `<span class="brand-wordmark-fallback">AltiusNxt</span>`

function pageShellInner(company, pageLabel, bodyHtml) {
  return `
    <section class="page">
      <div class="page-header">
        <div class="brand"><span class="brand-wordmark">ALTIUSNXT</span></div>
        <div class="header-right">
          <div class="prepared-for">PREPARED FOR ${esc(String(company || '').toUpperCase())}</div>
        </div>
      </div>
      <div class="header-rule"></div>
      <div class="page-body">${bodyHtml}</div>
      <div class="page-footer">
        <span>AltiusNxt · Prepared for ${esc(company)}</span>
        <span>${esc(pageLabel)}</span>
      </div>
    </section>
  `
}

function pageShellCover(company, pageLabel, bodyHtml) {
  return `
    <section class="page">
      <div class="page-header page-header-cover">
        <div class="brand">${BRAND_HEADER_HTML}</div>
        <div class="header-right">
          <div class="prepared-for">PREPARED FOR ${esc(String(company || '').toUpperCase())}</div>
          <div class="report-tag">Anyone can fill your fields. We engineer your catalog for AI discovery.</div>
        </div>
      </div>
      <div class="header-rule header-rule-cover"></div>
      <div class="page-body">${bodyHtml}</div>
    </section>
  `
}

export function buildOutreachReportHtml(params = {}) {
  const lead = params.lead || {}
  const product = params.product || {}
  const stats = params.stats || {}
  const headline = params.headline || {}
  const methodology = Array.isArray(params.methodology) ? params.methodology.slice(0, 3) : []
  const queries = params.queries || {}
  const namedQueries = Array.isArray(queries.named) ? queries.named : []
  const categoryQueries = Array.isArray(queries.category) ? queries.category : []
  const quotes = params.quotes || {}
  const gaps = Array.isArray(params.gaps) ? params.gaps : []
  const specDepth = Array.isArray(params.specDepth) ? params.specDepth : []
  const beforeAfter = params.beforeAfter || {}
  const currentBullets = Array.isArray(beforeAfter.currentBullets) ? beforeAfter.currentBullets : []
  const enrichedBullets = Array.isArray(beforeAfter.enrichedBullets) ? beforeAfter.enrichedBullets : []
  const businessImpact = Array.isArray(params.businessImpact) ? params.businessImpact : []
  const priceComparison = Array.isArray(params.priceComparison) ? params.priceComparison : []
  const revenueTable = params.revenueTable || {}
  const revenueTiers = Array.isArray(revenueTable.tiers) ? revenueTable.tiers : []
  const nextSteps = params.nextSteps || {}
  const optionA = nextSteps.optionA || {}
  const optionB = nextSteps.optionB || {}
  const sender = params.sender || {}

  const company = lead.company || 'Prospect'
  const productName = product.name || 'the product assessed'
  const citedCount = Number.isFinite(stats.citedCount) ? stats.citedCount : 0
  const totalQueries = Number.isFinite(stats.totalQueries) ? stats.totalQueries : (namedQueries.length || 0)
  const totalAskedCount = namedQueries.length + categoryQueries.length
  const engineNames = Array.isArray(params.engineNames) ? params.engineNames : []
  const engineNamesLabel = engineNames.length ? engineNames.join(', ').toUpperCase() : 'ENGINES'
  // Natural-case "X, Y and Z" join for sentence context — engineNamesLabel above is upper-cased
  // for table headers, which reads as shouting mid-sentence.
  const engineNamesSentence = engineNames.length === 0
    ? 'the configured AI engines'
    : engineNames.length === 1
      ? engineNames[0]
      : `${engineNames.slice(0, -1).join(', ')} and ${engineNames[engineNames.length - 1]}`
  const fullDate = params.methodologyDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const monthYear = params.methodologyMonthYear || fullDate

  // ---------- notes collection for page 2 footnote ----------
  const noteMarkers = []
  function markerFor(note) {
    if (!note) return ''
    let idx = noteMarkers.indexOf(note)
    if (idx === -1) {
      noteMarkers.push(note)
      idx = noteMarkers.length - 1
    }
    return '*'.repeat(idx + 1)
  }

  function citedCell(row) {
    if (row && row.prospectCited) {
      return `<span class="cited-yes">Cited</span>`
    }
    return `<span class="cited-no">Not cited</span>`
  }

  function queryTableRows(rows) {
    return rows.map((row) => {
      const marker = markerFor(row && row.note)
      const sellers = Array.isArray(row && row.sellersCited) ? row.sellersCited : []
      return `
        <tr>
          <td>${esc(row && row.query)}${marker ? `<sup>${marker}</sup>` : ''}</td>
          <td>${sellers.length ? esc(sellers.join(', ')) : '—'}</td>
          <td>${citedCell(row)}</td>
        </tr>
      `
    }).join('')
  }

  // ---------- Page 1 ----------
  const statRows = [
    `<div class="stat-box" style="background:${RED}">
       <div class="stat-num">${esc(citedCount)} of ${esc(totalQueries)}</div>
       <div class="stat-label">AI LLM ANSWERS NAMING ${esc(String(productName).toUpperCase())} THAT CITED ${esc(String(company).toUpperCase())}</div>
     </div>`,
    `<div class="stat-box" style="background:${ORANGE}">
       <div class="stat-num">${esc(stats.priceRank)}</div>
       <div class="stat-label">PRICE RANK OF THE ${esc(stats.sellerCount)} SELLERS LISTING THIS PRODUCT (${esc(stats.priceLow)} TO ${esc(stats.priceHigh)})</div>
     </div>`,
    `<div class="stat-box info">
       <div class="stat-label" style="color:#fff;opacity:.85;">PRODUCT ASSESSED</div>
       <div class="stat-product">${esc(productName)}</div>
       <div class="stat-url">${esc(product.url)}</div>
     </div>`,
  ].join('')

  const featureRow = methodology.length
    ? methodology.map((m) => `
        <div class="feature"><div class="feature-rule"></div><h4>${esc(m && m.title)}</h4><p>${esc(m && m.body)}</p></div>
      `).join('')
    : ''

  const page1 = pageShellCover(company, 'Page 1 of 6', `
    <div class="hero-band">
      <div class="eyebrow">AI READINESS REPORT · ${esc(String(monthYear).toUpperCase())}</div>
      <h1>${esc(headline.line1)}<br>${esc(headline.line2)}<br><span class="accent">${esc(headline.line3)}</span></h1>
      <p class="lede">${esc(params.lede) || `We asked the AI assistants your buyers already use what they say about "${esc(productName)}" — live, today — and checked how ${esc(company)}'s own listing stacks up against the sellers those assistants actually cite.`}</p>

      <div class="stat-row">${statRows}</div>
      <p class="fineprint">Search results: ${esc(engineNamesSentence)} with live web search, run on ${esc(fullDate)}. AI answers vary between runs and between engines, so this is a snapshot.</p>
      <p class="fineprint">Prices are as displayed on each seller's site on ${esc(fullDate)}.</p>
    </div>

    <div class="qr-band">
      <div class="qr-copy">
        <div class="qr-heading">FULL AUDIT AVAILABLE</div>
        ${params.availableOnRequest ? `<p>This summary sits on top of a fuller technical audit of your product page: ${esc(params.availableOnRequest.replace(/\.$/, ''))}.</p>` : ''}
      </div>
      <div class="qr-contact">
        <p class="qr-contact-label">Request a copy:</p>
        <p class="qr-contact-email">${esc(sender.email)}</p>
        <p class="qr-contact-call">Prefer a call? Reply with a time that suits you${lead.timezoneLabel ? ` (${esc(lead.timezoneLabel)})` : ''}.</p>
      </div>
    </div>

    <div class="feature-row">${featureRow}</div>

    <div class="prepared">
      <div><strong>PREPARED FOR</strong> ${esc(lead.contactName)}${lead.contactTitle ? `, ${esc(lead.contactTitle)}` : ''}, ${esc(company)}${lead.location ? ` · ${esc(lead.location)}` : ''}${lead.website ? ` · ${esc(lead.website)}` : ''}</div>
      <div><strong>PREPARED BY</strong> ${esc(sender.name)}${sender.title ? `, ${esc(sender.title)}` : ''} · ${esc(sender.company)} · ${esc(sender.email)}</div>
    </div>
    <p class="fineprint">AltiusNxt sends this report to businesses whose public product listings we have assessed. If you would rather not hear from us again, reply "unsubscribe" to ${esc(params.unsubscribeEmail)} and we will stop.</p>
  `)

  // ---------- Page 2 ----------
  const namedRows = queryTableRows(namedQueries)
  const categoryRows = queryTableRows(categoryQueries)
  const footnoteLines = noteMarkers.map((note, i) => `<p class="footnote">${'*'.repeat(i + 1)} ${esc(note)}</p>`).join('')

  const quoteBlocks = []
  if (quotes.chatgpt) quoteBlocks.push(`<div class="quote-card"><blockquote>"${esc(quotes.chatgpt)}"</blockquote><footer>— ChatGPT, after reading your page</footer></div>`)
  if (quotes.claude) quoteBlocks.push(`<div class="quote-card"><blockquote>"${esc(quotes.claude)}"</blockquote><footer>— Claude, after reading your page</footer></div>`)

  const page2 = pageShellInner(company, 'Page 2 of 6', `
    <h2><span class="bar"></span>AI search results for your product</h2>
    <p class="headline-stat">${citedCount === 0
      ? `Across ChatGPT, Claude and Gemini, ${esc(company)} was cited in none of ${esc(numberWord(totalQueries))} buyer queries.`
      : `${esc(company)} was cited in ${esc(citedCount)} of ${esc(totalQueries)} buyer queries.`}</p>
    <p class="intro">We put ${esc(totalAskedCount)} buyer-style questions to live AI assistants, worded the way a real buyer would ask them, and recorded exactly who each engine cited.</p>

    <div class="subhead">QUERIES THAT NAME ${esc(String(productName).toUpperCase())}</div>
    <table class="qtable">
      <thead><tr><th>BUYER QUERY</th><th>SELLERS CITED (${esc(engineNamesLabel)})</th><th>${esc(String(company).toUpperCase())}</th></tr></thead>
      <tbody>${namedRows || '<tr><td colspan="3">No queries recorded.</td></tr>'}</tbody>
    </table>

    <div class="subhead" style="margin-top:14px;">BROADER CATEGORY QUERIES (${esc(String(productName).toUpperCase())} NOT NAMED)</div>
    <table class="qtable">
      <thead><tr><th>BUYER QUERY</th><th>SELLERS CITED (${esc(engineNamesLabel)})</th><th>${esc(String(company).toUpperCase())}</th></tr></thead>
      <tbody>${categoryRows || '<tr><td colspan="3">No queries recorded.</td></tr>'}</tbody>
    </table>
    ${footnoteLines}
    ${params.categoryQueryCausalNote ? `<p class="footnote">${esc(params.categoryQueryCausalNote)}</p>` : ''}

    <div class="quote-grid${quoteBlocks.length === 1 ? ' single' : ''}">${quoteBlocks.join('')}</div>
    <p class="fineprint">These quotes are AI-generated assessments of your page, offered as directional feedback — they are not verified facts.</p>

    <div class="callout">
      <p><strong>How to read these results:</strong> each row is a live, independent query to a real AI assistant — not a simulation. "Sellers cited" lists who the engine actually named back to the buyer. A seller with no citations here wasn't necessarily asked about by name; it means that across these specific phrasings, the engine didn't surface them.</p>
    </div>

    <h3>Commercial implications</h3>
    <p class="body-text">${esc(params.commercialImplications)}</p>
  `)

  // ---------- Page 3 ----------
  const gapsHtml = gaps.map((g, i) => `
    <div class="gap-row">
      <div class="gap-num">${i + 1}</div>
      <div><h4>${esc(g && g.title)}</h4><p>${esc(g && g.detail)}</p></div>
    </div>
  `).join('')

  const maxSpecCount = Math.max(1, ...specDepth.map((s) => Number(s && s.count) || 0))
  const specBars = specDepth.map((s) => {
    const count = Number(s && s.count) || 0
    const pct = Math.max((count / maxSpecCount) * 100, 3)
    const color = s && s.highlight ? RED : NAVY
    return `
      <div class="hbar-row">
        <div class="hbar-label">${esc(s && s.label)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="hbar-value">${esc(count)}</div>
      </div>
    `
  }).join('')

  const page3 = pageShellInner(company, 'Page 3 of 6', `
    <h2><span class="bar"></span>${gaps.length > 0 ? `${capitalize(numberWord(gaps.length))} gap${gaps.length === 1 ? '' : 's'} on the product page` : 'No on-page gaps found'}</h2>
    <p class="intro">${gaps.length > 0
      ? `We reviewed ${esc(company)}'s own listing for ${esc(productName)} against what AI assistants and buyers actually need to recommend and compare it. Here's what came back — none of it about price, design, or reputation.`
      : `We reviewed ${esc(company)}'s own listing for ${esc(productName)} against every on-page signal we test — none of them came back as a gap. The page shows its manufacturer code, its specifications hold up against the competitor cited alongside it, and it carries structured data. See page 5 for what that means for the citation result on page 2.`}</p>
    ${gapsHtml}

    <div class="callout callout-cream">
      <p><strong>Existing strengths:</strong> ${esc(params.strengths)}</p>
    </div>

    <h3>Specification depth compared with the sellers AI cited</h3>
    <div class="hbar-chart">${specBars}</div>
    <p class="fineprint">${esc(params.specDepthCaption)}</p>
  `)

  // ---------- Page 4 ----------
  const currentLis = currentBullets.map((b) => `<li>${esc(b)}</li>`).join('')
  const enrichedLis = enrichedBullets.map((b) => `<li>${esc(b)}</li>`).join('')
  const impactLis = businessImpact.map((b) => `<li><strong>${esc(b && b.title)}</strong> ${esc(b && b.detail)}</li>`).join('')

  const page4 = pageShellInner(company, 'Page 4 of 6', `
    <h2><span class="bar"></span>Product page: current and enriched</h2>
    <p class="intro">Same product, same website, same price. The right-hand version is what an AltiusNxt product specialist would build from manufacturer data and public seller listings — price and stock stay as they are on your live store.</p>

    <div class="cards">
      <div class="card card-before">
        <div class="card-tag">✕ CURRENT PAGE</div>
        ${beforeAfter.currentScreenshot
          ? `<img class="page-shot" src="${esc(beforeAfter.currentScreenshot)}" alt="Current page" />`
          : `<div class="page-shot-missing">Screenshot unavailable for this page</div>`}
        <ul class="card-list">${currentLis}</ul>
      </div>
      <div class="card card-after">
        <div class="card-tag" style="color:${GREEN}">✓ ENRICHED PAGE (MOCK-UP)</div>
        ${beforeAfter.enrichedScreenshot
          ? `<img class="page-shot" src="${esc(beforeAfter.enrichedScreenshot)}" alt="Enriched mock-up" />`
          : `<div class="page-shot-missing">Mock-up unavailable</div>`}
        <ul class="card-list">${enrichedLis}</ul>
      </div>
    </div>
    <p class="fineprint">${esc(beforeAfter.caption)}</p>

    <h3>Expected business impact</h3>
    <ul class="bullets">${impactLis}</ul>
  `)

  // ---------- Page 5 ----------
  const maxPrice = Math.max(1, ...priceComparison.map((p) => parseFloat(String(p && p.price).replace(/[^0-9.]/g, '')) || 0))
  const priceBars = priceComparison.map((p) => {
    const val = parseFloat(String(p && p.price).replace(/[^0-9.]/g, '')) || 0
    const pct = Math.max((val / maxPrice) * 100, 3)
    const color = p && p.isProspect ? RED : NAVY
    return `
      <div class="hbar-row">
        <div class="hbar-label">${esc(p && p.seller)}</div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${color}"></div></div>
        <div class="hbar-value">${esc(p && p.price)}</div>
      </div>
    `
  }).join('')

  // revenueTable.unitLabel is often a full description ("carton of 48 rolls") — too long to repeat
  // after every number in the table ("5 carton of 48 rolls"), so derive a short plural noun from
  // just its first word for the per-row labels, keeping the full description in the header.
  function shortUnitNoun(unitLabel) {
    let firstWord = String(unitLabel || 'units').trim().split(/\s+/)[0].replace(/[^a-z]/gi, '').toLowerCase()
    // "single unit" / "each" / "per item" all mean one product — say "unit", never "single".
    if (!firstWord || /^(single|each|per|one|individual|item|piece)$/.test(firstWord)) firstWord = 'unit'
    firstWord = firstWord.replace(/s$/, '')
    return { singular: firstWord, plural: /[sxz]$|[cs]h$/i.test(firstWord) ? `${firstWord}es` : `${firstWord}s` }
  }
  const unitNoun = shortUnitNoun(revenueTable.unitLabel)
  const unitPlural = unitNoun.plural
  const revenuePeriod = revenueTable.period || 'month'
  const revenueRows = revenueTiers.map((t) => {
    const n = t && (t.unitsPerPeriod ?? t.unitsPerMonth)
    return `
    <tr>
      <td>${esc(n)} ${esc(n === 1 ? unitNoun.singular : unitPlural)}</td>
      <td>${esc(t && (t.perPeriod ?? t.perMonth))}</td>
      <td>${esc(t && t.perYear)}</td>
    </tr>
  `}).join('')

  const page5 = pageShellInner(company, 'Page 5 of 6', `
    <h2><span class="bar"></span>The commercial impact</h2>
    <p class="intro">Being absent from AI answers doesn't just cost visibility — it costs orders that go to the sellers those answers do name, at the prices those sellers are charging.</p>

    <h3>Listed price of ${esc(productName)}: ${esc(company)} and the sellers AI cited</h3>
    <div class="hbar-chart">${priceBars}</div>
    <p class="fineprint">${esc(params.priceComparisonCaption)}</p>

    <h3>Revenue at stake on this product (illustrative)</h3>
    <p class="body-text">The figures below are illustrative scenarios to show how volume translates into revenue at the listed unit price — they are not an estimate of ${esc(company)}'s actual lost revenue.</p>
    <table class="qtable">
      <thead><tr><th>${esc(unitPlural.charAt(0).toUpperCase() + unitPlural.slice(1))} purchased elsewhere per ${esc(revenuePeriod)}</th><th>Per ${esc(revenuePeriod)}</th><th>Per year</th></tr></thead>
      <tbody>${revenueRows || '<tr><td colspan="3">No data.</td></tr>'}</tbody>
    </table>
    <p class="fineprint">${esc(revenueTable.caption)}</p>

    <div class="callout callout-navy">
      <p>${esc(params.refSummaryNote)}</p>
    </div>
  `)

  // ---------- Page 6 ----------
  const page6 = pageShellInner(company, 'Page 6 of 6', `
    <h2><span class="bar"></span>Recommended next steps</h2>
    <p class="intro">An AltiusNxt product specialist checked everything in this report by hand against ${esc(company)}'s live page and live AI query results. You control what changes and when — nothing publishes without your sign-off.</p>

    <div class="options">
      <div class="option">
        <div class="option-tag">OPTION A · VIRTUAL</div>
        <h4>${esc(optionA.title)}</h4>
        <p>${esc(optionA.body)}</p>
        <p class="option-contact">${esc(optionA.contact)}</p>
      </div>
      <div class="option">
        <div class="option-tag">OPTION B · COMPLIMENTARY ASSESSMENT</div>
        <h4>${esc(optionB.title)}</h4>
        <p>${esc(optionB.body)}</p>
        <p class="option-contact">${esc(optionB.note)}</p>
      </div>
    </div>

    <div class="cta-band">
      <strong>${esc(nextSteps.ctaHeadline) || 'Send us three product page addresses.'}</strong>
      <p>${esc(nextSteps.ctaBody) || "We'll show you — live, on screen — what AI assistants say about each one today, and what changes after enrichment. No proposal, no commitment."}</p>
      <p class="cta-sign">${esc(sender.name)} · ${esc(sender.email)}</p>
    </div>

    <p class="tagline accent-tagline">Anyone can fill your fields. We engineer your catalog for AI discovery.</p>
    <p class="fineprint" style="text-align:center;">Available on request: ${esc(params.availableOnRequest)}</p>
    <p class="fineprint" style="text-align:center;">If you'd rather not receive these, reply to ${esc(params.unsubscribeEmail)} and we'll stop.</p>
    ${CERTIFICATION_DATA_URI ? `<div class="cert-badge"><img src="${CERTIFICATION_DATA_URI}" alt="AltiusNxt QMS and ISMS Certified — TÜV Austria ISO 9001:2015 and ISO/IEC 27001:2022" /></div>` : ''}
  `)

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: ${STEEL}; }
  .page {
    width: 210mm; min-height: 297mm; padding: 14mm 16mm 16mm;
    display: flex; flex-direction: column;
    page-break-after: always; position: relative;
  }
  .page:last-child { page-break-after: auto; }
  .page-header { display:flex; align-items:center; justify-content:space-between; }
  .page-header-cover { align-items:flex-start; }
  .brand { display:flex; align-items:center; }
  .brand-logo { height:58px; width:auto; display:block; margin-top:-6px; }
  .brand-wordmark, .brand-wordmark-fallback { font-weight:800; font-size:13px; color:${NAVY}; letter-spacing:.14em; }
  .header-right { text-align:right; }
  .prepared-for { font-size:9px; font-weight:700; color:${STEEL}; letter-spacing:.03em; }
  .report-tag { font-size:9px; font-weight:700; color:${ORANGE}; margin-top:4px; max-width:300px; }
  /* The orange rule spans the full page width (negative margins cancel the page padding). */
  .header-rule { height:4px; background:${ORANGE}; margin:8px -16mm 10px; border-radius:0; }
  .header-rule-cover { margin-bottom:0; }
  .page-body { flex:1; }
  .page-footer { display:flex; justify-content:space-between; font-size:7.5px; color:${STEEL_2}; margin-top:8px; border-top:1px solid ${LIGHT}; padding-top:6px; }

  h1 { font-size:26px; font-weight:800; color:${NAVY}; line-height:1.2; margin:14px 0 10px; }
  h1 .accent { color:${ORANGE}; }
  h2 { font-size:19px; font-weight:800; color:${NAVY}; margin:0 0 8px; display:flex; align-items:center; gap:10px; }
  h2 .bar { width:11px; height:17px; background:${ORANGE}; border-radius:1px; display:inline-block; }
  h3 { font-size:14px; font-weight:800; color:${NAVY}; margin:12px 0 6px; }
  h4 { font-size:12.5px; font-weight:800; color:${NAVY}; margin:0 0 4px; }
  p { font-size:10.5px; line-height:1.55; margin:0 0 6px; }
  .intro { font-size:11px; color:${STEEL}; margin-bottom:10px; }
  .body-text { font-size:10.5px; }
  .fineprint { font-size:8px; color:${STEEL_2}; font-style:italic; }
  .subhead { font-size:11px; font-weight:800; color:${NAVY}; letter-spacing:.03em; margin-bottom:8px; }
  .footnote { font-size:8.5px; color:${STEEL_2}; margin:4px 0; }
  .headline-stat { font-size:12px; font-weight:800; color:${ORANGE_2}; text-transform:uppercase; letter-spacing:.02em; margin-bottom:8px; }

  /* Full-bleed navy band straight under the orange rule — a page band, not a rounded card. */
  .hero-band { background:${NAVY}; color:#fff; border-radius:0; padding:30px 16mm 22px; margin:0 -16mm 20px; }
  .hero-band .eyebrow { font-size:9.5px; letter-spacing:.1em; color:#a9bade; margin-bottom:8px; }
  .hero-band h1 { color:#fff; margin-top:2px; font-size:30px; line-height:1.15; }
  .hero-band .lede { font-size:11.5px; color:#d6e0f0; max-width:640px; margin:10px 0 18px; }
  .hero-band .fineprint { color:#8fa3c8; }

  .stat-row { display:grid; grid-template-columns:1fr 1fr 1.25fr; gap:12px; margin-bottom:10px; }
  .stat-box { border-radius:4px; padding:18px 16px 16px; color:#fff; min-height:112px; display:flex; flex-direction:column; justify-content:flex-start; }
  .stat-box.info { background:${NAVY_2}; border:1px solid rgba(255,255,255,.15); }
  .stat-num { font-size:34px; font-weight:800; line-height:1.05; }
  .stat-label { font-size:8px; font-weight:700; letter-spacing:.04em; margin-top:8px; opacity:.9; text-transform:uppercase; }
  .stat-product { font-size:12.5px; font-weight:700; margin-top:6px; }
  .stat-url { font-size:8.5px; color:#a9bade; margin-top:3px; word-break:break-all; }

  .qr-band { display:flex; gap:0; align-items:stretch; border-radius:0; overflow:hidden; margin-bottom:18px; background:${CREAM}; padding:14px; }
  .qr-copy { flex:1; background:${CREAM}; padding:4px 16px 4px 4px; }
  .qr-heading { font-size:11.5px; font-weight:800; color:${ORANGE_2}; letter-spacing:.02em; margin-bottom:5px; }
  .qr-copy p { font-size:9.5px; color:${STEEL}; margin-bottom:4px; }
  .qr-contact { flex:0 0 190px; background:${NAVY}; padding:12px 16px; display:flex; flex-direction:column; justify-content:center; text-align:center; }
  .qr-contact-label { font-size:9.5px; font-weight:700; color:#fff; margin-bottom:3px; }
  .qr-contact-email { font-size:10.5px; font-weight:800; color:${ORANGE}; margin-bottom:8px; word-break:break-all; }
  .qr-contact-call { font-size:9px; color:${LIGHT}; line-height:1.4; }

  .feature-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; margin-bottom:24px; }
  .feature-rule { width:28px; height:4px; background:${ORANGE}; border-radius:0; margin-bottom:10px; }
  .feature p { font-size:9.5px; }

  .prepared { font-size:9px; color:${STEEL}; border-top:1px solid ${LIGHT}; padding-top:10px; margin-top:auto; }
  .prepared strong { color:${NAVY}; }
  .tagline { text-align:center; font-style:italic; font-size:10px; color:${STEEL}; margin-top:10px; }
  .cert-badge { display:flex; justify-content:center; margin-top:18px; }
  .cert-badge img { height:70px; width:auto; }
  .accent-tagline { color:${ORANGE_2}; font-size:11px; }

  .qtable { width:100%; border-collapse:collapse; margin-bottom:4px; }
  .qtable th { background:${NAVY}; color:#fff; font-size:8.5px; text-align:left; padding:6px 8px; }
  .qtable td { font-size:9.5px; padding:6px 8px; border-bottom:1px solid ${LIGHT}; vertical-align:top; }
  .qtable tr:nth-child(even) td { background:${PAPER}; }
  .cited-no { color:${RED}; font-weight:700; }
  .cited-yes { color:${GREEN}; font-weight:700; }

  .quote-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:10px 0; }
  .quote-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:10px 0 8px; }
  .quote-grid.single { grid-template-columns:1fr; }
  .quote-card { background:${CREAM}; border-left:3px solid ${ORANGE}; border-radius:0; padding:12px 14px; }
  .quote-card blockquote { margin:0; font-size:10px; font-style:italic; color:${NAVY}; }
  .quote-card footer { font-size:8.5px; font-style:normal; font-weight:700; color:${NAVY}; margin-top:7px; }

  .callout { background:${PAPER}; border-left:3px solid ${ORANGE}; border-radius:0 8px 8px 0; padding:10px 14px; margin:10px 0; }
  .callout-cream { background:${CREAM}; }
  .callout p { font-size:10.5px; color:${NAVY}; margin-bottom:0; }

  .gap-row { display:flex; gap:12px; margin-bottom:12px; }
  .gap-num { width:22px; height:22px; border-radius:50%; background:${ORANGE}; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex:none; }
  .gap-row p { font-size:9.5px; }

  .hbar-chart { margin-top:10px; }
  .hbar-row { display:grid; grid-template-columns:150px 1fr 70px; align-items:center; gap:10px; margin-bottom:8px; }
  .hbar-label { font-size:9px; color:${STEEL}; text-align:right; }
  .hbar-track { height:12px; background:${LIGHT}; border-radius:6px; overflow:hidden; }
  .hbar-fill { height:100%; border-radius:6px; }
  .hbar-value { font-size:9.5px; font-weight:700; color:${NAVY}; }

  .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0; }
  .card { border-radius:8px; padding:14px 16px; }
  .card-before { background:${RED_BG}; }
  .card-after { background:${GREEN_BG}; }
  .card-tag { font-size:9.5px; font-weight:800; color:${RED}; margin-bottom:6px; }
  .card-list { list-style:none; margin:6px 0 0; padding:0; font-size:9.5px; color:${STEEL}; }
  .card-list li { margin-bottom:5px; }
  .page-shot { width:100%; border-radius:6px; border:1px solid ${LIGHT}; margin-bottom:8px; display:block; }
  .page-shot-missing { width:100%; height:120px; border-radius:6px; border:1px dashed ${STEEL_2}; margin-bottom:8px; display:flex; align-items:center; justify-content:center; font-size:9.5px; color:${STEEL_2}; font-style:italic; }

  .bullets { margin:0; padding-left:16px; }
  .bullets li { font-size:10px; margin-bottom:6px; color:${STEEL}; }

  .options { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0 18px; }
  .option { background:${NAVY}; color:#fff; border-radius:0; padding:18px 18px 16px; }
  .option:nth-child(2) { background:${ORANGE}; }
  .option h3, .option h4 { color:#fff; margin-top:0; }
  .option-tag { font-size:9px; font-weight:800; color:#fff; opacity:.85; letter-spacing:.08em; margin-bottom:8px; text-transform:uppercase; }
  .option p { font-size:9.5px; color:#fff; }
  .option-contact { font-weight:700; color:#fff; margin-top:8px; }
  .callout-navy { background:${NAVY}; border-left:none; border-radius:0; padding:14px 18px; }
  .callout-navy p, .callout-navy strong { color:#fff; }
  .callout-navy p { font-size:10.5px; }

  /* Centred closing ask, like the reference — not a boxed band. */
  .cta-band { background:transparent; color:${NAVY}; border-top:1px solid ${LIGHT}; border-radius:0; padding:20px 20px 6px; margin:16px 0 14px; text-align:center; }
  .cta-band strong { font-size:16px; display:block; margin-bottom:6px; }
  .cta-band p { font-size:10px; color:${STEEL}; margin-top:4px; }
  .cta-band .cta-sign { font-weight:700; color:${NAVY}; }
  .cta-sign { color:${ORANGE} !important; font-weight:700; }
</style>
</head>
<body>
  ${page1}
  ${page2}
  ${page3}
  ${page4}
  ${page5}
  ${page6}
</body>
</html>`
}
