import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronsLeftRight, Check, Download, Search, ShoppingCart } from 'lucide-react'
import { TESYS } from '../sampleProduct.js'
import { ALL_ATTRS, PRODUCT } from '../walkthrough/data.js'

const breaker = TESYS.images.front
import './BeforeAfter.css'

function Shell({ children }) {
  return (
    <div className="ba-page">
      <div className="ba-bar"><i /><i /><i /><span>store.example.com/circuit-breakers/telgv3p73</span></div>
      <div className="ba-nav"><b><i />Sample Industrial Supply</b><span>Products</span><span>Brands</span><span>Documents</span><Search size={12} /><ShoppingCart size={13} /></div>
      {children}
    </div>
  )
}

function After() {
  return (
    <Shell>
      <ol className="ba-bc"><li>Home</li>{PRODUCT.taxonomy.map((t) => <li key={t}>{t}</li>)}</ol>
      <div className="ba-cols">
        <div className="ba-gal"><img src={breaker} alt="" /></div>
        <div className="ba-info">
          <h3>{PRODUCT.title}</h3>
          <small><u>In stock</u></small>
          <dl className="ba-id">
            <div><dt>Brand</dt><dd>{PRODUCT.maker}</dd></div>
            <div><dt>Mfr. Name</dt><dd>{PRODUCT.maker}</dd></div>
            <div><dt>Mfr. Part No.</dt><dd>{TESYS.sku}</dd></div>
            <div><dt>SKU</dt><dd>{PRODUCT.sku}</dd></div>
          </dl>
          <p>{PRODUCT.description}</p>
          <div className="ba-cta"><span className="p">Request a quote</span><span><Download size={12} />Datasheet (PDF)</span></div>
        </div>
      </div>
      <section className="ba-card" aria-label="Specifications">
        <header><b>Specifications</b><span className="ba-chip ok"><Check size={10} strokeWidth={3.4} />17 of 17 filled</span></header>
        <div className="ba-spec">{ALL_ATTRS.map(([l, v], i) => <span key={l} style={{ '--k': i }}><em>{l}</em><b>{v}</b></span>)}</div>
      </section>
    </Shell>
  )
}

function Before() {
  return (
    <Shell>
      <ol className="ba-bc"><li>Home</li><li>Circuit Breakers</li></ol>
      <div className="ba-cols">
        <div className="ba-gal"><img src={breaker} alt="" /></div>
        <div className="ba-info">
          <h3 className="raw">{PRODUCT.raw}</h3>
          <dl className="ba-id off">
            <div><dt>SKU</dt><dd>{PRODUCT.sku}</dd></div>
          </dl>
          <p className="raw">Motor circuit breaker 73A.</p>
          <div className="ba-cta"><span className="off">Request a quote</span></div>
        </div>
      </div>
      <section className="ba-card" aria-label="Specifications">
        <header><b>Specifications</b></header>
        <div className="ba-spec">
          {ALL_ATTRS.slice(0, 3).map(([l, v]) => <span key={l}><em>{l}</em><b>{v}</b></span>)}
        </div>
      </section>
    </Shell>
  )
}

