import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import valveImg from '../assets/home/valve.png'
import './SupplierFlow.css'
import Icon from './ui/Icon.jsx'

/* ------------------------------------------------------------------
   Desktop stage: one 1000 x 720 coordinate space scaled with container query
   units. Source cards (left) → CatalogWiz dashboard (centre) → output cards (right).
   ------------------------------------------------------------------ */
const W = 1000
const H = 720
const SRC_W = 175
const OUT_X = 790
const LAP = { x: 270, r: 730 }

const RawSvg = ({ children, size = 22, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

const Svg = ({ children, size, sw, ...rest }) => (
  typeof children === 'string'
    ? <Icon name={children} size={size ?? 18} strokeWidth={sw ?? 2} />
    : <RawSvg size={size} sw={sw} {...rest}>{children}</RawSvg>
)

const SOURCES = [
  { t: 'XLSX', s: 'Spreadsheets', c: '#1f8f55', i: 'sheet' },
  { t: 'CSV', s: 'Product files', c: '#2f6fe0', i: 'file' },
  { t: 'PDF', s: 'Supplier catalogs', c: '#d93a2f', i: 'file' },
  { t: 'ERP', s: 'System exports', c: '#0b1f3a', i: 'database' },
  { t: 'Supplier Catalog', s: 'Digital catalogs', c: '#0b1f3a', i: 'book' },
  { t: 'Images', s: 'Product photos', c: '#7a4fe0', i: 'image' },
  { t: 'SKU / MPN', s: 'Product identifiers', c: '#0b1f3a', i: 'barcode' },
  { t: 'Technical Specs', s: 'Data sheets', c: '#0b1f3a', i: 'file' },
]

const OUTPUTS = [
  { t: 'Enriched', s: 'Complete product content', i: 'sparkles' },
  { t: 'Taxonomy Applied', s: 'Mapped to industry standards', i: 'network' },
  { t: 'Attributes Standardized', s: 'Clean, consistent data', i: 'sliders' },
  { t: 'Quality Validated', s: 'AI + expert review', i: 'check-circle' },
  { t: 'Channel Ready', s: 'Ecommerce, PIM, marketplaces', i: 'send' },
]

const srcY = (i) => 45 + i * 76 // card centre
const outY = (i) => 150 + i * 84
const srcAnchor = (i) => 150 + i * 40 // where each source line meets the dashboard edge
const outAnchor = (i) => 185 + i * 32

const srcPaths = SOURCES.map((_, i) => `M${SRC_W} ${srcY(i)} C ${SRC_W + 50} ${srcY(i)}, ${LAP.x - 50} ${srcAnchor(i)}, ${LAP.x + 4} ${srcAnchor(i)}`)
const outPaths = OUTPUTS.map((_, i) => `M${LAP.r - 4} ${outAnchor(i)} C ${LAP.r + 36} ${outAnchor(i)}, ${OUT_X - 36} ${outY(i)}, ${OUT_X} ${outY(i)}`)

const MESSAGES = [
  'Reading supplier files',
  'Understanding product data',
  'Enriching missing information',
  'Standardizing attributes',
  'Validating quality',
  'Preparing channel-ready content',
]

const CAPS = [
  { t: 'Ingest Any Source', d: 'Files, ERP exports, supplier catalogs and more.', i: 'upload' },
  { t: 'AI + Expert Enrichment', d: 'Complete, accurate and on-brand product content.', i: 'sparkles' },
  { t: 'Validate & Standardize', d: 'Ensure accuracy, consistency and industry taxonomy.', i: 'shield' },
  { t: 'Publish Everywhere', d: 'Send to ecommerce, marketplaces, PIM systems and AI assistants.', i: 'send' },
]

const STATS = [
  { k: 'Products processed', i: 'file' },
  { v: '100%', k: 'Enrichment complete', i: 'check-circle' },
  { v: '100%', k: 'Validation passed', i: 'shield' },
  { v: 'Ready', k: 'For all channels', i: 'send' },
]

const SPEC_ROWS = [
  ['Product Type', 'Ball Valve', false],
  ['Material', 'Stainless Steel 316', true],
  ['Size', '2" (DN50)', false],
  ['Pressure Rating', '1000 PSI', true],
  ['End Connection', 'Flanged', false],
  ['Standards', 'API 6D, ISO 5208', true],
]

const NAV = ['Overview', 'Products', 'Enrichment', 'Validation', 'Channels', 'Suppliers', 'Settings']

export default function SupplierFlow() {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [msg, setMsg] = useState(reduced ? MESSAGES.length : 0) // MESSAGES.length = finished
  const [count, setCount] = useState(reduced ? 12480 : 0)

  // Run the sequence once when the section enters the viewport
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (reduced) { section.classList.add('is-in'); return }
    const timers = []
    let raf = 0
    const run = () => {
      section.classList.add('is-in')
      MESSAGES.forEach((_, i) => timers.push(setTimeout(() => setMsg(i), 300 + i * 480)))
      timers.push(setTimeout(() => setMsg(MESSAGES.length), 3300))
      timers.push(setTimeout(() => {
        const t0 = performance.now()
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 1000)
          setCount(Math.round(12480 * (1 - Math.pow(1 - k, 3))))
          if (k < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      }, 2900))
    }
    if (!('IntersectionObserver' in window)) { run(); return () => timers.forEach(clearTimeout) }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); run() }
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(section)
    return () => { io.disconnect(); timers.forEach(clearTimeout); cancelAnimationFrame(raf) }
  }, [reduced])

  // Gentle pointer parallax (desktop, fine pointer)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const ok = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1100px)')
    if (!ok.matches || reduced) return
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    let raf = 0
    let running = false
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.06
      cur.y += (target.y - cur.y) * 0.06
      stage.style.setProperty('--mx', cur.x.toFixed(4))
      stage.style.setProperty('--my', cur.y.toFixed(4))
      if (Math.abs(target.x - cur.x) > 0.001 || Math.abs(target.y - cur.y) > 0.001) raf = requestAnimationFrame(tick)
      else running = false
    }
    const kick = () => { if (!running) { running = true; raf = requestAnimationFrame(tick) } }
    const move = (e) => {
      const r = stage.getBoundingClientRect()
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
      kick()
    }
    const leave = () => { target.x = 0; target.y = 0; kick() }
    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerleave', leave)
    return () => { cancelAnimationFrame(raf); stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerleave', leave) }
  }, [reduced])

  const filled = msg >= 2
  const done = msg >= MESSAGES.length
  const pct = (v, t) => `${((v / t) * 100).toFixed(3)}%`

  return (
    <section ref={sectionRef} className={`sf${reduced ? ' sf--static' : ''}`} aria-labelledby="sf-heading">
      <div className="sf-bg" aria-hidden="true">
        <span className="sf-blob" />
        <span className="sf-dots sf-dots-a" />
        <span className="sf-dots sf-dots-b" />
        <svg className="sf-orbit" viewBox="0 0 800 800" fill="none"><circle cx="400" cy="400" r="380" /><circle cx="400" cy="400" r="290" /></svg>
        {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="sf-speck" style={{ '--i': i }} />)}
      </div>

      <div className="sf-wrap">
        {/* ---------- left: transformation story ---------- */}
        <div className="sf-visual">
          {/* Desktop stage */}
          <div ref={stageRef} className="sf-stage">
            <div className="sf-glow" aria-hidden="true" />
            <svg className="sf-links" viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true">
              {srcPaths.map((d, i) => (
                <g key={`s${i}`} className="sf-link" style={{ '--dl': `${0.55 + i * 0.06}s` }}>
                  <path className="sf-link-base" d={d} />
                  <path className="sf-link-draw" pathLength="1" d={d} />
                  {!reduced && (
                    <circle r="2.8" className={`sf-pt ${i % 3 === 1 ? 'blue' : ''}`} style={{ '--dl': `${1.2 + i * 0.07}s` }}>
                      <animateMotion dur={`${2.6 + (i % 4) * 0.35}s`} repeatCount="indefinite" path={d} />
                    </circle>
                  )}
                </g>
              ))}
              {outPaths.map((d, i) => (
                <g key={`o${i}`} className="sf-link out" style={{ '--dl': `${1.9 + i * 0.16}s` }}>
                  <path className="sf-link-base" d={d} />
                  <path className="sf-link-draw" pathLength="1" d={d} />
                  {!reduced && (
                    <circle r="2.8" className="sf-pt out" style={{ '--dl': `${2.4 + i * 0.16}s` }}>
                      <animateMotion dur={`${3 + (i % 3) * 0.3}s`} repeatCount="indefinite" path={d} />
                    </circle>
                  )}
                </g>
              ))}
            </svg>

            <div className="sf-process" aria-live="off">
              {!done ? (
                <><span className="sf-spin" aria-hidden="true" /><span key={msg} className="sf-msg">{MESSAGES[Math.min(msg, MESSAGES.length - 1)]}</span></>
              ) : (
                <><span className="sf-okdot" aria-hidden="true" /><span className="sf-msg">Product data ready</span></>
              )}
            </div>

            <ol className="sf-src">
              {SOURCES.map((s, i) => (
                <li key={s.t} className="sf-card sf-card-src" style={{ top: pct(srcY(i), H), '--dl': `${0.1 + i * 0.09}s`, '--k': 5 + (i % 3) }}>
                  <span className="sf-card-ico" style={{ color: s.c }}><Svg size={20}>{s.i}</Svg></span>
                  <span className="sf-card-txt"><b>{s.t}</b><small>{s.s}</small></span>
                </li>
              ))}
            </ol>

            <div className="sf-laptop">
              <div className="sf-lid">
                <div className="sf-screen">
                  <div className="sf-ui">
                    <aside className="sf-side">
                      <span className="sf-logo">Catalog<em>Wiz</em></span>
                      {NAV.map((n, i) => <span key={n} className={`sf-nav${i === 1 ? ' on' : ''}`}><i />{n}</span>)}
                    </aside>
                    <div className="sf-main">
                      <div className="sf-search">Search products, SKUs, suppliers…</div>
                      <div className="sf-prod">
                        <div className="sf-photo"><img src={valveImg} alt="" /></div>
                        <div className="sf-info">
                          <div className="sf-ptitle">Stainless Steel Ball Valve <span>AI-Ready</span></div>
                          <div className="sf-sku">SKU: BV-1000 &nbsp;|&nbsp; MPN: SS-BV-1000</div>
                          <div className="sf-tabs"><u>Overview</u><span>Attributes</span><span>Media</span><span>Documents</span><span>Channels</span></div>
                          <div className="sf-table">
                            {SPEC_ROWS.map(([k, v, fill]) => (
                              <div key={k} className="sf-tr"><span>{k}</span>
                                {fill && !filled ? <i className="sf-skel" /> : <b className={fill ? 'sf-fill' : ''}>{v}</b>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="sf-gen"><span>✦ AI-Generated Product Content</span></div>
                      <div className="sf-gen-tabs"><u>Product Title</u><span>Short Description</span><span>Long Description</span><span>Key Features</span></div>
                      <div className="sf-gen-line">Stainless Steel 316 Ball Valve – 2" Flanged, 1000 PSI, API 6D</div>
                    </div>
                  </div>
                  <span className="sf-scan" aria-hidden="true" />
                </div>
              </div>
              <div className="sf-base" aria-hidden="true" />
              <span className="sf-pulse" aria-hidden="true" />
            </div>

            <ol className="sf-outs">
              {OUTPUTS.map((o, i) => (
                <li key={o.t} className="sf-card sf-card-out" style={{ top: pct(outY(i), H), '--dl': `${1.9 + i * 0.16}s`, '--k': 5 + (i % 3) }}>
                  <span className="sf-card-ico ok"><Svg size={19}>{o.i}</Svg></span>
                  <span className="sf-card-txt"><b>{o.t}</b><small>{o.s}</small></span>
                </li>
              ))}
            </ol>

            <div className="sf-final">
              <div className="sf-final-head">
                <span className="sf-final-ok"><Svg size={20} sw={2.6}>check</Svg></span>
                <div><strong>PRODUCT DATA READY</strong><small>Enriched • Standardized • Validated • Channel Ready</small></div>
              </div>
              <div className="sf-stats">
                {STATS.map((s, i) => (
                  <div key={s.k} className="sf-stat">
                    <span className="sf-stat-ico"><Svg size={16}>{s.i}</Svg></span>
                    <b>{i === 0 ? count.toLocaleString('en-US') : s.v}</b>
                    <small>{s.k}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile / tablet: Supplier Files → CatalogWiz → AI-Ready Data */}
          <div className="sf-flow">
            <div className="sf-node" style={{ '--n': 0 }}>
              <h4>Supplier Files</h4>
              <div className="sf-chips">{['XLSX', 'CSV', 'PDF', 'ERP', 'Catalogs', 'Images', 'SKU / MPN', 'Specs'].map((c) => <span key={c}>{c}</span>)}</div>
            </div>
            <span className="sf-arrow" aria-hidden="true"><i /></span>
            <div className="sf-node core" style={{ '--n': 1 }}>
              <h4>Catalog<em>Wiz</em></h4>
              <div className="sf-process sf-process-m">
                {!done ? (
                  <><span className="sf-spin" aria-hidden="true" /><span key={msg} className="sf-msg">{MESSAGES[Math.min(msg, MESSAGES.length - 1)]}</span></>
                ) : (
                  <><span className="sf-okdot" aria-hidden="true" /><span className="sf-msg">Product data ready</span></>
                )}
              </div>
              <div className="sf-bar"><i /></div>
            </div>
            <span className="sf-arrow" aria-hidden="true"><i /></span>
            <div className="sf-node out" style={{ '--n': 2 }}>
              <h4>AI-Ready Data</h4>
              <div className="sf-chips ok">{OUTPUTS.map((o) => <span key={o.t}>{o.t}</span>)}</div>
              <div className="sf-mstats"><b>{count.toLocaleString('en-US')}</b> products processed · 100% validated</div>
            </div>
          </div>
        </div>

        {/* ---------- right: content ---------- */}
        <div className="sf-copy">
          <span className="sf-eyebrow sf-r" style={{ '--i': 0 }}>From raw data to AI-ready</span>
          <h2 id="sf-heading" className="sf-title sf-r" style={{ '--i': 1 }}>Turn supplier data into structured, <span>revenue-ready</span> product content.</h2>
          <p className="sf-lede sf-r" style={{ '--i': 2 }}>
            Bring in spreadsheets, PDFs, ERP exports, supplier catalogs or incomplete product records — and transform
            them into enriched, standardized and validated product information ready for ecommerce, marketplaces, PIM
            systems and AI discovery.
          </p>
          <p className="sf-value sf-r" style={{ '--i': 3 }}>Less manual cleanup. Better product quality. Faster time to market.</p>
          <ul className="sf-caps">
            {CAPS.map((c, i) => (
              <li key={c.t} className="sf-cap sf-r" style={{ '--i': 4 + i }}>
                <span className="sf-cap-ico"><Svg size={20}>{c.i}</Svg></span>
                <div><h3>{c.t}</h3><p>{c.d}</p></div>
              </li>
            ))}
          </ul>
          <div className="sf-actions sf-r" style={{ '--i': 8 }}>
            <Link className="sf-cta" to="/how-it-works">See the Workflow <Icon name="arrow-right" /></Link>
            <Link className="sf-link2" to="/how-it-works">Explore CatalogWiz Workbench <Icon name="arrow-right" /></Link>
          </div>
        </div>
      </div>
    </section>
  )
}
