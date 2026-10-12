import { useEffect, useRef, useState } from 'react'
import { MAP, DOTS } from './worldDots.js'
import './AboutGlobal.css'
import Icon from '../components/ui/Icon.jsx'

/* Global presence — India operations → United States engagement → global delivery.
   A short timeline of steps (0–4) drives the map and the mobile flow. */

const pt = (lat, lon) => ({
  x: ((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0)) * MAP.w,
  y: ((MAP.lat0 - lat) / (MAP.lat0 - MAP.lat1)) * MAP.h,
})
const NODES = {
  in: { ...pt(11.0, 76.96), name: 'India', city: 'Coimbatore' },
  us: { ...pt(42.5, -83.4), name: 'United States', city: 'Farmington Hills' },
  americas: { ...pt(-14, -58), name: 'Americas' },
  europe: { ...pt(50, 9), name: 'Europe' },
  emea: { ...pt(9, 29), name: 'EMEA' },
  apac: { ...pt(33, 116), name: 'APAC' },
}
const arc = (a, b, lift = 0.3) => {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * lift
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
}
const ROUTES = [
  { id: 'main', from: 'in', to: 'us', lift: 0.28, step: 2, focus: 'main' },
  { id: 'apac', from: 'in', to: 'apac', lift: 0.25, step: 3, focus: 'gl' },
  { id: 'emea', from: 'in', to: 'emea', lift: 0.3, step: 3, focus: 'gl' },
  { id: 'europe', from: 'us', to: 'europe', lift: 0.22, step: 3, focus: 'gl' },
  { id: 'americas', from: 'us', to: 'americas', lift: 0.2, step: 3, focus: 'gl' },
].map((r) => ({ ...r, d: arc(NODES[r.from], NODES[r.to], r.lift) }))

const OFFICES = {
  us: {
    key: 'us', title: 'United States', city: 'Farmington Hills, Michigan',
    address: ['31700 West Thirteen Mile Road, Suite 205', 'Farmington Hills, MI 48334'],
    role: ['Client engagement', 'Strategic partnerships', 'Global operations'], tag: 'Connect',
  },
  in: {
    key: 'in', title: 'India', city: 'Coimbatore, Tamil Nadu',
    address: ['56-C, Bharathi Park, 2nd Cross', 'Saibaba Colony, Coimbatore, Tamil Nadu 641011'],
    role: ['Product-data operations', 'Technology development', 'Support'], tag: 'Build',
  },
}
const REGIONS = ['americas', 'europe', 'emea', 'apac']
const PILLARS = ['Product data', 'Technology', 'Customer success', 'Digital commerce']
const pc = (n) => ({ left: `${(n.x / MAP.w) * 100}%`, top: `${(n.y / MAP.h) * 100}%` })

const Pin = () => <Icon name="pin" size={16} />

const OfficeBlock = ({ o, focus, setFocus }) => (
  <article
    className={`ag-office${focus === o.key ? ' on' : ''}`}
    tabIndex={0}
    onMouseEnter={() => setFocus(o.key)} onMouseLeave={() => setFocus(null)}
    onFocus={() => setFocus(o.key)} onBlur={() => setFocus(null)}
  >
    <h3><Pin />{o.title}<small>{o.city}</small></h3>
    <address>{o.address.map((l) => <span key={l}>{l}</span>)}</address>
    <p>{o.role.join(' · ')}</p>
  </article>
)

