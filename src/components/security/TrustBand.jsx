import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import iso9001 from '../../assets/awards/tuv-iso-9001.png'
import iso27001 from '../../assets/awards/tuv-iso-27001.png'
import b2bea from '../../assets/awards/b2bea-member-badge.svg'
import './TrustBand.css'

/* Four gates every value passes before it is published. Sample value only. */
const GATES = [
  { t: 'AI suggests', d: 'CatalogWiz AI extracts the value and cites its source.', chip: 'Voltage rating · 690 V ac' },
  { t: 'Human verification', d: 'A person checks it against the manufacturer document.', chip: 'Datasheet p.2 · matches' },
  { t: 'Quality gate', d: 'Attributes, taxonomy and SEO are checked before release.', chip: '17 of 17 checks passed' },
  { t: 'You approve', d: 'Nothing is published until you sign off.', chip: 'Approved' },
]
const STEP = 2.1
const LOOP = STEP * GATES.length + 3
const BADGES = [
  { src: iso9001, name: 'ISO 9001', sub: 'Quality management' },
  { src: iso27001, name: 'ISO 27001', sub: 'Information security' },
]
const FACTS = [['Since 2007', 'in industrial product data'], ['Every value', 'checked by an engineer']]

export default function TrustBand() {
  const ref = useRef(null)
  const st = useRef({ t: 0, visible: false, reduced: false })
  const [t, setT] = useState(0)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const s = st.current
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => { s.reduced = mq.matches; if (mq.matches) setT(STEP * GATES.length + 0.5) }
    read()
    mq.addEventListener('change', read)
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; if (e.isIntersecting) setSeen(true) }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(ref.current)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (s.visible && !s.reduced && !document.hidden) {
        s.t = (s.t + dt) % LOOP
        acc += dt
        if (acc >= 0.04) { acc = 0; setT(s.t) }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); mq.removeEventListener('change', read); io.disconnect() }
  }, [])

  const complete = t >= STEP * GATES.length
  const cur = complete ? -1 : Math.floor(t / STEP)
  const line = Math.min(1, t / (STEP * (GATES.length - 1) + STEP * 0.6))

  return (
    <section className={`tb${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="tb-title">
      <div className="tb-wrap">
        <header className="tb-head">
          <p className="tb-eyebrow">Data quality &amp; security</p>
          <h2 id="tb-title">Every value checked by an engineer, <em>not left to your team.</em></h2>
          <p className="tb-sub">Most AI enrichment tools hand the checking back to your staff. We don’t. An AltiusNxt product data engineer verifies each value against the manufacturer document and records where it came from. Each value passes four quality checks before it is published. Found a wrong value? We correct it free, because we carry the accuracy risk, not you.</p>
        </header>

        <div className="tb-card">
          <ol className="tb-gates" aria-label="How every value earns trust">
            <span className="line" aria-hidden="true"><i style={{ transform: `scaleX(${line})` }} /></span>
            {GATES.map((g, i) => {
              const on = complete || i < cur
              const now = i === cur
              return (
                <li key={g.t} className={`${on ? 'on' : ''}${now ? ' now' : ''}`}>
                  <span className="n">{on ? <Check size={14} strokeWidth={3.4} /> : i + 1}</span>
                  <b>{g.t}</b>
                  <small>{g.d}</small>
                  <em className="chip">{g.chip}</em>
                </li>
              )
            })}
          </ol>

          <div className="tb-proof">
            <div className="certs">
              {BADGES.map((b) => (
                <figure key={b.name}>
                  <img src={b.src} alt={`${b.name} certification`} loading="lazy" />
                  <figcaption><b>{b.name}</b><small>{b.sub}</small></figcaption>
                </figure>
              ))}
            </div>
            <ul className="facts">
              {FACTS.map(([n, l]) => <li key={l}><b>{n}</b><small>{l}</small></li>)}
            </ul>
            <p className="mem"><img src={b2bea} alt="" loading="lazy" /><span>Member, B2B Ecommerce Association (2026)</span></p>
          </div>
        </div>
      </div>
    </section>
  )
}
