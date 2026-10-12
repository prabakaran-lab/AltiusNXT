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

function possessive(name) {
  const n = String(name || '')
  return esc(n) + (n.endsWith('s') ? '’' : '’s')
}

function pageShell(companyName, pageLabel, bodyHtml) {
  return `
    <section class="page">
      <div class="page-header">
        <div class="brand"><span class="brand-mark"></span>ALTIUSNXT</div>
        <div class="header-right">
          <div class="confidential">CONFIDENTIAL · ${esc(companyName)}</div>
          <div class="report-tag">AI Readiness Report</div>
        </div>
      </div>
      <div class="header-rule"></div>
      <div class="page-body">${bodyHtml}</div>
      <div class="page-footer">
        <span>AltiusNxt · Confidential · Generated automatically, reviewed by your AltiusNxt contact before follow-up</span>
        <span>${esc(pageLabel)}</span>
      </div>
    </section>
  `
}

const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`

const ENGINE_LABEL = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' };

export function buildReportHtml({ lead, url, quickScan, deep, revenue, liveAudit, pageReaction, qrDataUrl, hasFullReport }) {
  const company = lead?.company || 'Prospect'
  const productName = quickScan?.productName || deep?.productCategory || 'the page tested'
  const score = Number.isFinite(quickScan?.score) ? quickScan.score : 0
  const scoreColor = score < 40 ? RED : score < 70 ? ORANGE : GREEN
  const auditResults = liveAudit?.results || []
  const auditEngines = liveAudit?.engines || []
  const engineNames = auditEngines.map((e) => ENGINE_LABEL[e] || e)
  const mentionedCount = auditResults.filter((r) => r.mentioned).length
  const hasRevenue = revenue && Number.isFinite(revenue.totalRiskUSD)
  const auditDateLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // ---------- Page 1 ----------
  const page1 = pageShell(company, 'Page 1', `
    <div class="hero-band">
      <div class="eyebrow">AI READINESS REPORT · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
      <h1>Your buyers have moved to AI search.<br><span class="accent">Is your catalog ready?</span></h1>
      <p class="lede">What ${engineNames.length ? engineNames.join(', ') : 'AI shopping assistants'} actually said, live, when asked about "${esc(productName)}" today — and what closing the gap looks like.</p>

      <div class="stat-row">
        <div class="stat-box" style="background:${RED}">
          <div class="stat-num">${mentionedCount} of ${auditResults.length || 6}</div>
          <div class="stat-label">LIVE AI RECOMMENDATIONS</div>
        </div>
        <div class="stat-box" style="background:${ORANGE}">
          ${hasRevenue
            ? `<div class="stat-num">≈ ${usd(revenue.totalRiskUSD)}</div><div class="stat-label">12-MONTH REVENUE AT RISK</div>`
            : `<div class="stat-num">${score}/100</div><div class="stat-label">AI READINESS SCORE</div>`}
        </div>
        <div class="stat-box info">
          <div class="stat-label" style="color:#fff;opacity:.85;">PRODUCT TESTED</div>
          <div class="stat-product">${esc(productName)}</div>
          <div class="stat-url">${esc(url)}</div>
        </div>
      </div>
      <p class="fineprint">Recommendation counts are from live queries to ${engineNames.length ? engineNames.join(', ') : 'the configured engines'} on ${auditDateLabel} — real responses, not modeled estimates. See page 2 for the full transcript summary.${hasRevenue ? ` Revenue at risk is AltiusNxt's estimate based on ${revenue.selfReported ? `${possessive(company)} own reported annual revenue range` : `public signals on ${possessive(company)} own website`} (${esc(revenue.revenueDisplay || '')} estimated annual revenue) — refined with real numbers on the walkthrough call.` : ''}</p>
    </div>

    <div class="qr-band">
      <img class="qr-code" src="${qrDataUrl}" alt="QR code" />
      <div class="qr-copy">
        ${hasFullReport ? `
        <div class="qr-heading">SEE IT LIVE — SCAN FOR THE FULL AUDIT</div>
        <p>Scan with your phone camera to open the full AI Discoverability Audit — the 15-point scorecard, real per-engine query transcripts, the machine-readable schema graph, and the remediation roadmap.</p>
        <p class="qr-bold">Same data behind this report, in full — no login required.</p>
        ` : `
        <div class="qr-heading">WANT TO GO DEEPER? SCAN TO BOOK YOUR WALKTHROUGH</div>
        <p>Scan with your phone camera to email Govind directly and set up a 20-minute screen-share on your own catalog — live query logs, JSON-LD prototypes, and remediation paths.</p>
        <p class="qr-bold">No proposal, no commitment — just a working session on your three best-selling part numbers.</p>
        `}
      </div>
    </div>

    <div class="feature-row">
      <div class="feature"><div class="feature-rule"></div><h4>AI-readiness scored</h4><p>Weighted 0-100 across the five checks that determine whether AI can find and recommend this page.</p></div>
      <div class="feature"><div class="feature-rule"></div><h4>Live-audited, not modeled</h4><p>${engineNames.length ? engineNames.join(', ') : 'Each engine'} queried directly for every question in this report — real transcripts, stored for reference.</p></div>
      <div class="feature"><div class="feature-rule"></div><h4>Reviewed before follow-up</h4><p>Every automated finding here is checked by an AltiusNxt specialist before anyone calls you.</p></div>
    </div>

    <div class="prepared">
      <div><strong>PREPARED FOR</strong> ${esc(lead?.firstName)} ${esc(lead?.lastName)}, ${esc(company)}${lead?.companyWebsite ? ` · ${esc(lead.companyWebsite)}` : ''}</div>
      <div><strong>PREPARED BY</strong> Govind, Business Unit Head · AltiusNxt Technologies · govind@altiusnxt.com</div>
    </div>
    <p class="tagline">Anyone can fill your fields. We engineer your catalog for AI discovery.</p>
  `)

  // ---------- Page 2 ----------
  const snippet = (text, len = 130) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim()
    return t.length > len ? `${t.slice(0, len - 1)}…` : t
  }

  const tableRows = auditResults.map((r) => {
    const engineCells = r.perEngine
      .map((e) => `<strong>${esc(ENGINE_LABEL[e.engine] || e.engine)}:</strong> ${esc(e.error ? '(unavailable)' : snippet(e.text))}`)
      .join('<br>')
    return `
      <tr>
        <td>${esc(r.question)}</td>
        <td>${engineCells || '—'}</td>
        <td class="${r.mentioned ? 'mentioned' : 'not-mentioned'}">${r.mentioned ? 'Mentioned' : 'Not mentioned'}</td>
      </tr>
    `
  }).join('')

  const quoteBlocks = []
  if (pageReaction?.chatgpt) quoteBlocks.push(`<blockquote>"${esc(pageReaction.chatgpt)}"<footer>— ChatGPT, after reading your page</footer></blockquote>`)
  if (pageReaction?.claude) quoteBlocks.push(`<blockquote>"${esc(pageReaction.claude)}"<footer>— Claude, after reading your page</footer></blockquote>`)

  const page2 = pageShell(company, 'Page 2', `
    <h2><span class="bar"></span>What AI actually said about you</h2>
    <div class="subhead">${(auditResults.length || 6)} QUESTIONS, LIVE-QUERIED · ${esc(auditDateLabel).toUpperCase()}</div>
    <p class="intro">These are the questions we put to ${engineNames.length ? engineNames.join(', ') : 'the configured engines'}, worded the way a real buyer would ask them, for a ${esc(deep?.productCategory || 'product like this')}.</p>

    <table class="qtable">
      <thead><tr><th>WHAT THE BUYER ASKED</th><th>WHAT EACH ENGINE SAID</th><th>${esc(company).toUpperCase()}</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p class="footnote">Live queries, run once at report generation time — engines can answer differently on a different day or a different phrasing.</p>

    ${quoteBlocks.length ? quoteBlocks.join('') : `
    <div class="callout">
      <p>${esc(deep?.recommendationSummary || 'This page currently gives AI assistants very little first-party evidence to work with — no brand, no specs, no structured data for a model to match against a buyer’s question.')}</p>
      <footer>— AltiusNxt analysis, from your live page</footer>
    </div>`}

    <h3>What this means for your counter and your phones</h3>
    <p class="body-text">Every one of these questions is a real purchase — the first product, then the accessories and the next tool after that. When the AI answers with someone else, the buyer orders online and the relationship never starts. Your existing customers still call you today. The ones you haven't met yet are already asking somewhere else.</p>
  `)

  // ---------- Page 3 ----------
  const gapsHtml = (deep?.gaps || []).map((g, i) => `
    <div class="gap-row">
      <div class="gap-num">${i + 1}</div>
      <div><h4>${esc(g.title)}</h4><p>${esc(g.detail)}</p></div>
    </div>
  `).join('')

  const page3 = pageShell(company, 'Page 3', `
    <h2><span class="bar"></span>Gaps on this product page</h2>
    <p class="intro">Our full audit checks fifteen technical points. Here's what came back on this page — none about website design, prices set, or reputation.</p>
    ${gapsHtml}

    <h3>AI readiness score</h3>
    <div class="gauge-track">
      <div class="gauge-fill" style="width:${Math.max(score, 3)}%;background:${scoreColor}"></div>
    </div>
    <div class="gauge-labels"><span>0</span><span>${score}/100</span><span>100</span></div>
    <p class="body-text">A page in the 70s or above is what typically shows up in an AI assistant's answer. Below that, the assistant has too little first-party evidence to cite this page with confidence — regardless of how good the underlying product is.</p>
  `)

  // ---------- Page 4 ----------
  const before = deep?.beforeAfter?.before || {}
  const after = deep?.beforeAfter?.after || {}
  const afterSpecs = (after.sampleSpecs || []).map((s) => `<li>${esc(s)}</li>`).join('')

  const page4 = pageShell(company, 'Page 4', `
    <h2><span class="bar"></span>Your page, before and after</h2>
    <p class="intro">Same product, same website, same price. The right-hand version is what an AltiusNxt product specialist would build from the manufacturer's data and your own team's knowledge.</p>

    <div class="cards">
      <div class="card card-before">
        <div class="card-tag">✕ YOUR PAGE TODAY</div>
        <h4>${esc(before.title || 'Untitled page')}</h4>
        <ul class="card-list">
          <li>Brand: ${esc(before.brand || 'not stated')}</li>
          <li>Price: ${esc(before.price || 'hidden')} &nbsp;·&nbsp; Stock: ${esc(before.stock || 'hidden')}</li>
          <li>Specs shown: ${before.specCount ?? 0}</li>
          <li>Datasheet: ${before.hasDatasheet ? 'yes' : 'none'}</li>
          <li>Structured data: ${before.hasStructuredData ? 'yes' : 'none'}</li>
        </ul>
      </div>
      <div class="card card-after">
        <div class="card-tag" style="color:${GREEN}">✓ AFTER ENRICHMENT</div>
        <h4>${esc(after.title || 'Enriched listing')}</h4>
        <ul class="card-list">
          <li>Brand: ${esc(after.brand || '—')}</li>
          <li>Price: ${esc(after.price || '—')} &nbsp;·&nbsp; Stock: ${esc(after.stock || '—')}</li>
          <li>Specs shown: ${after.specCount ?? 0}${afterSpecs ? `<ul class="sub-list">${afterSpecs}</ul>` : ''}</li>
          <li>Datasheet: ${after.hasDatasheet ? 'yes' : 'none'}</li>
          <li>Structured data: ${after.hasStructuredData ? 'yes' : 'none'}</li>
        </ul>
      </div>
    </div>

    <h3>What changes for your business</h3>
    <ul class="bullets">
      <li>You show up in AI answers — when a buyer asks a specific question, the AI now has a listing that answers it, and it's yours.</li>
      <li>Buyers you've never met find you first — the under-40 buyer who starts with ChatGPT finds you before a national marketplace.</li>
      <li>Existing customers reorder without phoning a rep — price, stock and specs are on the page.</li>
      <li>Your catalog outlives any one salesperson's memory — written down once, in a form people and machines both read.</li>
    </ul>
  `)

  // ---------- Page 5 ----------
  let page5Body
  if (hasRevenue) {
    const TRACK_PX = 170
    const maxVal = Math.max(revenue.totalRiskUSD * 1.15, 1)
    const pxVal = (v) => Math.max((Math.max(v, 0) / maxVal) * TRACK_PX, 3)
    const aPx = pxVal(revenue.newBuyerRiskUSD)
    const bPx = pxVal(revenue.existingAccountRiskUSD)
    const cPx = pxVal(revenue.totalRiskUSD)

    page5Body = `
      <h2><span class="bar"></span>The cost of doing nothing for 12 months</h2>
      <p class="intro">Based on ${revenue.selfReported ? `${possessive(company)} own reported annual revenue range` : `public signals on ${possessive(company)} own website`} (${esc(revenue.revenueDisplay || usd(0))} estimated annual revenue) — conservative assumptions stated for each figure below. Real numbers get refined on the walkthrough call.</p>

      <div class="waterfall">
        <div class="wf-track" style="height:${TRACK_PX}px;">
          <div class="wf-col">
            <div class="wf-value" style="bottom:${aPx + 8}px;">${usd(revenue.newBuyerRiskUSD)}</div>
            <div class="wf-bar" style="bottom:0;height:${aPx}px;background:${ORANGE};"></div>
          </div>
          <div class="wf-col">
            <div class="wf-value" style="bottom:${aPx + bPx + 8}px;">+${usd(revenue.existingAccountRiskUSD)}</div>
            <div class="wf-bar" style="bottom:${aPx}px;height:${bPx}px;background:#f4b183;"></div>
          </div>
          <div class="wf-col">
            <div class="wf-value" style="bottom:${cPx + 8}px;">${usd(revenue.totalRiskUSD)}</div>
            <div class="wf-bar" style="bottom:0;height:${cPx}px;background:${NAVY};"></div>
          </div>
        </div>
        <div class="wf-labels">
          <span>New buyers<br>routed to competitors</span>
          <span>+ Existing accounts<br>lost at turnover</span>
          <span>= Total 12-month<br>exposure</span>
        </div>
      </div>

      <div class="risk-lines">
        <div class="risk-line"><h4>New buyers you never hear from <span>≈ ${usd(revenue.newBuyerRiskUSD)}</span></h4><p>${esc(revenue.newBuyerExplanation || '')}</p></div>
        <div class="risk-line"><h4>Existing accounts that change hands <span>≈ ${usd(revenue.existingAccountRiskUSD)}</span></h4><p>${esc(revenue.existingAccountExplanation || '')}</p></div>
      </div>

      <div class="callout-band">Roughly ${usd(revenue.totalRiskUSD)} a year, on AltiusNxt's estimate — against a catalog program that costs less than one lost account.</div>
      <p class="fineprint" style="margin-top:8px;">Revenue basis: ${esc(revenue.revenueBasis || 'estimated from public signals on the company website')}. Confidence: ${esc(revenue.confidence || 'low')} — this is a modeled estimate, not verified financial data.</p>
    `
  } else {
    page5Body = `
      <h2><span class="bar"></span>The cost of doing nothing</h2>
      <p class="intro">We couldn't confidently read ${possessive(company)} revenue signals from their site, so we're not going to hand you a made-up dollar number — that gets sized properly on the walkthrough call, using your real numbers. Directionally, here's where the exposure comes from.</p>

      <div class="risk-row">
        <div class="risk-card">
          <div class="risk-tag" style="background:${ORANGE}">A</div>
          <h4>New buyers you never hear from</h4>
          <p>Every technician question that starts with an AI assistant and never surfaces you is a buyer who ordered from a competitor before your phone ever rang.</p>
        </div>
        <div class="risk-card">
          <div class="risk-tag" style="background:${STEEL}">B</div>
          <h4>Existing accounts that quietly re-decide</h4>
          <p>Buyers who change roles or vendors re-evaluate suppliers the same way — through an AI-assisted search — even at accounts you already have.</p>
        </div>
        <div class="risk-card">
          <div class="risk-tag" style="background:${NAVY}">C</div>
          <h4>A lead that compounds monthly</h4>
          <p>This gap doesn't close on its own. The distributors already investing in AI-ready content pull further ahead every month you wait.</p>
        </div>
      </div>

      <div class="callout-band">On the call, we'll size this against your actual revenue and account mix — not a generic industry estimate.</div>
    `
  }
  const page5 = pageShell(company, 'Page 5', page5Body)

  // ---------- Page 6 ----------
  const page6 = pageShell(company, 'Page 6', `
    <h2><span class="bar"></span>Recommended next steps</h2>
    <p class="intro">Everything in this report was checked by an AltiusNxt product specialist against your live page. The fix works the same way — no new hires, nothing technical for your team to learn.</p>

    <div class="options">
      <div class="option">
        <div class="option-tag">OPTION A · VIRTUAL</div>
        <h4>20-Minute Technical Walkthrough</h4>
        <p>A focused screen-share with our catalog engineering team to review raw query logs, JSON-LD schema prototypes, and batch remediation paths.</p>
        <p class="option-contact">Contact: govind@altiusnxt.com</p>
      </div>
      <div class="option">
        <div class="option-tag">OPTION B · IN-PERSON</div>
        <h4>Indianapolis B2B Expo Live Diagnostic</h4>
        <p>Visit the AltiusNxt booth at B2B eCommerce World Americas (Nov 2026). Our catalog architects will run live audits across any five SKUs from your catalog.</p>
        <p class="option-contact">Booth registration: altiusnxt.com/events</p>
      </div>
    </div>

    <div class="cta-band">
      <strong>Send us your three best-selling part numbers.</strong>
      <p>We'll show you — live, on screen — what AI assistants say about each one today, and what changes after enrichment. No proposal, no commitment.</p>
      <p class="cta-sign">Govind, Business Unit Head · govind@altiusnxt.com</p>
    </div>

    <p class="tagline">"Anyone can fill your fields. We engineer your catalog for AI discovery."</p>
    <p class="fineprint" style="text-align:center;">Appendix: full query logs and page-snapshot JSON available on request.</p>
    <p class="fineprint" style="margin-top:18px;">${engineNames.length
      ? `The recommendation table and quotes on page 2 are from live queries to ${engineNames.join(', ')} on ${auditDateLabel} — real responses, not modeled. Perplexity is not yet included in this audit. The gap analysis, before/after mockup and revenue estimate elsewhere in this report are AltiusNxt's own assessment of your page, not AI-generated claims.`
      : 'No AI engines were configured for a live audit when this report was generated — recommendation counts default to zero.'}</p>
    <p class="fineprint">Prepared for: ${esc(lead?.firstName)} ${esc(lead?.lastName)}${lead?.jobTitle ? `, ${esc(lead.jobTitle)}` : ''} · ${esc(company)}<br>${esc(lead?.email)}</p>
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
  .brand { font-weight:800; font-size:15px; color:${NAVY}; letter-spacing:.04em; display:flex; align-items:center; gap:8px; }
  .brand-mark { width:14px; height:14px; border-radius:3px; background:${ORANGE}; display:inline-block; }
  .header-right { text-align:right; }
  .confidential { font-size:9px; color:${STEEL}; letter-spacing:.03em; }
  .report-tag { font-size:9px; font-weight:700; color:${ORANGE}; }
  .header-rule { height:3px; background:${ORANGE}; margin:8px 0 16px; border-radius:2px; }
  .page-body { flex:1; }
  .page-footer { display:flex; justify-content:space-between; font-size:7.5px; color:${STEEL_2}; margin-top:14px; border-top:1px solid ${LIGHT}; padding-top:8px; }

  h1 { font-size:26px; font-weight:800; color:${NAVY}; line-height:1.2; margin:14px 0 10px; }
  h1 .accent { color:${ORANGE}; }
  h2 { font-size:19px; font-weight:800; color:${NAVY}; margin:0 0 10px; display:flex; align-items:center; gap:10px; }
  h2 .bar { width:4px; height:18px; background:${ORANGE}; border-radius:2px; display:inline-block; }
  h3 { font-size:14px; font-weight:800; color:${NAVY}; margin:18px 0 8px; }
  h4 { font-size:12.5px; font-weight:800; color:${NAVY}; margin:0 0 4px; }
  p { font-size:10.5px; line-height:1.55; margin:0 0 6px; }
  .intro { font-size:11px; color:${STEEL}; margin-bottom:14px; }
  .body-text { font-size:10.5px; }
  .fineprint { font-size:8px; color:${STEEL_2}; font-style:italic; }
  .subhead { font-size:11px; font-weight:800; color:${NAVY}; letter-spacing:.03em; margin-bottom:8px; }
  .footnote { font-size:8.5px; color:${STEEL_2}; margin:8px 0 16px; }

  .hero-band { background:${NAVY}; color:#fff; border-radius:10px; padding:22px 22px 16px; margin-bottom:16px; }
  .hero-band .eyebrow { font-size:9.5px; letter-spacing:.08em; color:#a9bade; margin-bottom:6px; }
  .hero-band h1 { color:#fff; margin-top:2px; }
  .hero-band .lede { font-size:11px; color:#c3d0e6; max-width:640px; margin-bottom:16px; }
  .hero-band .fineprint { color:#8fa3c8; }

  .stat-row { display:grid; grid-template-columns:1fr 1fr 1.3fr; gap:12px; margin-bottom:8px; }
  .stat-box { border-radius:8px; padding:14px 16px; color:#fff; }
  .stat-box.info { background:${NAVY_2}; border:1px solid rgba(255,255,255,.15); }
  .stat-num { font-size:24px; font-weight:800; }
  .stat-label { font-size:8.5px; font-weight:700; letter-spacing:.04em; margin-top:2px; opacity:.9; }
  .stat-product { font-size:12px; font-weight:700; margin-top:4px; }
  .stat-url { font-size:8.5px; color:#a9bade; margin-top:2px; word-break:break-all; }

  .qr-band { display:flex; gap:18px; align-items:center; background:${CREAM}; border-radius:10px; padding:16px 18px; margin-bottom:16px; }
  .qr-code { width:78px; height:78px; flex:none; border-radius:6px; background:#fff; padding:4px; }
  .qr-heading { font-size:10.5px; font-weight:800; color:${ORANGE_2}; letter-spacing:.02em; margin-bottom:4px; }
  .qr-copy p { font-size:9.5px; color:${STEEL}; margin-bottom:4px; }
  .qr-bold { font-weight:700; color:${NAVY}; }

  .feature-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:20px; }
  .feature-rule { width:22px; height:3px; background:${ORANGE}; border-radius:2px; margin-bottom:8px; }
  .feature p { font-size:9.5px; }

  .prepared { font-size:9px; color:${STEEL}; border-top:1px solid ${LIGHT}; padding-top:10px; margin-top:auto; }
  .prepared strong { color:${NAVY}; }
  .tagline { text-align:center; font-style:italic; font-size:10px; color:${STEEL}; margin-top:10px; }

  .qtable { width:100%; border-collapse:collapse; margin-bottom:4px; }
  .qtable th { background:${NAVY}; color:#fff; font-size:8.5px; text-align:left; padding:8px 10px; }
  .qtable td { font-size:9.5px; padding:8px 10px; border-bottom:1px solid ${LIGHT}; vertical-align:top; }
  .qtable tr:nth-child(even) td { background:${PAPER}; }
  .not-mentioned { color:${RED}; font-weight:700; }
  .mentioned { color:${GREEN}; font-weight:700; }

  .callout { background:${CREAM}; border-left:3px solid ${ORANGE}; border-radius:0 8px 8px 0; padding:14px 16px; margin:14px 0; }
  .callout p { font-size:10.5px; font-style:italic; color:${NAVY}; margin-bottom:6px; }
  .callout footer { font-size:9px; color:${STEEL_2}; }

  blockquote { background:${CREAM}; border-left:3px solid ${ORANGE}; border-radius:0 8px 8px 0; padding:12px 16px; margin:10px 0; }
  blockquote p, blockquote { font-size:10.5px; font-style:italic; color:${NAVY}; }
  blockquote footer { font-size:9px; font-style:normal; color:${STEEL_2}; margin-top:6px; }

  .gap-row { display:flex; gap:12px; margin-bottom:12px; }
  .gap-num { width:22px; height:22px; border-radius:50%; background:${ORANGE}; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex:none; }
  .gap-row p { font-size:9.5px; }

  .gauge-track { height:16px; background:${LIGHT}; border-radius:8px; overflow:hidden; margin-top:6px; }
  .gauge-fill { height:100%; border-radius:8px; }
  .gauge-labels { display:flex; justify-content:space-between; font-size:8.5px; color:${STEEL_2}; margin-top:4px; margin-bottom:12px; }

  .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0; }
  .card { border-radius:8px; padding:14px 16px; }
  .card-before { background:${RED_BG}; }
  .card-after { background:${GREEN_BG}; }
  .card-tag { font-size:9.5px; font-weight:800; color:${RED}; margin-bottom:6px; }
  .card-list { list-style:none; margin:6px 0 0; padding:0; font-size:9.5px; color:${STEEL}; }
  .card-list li { margin-bottom:4px; }
  .sub-list { margin:4px 0 0 14px; padding:0; }
  .sub-list li { font-size:8.5px; }

  .bullets { margin:0; padding-left:16px; }
  .bullets li { font-size:10px; margin-bottom:6px; color:${STEEL}; }

  .risk-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin:14px 0; }
  .risk-card { background:${PAPER}; border-radius:8px; padding:14px; }
  .risk-tag { width:22px; height:22px; border-radius:6px; color:#fff; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-bottom:8px; }
  .risk-card p { font-size:9.5px; }
  .callout-band { background:${NAVY}; color:#fff; border-radius:8px; padding:16px 18px; font-size:11px; text-align:center; font-weight:600; margin-top:10px; }

  .waterfall { margin:18px 0 14px; }
  .wf-track { position:relative; display:flex; align-items:flex-end; gap:0; border-bottom:1px solid ${LIGHT}; padding:0 10%; }
  .wf-col { position:relative; flex:1; height:100%; }
  .wf-bar { position:absolute; left:12%; right:12%; border-radius:3px 3px 0 0; }
  .wf-value { position:absolute; left:0; right:0; text-align:center; font-size:13px; font-weight:800; color:${NAVY}; white-space:nowrap; }
  .wf-labels { display:flex; margin-top:8px; }
  .wf-labels span { flex:1; text-align:center; font-size:8.5px; color:${STEEL_2}; line-height:1.4; }

  .risk-lines { margin-top:16px; }
  .risk-line { border-top:1px solid ${LIGHT}; padding:10px 0; }
  .risk-line h4 { display:flex; justify-content:space-between; font-size:11px; }
  .risk-line h4 span { color:${ORANGE_2}; }
  .risk-line p { font-size:9.5px; margin-top:2px; }

  .options { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0 18px; }
  .option { background:${PAPER}; border-radius:8px; padding:16px; }
  .option-tag { font-size:9px; font-weight:800; color:${ORANGE_2}; letter-spacing:.03em; margin-bottom:6px; }
  .option p { font-size:9.5px; }
  .option-contact { font-weight:700; color:${NAVY}; margin-top:8px; }

  .cta-band { background:${NAVY}; color:#fff; border-radius:8px; padding:18px 20px; margin:10px 0 16px; }
  .cta-band strong { font-size:12px; }
  .cta-band p { font-size:10px; color:#c3d0e6; margin-top:6px; }
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