export default function AboutGlobal() {
  const ref = useRef(null)
  const [step, setStep] = useState(0)
  const [focus, setFocus] = useState(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (rm || !('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => { setReduced(rm); setStep(4) })
      return () => cancelAnimationFrame(f)
    }
    const timers = []
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      ;[[200, 1], [1100, 2], [2300, 3], [3300, 4]].forEach(([ms, s]) => timers.push(setTimeout(() => setStep(s), ms)))
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(el)
    return () => { io.disconnect(); timers.forEach(clearTimeout) }
  }, [])

  const cls = `ag s${step}${focus ? ` f-${focus}` : ''}`
  const lit = (r) => step >= r.step
  const bind = (k) => ({
    onMouseEnter: () => setFocus(k), onMouseLeave: () => setFocus(null), onFocus: () => setFocus(k), onBlur: () => setFocus(null),
  })

  return (
    <section ref={ref} className={cls} aria-labelledby="ag-title">
      <div className="ag-wrap">
        <div className="ag-copy">
          <p className="ag-eyebrow ag-r" style={{ '--d': '0ms' }}>Global presence</p>
          <h2 id="ag-title" className="ag-r" style={{ '--d': '80ms' }}>Global expertise. <span>Local delivery.</span></h2>
          <p className="ag-lede ag-r" style={{ '--d': '170ms' }}>
            With teams in India and the United States, AltiusNxt combines product-data operations, technology expertise and
            customer engagement to support manufacturers and distributors across global markets.
          </p>
          <p className="ag-statement ag-r" style={{ '--d': '250ms' }}>One connected team. Multiple regions. Consistent product-data delivery.</p>
          <a className="ag-btn ag-r" style={{ '--d': '320ms' }} href="mailto:sales@altiusnxt.com?subject=Get%20in%20touch">Get in Touch <Icon name="arrow-right" /></a>
        </div>

        {/* Desktop / tablet map */}
        <div className="ag-map-col">
          <div className="ag-map" role="group" aria-label="Map: product-data operations in India connect to client engagement in the United States and to global markets">
            <svg viewBox={`0 0 ${MAP.w} ${MAP.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
              <path className="ag-dots" d={DOTS} />
              {ROUTES.map((r) => (
                <g key={r.id} className={`ag-route ${r.focus}${lit(r) ? ' on' : ''}`}>
                  <path className="base" d={r.d} />
                  <path className="line" d={r.d} pathLength="1" />
                  {lit(r) && !reduced && (
                    <circle r="3.4" className="pulse">
                      <animateMotion dur={r.id === 'main' ? '2.6s' : '3.2s'} repeatCount="indefinite" path={r.d} />
                    </circle>
                  )}
                </g>
              ))}
              {Object.entries(NODES).map(([k, n]) => (
                <g key={k} className={`ag-node ${k}${k === 'in' || k === 'us' ? ' main' : ''}${(k === 'in' && step >= 1) || (k === 'us' && step >= 2) || (k !== 'in' && k !== 'us' && step >= 3) ? ' on' : ''}`}>
                  <circle className="ring" cx={n.x} cy={n.y} r="7" />
                  <circle className="dot" cx={n.x} cy={n.y} r={k === 'in' || k === 'us' ? 6 : 3.6} />
                </g>
              ))}
            </svg>

            <button type="button" className={`ag-lab main in${step >= 1 ? ' on' : ''}`} style={pc(NODES.in)} {...bind('in')}>
              <em>Build</em><strong>India</strong><span>Product data operations · Technology development · Support</span>
            </button>
            <button type="button" className={`ag-lab main us${step >= 2 ? ' on' : ''}`} style={pc(NODES.us)} {...bind('us')}>
              <em>Connect</em><strong>United States</strong><span>Client engagement · Strategic partnerships · Global operations</span>
            </button>
            {REGIONS.map((k) => (
              <span key={k} className={`ag-lab reg ${k}${step >= 3 ? ' on' : ''}`} style={pc(NODES[k])}>{NODES[k].name}</span>
            ))}
          </div>

          <div className={`ag-final${step >= 4 ? ' on' : ''}`}>
            <p><b>Connected delivery network</b><span>India <i aria-hidden="true">↔</i> United States <i aria-hidden="true">↔</i> Global markets</span></p>
            <ul>{PILLARS.map((t, i) => <li key={t} style={{ '--i': i }}>{t}</li>)}</ul>
          </div>
        </div>

        {/* Mobile vertical flow */}
        <div className="ag-flow" aria-label="Global delivery flow">
          <div className={`ag-step${step >= 1 ? ' on' : ''}`}><i aria-hidden="true" /><div><em>Build</em><strong>India · Coimbatore</strong><span>Product-data operations, technology development and support</span></div></div>
          <div className={`ag-step${step >= 2 ? ' on' : ''}`}><i aria-hidden="true" /><div><em>Connect</em><strong>United States · Farmington Hills</strong><span>Client engagement, strategic partnerships and global operations</span></div></div>
          <div className={`ag-step${step >= 3 ? ' on' : ''}`}><i aria-hidden="true" /><div><em>Deliver</em><strong>Global markets</strong><ul>{['Americas', 'Europe / EMEA', 'APAC'].map((t) => <li key={t}>{t}</li>)}</ul></div></div>
        </div>

        <div className="ag-offices ag-r" style={{ '--d': '420ms' }}>
          <OfficeBlock o={OFFICES.us} focus={focus} setFocus={setFocus} />
          <OfficeBlock o={OFFICES.in} focus={focus} setFocus={setFocus} />
        </div>
        <div className="ag-acc">
          {[OFFICES.in, OFFICES.us].map((o) => (
            <details key={o.key}>
              <summary><Pin />{o.title}<small>View office details</small></summary>
              <address>{o.address.map((l) => <span key={l}>{l}</span>)}</address>
              <p>{o.role.join(' · ')}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
