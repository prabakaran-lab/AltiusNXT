import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import breakerImg from '../assets/home/circuit-breaker.webp'
import Icon from './ui/Icon.jsx'

const ICONS = { id: 'id', ruler: 'ruler', tag: 'tag', tree: 'network', image: 'image', shield: 'shield', send: 'send' }

/* ------------------------------------------------------------------
   Desktop geometry. Everything lives in one 1000 x 860 coordinate space that
   scales with the stage (container query units), so nothing can drift or collide
   at a different width. Columns, left → right:
     layer cards 0–210 | channel 219 | raw-data lane 228–355 | product 375–625 | mirrored
   ------------------------------------------------------------------ */
const W = 1000
const H = 860
const ANCHOR_Y = [150, 265, 380] // alleys: top / middle / bottom connection rows
const LANE_IN = 355 // inner edge of the raw-data lane (left); mirrored on the right
const CARD_W = 210
const CHANNEL = 219

const LAYERS = [
  { n: '01', title: 'Product Identity', text: 'Names, brand, SKU, MPN and core identifiers.', icon: 'id', side: 'l', cy: 110, row: 0 },
  { n: '02', title: 'Technical Specifications', text: 'Voltage, current rating, poles, breaking capacity and technical performance data.', icon: 'ruler', side: 'l', cy: 345, row: 1 },
  { n: '03', title: 'Attributes', text: 'Standardized values, units and searchable specifications.', icon: 'tag', side: 'l', cy: 580, row: 2 },
  { n: '04', title: 'Classification', text: 'Taxonomy, category hierarchy and product mapping.', icon: 'tree', side: 'b', cy: 750 },
  { n: '05', title: 'Digital Assets', text: 'Images, documents, drawings and supporting product media.', icon: 'image', side: 'r', cy: 110, row: 0 },
  { n: '06', title: 'Compliance & Quality', text: 'Validation, standards, completeness and data-quality checks.', icon: 'shield', side: 'r', cy: 345, row: 1 },
  { n: '07', title: 'Channel Optimization', text: 'SEO, marketplace requirements and channel-ready product content.', icon: 'send', side: 'r', cy: 580, row: 2 },
]

// Raw supplier fragments: two per connection row on each side, so each row reads as a pair.
const RAW = [
  { t: 'SKU', side: 'l', row: 0, slot: 0 }, { t: 'MPN', side: 'l', row: 0, slot: 1 },
  { t: 'Brand', side: 'l', row: 1, slot: 0 }, { t: 'Category', side: 'l', row: 1, slot: 1 },
  { t: 'Image', side: 'l', row: 2, slot: 0 }, { t: 'Mounting Type', side: 'l', row: 2, slot: 1 },
  { t: 'Voltage', side: 'r', row: 0, slot: 0 }, { t: 'Poles', side: 'r', row: 0, slot: 1 },
  { t: 'Current Rating', side: 'r', row: 1, slot: 0 }, { t: 'Breaking Capacity', side: 'r', row: 1, slot: 1 },
  { t: 'PDF', side: 'r', row: 2, slot: 0 }, { t: 'XLSX', side: 'r', row: 2, slot: 1 },
]

const STAGES = [
  { msg: 'Ingesting supplier data' },
  { msg: 'Understanding product identity', chips: ['Brand', 'SKU', 'MPN', 'Product name'] },
  { msg: 'Reading technical specifications', chips: ['415V', '32A', '4 Pole', '10kA', 'MCCB', 'DIN Rail / Panel Mount'] },
  { msg: 'Standardizing attributes', rows: [['Current Rating', '32 A'], ['Voltage', '415 V'], ['Pole Count', '4'], ['Breaking Capacity', '10 kA']] },
  { msg: 'Building taxonomy structure', path: ['Electrical', 'Circuit Protection', 'Circuit Breakers', 'MCCB'] },
  { msg: 'Attaching product assets', chips: ['Product image', 'Datasheet PDF', 'Technical drawing', 'Installation guide'] },
  { msg: 'Validating product quality', chips: ['Complete', 'Verified', 'Standards Checked', 'Data Quality Passed'], ok: true },
  { msg: 'Preparing channel-ready content', chips: ['Ecommerce', 'Marketplace', 'Search', 'AI Discovery'] },
]
const STAGE_COUNT = STAGES.length

const mirror = (pts, side) => (side === 'r' ? pts.map(([x, y]) => [W - x, y]) : pts)

