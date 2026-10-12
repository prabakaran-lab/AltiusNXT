import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import bpImg from '../assets/home/angle-grinder.webp'
import './AIReadiness.css'
import Icon from './ui/Icon.jsx'

/* ------------------------------------------------------------------
   AI Readiness: one live report workspace for a single sample product
   (Corded Angle Grinder). Eight phases build the report in view.

   DATA HONESTY: only facts visible in the supplied product photo are used as
   product facts (corded angle grinder with side handle, wheel guard, grinding
   disc and slide switch). No model number, brand, power rating, speed, disc
   size, price or certification is stated. Every assessment result below is
   EXAMPLE data and the UI says so. Unknown product fields are placeholders.
   ------------------------------------------------------------------ */

const REPORT_URL = '/ai-readiness-report'
const SAMPLE_REPORT_URL = '' // set when a public sample report exists; the secondary CTA falls back to an anchor while empty
const PRODUCT = 'Corded Angle Grinder'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}
const Tick = ({ size, s }) => <Icon name="check" size={size ?? s ?? 10} strokeWidth={3.4} />

/* ---------------- phases ---------------- */
const PHASES = [
  { id: 'score', rail: 'Score', title: 'Against the market', ms: 3800 },
  { id: 'crawlers', rail: 'Crawler access', title: 'Crawler / user-agent access', ms: 7000 },
  { id: 'questions', rail: 'Buying questions', title: 'Six buying questions', ms: 8600 },
  { id: 'competitors', rail: 'Competitor listings', title: 'Verified competitor listings', ms: 5200 },
  { id: 'causes', rail: 'Root causes', title: 'Why AI may not cite this page', ms: 6200 },
  { id: 'scorecard', rail: '15-point scorecard', title: '15-point AI Readiness diagnostic', ms: 6800 },
  { id: 'beforeafter', rail: 'Before / After', title: 'Current vs enriched product page', ms: 10200 },
  { id: 'fixes', rail: 'Prioritized fixes', title: 'Prioritized fixes', ms: 0 },
]
const LAST = PHASES.length - 1
const PROGRESS = [['Crawler test', [1]], ['Buyer queries', [2]], ['Market comparison', [3]], ['Diagnostics', [4, 5]], ['Recommendations', [6, 7]]]
const METERS = [['Findability', 'Can AI find you?', 'Good', 3, 'g'], ['Comprehension', 'Can AI understand you?', 'Partial', 6, 'm'], ['Recommendation', 'Will AI recommend you?', 'Needs work', 7, 'w']]

const BOTS = [
  ['Standard browser', 'ok'], ['Googlebot', 'ok'], ['Google-Extended', 'review'], ['Bingbot', 'ok'], ['Claude-User', 'ok'],
  ['GPTBot', 'blocked'], ['OAI-SearchBot', 'ok'], ['ChatGPT-User', 'ok'], ['ClaudeBot', 'review'], ['PerplexityBot', 'ok'],
]
const BOT_TXT = { ok: 'Accessible', blocked: 'Blocked', review: 'Needs review' }

const ENGINES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity']
const QS = [
  ['What are the specifications of this angle grinder?', ['partial', 'found', 'partial', 'other']],
  ['Where can I buy this model?', ['none', 'other', 'none', 'other']],
  ['What disc size does it support?', ['partial', 'none', 'none', 'partial']],
  ['What features does this grinder include?', ['found', 'found', 'partial', 'found']],
  ['Is the model information clearly available?', ['none', 'partial', 'none', 'none']],
  ['What comparable angle grinders are available?', ['other', 'other', 'other', 'other']],
]
const Q_TXT = { found: 'Found', partial: 'Partial', none: 'Not cited', other: 'Other source' }

