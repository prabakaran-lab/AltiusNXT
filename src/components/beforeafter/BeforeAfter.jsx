import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Check, Sparkles, UserCheck } from 'lucide-react'
import { TESYS } from '../sampleProduct.js'
import { ALL_ATTRS, PRODUCT } from '../walkthrough/data.js'
import './BeforeAfter.css'

/* Before / after as a transformation board: the raw supplier file on the left, a progress ring in the middle,
   and the finished product page on the right that fills in one attribute at a time. Plays while in view, then loops. */

const TOTAL = ALL_ATTRS.length // 17
const GIVEN = 5 // what the supplier sent
const T_IDLE = 1.4 // seconds showing the raw state
const T_FILL = 6.2 // seconds to fill the other 12
const T_HOLD = 4 // seconds the finished page stays before the loop restarts
const R = 54
const C = 2 * Math.PI * R

export default function BeforeAfter() {
  const rootRef = useRef(null)
  const [n, setN] = useState(GIVEN)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => { setSeen(true); setN(TOTAL) })
      return () => cancelAnimationFrame(f)
    }
    let raf = 0
    let t0 = 0
    let last = -1
    const frame = (now) => {
      if (!t0) t0 = now
      const t = (now - t0) / 1000
      const cycle = T_IDLE + T_FILL + T_HOLD
      const c = t % cycle
      const p = Math.min(1, Math.max(0, (c - T_IDLE) / T_FILL))
      const eased = p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2
      const v = GIVEN + Math.round(eased * (TOTAL - GIVEN))
      if (v !== last) { last = v; setN(v) }
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); t0 = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame) }
      else cancelAnimationFrame(raf)
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(rootRef.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  const done = n >= TOTAL
  const pct = Math.round((n / TOTAL) * 100)
  const enriched = n > GIVEN

  return (
    <section className={`ba${seen ? ' seen' : ''}`} ref={rootRef} aria-labelledby="ba-title">
      <div className="ba-wrap">
        <header className="ba-head">
          <p className="ba-eyebrow">Before &amp; after CatalogWiz</p>
          <h2 id="ba-title">Same supplier file. <em>A product page buyers can trust.</em></h2>
          <p className="ba-sub">Watch one raw supplier listing become a complete, human-verified product page.</p>
        </header>

        <div className="bx-board" role="img" aria-label={`Animated example: a supplier file with ${GIVEN} of ${TOTAL} product details becomes a product page with all ${TOTAL}, verified by a data specialist.`}>
          {/* 1 · what the supplier sent: the same product page, with only what the supplier provided */}
          <div className="bx-col bx-src">
            <p className="bx-label"><span>Before</span>What the supplier sent</p>
            <div className="bx-page raw">
              <div className="bx-page-bar"><i /><i /><i /><span>{PRODUCT.url}</span></div>
              <div className="bx-prod">
                <div className="bx-img"><img src={TESYS.images.front} alt="" /></div>
                <div className="bx-info">
                  <h3>{PRODUCT.raw}</h3>
                  <p className="bx-meta"><span>SKU {PRODUCT.sku}</span></p>
                  <p className="bx-desc">Motor circuit breaker 73A.</p>
                </div>
              </div>
              <ul className="bx-specs">
                {ALL_ATTRS.slice(0, GIVEN).map(([l, v]) => (
                  <li key={l} className="on"><em>{l}</em><b>{v}</b></li>
                ))}
              </ul>
            </div>
          </div>

          {/* 2 · the transformation */}
          <div className="bx-mid">
            <div className="bx-ring">
              <svg viewBox="0 0 140 140" aria-hidden="true">
                <circle className="trk" cx="70" cy="70" r={R} />
                <circle className="bar" cx="70" cy="70" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - n / TOTAL)} />
              </svg>
              <div className="num"><b>{pct}<small>%</small></b><span>{n} of {TOTAL}</span></div>
            </div>
            <ul className="bx-steps">
              <li className={enriched ? 'on' : ''}><Sparkles size={14} />AI fills the gaps</li>
              <li className={done ? 'on' : ''}><UserCheck size={14} />Expert verifies</li>
            </ul>
          </div>

          {/* 3 · the finished page */}
          <div className="bx-col bx-out">
            <p className="bx-label"><span className="after">After</span>What buyers see</p>
            <div className={`bx-page${done ? ' done' : ''}`}>
              <div className="bx-page-bar"><i /><i /><i /><span>{PRODUCT.url}</span></div>
              <div className="bx-prod">
                <div className="bx-img"><img src={TESYS.images.front} alt="" /></div>
                <div className="bx-info">
                  <h3>{n >= 8 ? PRODUCT.title : PRODUCT.raw}</h3>
                  <p className="bx-meta">
                    <span className={n >= 9 ? 'on' : ''}>{PRODUCT.maker}</span>
                    <span>SKU {PRODUCT.sku}</span>
                    <span className={done ? 'on ok' : ''}><BadgeCheck size={13} />Human-verified</span>
                  </p>
                  <p className={`bx-desc${n >= 12 ? ' on' : ''}`}>{n >= 12 ? PRODUCT.description : 'Motor circuit breaker 73A.'}</p>
                </div>
              </div>
              <ul className="bx-specs">
                {ALL_ATTRS.map(([l, v], i) => (
                  <li key={l} className={`${i < n ? 'on' : ''}${i >= GIVEN ? ' add' : ''}`}>
                    <em>{l}</em><b>{v}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ul className="ba-points">
          <li><Check size={14} strokeWidth={3} /><b>5 of 17 → 17 of 17</b> details filled from the datasheet</li>
          <li><Check size={14} strokeWidth={3} /><b>Structured</b> title, taxonomy, description and SEO</li>
          <li><Check size={14} strokeWidth={3} /><b>Human verified</b> before it goes live</li>
        </ul>
        <p className="ba-foot">Illustrative sample data · sample product TELGV3P73</p>
      </div>
    </section>
  )
}