// Orthogonal route with rounded corners — deliberate, readable connector paths.
function route(pts, r = 9) {
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const [nx, ny] = pts[i + 1]
    const a = Math.hypot(px - cx, py - cy)
    const b = Math.hypot(nx - cx, ny - cy)
    const rr = Math.min(r, a / 2, b / 2)
    d += ` L${(cx + ((px - cx) / a) * rr).toFixed(1)} ${(cy + ((py - cy) / a) * rr).toFixed(1)}`
    d += ` Q${cx} ${cy} ${(cx + ((nx - cx) / b) * rr).toFixed(1)} ${(cy + ((ny - cy) / b) * rr).toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${last[0]} ${last[1]}`
}

const layerLinks = LAYERS.map((l) => {
  if (l.side === 'b') {
    const x0 = W / 2 - CARD_W / 2
    return { n: l.n, d: route([[x0, l.cy], [345, l.cy], [345, 432], [402, 432], [402, 410]], 10), sx: x0, sy: l.cy }
  }
  const a = ANCHOR_Y[l.row]
  const pts = mirror([[CARD_W, l.cy], [CHANNEL, l.cy], [CHANNEL, a], [392, a]], l.side)
  return { n: l.n, d: route(pts, 9), sx: pts[0][0], sy: pts[0][1] }
})

const rawLinks = RAW.map((c) => {
  const y = ANCHOR_Y[c.row] + (c.slot ? 30 : -30)
  const ay = ANCHOR_Y[c.row] + (c.slot ? 12 : -12)
  const pts = mirror([[LANE_IN, y], [366, y], [366, ay], [392, ay]], c.side)
  return { ...c, y, d: route(pts, 6), sx: pts[0][0], sy: pts[0][1] }
})

const Tick = ({ size, s }) => <Icon name="check" size={size ?? s ?? 10} strokeWidth={3.4} />

