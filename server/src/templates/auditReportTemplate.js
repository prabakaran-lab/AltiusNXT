const NAVY = '#0b1f3a'
const NAVY_2 = '#122b52'
const ORANGE = '#ff6a1a'
const ORANGE_2 = '#e85a0c'
const STEEL = '#48566b'
const STEEL_2 = '#8291a6'
const LIGHT = '#dde3ec'
const PAPER = '#f4f6fa'
const GREEN = '#1a8f5e'
const GREEN_BG = '#e9f7ef'
const RED = '#b93b2e'
const RED_BG = '#fdecea'
const AMBER = '#b8720a'
const AMBER_BG = '#fdf0dc'

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

const ENGINE_LABEL = { chatgpt: 'ChatGPT-4o (OpenAI)', claude: 'Claude (Anthropic)', gemini: 'Gemini (Google)' }

function statusBadge(status) {
  const map = {
    PASS: [GREEN_BG, GREEN, 'PASS'],
    FAIL: [AMBER_BG, AMBER, 'FAIL'],
    CRIT_FAIL: [RED_BG, RED, 'CRIT FAIL'],
  }
  const [bg, color, label] = map[status] || map.FAIL
  return `<span class="status-pill" style="background:${bg};color:${color}">${label}</span>`
}

function pageShell(refCode, pageLabel, bodyHtml) {
  return `
    <section class="page">
      <div class="page-header">
        <div class="brand"><span class="brand-mark"></span>ALTIUSNXT</div>
        <div class="header-right">
          <div class="confidential">CONFIDENTIAL &amp; PROPRIETARY</div>
          <div class="ref-line">AUDIT REF: ${esc(refCode)}</div>
        </div>
      </div>
      <div class="header-rule"></div>
      <div class="page-body">${bodyHtml}</div>
      <div class="page-footer">
        <span>AltiusNxt Technologies Pvt Ltd · AI Discoverability Audit Report · ${esc(refCode)}</span>
        <span>${esc(pageLabel)}</span>
      </div>
    </section>
  `
}

