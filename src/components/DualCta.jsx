import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import productImg from '../assets/home/weg-rw27.webp'
import './DualCta.css'
import Icon from './ui/Icon.jsx'

/* "Two ways to move forward": a compact product selector.
   CatalogWiz and AI Readiness are separate products with equal weight and the same
   card anatomy. Visuals are illustrative; no scores or live results are claimed. */

const PRODUCTS = [
  {
    id: 'catalogwiz',
    type: 'Product data workbench',
    intent: 'Need to build, enrich or publish product data?',
    name: 'CatalogWiz',
    desc: 'Turn supplier files, technical documentation and incomplete product records into structured, validated and channel-ready content.',
    flow: ['Ingest', 'Enrich', 'Validate', 'Approve', 'Publish'],
    best: ['Manufacturers', 'Distributors', 'Product-data teams'],
    outcome: ['One governed product record.', 'Ready for every channel.'],
    cta: 'Explore CatalogWiz',
    to: '/catalogwiz',
  },
  {
    id: 'ai-readiness',
    type: 'AI discovery assessment',
    intent: 'Need to understand how AI sees your products?',
    name: 'AI Readiness',
    desc: 'Test whether AI systems can find, understand and verify your product content — then uncover the gaps affecting visibility and trust.',
    flow: ['Scan', 'Test', 'Diagnose', 'Recommend', 'Re-test'],
    best: ['Ecommerce teams', 'SEO teams', 'Digital commerce leaders'],
    outcome: ['Clear findings.', 'Prioritized fixes.', 'Evidence you can act on.'],
    cta: 'Explore AI Readiness',
    to: '/how-it-works#ai-readiness',
  },
]

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const Tick = ({ size, s }) => <Icon name="check" size={size ?? s ?? 10} strokeWidth={3.4} />

function CatalogVisual() {
  return (
    <div className="dcv cw" aria-hidden="true">
      <ul className="files"><li style={{ '--t': '0s' }}>XLSX</li><li style={{ '--t': '.12s' }}>PDF</li></ul>
      <span className="dot" />
      <div className="rec">
        <div className="top"><img src={productImg} alt="" width="1254" height="1254" loading="lazy" /><b>RW27 Overload Relay</b></div>
        <dl>
          <div style={{ '--t': '.9s' }}><dt>Series</dt><dd>RW27</dd></div>
          <div style={{ '--t': '1.05s' }}><dt>Current</dt><dd>11–17 A</dd></div>
          <div style={{ '--t': '1.2s' }}><dt>Poles</dt><dd>3P</dd></div>
        </dl>
        <div className="foot"><span className="chk"><Tick /> Validated</span><span className="pub">Publish</span></div>
      </div>
    </div>
  )
}

function ReadinessVisual() {
  return (
    <div className="dcv ai" aria-hidden="true">
      <div className="page">
        <div className="bar"><i /><i /><i /></div>
        <img src={productImg} alt="" width="1254" height="1254" loading="lazy" />
        <span /><span className="s" />
        <div className="scanline" />
      </div>
      <div className="side">
        <ul className="states"><li style={{ '--t': '1.1s' }}>Find</li><li style={{ '--t': '1.35s' }}>Understand</li><li style={{ '--t': '1.6s' }}>Recommend</li></ul>
        <ul className="issues">
          <li className="ok" style={{ '--t': '1.4s' }}><span>Product identity</span><i><Tick /></i></li>
          <li className="gap" style={{ '--t': '1.6s' }}><span>Specifications</span><i>!</i></li>
          <li className="ok" style={{ '--t': '1.8s' }}><span>Structured data</span><i><Tick /></i></li>
        </ul>
        <span className="report">AI Readiness Report</span>
      </div>
    </div>
  )
}

function ProductCard({ p, delay }) {
  const ref = useRef(null)
  const lastRun = useRef(0)
  const [run, setRun] = useState(0) // remounting the visual restarts its CSS animation
  const [go, setGo] = useState(false)
  const [reduced] = useState(reducedMotion)

  // first run when the card enters the viewport
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reduced || !('IntersectionObserver' in window)) { const f = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(f) }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); lastRun.current = Date.now(); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  // replay on hover / keyboard focus (not while it is still playing)
  const replay = useCallback(() => {
    if (reduced || Date.now() - lastRun.current < 2600) return
    lastRun.current = Date.now()
    setRun((n) => n + 1)
  }, [reduced])

  return (
    <article ref={ref} className={`dc-card${go ? ' go' : ''}${reduced ? ' fin' : ''}`} style={{ '--d': `${delay}ms` }} onMouseEnter={replay} onFocus={replay}>
      <p className="dc-type"><i aria-hidden="true" />{p.type}</p>
      <div className="dc-body">
        <div className="dc-text">
          <p className="dc-intent">{p.intent}</p>
          <h3>{p.name}</h3>
          <p className="dc-desc">{p.desc}</p>
        </div>
        <div key={run} className="dc-vis">{p.id === 'catalogwiz' ? <CatalogVisual /> : <ReadinessVisual />}</div>
      </div>

      <ol className="dc-flow" aria-label={`${p.name} workflow`}>
        {p.flow.map((s, i) => <li key={s} style={{ '--t': `${0.2 + i * 0.4}s` }}><span>{i + 1}</span>{s}</li>)}
      </ol>

      <div className="dc-meta">
        <div className="dc-best"><b>Best for</b><ul>{p.best.map((b) => <li key={b}>{b}</li>)}</ul></div>
        <p className="dc-outcome">{p.outcome.map((o) => <span key={o}>{o}</span>)}</p>
      </div>
      <Link className="dc-btn" to={p.to}>{p.cta} <Icon name="arrow-right" /></Link>
    </article>
  )
}

export default function DualCta() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) { const f = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(f) }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} id="choose-path" className={`dc${on ? ' on' : ''}`} aria-labelledby="dc-h">
      <div className="dc-wrap">
        <header className="dc-head">
          <p className="dc-eyebrow">Two ways to move forward</p>
          <h2 id="dc-h">Choose the path that matches your product-data challenge.</h2>
          <p className="dc-lede">Build and operationalize trusted product data with CatalogWiz — or assess how well your existing product content performs in AI-driven discovery.</p>
        </header>
        <div className="dc-grid">
          {PRODUCTS.map((p, i) => <ProductCard key={p.id} p={p} delay={100 + i * 110} />)}
        </div>
        <p className="dc-foot">Not sure where to start? <Link to="/contact#contact-form">Talk to a Product Data Engineer <Icon name="arrow-right" /></Link></p>
      </div>
    </section>
  )
}
