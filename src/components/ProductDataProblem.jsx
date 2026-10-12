import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import bgImg from '../assets/home/problem-bg.webp'
import './ProductDataProblem.css'
import Icon from './ui/Icon.jsx'

/* "From incomplete data to complete answers": supplier data -> transformation node -> structured record.
   Illustrative only (placeholder lines, no real values). Runs once on entering the viewport. */

const RawSvg = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

const Svg = ({ children, size, sw, ...rest }) => (
  typeof children === 'string'
    ? <Icon name={children} size={size ?? 18} strokeWidth={sw ?? 2} />
    : <RawSvg size={size} sw={sw} {...rest}>{children}</RawSvg>
)
const Tick = ({ size, s }) => <Icon name="check" size={size ?? s ?? 10} strokeWidth={3.4} />

const SOURCES = [
  { t: 'Product list', c: '#1f8f55', i: 'sheet' },
  { t: 'Technical datasheet', c: '#d93a2f', i: 'file' },
  { t: 'Product images', c: '#c9822b', i: 'image' },
  { t: 'ERP export', c: '#0b1f3a', i: 'database' },
  { t: 'Specification details', c: '#0b1f3a', i: 'file' },
]
const FIELDS = ['Product Name', 'Brand', 'Model / Series', 'Category', 'Technical Attributes', 'Dimensions', 'Compliance', 'Marketing Content']
const MOBILE_KEEP = ['Product Name', 'Category', 'Technical Attributes', 'Compliance']
const BENEFITS = [
  { a: 'Handle', b: 'any data format', i: 'upload' },
  { a: 'Standardize', b: 'and enrich automatically', i: 'settings' },
  { a: 'Deliver', b: 'complete product records', i: 'check-circle' },
]

