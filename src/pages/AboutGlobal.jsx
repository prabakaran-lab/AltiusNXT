import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { MAP_SVG } from './globalMap.js'
import './AboutGlobal.css'
import Icon from '../components/ui/Icon.jsx'

/* Global presence — client countries by region, with the US office and the India delivery centre. */

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
const REGIONS = ['North America', 'Europe', 'Middle East & Africa', 'Asia-Pacific']
const PILLARS = ['Product data', 'Technology', 'Customer success', 'Digital commerce']
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

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (rm || !('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => { setStep(4) })
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

  return (
    <section ref={ref} className={cls} aria-labelledby="ag-title">
      <div className="ag-wrap">
        <div className="ag-copy">
          <p className="ag-eyebrow ag-r" style={{ '--d': '0ms' }}>Global presence</p>
          <h2 id="ag-title" className="ag-r" style={{ '--d': '80ms' }}>Global expertise. <span>Local delivery.</span></h2>
          <p className="ag-lede ag-r" style={{ '--d': '170ms' }}>
            From our offices in the United States and India, we have delivered product data enrichment projects for
            manufacturers and distributors in 15+ countries.
          </p>
          <p className="ag-statement ag-r" style={{ '--d': '250ms' }}>One connected team. 15+ countries. Engineer-verified product data.</p>
          <Link className="ag-btn ag-r" style={{ '--d': '320ms' }} to="/contact">Get in Touch <Icon name="arrow-right" /></Link>
        </div>

        {/* Desktop / tablet map */}
        <div className="ag-map-col">
          <div className="ag-map" dangerouslySetInnerHTML={{ __html: MAP_SVG }} />

          <p className="ag-clients">Clients in: USA, Canada, UK, Ireland, Netherlands, Belgium, France, Germany, Lithuania, Malta, UAE, South Africa, Kenya, Singapore, Australia and New Zealand.</p>

          <div className={`ag-final${step >= 4 ? ' on' : ''}`}>
            <p><b>Connected delivery network</b><span>Offices in USA &amp; India · Clients in 15+ countries</span></p>
            <ul>{PILLARS.map((t, i) => <li key={t} style={{ '--i': i }}>{t}</li>)}</ul>
          </div>
        </div>

        {/* Mobile vertical flow */}
        <div className="ag-flow" aria-label="Global delivery flow">
          <div className={`ag-step${step >= 1 ? ' on' : ''}`}><i aria-hidden="true" /><div><em>Build</em><strong>India · Coimbatore</strong><span>Product-data operations, technology development and support</span></div></div>
          <div className={`ag-step${step >= 2 ? ' on' : ''}`}><i aria-hidden="true" /><div><em>Connect</em><strong>United States · Farmington Hills</strong><span>Client engagement, strategic partnerships and global operations</span></div></div>
          <div className={`ag-step${step >= 3 ? ' on' : ''}`}><i aria-hidden="true" /><div><em>Deliver</em><strong>Clients in 15+ countries</strong><ul>{REGIONS.map((t) => <li key={t}>{t}</li>)}</ul></div></div>
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