const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`

export default function ProductIntelligence() {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [stage, setStage] = useState(reduced ? STAGE_COUNT - 1 : 0)
  const [final, setFinal] = useState(reduced)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    section.style.setProperty('--p', reduced ? '1' : '0')
    if (reduced) return

    const desktop = window.matchMedia('(min-width: 1280px)')
    let target = 0
    let current = 0
    let raf = 0
    let tracking = false
    let lastStage = 0
    let lastFinal = false

    const measure = () => {
      const vh = window.innerHeight
      if (desktop.matches) {
        const r = trackRef.current.getBoundingClientRect()
        target = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)))
      } else {
        const r = stageRef.current.getBoundingClientRect()
        target = Math.max(0, Math.min(1, (74 - r.top) / Math.max(1, r.height - vh + 74)))
      }
      const s = Math.min(STAGE_COUNT - 1, Math.floor(target * 8.6))
      const f = target >= 0.95
      if (s !== lastStage) { lastStage = s; setStage(s) }
      if (f !== lastFinal) { lastFinal = f; setFinal(f) }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    // eased follow: the product grows smoothly instead of stepping with the wheel
    const tick = () => {
      raf = 0
      current += (target - current) * 0.09
      section.style.setProperty('--p', current.toFixed(4))
      if (Math.abs(target - current) > 0.0006) raf = requestAnimationFrame(tick)
    }
    const onScroll = () => { if (tracking) measure() }

    const io = new IntersectionObserver(([e]) => {
      tracking = e.isIntersecting
      if (tracking) measure()
    }, { rootMargin: '200px 0px' })
    io.observe(section)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    measure()
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [reduced])

  const info = STAGES[stage]
  const showFinal = reduced || final
  const phase = showFinal ? 'done' : stage >= 5 ? 'late' : stage >= 2 ? 'mid' : 'raw'

  return (
    <section ref={sectionRef} className={`pi${reduced ? ' pi--static' : ''}`} aria-labelledby="pi-heading" style={{ '--p': reduced ? 1 : 0 }}>
      <div className="pi-bg" aria-hidden="true"><span className="pi-grid-bg" /><span className="pi-orb" /></div>
      <div ref={trackRef} className="pi-track">
        <div className="pi-sticky">
          <div className="pi-wrap">
            <div className="pi-copy">
              <span className="pi-eyebrow"><i aria-hidden="true" />The AltiusNxt approach</span>
              <h2 id="pi-heading" className="pi-title">
                <span>One product.</span>
                <span className="pi-accent">Seven intelligence</span>
                <span className="pi-accent">layers.</span>
                <span>Infinite possibilities.</span>
              </h2>
              <p className="pi-lede">
                Supplier data rarely arrives complete or consistent. AltiusNxt transforms fragmented circuit
                breaker information into a structured, validated and AI-ready product record — making it easier
                to publish, optimize and scale across channels.
              </p>
              <Link className="pi-cta" to="/how-it-works">See How It Works <Icon name="arrow-right" /></Link>
              <div className="pi-steps" aria-hidden="true">
                <div className="pi-steps-bar">
                  {STAGES.map((_, i) => <i key={i} className={i <= stage ? 'on' : ''} />)}
                </div>
                <span>{showFinal ? 'Record complete' : `Stage ${String(stage + 1).padStart(2, '0')} / 08`}</span>
              </div>
            </div>

            <div ref={stageRef} className="pi-stage" data-phase={phase}>
              {/* SVG connector layer shares the stage's coordinate space (desktop) */}
              <svg className="pi-links" viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true">
                {rawLinks.map((l) => {
                  const active = !reduced && stage === 0
                  return (
                    <g key={l.t} className={`pi-link raw${active ? ' active' : ''}`}>
                      <path className="pi-link-base" d={l.d} />
                      <path className="pi-link-draw" pathLength="1" d={l.d} />
                      {active && <circle r="2.6" className="pi-pulse"><animateMotion dur="2.6s" repeatCount="indefinite" path={l.d} /></circle>}
                    </g>
                  )
                })}
                {layerLinks.map((l, i) => {
                  const on = reduced || stage >= i + 1
                  const active = !reduced && stage === i + 1 && !final
                  return (
                    <g key={l.n} className={`pi-link layer${on ? ' on' : ''}${active ? ' active' : ''}`}>
                      <path className="pi-link-base" d={l.d} />
                      <path className="pi-link-draw" pathLength="1" d={l.d} />
                      <circle cx={l.sx} cy={l.sy} r="3.2" className="pi-node" />
                      {active && <circle r="3" className="pi-pulse"><animateMotion dur="2.8s" repeatCount="indefinite" path={l.d} /></circle>}
                    </g>
                  )
                })}
              </svg>

              <div className="pi-canvas">
                <div className="pi-frags" aria-hidden="true">
                  {rawLinks.map((c) => (
                    <span
                      key={c.t}
                      className={`pi-frag ${c.side === 'l' ? 'is-left' : 'is-right'}`}
                      style={{ top: pct(c.y - 14, H) }}
                    >{c.t}</span>
                  ))}
                </div>

                <div className="pi-product">
                  <span className="pi-glow" aria-hidden="true" />
                  <span className="pi-ring" aria-hidden="true" />
                  <div className="pi-product-in">
                    <img src={breakerImg} alt="Industrial moulded case circuit breaker" width="740" height="890" decoding="async" />
                  </div>
                </div>

                {!showFinal && (
                  <div className="pi-status">
                    <span className="pi-spin" aria-hidden="true" />
                    <span key={stage} className="pi-msg">{info.msg}</span>
                  </div>
                )}

                {!showFinal && (info.chips || info.rows || info.path) && (
                  <div key={`d${stage}`} className={`pi-detail${info.rows ? ' rows' : ''}`}>
                    {info.chips && info.chips.map((c, i) => (
                      <span key={c} className={`pi-chip${info.ok ? ' ok' : ''}`} style={{ '--i': i }}>{info.ok && <Tick />}{c}</span>
                    ))}
                    {info.rows && info.rows.map(([k, v], i) => (
                      <span key={k} className="pi-row" style={{ '--i': i }}><em>{k}</em><b>→ {v}</b></span>
                    ))}
                    {info.path && info.path.map((c, i) => (
                      <span key={c} className="pi-crumb" style={{ '--i': i }}>{c}{i < info.path.length - 1 && <u aria-hidden="true"><Icon name="chevron-right" size={14} /></u>}</span>
                    ))}
                  </div>
                )}

                {showFinal && (
                  <div className="pi-final">
                    <span className="pi-final-k">Product knowledge complete</span>
                    <div className="pi-final-chips">
                      {['Structured', 'AI-Enriched', 'Validated', 'Channel-Ready'].map((s, i) => (
                        <span key={s} style={{ '--i': i }}><Tick />{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ol className="pi-cards">
                {LAYERS.map((l, i) => {
                  const on = reduced || stage >= i + 1
                  const active = !reduced && stage === i + 1 && !final
                  return (
                    <li
                      key={l.n}
                      className={`pi-card side-${l.side}${on ? ' on' : ''}${active ? ' active' : ''}`}
                      style={{ top: pct(l.cy, H) }}
                    >
                      <div className="pi-card-top">
                        <span className="pi-card-ico">
                          <Icon name={ICONS[l.icon]} size={18} />
                        </span>
                        <span className="pi-card-n">{l.n}</span>
                      </div>
                      <h3>{l.title}</h3>
                      <p>{l.text}</p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