const INIT = { copy: false, card: false, rows: 0, lines: false, node: false, pulse: false, out: false, fields: 0, done: false }
const FINAL = { copy: true, card: true, rows: SOURCES.length, lines: true, node: true, pulse: false, out: true, fields: FIELDS.length, done: true }
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ProductDataProblem() {
  const [s, setS] = useState(INIT)
  const [geo, setGeo] = useState({ inn: [], out: [], node: null })
  const secRef = useRef(null)
  const stageRef = useRef(null)
  const srcRefs = useRef([])
  const fieldRefs = useRef([])
  const nodeRef = useRef(null)
  const timers = useRef([])
  const started = useRef(false)

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  const run = useCallback(() => {
    clear()
    setS(INIT)
    const q = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    const patch = (o) => setS((p) => ({ ...p, ...o }))
    q(60, () => patch({ copy: true }))                                      // 1 copy
    q(500, () => patch({ card: true }))                                     // 2 supplier card
    SOURCES.forEach((_, i) => q(900 + i * 190, () => patch({ rows: i + 1 })))
    q(2000, () => patch({ lines: true }))                                   // 3 connector lines
    q(2700, () => patch({ node: true, pulse: true }))                       // 4 node activates
    q(3300, () => patch({ out: true }))                                     // 5 pulses to the record
    FIELDS.forEach((_, i) => q(3700 + i * 260, () => patch({ fields: i + 1 })))   // 6 rows
    q(3700 + FIELDS.length * 260 + 300, () => patch({ done: true, pulse: false })) // 7 settle
  }, [])

  useEffect(() => {
    const el = secRef.current
    if (!el) return undefined
    if (reduced()) { const f = requestAnimationFrame(() => setS(FINAL)); started.current = true; return () => cancelAnimationFrame(f) }
    if (!('IntersectionObserver' in window)) { const f = requestAnimationFrame(run); return () => { cancelAnimationFrame(f); clear() } }
    const io = new IntersectionObserver(([e]) => {
      const need = Math.min(0.3 * e.boundingClientRect.height, window.innerHeight * 0.4)
      if (e.isIntersecting && e.intersectionRect.height >= need - 1 && !started.current) { started.current = true; run(); io.disconnect() }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) })
    io.observe(el)
    return () => { io.disconnect(); clear() }
  }, [run])

  // connector geometry from the real layout (desktop / tablet landscape only)
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const mq = window.matchMedia('(min-width: 861px)')
    const measure = () => {
      if (!mq.matches || !nodeRef.current) { setGeo({ inn: [], out: [], node: null }); return }
      const sr = stage.getBoundingClientRect()
      const nr = nodeRef.current.getBoundingClientRect()
      const nx = nr.left - sr.left, ny = nr.top - sr.top + nr.height / 2, nx2 = nr.right - sr.left
      const inn = srcRefs.current.filter(Boolean).map((el) => {
        const r = el.getBoundingClientRect()
        const x0 = r.right - sr.left, y0 = r.top - sr.top + r.height / 2, mx = x0 + (nx - x0) * 0.55
        return `M${x0.toFixed(1)} ${y0.toFixed(1)} C${mx.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${ny.toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`
      })
      const rowEls = fieldRefs.current.filter(Boolean)
      const pick = [0, 2, 4, 6].map((i) => rowEls[i]).filter(Boolean)
      const out = pick.map((el) => {
        const r = el.getBoundingClientRect()
        const x1 = r.left - sr.left, y1 = r.top - sr.top + r.height / 2, mx = nx2 + (x1 - nx2) * 0.5
        return `M${nx2.toFixed(1)} ${ny.toFixed(1)} C${mx.toFixed(1)} ${ny.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
      })
      setGeo({ inn, out, node: { x: nx + nr.width / 2, y: ny } })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  return (
    <section ref={secRef} className={`pdp${s.copy ? ' on' : ''}`} aria-labelledby="pdp-h">
      <div className="pdp-bg" aria-hidden="true"><img src={bgImg} alt="" loading="lazy" width="1200" height="563" /></div>
      <div className="pdp-wrap">
        <div className="pdp-copy">
          <p className="pdp-eyebrow pdp-r" style={{ '--d': '0ms' }}>From incomplete data to complete answers</p>
          <h2 id="pdp-h" className="pdp-r" style={{ '--d': '80ms' }}>Your suppliers send product data. <span>Your customers expect complete answers.</span></h2>
          <p className="pdp-lede pdp-r" style={{ '--d': '170ms' }}>Turn fragmented supplier information into structured, standardized and enriched product content — so your customers always find the complete, accurate information they need.</p>
          <ul className="pdp-benefits pdp-r" style={{ '--d': '260ms' }}>
            {BENEFITS.map((b) => (
              <li key={b.a}><span className="ic"><Svg>{b.i}</Svg></span><span><b>{b.a}</b>{b.b}</span></li>
            ))}
          </ul>
        </div>

        <div ref={stageRef} className="pdp-stage" role="group" aria-label="Illustration: supplier data in several formats is transformed into a structured, verified product record. Placeholder content only.">
          {/* supplier data */}
          <div className={`pdp-card sup${s.card ? ' in' : ''}`}>
            <header><span className="hi"><Svg size={16}>file</Svg></span>Supplier Data</header>
            <ul>
              {SOURCES.map((src, i) => (
                <li key={src.t} ref={(el) => { srcRefs.current[i] = el }} className={s.rows > i ? 'in' : ''}>
                  <span className="ic" style={{ color: src.c }}><Svg size={20}>{src.i}</Svg></span>
                  <span className="tx"><b>{src.t}</b><i /><i className="s" /></span>
                </li>
              ))}
            </ul>
          </div>

          {/* transformation node */}
          <div className="pdp-nodecol">
            <div ref={nodeRef} className={`pdp-node${s.node ? ' on' : ''}${s.done ? ' done' : ''}`} aria-hidden="true">
              <Svg size={24}>arrow-right</Svg>
            </div>
            <span className="pdp-vline" aria-hidden="true" />
          </div>

          {/* structured product data */}
          <div className={`pdp-card out${s.out ? ' in' : ''}${s.done ? ' done' : ''}`}>
            <header><span className="hi"><Svg size={16}>sparkles</Svg></span>Structured Product Data</header>
            <ul>
              {FIELDS.map((f, i) => (
                <li key={f} ref={(el) => { fieldRefs.current[i] = el }} className={`${s.fields > i ? 'ok' : ''}${MOBILE_KEEP.includes(f) ? '' : ' extra'}`}>
                  <span className="lb">{f}</span>
                  <span className="ln"><i /></span>
                  <span className="ck"><Tick /></span>
                </li>
              ))}
            </ul>
            <p className="more">+ more structured fields</p>
          </div>

          <svg className="pdp-svg" aria-hidden="true" focusable="false">
            {geo.inn.map((d, i) => (
              <g key={`i${i}`}><path className="base" d={d} /><path className={`lit${s.lines ? ' draw' : ''}`} d={d} pathLength="1" style={{ transitionDelay: `${i * 90}ms` }} /></g>
            ))}
            {geo.out.map((d, i) => (
              <g key={`o${i}`}><path className="base" d={d} /><path className={`lit${s.out ? ' draw' : ''}${s.done ? ' done' : ''}`} d={d} pathLength="1" style={{ transitionDelay: `${i * 90}ms` }} /></g>
            ))}
          </svg>
          {geo.inn.map((d, i) => <span key={`di${i}`} className={`pdp-dot${s.pulse && !s.out ? ' run' : ''}`} style={{ offsetPath: `path("${d}")`, animationDelay: `${i * 90}ms` }} aria-hidden="true" />)}
          {geo.out.map((d, i) => <span key={`do${i}`} className={`pdp-dot${s.out && !s.done ? ' run' : ''}`} style={{ offsetPath: `path("${d}")`, animationDelay: `${i * 110}ms` }} aria-hidden="true" />)}
        </div>
      </div>
    </section>
  )
}