export default function BeforeAfter() {
  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const [pos, setPos] = useState(100)
  const [used, setUsed] = useState(false)
  const [seen, setSeen] = useState(false)
  const touched = useRef(false)
  const started = useRef(false)
  const drag = useRef(false)

  /* the moment the slider lands on "After", the enriched page pops in (see .ba-layer.after.pop in the CSS) */
  const [pop, setPop] = useState(false)
  const popT = useRef(0)
  const wasAfter = useRef(false)
  const track = useCallback((v) => {
    const now = v < 12
    if (now && !wasAfter.current) {
      setPop(true)
      window.clearTimeout(popT.current)
      popT.current = window.setTimeout(() => setPop(false), 2600)
    }
    wasAfter.current = now
  }, [])

  const setFrom = useCallback((clientX) => {
    const r = boxRef.current.getBoundingClientRect()
    const v = Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100))
    posRef.current = v
    track(v)
    setPos(v)
  }, [track])

  const posRef = useRef(96)
  const raf = useRef(0)
  const timer = useRef(0)
  const reduce = useRef(false)

  const glide = useCallback((to, ms = 1300, done) => {
    cancelAnimationFrame(raf.current)
    const from = posRef.current
    const t0 = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms)
      const v = from + (to - from) * ease(t)
      posRef.current = v
      track(v)
      setPos(v)
      if (t < 1) raf.current = requestAnimationFrame(step)
      else if (done) done()
    }
    raf.current = requestAnimationFrame(step)
  }, [track])

  /* auto-play: before → wipe → after → wipe → before … until the visitor takes over */
  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let on = false
    const cycle = (toAfter) => {
      if (touched.current || !on) return
      timer.current = window.setTimeout(() => {
        if (touched.current || !on) return
        glide(toAfter ? 0 : 100, 1500, () => cycle(!toAfter))
      }, 2400)
    }
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting
      if (on && !started.current) { started.current = true; setSeen(true); if (!reduce.current) cycle(true) }
      if (!on) { window.clearTimeout(timer.current); cancelAnimationFrame(raf.current) }
      else if (started.current && !touched.current && !reduce.current && !raf.current) cycle(posRef.current > 50)
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.35 })
    io.observe(rootRef.current)
    return () => { io.disconnect(); window.clearTimeout(timer.current); cancelAnimationFrame(raf.current) }
  }, [glide])

  const choose = (toAfter) => {
    touched.current = true
    setUsed(true)
    window.clearTimeout(timer.current)
    if (reduce.current) { posRef.current = toAfter ? 0 : 100; setPos(posRef.current) } else glide(toAfter ? 0 : 100, 1200)
  }

  const down = (e) => { touched.current = true; setUsed(true); window.clearTimeout(timer.current); cancelAnimationFrame(raf.current); drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); setFrom(e.clientX) }
  const move = (e) => { if (drag.current) setFrom(e.clientX) }
  const up = () => { drag.current = false }

  return (
    <section className={`ba${seen ? ' seen' : ''}`} ref={rootRef} aria-labelledby="ba-title">
      <div className="ba-wrap">
        <header className="ba-head">
          <p className="ba-eyebrow">Before &amp; after CatalogWiz</p>
          <h2 id="ba-title">Same supplier file. <em>A product page buyers can trust.</em></h2>
          <p className="ba-sub">Watch the raw supplier listing wipe into the enriched, human-verified product page, or drag the handle yourself.</p>
        </header>

        <div className="ba-toggle" role="group" aria-label="Show before or after">
          <i style={{ transform: `translateX(${pos < 50 ? 100 : 0}%)` }} aria-hidden="true" />
          <button type="button" aria-pressed={pos >= 50} className={pos >= 50 ? 'on' : ''} onClick={() => choose(false)}>Before</button>
          <button type="button" aria-pressed={pos < 50} className={pos < 50 ? 'on after' : 'after'} onClick={() => choose(true)}>After</button>
        </div>

        <div className={`ba-stage${pop ? ' burst' : ''}`} ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className={`ba-layer after${pop ? ' pop' : ''}`}><After /></div>
          <div className="ba-layer before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}><Before /></div>
          <span className={`ba-tag b${pos < 12 ? ' dim' : ''}`}>Before <small>22% complete</small></span>
          <span className="ba-flash" aria-hidden="true" />
          <span className={`ba-tag a${pos > 88 ? ' dim' : ''}`}>After <small>98% complete</small></span>
          <div className={`ba-handle${pos < 2 || pos > 98 ? ' rest' : ''}`} style={{ left: `${pos}%` }} aria-hidden="true"><span><ChevronsLeftRight size={18} /></span></div>
          <span className={`ba-hint${used ? ' gone' : ''}`} aria-hidden="true">Drag to compare</span>
          <input className="ba-range" type="range" min="0" max="100" value={Math.round(pos)} aria-label="Compare before and after" onChange={(e) => { touched.current = true; setUsed(true); window.clearTimeout(timer.current); cancelAnimationFrame(raf.current); posRef.current = Number(e.target.value); setPos(posRef.current) }} onPointerDown={(e) => e.stopPropagation()} />
        </div>

        <ul className="ba-points">
          <li><Check size={14} strokeWidth={3} /><b>5 → 17</b> attributes filled from the datasheet</li>
          <li><Check size={14} strokeWidth={3} /><b>Structured</b> title, taxonomy, description and SEO</li>
          <li><Check size={14} strokeWidth={3} /><b>Human verified</b> before it goes live</li>
        </ul>
        <p className="ba-foot">Illustrative sample data · sample product TELGV3P73</p>
      </div>
    </section>
  )
}
