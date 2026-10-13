import { useCallback, useEffect, useRef, useState } from 'react'
import './AboutJourney.css'
import UiIcon from '../components/ui/Icon.jsx'

/* Our Journey — interactive company timeline.
   One active milestone at a time; rail years are buttons; the section steps through the
   milestones once when it scrolls into view and stops as soon as the visitor interacts. */

const MILESTONES = [
  { year: '2007', title: 'Company founded', text: 'AltiusNxt founded by Mr. Vellayan.', tag: 'Foundation', icon: 'flag', art: 'plain' },
  { year: '2010', title: 'Team expansion', text: 'Expanded to a 50-member team.', tag: 'Team growth', icon: 'team', art: 'plain' },
  { year: '2012', title: 'Scaling up', text: 'Grew to 100+ employees.', tag: 'Scale', icon: 'scale', art: 'plain' },
  { year: '2014', title: '100th client', text: 'AltiusNxt welcomed its 100th client.', tag: 'Customer success', icon: 'star', art: 'plain' },
  { year: '2017', title: 'PIM & eCommerce', text: 'First PIM and eCommerce builds.', tag: 'Digital commerce', icon: 'cart', art: 'grid' },
  { year: '2020', title: 'Clients worldwide', text: 'Clients across Europe and Asia-Pacific.', tag: 'Global expansion', icon: 'globe', art: 'globe' },
  { year: '2025', title: 'ISO certified', text: 'ISO 9001 and ISO 27001 certified.', tag: 'Trust & certification', icon: 'shield', art: 'seal' },
  { year: '2026', title: 'CatalogWiz AI', text: 'CatalogWiz AI launched.', tag: 'AI-enabled product data', icon: 'flow', art: 'dots' },
]

const ICONS = { flag: 'flag', team: 'users', scale: 'chart', star: 'star', cart: 'cart', globe: 'globe', shield: 'shield', flow: 'workflow' }
const Icon = ({ name, size = 22 }) => <UiIcon name={ICONS[name]} size={size} />

const FORMULA = ['Product-data expertise', 'AI-enabled Workbench', 'Human review']
const STEP_MS = 1700
const LAST = MILESTONES.length - 1

export default function AboutJourney() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  const [active, setActive] = useState(0)
  const hover = useRef(false)
  const touched = useRef(false)
  const reduced = useRef(false)

  // Enter animation + one automatic pass through the timeline.
  useEffect(() => {
    const el = ref.current
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el) return undefined
    if (reduced.current || !('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => { setOn(true); setActive(LAST) })
      return () => cancelAnimationFrame(f)
    }
    let timer
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      setOn(true)
      timer = setInterval(() => {
        if (touched.current) { clearInterval(timer); return }
        if (hover.current) return
        setActive((a) => {
          if (a >= LAST) { clearInterval(timer); return a }
          return a + 1
        })
      }, STEP_MS)
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(el)
    return () => { io.disconnect(); clearInterval(timer) }
  }, [])

  const go = useCallback((i) => {
    touched.current = true
    setActive(Math.max(0, Math.min(LAST, i)))
  }, [])

  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(active + 1); focusItem(active + 1) }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(active - 1); focusItem(active - 1) }
    if (e.key === 'Home') { e.preventDefault(); go(0); focusItem(0) }
    if (e.key === 'End') { e.preventDefault(); go(LAST); focusItem(LAST) }
  }
  const focusItem = (i) => {
    const b = ref.current?.querySelectorAll('.aj-btn')[Math.max(0, Math.min(LAST, i))]
    if (b) b.focus()
  }

  const m = MILESTONES[active]

  return (
    <section ref={ref} id="journey" className={`aj${on ? ' on' : ''}`} aria-labelledby="aj-title">
      <div className="aj-wrap">
        <header className="aj-head">
          <p className="aj-eyebrow aj-r" style={{ '--d': '0ms' }}>Our journey</p>
          <h2 id="aj-title" className="aj-r" style={{ '--d': '80ms' }}>From a small team to a <span>trusted global partner.</span></h2>
          <p className="aj-intro aj-r" style={{ '--d': '170ms' }}>
            Our journey has been shaped by product-data expertise, customer trust, digital commerce and a continuous focus on
            helping manufacturers and distributors manage complex product information better.
          </p>
        </header>

        <ol className="aj-rail" onMouseEnter={() => { hover.current = true }} onMouseLeave={() => { hover.current = false }} aria-label="Company milestones">
          {MILESTONES.map((it, i) => {
            const state = i === active ? 'active' : i < active ? 'done' : 'future'
            return (
              <li key={it.year} className={`aj-item ${state}`} style={{ '--i': i }}>
                {i < LAST && <span className="aj-seg" aria-hidden="true"><i /></span>}
                <button type="button" className="aj-btn" aria-current={i === active ? 'step' : undefined} aria-expanded={i === active} onClick={() => go(i)} onKeyDown={onKey}>
                  <span className="aj-dot" aria-hidden="true" />
                  <span className="aj-yr">{it.year}</span>
                  <span className="aj-tt">{it.title}</span>
                </button>
                <div className="aj-m-detail">
                  <div className="aj-m-inner">
                    <p className="aj-tag">{it.tag}</p>
                    <p>{it.text}</p>
                    {i === LAST && <p className="aj-next">The next chapter: trusted product data for an AI-first commerce world.</p>}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        <div className={`aj-panel art-${m.art}`} onMouseEnter={() => { hover.current = true }} onMouseLeave={() => { hover.current = false }} aria-live="polite">
          <div className="aj-art" aria-hidden="true" />
          <div className="aj-pbody" key={m.year}>
            <p className="aj-tag"><span className="aj-ico"><Icon name={m.icon} size={18} /></span>{m.tag}</p>
            <div className="aj-pyear">{m.year}</div>
            <h3>{m.title}</h3>
            <p className="aj-text">{m.text}</p>
            {active === LAST && (
              <div className="aj-final">
                <ul>
                  {FORMULA.map((t, i) => <li key={t}>{i > 0 && <b aria-hidden="true">+</b>}<span>{t}</span></li>)}
                  <li><b aria-hidden="true"><UiIcon name="arrow-right" size={14} /></b><strong>CatalogWiz</strong></li>
                </ul>
                <p className="aj-next">The next chapter: trusted product data for an AI-first commerce world.</p>
              </div>
            )}
          </div>
          <div className="aj-ctrl">
            <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous milestone"><UiIcon name="arrow-left" /> Previous</button>
            <span>{String(active + 1).padStart(2, '0')} / {String(MILESTONES.length).padStart(2, '0')}</span>
            <button type="button" onClick={() => go(active + 1)} disabled={active === LAST} aria-label="Next milestone">Next <UiIcon name="arrow-right" /></button>
          </div>
        </div>
      </div>
    </section>
  )
}
