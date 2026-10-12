import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import './ImpactMetrics.css'
import Icon from './ui/Icon.jsx'

/* Editable content: the percentages are marketing values, not certified claims. */
const METRICS = [
  { value: 80, label: 'Faster product onboarding', text: 'Reduce manual setup and move products from source files to structured records faster.', icon: 'bolt', visual: 'line' },
  { value: 70, label: 'Improved search visibility', text: 'Complete taxonomy, attributes and specifications improve product discoverability.', icon: 'search', visual: 'spark' },
  { value: 90, label: 'Product data completeness', text: 'Fill missing content, normalize specifications and validate required fields.', icon: 'layers', visual: 'ring' },
  { value: 60, label: 'Fewer content bottlenecks', text: 'Reduce repetitive manual enrichment, review and publishing tasks.', icon: 'flow', visual: 'bars' },
]

const OUTCOMES = [
  { title: 'Faster time to market', text: 'Enrich and publish products sooner across connected channels.', icon: 'clock' },
  { title: 'Consistent product data', text: 'Standardized taxonomy, attributes, units and specifications.', icon: 'check' },
  { title: 'Channel-ready content', text: 'One enriched product record prepared for ecommerce, marketplaces and PIM systems.', icon: 'channels' },
]

const STAGES = ['Source Data', 'Enrichment', 'Validation', 'Publish', 'Business Impact']

const ICONS = { bolt: 'zap', search: 'scan', layers: 'layers', flow: 'workflow', clock: 'clock', check: 'shield', channels: 'share' }

const Svg = ({ name, size = 22 }) => <Icon name={ICONS[name]} size={size} />

/* Small supporting visuals — they illustrate the number, they are not charts. */
const Visual = ({ kind, value }) => {
  if (kind === 'line') {
    return <span className="im-vis im-line" aria-hidden="true"><span style={{ '--w': `${value}%` }} /></span>
  }
  if (kind === 'spark') {
    return (
      <svg className="im-vis im-spark" viewBox="0 0 120 28" aria-hidden="true">
        <path pathLength="1" d="M2 24 C16 22 22 20 34 18 S52 20 64 13 S88 12 98 7 S112 4 118 3" />
        <circle cx="118" cy="3" r="2.6" />
      </svg>
    )
  }
  if (kind === 'ring') {
    return (
      <svg className="im-vis im-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle className="im-ring-bg" cx="18" cy="18" r="14" />
        <circle className="im-ring-fg" cx="18" cy="18" r="14" pathLength="100" style={{ '--dash': value }} transform="rotate(-90 18 18)" />
      </svg>
    )
  }
  return (
    <span className="im-vis im-bars" aria-hidden="true">
      <span className="im-bar-before" />
      <span className="im-bar-after" style={{ '--w': `${100 - value}%` }} />
    </span>
  )
}

function Counter({ to, start, reduced }) {
  const [n, setN] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced || !start) return undefined
    let raf = 0
    let t0 = 0
    const dur = 1100
    const tick = (t) => {
      if (!t0) t0 = t
      const p = Math.min((t - t0) / dur, 1)
      setN(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, to, reduced])
  return <>{n}</>
}

export default function ImpactMetrics() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [reduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reduced || !('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect() } // reveal + count only once
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  return (
    <section ref={ref} className={`im${visible ? ' is-visible' : ''}${reduced ? ' is-static' : ''}`} aria-labelledby="im-heading">
      <div className="im-wrap">
        <div className="im-intro">
          <p className="im-eyebrow im-rise" style={{ '--d': '0ms' }}>Real business impact</p>
          <h2 id="im-heading" className="im-rise" style={{ '--d': '80ms' }}>Measurable improvements across your product data workflow.</h2>
          <p className="im-lede im-rise" style={{ '--d': '200ms' }}>
            Turn incomplete supplier data into structured, enriched and channel-ready product content — with less manual effort and faster time to market.
          </p>
          <p className="im-proof im-rise" style={{ '--d': '280ms' }}>From supplier intake to enrichment, validation and multi-channel publishing.</p>
          <Link to="/how-it-works" className="im-cta im-rise" style={{ '--d': '360ms' }}>See how the Workbench works <Icon name="arrow-right" /></Link>
        </div>

        <div className="im-metrics">
          <div className="im-path im-rise" style={{ '--d': '300ms' }} aria-hidden="true">
            <span className="im-path-label">From product data to business outcomes</span>
            <div className="im-path-track">
              <span className="im-path-fill" />
              {STAGES.map((s, i) => (
                <span key={s} className="im-node" style={{ '--i': i }}><i /><em>{s}</em></span>
              ))}
            </div>
          </div>

          <ul className="im-grid">
            {METRICS.map((m, i) => (
              <li key={m.label} className="im-card im-rise" style={{ '--d': `${420 + i * 100}ms` }}>
                <article>
                  <span className="im-card-top">
                    <span className="im-index">0{i + 1}</span>
                    <span className="im-icon"><Svg name={m.icon} /></span>
                  </span>
                  <p className="im-value"><Counter to={m.value} start={visible} reduced={reduced} /><span>%</span></p>
                  <h3>{m.label}</h3>
                  <p className="im-text">{m.text}</p>
                  <Visual kind={m.visual} value={m.value} />
                </article>
              </li>
            ))}
          </ul>
        </div>

        <ul className="im-outcomes im-rise" style={{ '--d': '1000ms' }}>
          {OUTCOMES.map((o) => (
            <li key={o.title}>
              <span className="im-out-icon"><Svg name={o.icon} size={18} /></span>
              <div><strong>{o.title}</strong><p>{o.text}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