const LISTINGS = [
  { you: true, p: PRODUCT, src: 'Your product page', price: 'Price not visible', av: 'Not stated', ai: 'Partial', k: 'partial' },
  { p: 'Comparable corded grinder', src: 'Retailer listing', price: 'Price visible', av: 'In stock', ai: 'Cited', k: 'cited' },
  { p: 'Angle grinder with side handle', src: 'Marketplace listing', price: 'Price visible', av: 'In stock', ai: 'Cited', k: 'cited' },
  { p: 'Corded grinder with guard', src: 'Brand site', price: 'Price visible', av: 'Not stated', ai: 'Not cited', k: 'none' },
]

const CAUSES = [
  ['Product title', 'Title and identifiers are not consistent across the page'],
  ['Model / part number', 'No clear model or part number for AI to match'],
  ['Specifications', 'Limited technical detail to verify or compare'],
  ['Structured data', 'Product markup is incomplete or inconsistent'],
  ['Buying-question coverage', 'Common purchase questions are not answered on the page'],
]

const SCORECARD = [
  ['Findability', [['Crawler access', 'v'], ['Page indexable', 'v'], ['Product identity', 'r'], ['Model / part number', 'g'], ['Title consistency', 'r']]],
  ['Comprehension', [['Specification depth', 'g'], ['Attribute completeness', 'g'], ['Structured data', 'g'], ['Metadata', 'r'], ['Category context', 'v']]],
  ['Recommendation', [['Buying-question coverage', 'g'], ['Price / availability signal', 'r'], ['Source verification', 'g'], ['Comparison signals', 'g'], ['Supporting content', 'r']]],
]
const SC_TXT = { v: 'Verified', g: 'Gap', r: 'Needs review' }

const AFTER_ROWS = [
  ['Product name', PRODUCT, 'known'],
  ['Product type', 'Corded angle grinder', 'known'],
  ['Handle', 'Side handle', 'known'],
  ['Guard / disc', 'Wheel guard with grinding disc', 'known'],
  ['Switch', 'Slide switch on the body', 'known'],
  ['Brand', 'Add from supplier data', 'todo'],
  ['Model / series', 'Add from supplier data', 'todo'],
  ['Power rating', 'Add from supplier data', 'todo'],
  ['Disc diameter', 'Add from supplier data', 'todo'],
  ['No-load speed', 'Add from supplier data', 'todo'],
]
const BEFORE_FLAGS = ['Incomplete product title', 'Model / part number not stated', 'Limited specification detail', 'Unstructured description', 'Metadata / structured-data issue']
const STEPS4 = ['Verify', 'Structure', 'Enrich', 'Validate']

const FIXES = [
  ['01', 'Product identity', 'Standardize title and product identifiers', 'High impact', 'hi'],
  ['02', 'Specifications', 'Publish structured technical fields', 'High impact', 'hi'],
  ['03', 'Structured data', 'Correct machine-readable product information', 'High impact', 'hi'],
  ['04', 'Buyer questions', 'Add missing purchase-intent information', 'Medium impact', 'md'],
  ['05', 'Re-test', 'Repeat the AI discovery assessment', 'Verification', 'vf'],
]