export function buildAuditReportHtml({ lead, url, quickScan, deep, scores, engineData, jsonLd, narrative, refCode, auditDate }) {
  const company = lead?.company || 'Prospect'
  const productName = quickScan?.productName || deep?.productCategory || 'the page tested'
  const brandName = deep?.beforeAfter?.after?.brand || deep?.beforeAfter?.before?.brand || 'Not stated on page'
  const before = deep?.beforeAfter?.before || {}
  const after = deep?.beforeAfter?.after || {}
  const overallColor = scores.overall < 40 ? RED : scores.overall < 70 ? AMBER : GREEN

  const scoreBox = (label, value, weight, note) => `
    <div class="pillar-box">
      <div class="pillar-value">${value}<span>/100</span></div>
      <div class="pillar-label">${esc(label)}</div>
      <div class="pillar-weight">Weight: ${weight}</div>
      <div class="pillar-note">${esc(note)}</div>
    </div>
  `

  // ---------- Page 1 ----------
  const page1 = pageShell(refCode, 'Page 1', `
    <div class="meta-grid">
      <div><span>TARGET PRODUCT</span><strong>${esc(productName)}</strong></div>
      <div><span>MANUFACTURER / BRAND</span><strong>${esc(brandName)}</strong></div>
      <div><span>DISTRIBUTOR / CLIENT</span><strong>${esc(company)}</strong></div>
      <div><span>AUDITED URL</span><strong class="mono">${esc(url)}</strong></div>
      <div><span>AUDIT DATE</span><strong>${esc(auditDate)}</strong></div>
      <div><span>LLMs BENCHMARKED</span><strong>${engineData.engines.map((e) => ENGINE_LABEL[e] || e).join(' · ') || 'None configured'}</strong></div>
    </div>

    <h1>AI Discoverability Audit Report</h1>
    <p class="lede">Comprehensive diagnostic: can AI find, understand, and recommend this product in autonomous B2B workflows?</p>

    <div class="score-row">
      <div class="overall-box" style="background:${overallColor}">
        <div class="overall-value">${scores.overall}<span>/100</span></div>
        <div class="overall-label">OVERALL INDEX</div>
        <div class="overall-sub">${scores.overall < 40 ? 'TOTAL DATA VOID — COMMERCIALLY INVISIBLE' : scores.overall < 70 ? 'PARTIALLY DISCOVERABLE' : 'AI-READY'}</div>
      </div>
      ${scoreBox('CAN AI FIND YOU?', scores.find, '30%', 'Crawlability, structured data and brand identity.')}
      ${scoreBox('CAN AI UNDERSTAND?', scores.understand, '30%', 'Specification depth and application context.')}
      ${scoreBox('WILL AI RECOMMEND?', scores.recommend, '40%', `Live outcome: ${scores.mentionedCount} of ${scores.totalQuestions} engine queries.`)}
    </div>

    <h3>Executive finding</h3>
    <p class="body-text">${esc(narrative.executiveFinding)}</p>
  `)

  // ---------- Page 2: LOG Query blocks ----------
  const logBlocks = engineData.engines.map((engine) => {
    const summary = engineData.summaries[engine]
    return `
      <div class="log-block">
        <div class="log-title">LOG — ${esc(ENGINE_LABEL[engine] || engine)} <span class="log-score">${summary.appearedCount} / ${summary.totalQuestions} LIVE RECOMMENDATION SCORE</span></div>
        <p class="log-context"><strong>Execution context:</strong> ${summary.totalQuestions} live buyer-intent questions queried directly against this engine's API on ${esc(auditDate)}.</p>
        ${summary.quote ? `<blockquote class="log-quote">"${esc(summary.quote)}"</blockquote>` : '<p class="log-context">No direct page-reaction transcript captured for this engine.</p>'}
        <div class="log-stats">
          <div><span>Appeared in output</span><strong>${summary.appearedCount} / ${summary.totalQuestions}</strong></div>
          <div><span>Dominant peers surfaced</span><strong>${summary.peers.length ? esc(summary.peers.join(', ')) : 'None detected'}</strong></div>
        </div>
      </div>
    `
  }).join('')

  const page2 = pageShell(refCode, 'Page 2', `
    <h2><span class="bar"></span>What the engines returned: multi-engine query logs</h2>
    <p class="intro">${engineData.totalQuestions} standardized buyer-intent questions were executed live and directly against each configured engine's API.</p>
    ${logBlocks || '<p class="body-text">No live engines were configured for this audit.</p>'}
  `)

  // ---------- Page 3: 15-point scorecard ----------
  const pillarRows = (pillar) => (narrative.scorecard || [])
    .filter((r) => r.pillar === pillar)
    .map((r) => `
      <tr>
        <td class="mono">${esc(r.ref)}</td>
        <td>${esc(r.metric)}</td>
        <td>${esc(r.finding)}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>
    `).join('')

  const page3 = pageShell(refCode, 'Page 3', `
    <h2><span class="bar"></span>The 15-point AEO diagnostic scorecard</h2>

    <div class="pillar-heading">PILLAR 1 · CAN AI FIND YOU? (SCORE: ${scores.find}/100 · WEIGHT 30%)</div>
    <table class="score-table">
      <thead><tr><th>REF</th><th>METRIC</th><th>FINDING</th><th>STATUS</th></tr></thead>
      <tbody>${pillarRows('find')}</tbody>
    </table>

    <div class="pillar-heading">PILLAR 2 · CAN AI UNDERSTAND YOU? (SCORE: ${scores.understand}/100 · WEIGHT 30%)</div>
    <table class="score-table">
      <thead><tr><th>REF</th><th>METRIC</th><th>FINDING</th><th>STATUS</th></tr></thead>
      <tbody>${pillarRows('understand')}</tbody>
    </table>

    <div class="pillar-heading">PILLAR 3 · WILL AI RECOMMEND YOU? (SCORE: ${scores.recommend}/100 · WEIGHT 40%)</div>
    <table class="score-table">
      <thead><tr><th>REF</th><th>METRIC</th><th>FINDING</th><th>STATUS</th></tr></thead>
      <tbody>${pillarRows('recommend')}</tbody>
    </table>
  `)

  // ---------- Page 4: before/after + remediated copy ----------
  const afterSpecs = (after.sampleSpecs || []).map((s) => `<li>${esc(s)}</li>`).join('')
  const page4 = pageShell(refCode, 'Page 4', `
    <h2><span class="bar"></span>Visual comparison: before and after enrichment</h2>
    <div class="cards">
      <div class="card card-before">
        <div class="card-tag">✕ BEFORE ENRICHMENT</div>
        <h4>${esc(before.title || productName)}</h4>
        <ul class="card-list">
          <li>Brand: ${esc(before.brand || 'not stated')}</li>
          <li>Price: ${esc(before.price || 'hidden')} &nbsp;·&nbsp; Stock: ${esc(before.stock || 'hidden')}</li>
          <li>Specs shown: ${before.specCount ?? 0}</li>
          <li>Structured data: ${before.hasStructuredData ? 'yes' : 'none'}</li>
        </ul>
      </div>
      <div class="card card-after">
        <div class="card-tag" style="color:${GREEN}">✓ AFTER ENRICHMENT</div>
        <h4>${esc(after.title || productName)}</h4>
        <ul class="card-list">
          <li>Brand: ${esc(after.brand || brandName)}</li>
          <li>Price: ${esc(after.price || '—')} &nbsp;·&nbsp; Stock: ${esc(after.stock || '—')}</li>
          <li>Specs shown: ${after.specCount ?? (after.sampleSpecs || []).length}${afterSpecs ? `<ul class="sub-list">${afterSpecs}</ul>` : ''}</li>
          <li>Structured data: yes</li>
        </ul>
      </div>
    </div>

    <h3>What good looks like: remediated copy asset</h3>
    <p class="body-text remediated-copy">${esc(narrative.remediatedCopy)}</p>
  `)

  // ---------- Page 5: JSON-LD ----------
  const page5 = pageShell(refCode, 'Page 5', `
    <h2><span class="bar"></span>Machine-actionable schema graph (JSON-LD)</h2>
    <p class="intro">Generated directly from the enriched attribute set above — not AI-authored text, so it's guaranteed to validate against schema.org.</p>
    <pre class="code-block">${esc(JSON.stringify(jsonLd, null, 2))}</pre>
  `)

  // ---------- Page 6: remediation roadmap ----------
  const priorities = (narrative.remediationPriorities || []).map((p, i) => `
    <div class="priority-block">
      <div class="priority-title">PRIORITY ${i + 1}: ${esc(p.title)}</div>
      <div class="priority-tags">Commercial Impact: <strong>${esc(p.impact)}</strong> &nbsp;·&nbsp; Effort: <strong>${esc(p.effort)}</strong> &nbsp;·&nbsp; Owner: <strong>${esc(p.owner)}</strong></div>
      <p class="body-text"><strong>Deficiency:</strong> ${esc(p.deficiency)}</p>
      <p class="body-text"><strong>Remediation:</strong> ${esc(p.remediation)}</p>
    </div>
  `).join('')

  const page6 = pageShell(refCode, 'Page 6', `
    <h2><span class="bar"></span>Strategic remediation roadmap</h2>
    ${priorities}
  `)

  // ---------- Page 7: 7-layer framework + sign-off ----------
  const LAYERS = [
    ['LAYER 1', 'Raw Spec Ingestion', 'Ingest unstructured ERP data, manufacturer spec sheets and supplier catalogs.'],
    ['LAYER 2', 'Attribute Normalization', 'Standardize units, ranges and safety/compliance categories.'],
    ['LAYER 3', 'Engineering QC', 'Human-in-the-loop expert validation of every technical value.'],
    ['LAYER 4', 'Cross-Ref & Accessories', 'Map compatible accessories and sibling products.'],
    ['LAYER 5', 'Semantic Schema Graph', 'Deploy nested JSON-LD product data matching schema.org.'],
    ['LAYER 6', 'Regional Intent Anchors', 'Embed branch, delivery and account-term context.'],
    ['LAYER 7', 'Continuous AEO Validation', 'Re-run live engine queries on a schedule to track recommendation share over time.'],
  ]
  const layerRows = LAYERS.map(([n, t, d]) => `<tr><td class="mono">${n}</td><td><strong>${t}</strong></td><td>${d}</td></tr>`).join('')

  const page7 = pageShell(refCode, 'Page 7', `
    <h2><span class="bar"></span>The AltiusNxt 7-layer AEO framework</h2>
    <table class="score-table">
      <tbody>${layerRows}</tbody>
    </table>

    <h3>Methodology</h3>
    <p class="body-text">Product specifications, page DOM signals and commercial availability indicators were evaluated directly from the live catalog endpoint (${esc(url)}). Live retrieval tests were executed against each configured engine's own API. Scores reflect AltiusNxt's own weighted scoring model, computed deterministically from the measured signals above — not estimated by an AI model.</p>

    <div class="signoff-band">
      <div>
        <div class="signoff-name">Automated audit generation</div>
        <div class="signoff-role">AltiusNxt AI Readiness Engine</div>
        <p class="fineprint">This report was generated automatically from live data at the time of request. It is queued for review by your AltiusNxt contact before any strategic recommendation is finalized.</p>
      </div>
      <div>
        <div class="signoff-name">Govind</div>
        <div class="signoff-role">Business Unit Head, AltiusNxt Technologies Pvt Ltd</div>
        <p class="fineprint">Practice domain: Enterprise Catalog Transformation &amp; Architecture · govind@altiusnxt.com</p>
      </div>
    </div>
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
  .confidential { font-size:9px; font-weight:700; color:${STEEL}; letter-spacing:.03em; }
  .ref-line { font-size:8px; color:${STEEL_2}; font-family: 'Courier New', monospace; }
  .header-rule { height:3px; background:${ORANGE}; margin:8px 0 16px; border-radius:2px; }
  .page-body { flex:1; }
  .page-footer { display:flex; justify-content:space-between; font-size:7.5px; color:${STEEL_2}; margin-top:14px; border-top:1px solid ${LIGHT}; padding-top:8px; }

  h1 { font-size:24px; font-weight:800; color:${NAVY}; margin:18px 0 6px; }
  h2 { font-size:18px; font-weight:800; color:${NAVY}; margin:0 0 10px; display:flex; align-items:center; gap:10px; }
  h2 .bar { width:4px; height:16px; background:${ORANGE}; border-radius:2px; display:inline-block; }
  h3 { font-size:14px; font-weight:800; color:${NAVY}; margin:18px 0 8px; }
  h4 { font-size:12.5px; font-weight:800; color:${NAVY}; margin:0 0 4px; }
  p { font-size:10.5px; line-height:1.55; margin:0 0 6px; }
  .lede { font-size:11px; color:${STEEL}; margin-bottom:16px; }
  .intro { font-size:11px; color:${STEEL}; margin-bottom:14px; }
  .body-text { font-size:10.5px; }
  .fineprint { font-size:8px; color:${STEEL_2}; font-style:italic; margin-bottom:4px; }
  .mono { font-family:'Courier New', monospace; font-size:9px; word-break:break-all; }

  .meta-grid {
    display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; background:${PAPER}; border:1px solid ${LIGHT};
    border-radius:8px; padding:14px 18px; margin-bottom:18px; font-size:9.5px;
  }
  .meta-grid span { display:block; color:${STEEL_2}; font-size:8px; letter-spacing:.03em; margin-bottom:2px; }
  .meta-grid strong { color:${NAVY}; font-weight:700; }

  .score-row { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin:14px 0 20px; }
  .overall-box, .pillar-box { border-radius:8px; padding:14px; }
  .overall-box { color:#fff; }
  .overall-value { font-size:26px; font-weight:800; }
  .overall-value span { font-size:13px; opacity:.85; }
  .overall-label { font-size:8.5px; font-weight:700; letter-spacing:.03em; margin-top:2px; }
  .overall-sub { font-size:7.5px; margin-top:6px; opacity:.9; }
  .pillar-box { background:${PAPER}; border:1px solid ${LIGHT}; }
  .pillar-value { font-size:22px; font-weight:800; color:${NAVY}; }
  .pillar-value span { font-size:11px; color:${STEEL_2}; }
  .pillar-label { font-size:8px; font-weight:700; color:${NAVY}; letter-spacing:.02em; margin-top:2px; }
  .pillar-weight { font-size:7.5px; color:${STEEL_2}; margin-top:4px; }
  .pillar-note { font-size:8px; color:${STEEL}; margin-top:6px; line-height:1.4; }

  .log-block { background:${PAPER}; border:1px solid ${LIGHT}; border-radius:8px; padding:16px 18px; margin-bottom:16px; }
  .log-title { font-size:12px; font-weight:800; color:${NAVY}; display:flex; justify-content:space-between; margin-bottom:8px; }
  .log-score { font-size:9px; font-weight:700; color:${ORANGE_2}; }
  .log-context { font-size:9.5px; margin-bottom:8px; }
  .log-quote { background:#fff; border-left:3px solid ${ORANGE}; border-radius:0 6px 6px 0; padding:10px 14px; font-size:10px; font-style:italic; color:${NAVY}; margin:8px 0; }
  .log-stats { display:flex; gap:24px; margin-top:8px; }
  .log-stats span { display:block; font-size:8px; color:${STEEL_2}; }
  .log-stats strong { font-size:10.5px; color:${NAVY}; }

  .pillar-heading { font-size:10.5px; font-weight:800; color:#fff; background:${NAVY}; padding:8px 12px; border-radius:6px 6px 0 0; margin-top:18px; }
  .score-table { width:100%; border-collapse:collapse; margin-bottom:4px; }
  .score-table th { background:${NAVY_2}; color:#fff; font-size:8px; text-align:left; padding:7px 8px; }
  .score-table td { font-size:9px; padding:7px 8px; border-bottom:1px solid ${LIGHT}; vertical-align:top; }
  .score-table tr:nth-child(even) td { background:${PAPER}; }
  .status-pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:7.5px; font-weight:800; white-space:nowrap; }

  .cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:14px 0; }
  .card { border-radius:8px; padding:14px 16px; }
  .card-before { background:${RED_BG}; }
  .card-after { background:${GREEN_BG}; }
  .card-tag { font-size:9.5px; font-weight:800; color:${RED}; margin-bottom:6px; }
  .card-list { list-style:none; margin:6px 0 0; padding:0; font-size:9.5px; color:${STEEL}; }
  .card-list li { margin-bottom:4px; }
  .sub-list { margin:4px 0 0 14px; padding:0; }
  .sub-list li { font-size:8.5px; }
  .remediated-copy { background:${PAPER}; border-radius:8px; padding:14px 16px; font-style:italic; }

  .code-block {
    background:${NAVY}; color:#c3d0e6; font-family:'Courier New', monospace; font-size:8px; line-height:1.6;
    padding:16px; border-radius:8px; white-space:pre-wrap; word-break:break-word;
  }

  .priority-block { background:${PAPER}; border:1px solid ${LIGHT}; border-radius:8px; padding:14px 16px; margin-bottom:14px; }
  .priority-title { font-size:11px; font-weight:800; color:${NAVY}; margin-bottom:4px; }
  .priority-tags { font-size:8.5px; color:${STEEL_2}; margin-bottom:8px; }

  .signoff-band { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px; border-top:2px solid ${NAVY}; padding-top:14px; }
  .signoff-name { font-size:12px; font-weight:800; color:${NAVY}; }
  .signoff-role { font-size:9px; color:${ORANGE_2}; font-weight:700; margin-bottom:6px; }
</style>
</head>
<body>
  ${page1}
  ${page2}
  ${page3}
  ${page4}
  ${page5}
  ${page6}
  ${page7}
</body>
</html>`
}
