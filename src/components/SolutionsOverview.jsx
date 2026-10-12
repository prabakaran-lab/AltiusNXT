import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import productImg from '../assets/home/weg-rw27.webp'
import './SolutionsOverview.css'
import Icon from './ui/Icon.jsx'

/* Two product previews. Each card runs a compact, slow loop through its real flow:
   CatalogWiz = 7 governed layers, AI Readiness = 8 diagnostic steps.
   Previews are illustrative (sample product, no real scores or live results).
   Hover / focus pauses the loop; the stage buttons switch stage manually. */

const Tick = ({ s = 10 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>

/* ---------------- CatalogWiz ---------------- */
const CW_STEPS = [
  { id: 'intake', rail: 'Intake', name: 'Intake & Mapping', m: true },
  { id: 'taxonomy', rail: 'Taxonomy', name: 'Taxonomy', m: true },
  { id: 'classify', rail: 'Classify', name: 'Auto-Classification', m: false },
  { id: 'schema', rail: 'Schema', name: 'Schema & Attributes', m: true },
  { id: 'enrich', rail: 'Enrich', name: 'Data Enrichment', m: false },
  { id: 'quality', rail: 'Quality', name: 'Digital Assets & Quality', m: true },
  { id: 'publish', rail: 'Publish', name: 'Approval & Publish', m: true },
]
const TAX = ['Electrical', 'Industrial Controls', 'Relays', 'Overload Relays']
const SCHEMA = [['Series', 'RW27'], ['Current Rating', '11–17 A'], ['Voltage', '690 V'], ['Mounting Type', 'Direct Contactor']]

function CwBody({ id }) {
  switch (id) {
    case 'intake': return (
      <div className="pv-intake">
        <ul>{['XLSX', 'PDF', 'ERP', 'Images'].map((c, i) => <li key={c} style={{ '--i': i }}>{c}</li>)}</ul>
        <span className="pv-flowline" aria-hidden="true"><i /></span>
        <p className="pv-note">Mapped into one product record</p>
      </div>
    )
    case 'taxonomy': return (
      <ol className="pv-path">{TAX.map((t, i) => <li key={t} style={{ '--i': i }}>{t}</li>)}</ol>
    )
    case 'classify': return (
      <div className="pv-classify">
        <ol className="pv-path compact">{TAX.map((t) => <li key={t} className="on">{t}</li>)}</ol>
        <div className="pv-moving"><img src={productImg} alt="" width="1254" height="1254" /><span><Tick /> Classified: Overload Relays</span></div>
      </div>
    )
    case 'schema': return (
      <dl className="pv-rows">{SCHEMA.map(([k, v], i) => <div key={k} style={{ '--i': i }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    )
    case 'enrich': return (
      <ul className="pv-enrich">
        {[['11 to 17 amp', '11–17 A'], ['Direct contactor', 'Direct Contactor']].map(([a, b], i) => (
          <li key={a} style={{ '--i': i }}><s>{a}</s><i aria-hidden="true"><Icon name="arrow-right" size={14} /></i><b>{b}</b></li>
        ))}
        <li className="note" style={{ '--i': 2 }}>Standardized values and units</li>
      </ul>
    )
    case 'quality': return (
      <div className="pv-quality">
        <ul className="assets">{['Product image', 'Datasheet', 'Manual'].map((a, i) => <li key={a} style={{ '--i': i }}>{a}</li>)}</ul>
        <ul className="checks">{['Specifications', 'Attributes', 'Assets', 'Completeness'].map((c, i) => <li key={c} style={{ '--i': i + 3 }}><i><Tick s={8} /></i>{c}</li>)}</ul>
      </div>
    )
    default: return (
      <div className="pv-publish">
        <div className="status"><span className="a">In Review</span><i aria-hidden="true"><Icon name="arrow-right" size={14} /></i><span className="b">Approved</span><span className="c">Publish Ready</span></div>
        <ul>{['Ecommerce', 'PIM', 'ERP', 'Marketplace', 'API'].map((d, i) => <li key={d} style={{ '--i': i }}>{d}</li>)}</ul>
      </div>
    )
  }
}

/* ---------------- AI Readiness ---------------- */
const AI_STEPS = [
  { id: 'score', rail: 'Score', name: 'Can AI find, understand, recommend you?', m: true },
  { id: 'crawlers', rail: 'Crawlers', name: 'Crawler / user-agent test', m: true },
  { id: 'questions', rail: 'Questions', name: 'Six buying questions', m: true },
  { id: 'competitors', rail: 'Competitors', name: 'Competitor listings', m: false },
  { id: 'causes', rail: 'Causes', name: 'Root causes', m: true },
  { id: 'scorecard', rail: 'Scorecard', name: '15-point diagnostic', m: false },
  { id: 'beforeafter', rail: 'Before/After', name: 'Before / After page', m: false },
  { id: 'fixes', rail: 'Fixes', name: 'Prioritized action plan', m: true },
]
const BOTS = ['Standard browser', 'Googlebot', 'Google-Extended', 'Bingbot', 'Claude-User', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot']
const QUESTIONS = ['model specifications', 'where to buy', 'manufacturer part number', 'compatibility', 'dimensions', 'price']
const ENGINES = [['ChatGPT', 'ok'], ['Claude', 'part'], ['Gemini', 'ok'], ['Perplexity', 'miss']]
const ENGINE_TXT = { ok: 'Answered', part: 'Incomplete', miss: 'Missing' }
const CAUSES = ['Missing structured data', 'Weak specs', 'No pricing signal', 'Thin supporting content', 'Missing compatibility info']
const FIXES = ['Fix structured data', 'Improve specification depth', 'Add buying-question content', 'Strengthen comparison signals', 'Re-test']

function AiBody({ id }) {
  switch (id) {
    case 'score': return (
      <ul className="pv-score">
        {[['Can AI find you?', 'Findability', 'Good', 'g'], ['Can AI understand you?', 'Understanding', 'Moderate', 'm'], ['Will AI recommend you?', 'Recommendation', 'Weak', 'w']].map(([q, n, v, k], i) => (
          <li key={q} className={k} style={{ '--i': i }}><span><b>{q}</b><small>{n}</small></span><em>{v}</em><i aria-hidden="true" /></li>
        ))}
      </ul>
    )
    case 'crawlers': return (
      <ul className="pv-bots">{BOTS.map((b, i) => <li key={b} style={{ '--i': i }}><i aria-hidden="true" />{b}</li>)}</ul>
    )
    case 'questions': return (
      <div className="pv-q">
        <ul className="chips">{QUESTIONS.map((q, i) => <li key={q} style={{ '--i': i }}>{q}</li>)}</ul>
        <ul className="eng">{ENGINES.map(([n, k], i) => <li key={n} className={k} style={{ '--i': i + 5 }}><b>{n}</b><span>{ENGINE_TXT[k]}</span></li>)}</ul>
      </div>
    )
    case 'competitors': return (
      <ul className="pv-comp">
        {[['You', 'Listed · price not visible', 'warn'], ['Competitor A', 'Listed · price visible', 'ok'], ['Competitor B', 'Listed · price visible', 'ok']].map(([n, t, k], i) => (
          <li key={n} className={k} style={{ '--i': i }}><b>{n}</b><span>{t}</span></li>
        ))}
      </ul>
    )
    case 'causes': return (
      <ul className="pv-causes">{CAUSES.map((c, i) => <li key={c} style={{ '--i': i }}>{c}</li>)}</ul>
    )
    case 'scorecard': return (
      <div className="pv-card15">
        <p>15-point diagnostic scorecard</p>
        {[['Findability', 4], ['Comprehension', 3], ['Recommendation', 2]].map(([n, v], g) => (
          <div key={n} className="grp"><b>{n}</b><span>{Array.from({ length: 5 }, (_, k) => <i key={k} className={k < v ? 'on' : ''} style={{ '--i': g * 5 + k }} />)}</span></div>
        ))}
      </div>
    )
    case 'beforeafter': return (
      <div className="pv-ba">
        <div className="b"><h5>Before</h5><span /><span className="s" /><span className="x" /></div>
        <i aria-hidden="true"><Icon name="arrow-right" size={14} /></i>
        <div className="a"><h5>After</h5><span /><span className="s" /><span className="x" /></div>
      </div>
    )
    default: return (
      <ol className="pv-fixes">{FIXES.map((f, i) => <li key={f} style={{ '--i': i }}><span>{i + 1}</span>{f}</li>)}</ol>
    )
  }
}

/* ---------------- shared loop controller ---------------- */
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

function ProductPreview({ kind, steps, Body, dur }) {
  const mobile = useIsMobile()
  const seq = mobile ? steps.filter((s) => s.m) : steps
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [pos, setPos] = useState(reduced ? seq.length - 1 : 0)
  const [inView, setInView] = useState(false)
  const [hover, setHover] = useState(false)
  const [held, setHeld] = useState(false)
  const ref = useRef(null)
  const heldTimer = useRef(0)
  const p = Math.min(pos, seq.length - 1)
  const cur = seq[p]

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) { const f = requestAnimationFrame(() => setInView(true)); return () => cancelAnimationFrame(f) }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // slow loop: each stage for `dur` ms, a longer pause on the final state
  useEffect(() => {
    if (reduced || !inView || hover || held) return undefined
    const last = p === seq.length - 1
    const t = setTimeout(() => setPos((x) => (x >= seq.length - 1 ? 0 : x + 1)), last ? dur * 1.9 : dur)
    return () => clearTimeout(t)
  }, [p, inView, hover, held, reduced, seq.length, dur])

  useEffect(() => () => clearTimeout(heldTimer.current), [])
  const pick = useCallback((i) => {
    setPos(i)
    setHeld(true)
    clearTimeout(heldTimer.current)
    heldTimer.current = setTimeout(() => setHeld(false), 9000)
  }, [])

  return (
    <div
      ref={ref}
      className={`pv ${kind}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="pv-panel">
        <header>
          {kind === 'cw'
            ? <span className="pv-brand"><i aria-hidden="true" />CatalogWiz <b>Workbench</b></span>
            : <span className="pv-brand">AI Readiness <b>Diagnostic</b></span>}
          <em className={`pv-pill${kind === 'cw' && cur.id === 'publish' ? ' ok' : ''}`}>{cur.name}</em>
        </header>
        <div className="pv-sub">
          <img src={productImg} alt="" width="1254" height="1254" loading="lazy" />
          <strong>WEG RW27 Series Overload Relay</strong>
          <span className="pv-sample">Sample</span>
        </div>
        <div key={cur.id} className="pv-body">
          <Body id={cur.id} />
        </div>
        {kind === 'ai' && cur.id !== 'fixes' && <span key={`s${cur.id}`} className="pv-scan" aria-hidden="true" />}
      </div>

      <ol className="pv-rail" aria-label={kind === 'cw' ? 'CatalogWiz layers' : 'AI Readiness steps'}>
        {seq.map((s, i) => (
          <li key={s.id}>
            <button type="button" className={`${i === p ? 'on' : ''}${i < p ? ' done' : ''}`} aria-current={i === p ? 'step' : undefined} aria-label={`${i + 1}. ${s.name}`} onClick={() => pick(i)}>
              <span>{i < p ? <Tick s={9} /> : i + 1}</span>
              <em>{s.rail}</em>
            </button>
          </li>
        ))}
        <i className="pv-fill" aria-hidden="true" style={{ transform: `scaleX(${seq.length > 1 ? p / (seq.length - 1) : 1})` }} />
      </ol>
      <p className="pv-cap" aria-hidden="true">{p + 1}/{seq.length} · {cur.name}</p>
    </div>
  )
}

export default function SolutionsOverview() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const f = requestAnimationFrame(() => setOn(true))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} id="solutions" className={`so${on ? ' on' : ''}`} aria-labelledby="so-h">
      <div className="so-wrap">
        <header className="so-head so-rise" style={{ '--d': '0ms' }}>
          <p className="so-eyebrow">AltiusNxt solutions</p>
          <h2 id="so-h">Build better product data. <span>Understand how AI sees it.</span></h2>
          <p className="so-lede">Two products from one product-data expertise team. Use either on its own, or both together.</p>
        </header>

        <div className="so-grid">
          <article className="so-card cw so-rise" style={{ '--d': '120ms' }} id="solution-catalogwiz">
            <p className="so-tag"><i aria-hidden="true" />01 · CatalogWiz</p>
            <h3>Build complete, trusted product records.</h3>
            <p className="so-copy">Build and govern complete industrial product records, ready for the channels you use.</p>
            <ProductPreview kind="cw" steps={CW_STEPS} Body={CwBody} dur={1800} />
            <Link className="btn btn-primary so-cta" to="/how-it-works#catalogwiz">Explore CatalogWiz <Icon name="arrow-right" /></Link>
          </article>

          <article className="so-card ai so-rise" style={{ '--d': '240ms' }} id="solution-ai-readiness">
            <p className="so-tag"><i aria-hidden="true" />02 · AI Readiness</p>
            <h3>See how AI understands your product content.</h3>
            <p className="so-copy">Test how AI finds, understands and verifies the product pages you already publish.</p>
            <ProductPreview kind="ai" steps={AI_STEPS} Body={AiBody} dur={1600} />
            <Link className="btn btn-primary so-cta" to="/how-it-works#ai-readiness">Explore AI Readiness <Icon name="arrow-right" /></Link>
          </article>
        </div>
      </div>
    </section>
  )
}