/* ---------------- phase bodies ---------------- */
function PhaseScore() {
  return (
    <div className="lr-score">
      <figure><img src={bpImg} alt={`${PRODUCT} used as the sample product`} width="1000" height="614" /><figcaption>Example product page</figcaption></figure>
      <ul>
        {METERS.map(([n, q], i) => (
          <li key={n} style={{ '--i': i }}>
            <span><b>{n.toUpperCase()}</b><small>{q}</small></span>
            <em>Assessing…</em>
            <i aria-hidden="true" />
          </li>
        ))}
      </ul>
    </div>
  )
}
function PhaseCrawlers() {
  return (
    <div className="lr-tbl crawl" role="table" aria-label="Crawler access test (example)">
      <div className="hd" role="row"><span>User agent</span><span>Access</span><span>Result</span></div>
      {BOTS.map(([n, k], i) => (
        <div key={n} className="rw" role="row" style={{ '--d': `${0.2 + i * 0.5}s` }}>
          <b>{n}</b>
          <span className="acc"><i className="req">Request sent…</i><i className="res">Response received</i></span>
          <span className="out"><em className={`pill ${k}`}>{BOT_TXT[k]}</em></span>
        </div>
      ))}
      <p className="ins" style={{ '--d': '5.4s' }}>Crawler access does not automatically mean AI can understand the product.</p>
    </div>
  )
}
function PhaseQuestions() {
  return (
    <div className="lr-q">
      <figure><img src={bpImg} alt="" width="1000" height="614" loading="lazy" /></figure>
      <div className="lr-tbl q" role="table" aria-label="Buying questions across AI engines (example)">
        <div className="hd" role="row"><span>Buyer question</span>{ENGINES.map((e) => <span key={e}>{e}</span>)}</div>
        {QS.map(([q, r], i) => (
          <div key={q} className="rw" role="row" style={{ '--d': `${0.3 + i * 1.1}s` }}>
            <b>{q}</b>
            {r.map((k, j) => (
              <span key={j} className="cell" data-l={ENGINES[j]}><i className="req" /><em className={`pill ${k}`}>{Q_TXT[k]}</em></span>
            ))}
            <u aria-hidden="true" />
          </div>
        ))}
        <p className="ins" style={{ '--d': '7.2s' }}><Tick /> 6 buying questions tested</p>
      </div>
    </div>
  )
}
function PhaseCompetitors() {
  return (
    <div className="lr-tbl comp" role="table" aria-label="Competing listings (example)">
      <div className="hd" role="row"><span>Product</span><span>Seller / source</span><span>Price</span><span>Availability</span><span>AI visibility</span></div>
      {LISTINGS.map((l, i) => (
        <div key={l.p} className={`rw${l.you ? ' you' : ''}`} role="row" style={{ '--d': `${0.2 + i * 0.6}s` }}>
          <b data-l="Product">{l.you && <small>Your listing</small>}{l.p}</b>
          <span data-l="Source">{l.src}</span>
          <span data-l="Price">{l.price}</span>
          <span data-l="Availability">{l.av}</span>
          <span data-l="AI visibility"><em className={`pill ${l.k}`}>{l.ai}</em></span>
        </div>
      ))}
      <p className="ins" style={{ '--d': '3s' }}>Competitive price or availability alone does not guarantee AI visibility. Example data; prices appear only when supplied in a real audit.</p>
    </div>
  )
}
function PhaseCauses() {
  return (
    <div className="lr-causes">
      <div className="pg" aria-hidden="true">
        <div className="bar"><i /><i /><i /></div>
        <div className="top"><img src={bpImg} alt="" width="1000" height="614" loading="lazy" /><div>
          <b className="hs" style={{ '--i': 0 }}>{PRODUCT}</b>
          <span className="hs" style={{ '--i': 1 }}>Model / part no.: —</span>
        </div></div>
        <div className="hs blk" style={{ '--i': 2 }}><u /><u className="s" /></div>
        <div className="hs tag" style={{ '--i': 3 }}>Product schema</div>
        <div className="hs blk" style={{ '--i': 4 }}><u className="s" /><u /></div>
      </div>
      <ol>
        {CAUSES.map(([t, d], i) => <li key={t} style={{ '--i': i }}><span>{i + 1}</span><div><b>{t}</b><small>{d}</small></div></li>)}
      </ol>
    </div>
  )
}
function PhaseScorecard() {
  return (
    <div className="lr-sc">
      <div className="grid">
        <i className="sweep" aria-hidden="true" />
        {SCORECARD.map(([g, rows], c) => (
          <div key={g} className="col">
            <h5>{g}</h5>
            <ul>{rows.map(([n, k], r) => <li key={n} className={k} style={{ '--d': `${c * 1.9 + r * 0.25 + 0.3}s` }}><i>{k === 'v' ? <Tick s={8} /> : k === 'g' ? '!' : '?'}</i><span>{n}</span><em>{SC_TXT[k]}</em></li>)}</ul>
            <p className="sum" style={{ '--d': `${c * 1.9 + 1.7}s` }}>{rows.filter((x) => x[1] === 'v').length} verified · {rows.filter((x) => x[1] === 'g').length} gaps · {rows.filter((x) => x[1] === 'r').length} to review</p>
          </div>
        ))}
      </div>
    </div>
  )
}
function PhaseBeforeAfter() {
  return (
    <div className="lr-ba">
      <div className="pg before">
        <h5>Before · current product page</h5>
        <div className="top"><img src={bpImg} alt="" width="1000" height="614" loading="lazy" /><b>{PRODUCT}</b></div>
        <div className="sk"><u /><u className="s" /><u /></div>
        <ul>{BEFORE_FLAGS.map((f, i) => <li key={f} style={{ '--d': `${0.5 + i * 0.45}s` }}>{f}</li>)}</ul>
      </div>
      <ol className="mid" aria-label="Improvement steps">
        <i className="line" aria-hidden="true" />
        {STEPS4.map((s, i) => <li key={s} style={{ '--d': `${3 + i * 1.3}s` }}><span><Tick s={9} /></span>{s}</li>)}
      </ol>
      <div className="pg after">
        <h5>After · enriched product page</h5>
        <div className="top"><img src={bpImg} alt="" width="1000" height="614" loading="lazy" /><b>{PRODUCT}</b></div>
        <dl>{AFTER_ROWS.map(([k, v, t], i) => <div key={k} className={t} style={{ '--d': `${3.4 + i * 0.35}s` }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <p className="sd" style={{ '--d': '7.2s' }}><Tick s={9} /> Product schema validated</p>
      </div>
      <p className="fin" style={{ '--d': '8.4s' }}><span>More complete</span><span>More consistent</span><span>More verifiable</span></p>
    </div>
  )
}
function PhaseFixes() {
  return (
    <div className="lr-tbl fix" role="table" aria-label="Prioritized fixes (example)">
      <div className="hd" role="row"><span>Priority</span><span>Issue</span><span>Recommended change</span><span>Impact</span></div>
      {FIXES.map(([n, issue, change, imp, k], i) => (
        <div key={n} className="rw" role="row" style={{ '--d': `${0.2 + i * 0.4}s` }}>
          <span data-l="Priority" className="n">{n}</span><b data-l="Issue">{issue}</b><span data-l="Change">{change}</span><span data-l="Impact"><em className={`pill imp-${k}`}>{imp}</em></span>
        </div>
      ))}
    </div>
  )
}
const BODIES = { score: PhaseScore, crawlers: PhaseCrawlers, questions: PhaseQuestions, competitors: PhaseCompetitors, causes: PhaseCauses, scorecard: PhaseScorecard, beforeafter: PhaseBeforeAfter, fixes: PhaseFixes }

/* ---------------- workspace ---------------- */
function Workspace() {
  const mobile = useIsMobile()
  const reduced = reducedMotion()
  const [p, setP] = useState(reduced ? LAST : 0)
  const [inView, setInView] = useState(false)
  const [hover, setHover] = useState(false)
  const [held, setHeld] = useState(false)
  const [run, setRun] = useState(0)
  const [open, setOpen] = useState(0) // mobile accordion
  const ref = useRef(null)
  const heldT = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) { const f = requestAnimationFrame(() => setInView(true)); return () => cancelAnimationFrame(f) }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (mobile || reduced || !inView || hover || held || p >= LAST) return undefined
    const t = setTimeout(() => setP((x) => Math.min(x + 1, LAST)), PHASES[p].ms)
    return () => clearTimeout(t)
  }, [p, inView, hover, held, mobile, reduced])
  useEffect(() => () => clearTimeout(heldT.current), [])

  const pick = useCallback((i) => {
    setP(i); setRun((r) => r + 1); setHeld(true)
    clearTimeout(heldT.current)
    heldT.current = setTimeout(() => setHeld(false), 12000)
  }, [])
  const replay = () => { setHeld(false); setP(0); setRun((r) => r + 1) }

  const done = mobile || p >= LAST
  const Body = BODIES[PHASES[p].id]

  const header = (
    <div className="lr-head">
      <img src={bpImg} alt={`${PRODUCT} sample product`} width="1000" height="614" />
      <div className="t">
        <p>AI Readiness Report</p>
        <strong>{PRODUCT}</strong>
        <em className={done ? 'ok' : ''}>{done ? 'Assessment complete · Report ready' : 'Assessment in progress'}</em>
      </div>
    </div>
  )
  const progress = (
    <ul className="lr-prog" aria-label="Report progress">
      {PROGRESS.map(([n, idx]) => {
        const complete = done || p > Math.max(...idx)
        const active = !complete && idx.includes(p)
        return <li key={n} className={complete ? 'done' : active ? 'on' : ''}><i>{complete ? <Tick s={8} /> : null}</i>{n}</li>
      })}
    </ul>
  )
  const meters = (
    <ul className="lr-meters" aria-label="Pillar status (example)">
      {METERS.map(([n, , v, at, k]) => {
        const res = mobile || p >= at
        return <li key={n} className={res ? k : ''}><b>{n}</b><em>{res ? v : 'Assessing…'}</em></li>
      })}
    </ul>
  )

  if (mobile) {
    return (
      <div ref={ref} className="lr-ws mobile">
        <div className="lr-side">{header}{progress}{meters}<p className="lr-ex">Example assessment · illustrative results</p></div>
        <div className="lr-acc">
          {PHASES.map((ph, i) => {
            const B = BODIES[ph.id]
            const isOpen = open === i
            return (
              <div key={ph.id} className={`it${isOpen ? ' open' : ''}`}>
                <h4><button type="button" aria-expanded={isOpen} aria-controls={`lr-acc-${ph.id}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                  <span>{i + 1}</span>{ph.title}<Icon name="chevron-down" size={16} />
                </button></h4>
                {isOpen && <div id={`lr-acc-${ph.id}`} className="bd"><B /></div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="lr-ws" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
      <aside className="lr-side">
        {header}
        {progress}
        {meters}
        <ol className="lr-phases" aria-label="Report phases">
          {PHASES.map((ph, i) => (
            <li key={ph.id}>
              <button type="button" className={`${i === p ? 'on' : ''}${i < p ? ' done' : ''}`} aria-current={i === p ? 'step' : undefined} onClick={() => pick(i)}>
                <span>{i < p ? <Tick s={9} /> : i + 1}</span>{ph.rail}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="lr-replay" onClick={replay}>↻ Replay assessment</button>
      </aside>
      <div className="lr-stage">
        <header className="lr-st-h"><span>Phase {p + 1} of {PHASES.length}</span><h3>{PHASES[p].title}</h3><em>Example assessment · illustrative results</em></header>
        <div key={`${p}-${run}`} className="lr-st-b"><Body /></div>
        {PHASES[p].id !== 'fixes' && <span key={`sc${p}-${run}`} className="lr-scan" aria-hidden="true" />}
      </div>
    </div>
  )
}

/* ---------------- report preview carousel ---------------- */
const REPORT_DOCS = [
  ['AI Search Findings', 'What AI search returned for buyer-style questions.', 'findings'],
  ['15-Point Scorecard', 'Findability, comprehension and recommendation checks.', 'score'],
  ['Product Data Gaps', 'The specific gaps found on the page, with evidence.', 'gaps'],
  ['Current vs Enriched Page', 'A side-by-side view of the page before and after.', 'compare'],
  ['Commercial Implications', 'Why the gaps matter for discovery and buying.', 'impact'],
  ['Recommended Next Steps', 'Prioritized actions, ending in a re-test.', 'steps'],
]
const Thumb = ({ k }) => (
  <div className="th" aria-hidden="true">
    <b />
    {k === 'findings' && <><div className="eng">{ENGINES.map((e) => <span key={e} />)}</div><u /><u className="s" /><u /></>}
    {k === 'score' && <div className="g15">{Array.from({ length: 15 }, (_, i) => <i key={i} className={i % 4 === 1 ? 'a' : i % 5 === 3 ? 'r' : ''} />)}</div>}
    {k === 'gaps' && <><span className="gap" /><span className="gap" /><span className="gap s" /></>}
    {k === 'compare' && <div className="two"><span /><span className="g" /></div>}
    {k === 'impact' && <><u /><u className="s" /><u /><span className="ln" /></>}
    {k === 'steps' && <ol><li /><li /><li /></ol>}
  </div>
)

function ReportPreview() {
  const rail = useRef(null)
  const [idx, setIdx] = useState(0)
  const step = () => {
    const el = rail.current
    const c = el && el.children[0]
    return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0') : 300
  }
  const onScroll = () => { const el = rail.current; if (el) setIdx(Math.round(el.scrollLeft / step())) }
  const go = (d) => { const el = rail.current; if (el) el.scrollBy({ left: d * step(), behavior: reducedMotion() ? 'auto' : 'smooth' }) }
  return (
    <div id="air-report" className="lr-report">
      <div className="cp">
        <p className="lr-eyebrow">What you receive</p>
        <h3>Your AI Readiness Report includes:</h3>
        <ul>
          <li>AI search findings</li><li>Technical product-data assessment</li><li>Prioritized gaps</li>
          <li>Enrichment recommendations</li><li>Before / after product-page comparison</li><li>Recommended next actions</li>
        </ul>
        <Link className="btn btn-primary" to={REPORT_URL}>Get AI Readiness Report <Icon name="arrow-right" /></Link>
      </div>
      <div className="cr">
        <div className="ctl">
          <span>{String(Math.min(idx + 1, REPORT_DOCS.length)).padStart(2, '0')} / {String(REPORT_DOCS.length).padStart(2, '0')}</span>
          <div>
            <button type="button" onClick={() => go(-1)} aria-label="Previous report pages" disabled={idx <= 0}><Icon name="arrow-left" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next report pages" disabled={idx >= REPORT_DOCS.length - 3}><Icon name="arrow-right" /></button>
          </div>
        </div>
        <ul ref={rail} className="rail" onScroll={onScroll} tabIndex={0} aria-label="Report pages, swipe or use the arrows">
          {REPORT_DOCS.map(([t, d, k], i) => (
            <li key={t}><Thumb k={k} /><span className="n">{String(i + 1).padStart(2, '0')}</span><strong>{t}</strong><small>{d}</small></li>
          ))}
        </ul>
        <div className="bar" aria-hidden="true"><i style={{ width: `${((idx + 1) / REPORT_DOCS.length) * 100}%` }} /></div>
      </div>
    </div>
  )
}

/* ---------------- section ---------------- */
export default function AIReadiness() {
  return (
    <>
      <section id="ai-readiness" className="lr-intro" aria-labelledby="lr-h">
        <div className="lr-wrap lr-intro-grid">
          <div className="lc">
            <p className="lr-eyebrow">AI Readiness — live product assessment</p>
            <h2 id="lr-h">See exactly how AI understands your product content.</h2>
            <p className="lede">We test a real product page across crawler access, buyer-style questions, competing listings, product-data quality and AI discoverability — then show exactly what needs to improve.</p>
            <p className="shown">Shown here: {PRODUCT}</p>
            <div className="act">
              <Link className="btn btn-primary" to={REPORT_URL}>Get Your AI Readiness Report <Icon name="arrow-right" /></Link>
              {SAMPLE_REPORT_URL
                ? <a className="tl" href={SAMPLE_REPORT_URL}>View Sample Report <Icon name="arrow-right" /></a>
                : <a className="tl" href="#air-audit">See what we test <Icon name="arrow-right" /></a>}
            </div>
          </div>
          <figure className="pc">
            <div className="img"><img src={bpImg} alt={`${PRODUCT}, the single sample product for this assessment`} width="1000" height="614" /><i className="sl" aria-hidden="true" /></div>
            <figcaption><b>Example product page</b><span>Assessment in progress</span></figcaption>
          </figure>
        </div>
      </section>

      <section id="air-audit" className="lr-work" aria-label="AI Readiness report workspace">
        <div className="lr-wrap">
          <Workspace />
          <ReportPreview />
        </div>
      </section>
    </>
  )
}
