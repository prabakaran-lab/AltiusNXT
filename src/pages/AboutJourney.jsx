import { useCallback, useEffect, useRef, useState } from 'react'
import './AboutJourney.css'
import UiIcon from '../components/ui/Icon.jsx'

/* Our Journey — interactive company timeline.
   One active milestone at a time; rail years are buttons; the section steps through the
   milestones once when it scrolls into view and stops as soon as the visitor interacts. */

const MILESTONES = [
  { year: '2007', title: 'AltiusNxt is founded', text: 'Founded by Mr. Vellayan to help companies reach revenue goals by enriching their product content.', tag: 'Inception', icon: 'flag', art: 'plain', detail: 'Inception of AltiusNxt Technologies Pvt Ltd, with a clear vision: help companies reach their revenue goals through better product content.', stat: ['2007', 'Year founded'] },
  { year: '2010', title: 'Full-fledged company', text: 'A team of 50 building online data for industrial product catalogs.', tag: 'Team growth', icon: 'team', art: 'plain', detail: 'Reached a team size of 50, creating online data for a wide range of industrial product catalogs.', stat: ['50', 'Team members'] },
  { year: '2012', title: '100 employees and growing', text: 'One of the fastest-growing companies in the industry, with 100+ people.', tag: 'Scale', icon: 'scale', art: 'plain', detail: 'Became one of the fastest-growing companies in the industry, with over 100 employees and still growing at a steady pace.', stat: ['100+', 'Employees'] },
  { year: '2014', title: '1 billion USD', text: 'We helped one client reach a turnover of 1 billion USD.', tag: 'Client impact', icon: 'star', art: 'plain', detail: 'Our enriched product data helped one of our clients reach a turnover of 1 billion USD.', stat: ['$1B', 'Client turnover'] },
  { year: '2017', title: 'Additional offerings', text: 'Partnered with leading PIM and eCommerce platforms and began building eCommerce stores for clients.', tag: 'Digital commerce', icon: 'cart', art: 'grid', detail: 'Partnered with several PIM and eCommerce platforms and started developing successful eCommerce stores for our clients.', stat: ['PIM + eCommerce', 'Platform partners'] },
  { year: '2020', title: 'Expanding beyond horizon', text: 'Clients across the Americas, EU, EMEA and APAC.', tag: 'Global expansion', icon: 'globe', art: 'globe', detail: 'With clients across the Americas, EU, EMEA and APAC, we are set to expand beyond the horizon with multiple service offerings.', stat: ['4 regions', 'Americas · EU · EMEA · APAC'] },
  { year: '2025', title: 'ISO certified', text: 'ISO 9001 and ISO 27001 certified.', tag: 'Trust & certification', icon: 'shield', art: 'seal', detail: 'Independently audited for quality and information security, so your supplier files and product data stay protected.', stat: ['2', 'ISO certifications'] },
  { year: '2026', title: 'CatalogWiz AI', text: 'We launched CatalogWiz AI: AI-enriched, human-verified product data, ready for AI search and UCP-based AI shopping agents.', tag: 'AI-enabled product data', icon: 'flow', art: 'dots', detail: 'Our newest chapter: AI does the heavy lifting, experts verify every value, and the data is ready for AI search.', stat: ['AI + experts', 'Human-verified data'] },
]

// Animated line-art for the active milestone: strokes draw in, shapes pop, then ambient motion keeps looping
const D = ({ key, ...p }) => <path key={key} pathLength="1" className="d" {...p} />
const Flow = ({ path, n = 3, dur = 3, base = 0, r = 4, cls = 'dotfill' }) => Array.from({ length: n }, (_, i) => (
  <circle key={i} r={r} className={cls}>
    <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${base + (i * dur) / n}s`} path={path} />
  </circle>
))
const person = (x, y, s = 1) => <g transform={`translate(${x} ${y}) scale(${s})`}><circle cx="0" cy="-4" r="6" /><path d="M-11 14 Q0 -2 11 14" /></g>

function Count({ to, fmt = (v) => v, x = 200, y = 144, size = 42 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    let t0 = 0
    const f = (t) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / 1700)
      setN(to * (1 - (1 - p) ** 3))
      if (p < 1) raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <text className="num" x={x} y={y} textAnchor="middle" style={{ fontSize: size }}>{fmt(n)}</text>
}

const SCENES = {
  // 2007 · where it began: one point ripples out into a growing network
  2007: (
    <>
      <circle cx="200" cy="130" r="104" className="soft dash spin slowest" />
      <circle className="ping" cx="200" cy="130" r="42" />
      <circle className="ping late" cx="200" cy="130" r="42" />
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i / 8) * Math.PI * 2 + Math.PI / 8
        const x1 = 200 + Math.cos(t) * 50
        const y1 = 130 + Math.sin(t) * 50
        const x2 = 200 + Math.cos(t) * 104
        const y2 = 130 + Math.sin(t) * 104
        return (
          <g key={i}>
            {D({ d: `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, className: 'd hi', style: { '--i': 4 + i } })}
            <g className="pop" style={{ '--i': 7 + i }}><circle cx={x2} cy={y2} r="8" className="node" /><circle cx={x2} cy={y2} r="3.5" className="dotfill" /></g>
          </g>
        )
      })}
      <Flow path="M200 26 A104 104 0 1 1 199.9 26" n={2} dur={7} base={2} r={4.5} />
      <g className="pop" style={{ '--i': 1 }}>
        <circle cx="200" cy="130" r="42" className="node hi" />
        <text className="cap lg" x="200" y="120" textAnchor="middle">EST.</text>
        <text className="num sm" x="200" y="146" textAnchor="middle" style={{ fontSize: 28, fill: '#ff6a1a' }}>2007</text>
      </g>
      <text className="cap" x="200" y="254" textAnchor="middle" style={{ '--i': 14 }}>FOUNDED BY MR. VELLAYAN</text>
    </>
  ),
  // 2010 · team grows: people join around a hub
  2010: (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const t = (i / 12) * Math.PI * 2 - Math.PI / 2
        const x = 200 + Math.cos(t) * 100
        const y = 125 + Math.sin(t) * 86
        return (
          <g key={i}>
            {D({ d: `M200 125 L${x.toFixed(1)} ${y.toFixed(1)}`, className: 'd soft', style: { '--i': i } })}
            <g className="pop" style={{ '--i': i + 2 }}><circle cx={x} cy={y} r="17" className="node" /><g className="hi">{person(x, y + 1, 0.8)}</g></g>
          </g>
        )
      })}
      <circle className="ping" cx="200" cy="125" r="30" />
      <circle className="ping late" cx="200" cy="125" r="30" />
      <g className="pop" style={{ '--i': 14 }}><circle cx="200" cy="125" r="30" className="sunfill hi" /><text className="num sm" x="200" y="134" textAnchor="middle">50</text></g>
      <text className="cap" x="200" y="252" textAnchor="middle" style={{ '--i': 16 }}>50-MEMBER TEAM</text>
    </>
  ),
  // 2012 · scaling: area chart wipes in, a marker rides the line
  2012: (
    <>
      {[60, 120, 180].map((y, i) => D({ key: y, d: `M30 ${y} H380`, className: 'd soft', style: { '--i': i } }))}
      <path className="area" d="M30 215 L110 190 L190 150 L270 95 L370 30 V230 H30 Z" />
      {D({ d: 'M30 215 L110 190 L190 150 L270 95 L370 30', className: 'd hi', style: { '--i': 3 } })}
      {[[110, 190, ''], [190, 150, '50'], [270, 95, '75'], [370, 30, '100+']].map(([x, y, l], i) => (
        <g key={x} className="pop" style={{ '--i': 8 + i * 2 }}>
          <circle cx={x} cy={y} r="6" className="node hi" />
          {l && <text className="cap lg" x={x} y={y - 14} textAnchor="middle">{l}</text>}
        </g>
      ))}
      <circle r="6" className="dotfill"><animateMotion dur="4s" repeatCount="indefinite" begin="2.2s" path="M30 215 L110 190 L190 150 L270 95 L370 30" /></circle>
      <text className="cap" x="200" y="252" textAnchor="middle" style={{ '--i': 14 }}>100+ EMPLOYEES</text>
    </>
  ),
  // 2014 · 1 billion USD: coin stacks grow under a rising arrow
  2014: (
    <>
      {D({ d: 'M16 228 H384', style: { '--i': 0 } })}
      {[[100, 3], [200, 5], [300, 8]].map(([x, n], k) => (
        <g key={x}>
          {Array.from({ length: n }, (_, i) => {
            const cy = 218 - i * 12
            const top = i === n - 1
            return (
              <g key={i} className="pop" style={{ '--i': 2 + k * 4 + i * 0.6 }}>
                <path d={`M${x - 34} ${cy} v8 a34 9 0 0 0 68 0 v-8`} className="node" />
                <ellipse cx={x} cy={cy} rx="34" ry="9" className={top ? 'sunfill hi' : 'node'} />
              </g>
            )
          })}
        </g>
      ))}
      {D({ d: 'M54 150 Q170 140 250 92 T338 38', className: 'd hi thick', style: { '--i': 8 } })}
      {D({ d: 'M312 36 L340 36 L334 62', className: 'd hi thick', style: { '--i': 14 } })}
      <g className="pop" style={{ '--i': 1 }}>
        <rect x="20" y="12" width="150" height="64" rx="16" className="node hi" />
        <Count to={1} fmt={(v) => `$${v.toFixed(1)}B`} x={95} y={56} size={36} />
      </g>
      <text className="cap" x="95" y="94" textAnchor="middle" style={{ '--i': 6 }}>CLIENT TURNOVER</text>
      <circle r="5" className="dotfill"><animateMotion dur="3.4s" repeatCount="indefinite" begin="2.6s" path="M54 150 Q170 140 250 92 T338 38" /></circle>
    </>
  ),
  // 2017 · PIM + eCommerce: files flow through a PIM hub into a storefront
  2017: (
    <>
      {[70, 125, 180].map((y, i) => (
        <g key={y} className="pop" style={{ '--i': i }}><rect x="14" y={y - 16} width="46" height="34" rx="6" className="node" /><path d={`M24 ${y - 6} H50 M24 ${y + 4} H44`} /></g>
      ))}
      {['M62 86 C120 86 130 130 168 130', 'M62 142 H168', 'M62 197 C120 197 130 130 168 130'].map((d, i) => <g key={d}><path d={d} className="soft" /><Flow path={d} n={2} dur={2.6} base={i * 0.5} /></g>)}
      <g className="pop" style={{ '--i': 5 }}>
        <g transform="translate(200 130)"><g className="spin"><circle r="34" className="node hi" strokeDasharray="10 7" /></g><circle r="22" className="sunfill hi" /><text className="cap lg" y="4" textAnchor="middle">PIM</text></g>
      </g>
      <path d="M234 130 H298" className="soft" />
      <Flow path="M234 130 H298" n={3} dur={1.8} base={0.3} cls="dotfill big" />
      <g className="pop" style={{ '--i': 7 }}>
        <rect x="298" y="62" width="92" height="136" rx="10" className="node" />
        <path d="M298 82 H390" /><circle cx="308" cy="72" r="2.5" className="dotfill" /><circle cx="318" cy="72" r="2.5" className="dotfill" />
      </g>
      {[[308, 94], [352, 94], [308, 146], [352, 146]].map(([x, y], i) => (
        <g key={x + y} className="pop" style={{ '--i': 9 + i }}><rect x={x} y={y} width="34" height="40" rx="6" className="sunfill hi" /><path d={`M${x + 6} ${y + 30} H${x + 26}`} /></g>
      ))}
      <text className="cap" x="344" y="222" textAnchor="middle" style={{ '--i': 14 }}>ECOMMERCE</text>
    </>
  ),
  // 2020 · worldwide: rotating globe, routes with travelling pulses
  2020: (
    <>
      <circle className="d" pathLength="1" cx="200" cy="130" r="92" style={{ '--i': 0 }} />
      <g className="pop soft" style={{ '--i': 2 }}>
        {[[-0, 5], [-2, 5], [-4, 5]].map(([b, dur], i) => (
          <ellipse key={i} cx="200" cy="130" rx="86" ry="92">
            <animate attributeName="rx" dur={`${dur}s`} values="86;0;86" repeatCount="indefinite" begin={`${b}s`} />
          </ellipse>
        ))}
        <path d="M110 130 H290 M122 90 H278 M122 170 H278" />
      </g>
      {['M232 158 Q170 70 140 98', 'M232 158 Q270 80 276 104', 'M232 158 Q262 214 252 190', 'M232 158 Q160 190 138 172'].map((d, i) => (
        <g key={d}>{D({ d, className: 'd hi', style: { '--i': 6 + i * 2 } })}<Flow path={d} n={1} dur={2.4} base={2 + i * 0.5} /></g>
      ))}
      {[[140, 98], [276, 104], [252, 190], [138, 172]].map(([x, y], i) => (
        <g key={x} className="pop" style={{ '--i': 9 + i * 2 }}><circle className="ping late" cx={x} cy={y} r="9" /><circle cx={x} cy={y} r="5" className="dotfill" /></g>
      ))}
      <g className="pop" style={{ '--i': 5 }}><circle className="ping" cx="232" cy="158" r="12" /><circle cx="232" cy="158" r="7" className="navyfill" /></g>
      <text className="cap" x="200" y="252" textAnchor="middle" style={{ '--i': 16 }}>AMERICAS · EU · EMEA · APAC</text>
    </>
  ),
  // 2025 · ISO certified: shield, sweeping shine, badges orbiting
  2025: (
    <>
      <defs><clipPath id="ajShield"><path d="M200 46 L278 76 V138 Q278 192 200 222 Q122 192 122 138 V76 Z" /></clipPath></defs>
      <circle cx="200" cy="130" r="118" className="soft dash spin slowest" />
      <path className="pop sunfill" style={{ '--i': 2 }} d="M200 46 L278 76 V138 Q278 192 200 222 Q122 192 122 138 V76 Z" />
      {D({ d: 'M200 46 L278 76 V138 Q278 192 200 222 Q122 192 122 138 V76 Z', className: 'd hi', style: { '--i': 0 } })}
      {D({ d: 'M165 132 L192 160 L238 106', className: 'd hi thick', style: { '--i': 7 } })}
      <g clipPath="url(#ajShield)"><rect x="-40" y="0" width="34" height="260" className="shine" transform="skewX(-18)"><animateTransform attributeName="transform" type="translate" values="-80 0;520 0" dur="3.6s" repeatCount="indefinite" begin="2.4s" additive="sum" /></rect></g>
      {['0', '-6'].map((b, i) => (
        <g key={b}>
          <g className="badge"><circle r="25" className="node" /><text className="cap lg" y="4" textAnchor="middle">{i ? '27001' : '9001'}</text>
            <animateMotion dur="12s" repeatCount="indefinite" begin={`${b}s`} path="M200 12 A118 118 0 1 1 199.9 12" />
          </g>
        </g>
      ))}
    </>
  ),
  // 2026 · CatalogWiz AI: messy data → AI → verified product page
  2026: (
    <>
      {[[22, 64], [48, 98], [20, 132], [52, 166], [26, 198], [56, 60]].map(([x, y], i) => (
        <g key={x + y} className="pop" style={{ '--i': i }}><rect className="jit" x={x} y={y} width={i % 2 ? 22 : 30} height="13" rx="3" style={{ '--j': i }} /></g>
      ))}
      {['M80 70 Q130 70 164 120', 'M80 105 Q130 110 164 126', 'M80 140 H164', 'M80 172 Q130 160 164 134', 'M80 204 Q130 190 164 140'].map((d, i) => <Flow key={d} path={d} n={1} dur={2.2} base={i * 0.35} r={3} />)}
      <g className="pop" style={{ '--i': 6 }}>
        <circle className="ping" cx="200" cy="130" r="38" /><circle className="ping late" cx="200" cy="130" r="38" />
        <circle cx="200" cy="130" r="38" className="orb" />
        <text className="orbtxt" x="200" y="128" textAnchor="middle">CatalogWiz</text>
        <text className="orbtxt big" x="200" y="148" textAnchor="middle">AI</text>
      </g>
      <path d="M242 130 H268" className="soft" /><Flow path="M242 130 H268" n={3} dur={1.5} base={0.5} cls="dotfill big" />
      <g className="pop" style={{ '--i': 8 }}><rect x="268" y="52" width="122" height="156" rx="12" className="node" /></g>
      <g className="pop" style={{ '--i': 10 }}><rect x="280" y="64" width="98" height="46" rx="8" className="sunfill" /><path className="hi" d="M296 98 L316 78 L332 94 L346 82 L366 100" /></g>
      {[0, 1, 2].map((r) => (
        <g key={r}><rect x="280" y={124 + r * 22} width="30" height="7" rx="3.5" className="skel" /><rect className="hbar" x="318" y={124 + r * 22} width={[60, 48, 54][r]} height="7" rx="3.5" style={{ '--i': 12 + r * 2 }} /></g>
      ))}
      <g className="stamp"><circle cx="366" cy="196" r="18" className="navyfill" /><path d="M357 196 L364 203 L376 189" className="whitestroke" /></g>
      <text className="cap" x="200" y="252" textAnchor="middle" style={{ '--i': 14 }}>AI-ENRICHED · HUMAN-VERIFIED</text>
    </>
  ),
}

const ICONS = { flag: 'flag', team: 'users', scale: 'chart', star: 'star', cart: 'cart', globe: 'globe', shield: 'shield', flow: 'workflow' }
const Icon = ({ name, size = 22 }) => <UiIcon name={ICONS[name]} size={size} />

const FORMULA = ['Product data expertise', 'AI enrichment', 'Human verification']
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
            Since 2007 we have grown from a small product data team into a partner for 500+ manufacturers and distributors in 15+ countries.
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
          <svg className="aj-scene" key={`scene-${m.year}`} viewBox="0 0 400 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><linearGradient id="ajArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6a1a" stopOpacity=".38" /><stop offset="1" stopColor="#ff6a1a" stopOpacity="0" /></linearGradient></defs>{SCENES[m.year]}</svg>
          <div className="aj-pbody" key={m.year}>
            <p className="aj-tag"><span className="aj-ico"><Icon name={m.icon} size={18} /></span>{m.tag}</p>
            <div className="aj-pyear">{m.year}</div>
            <h3>{m.title}</h3>
            <p className="aj-text">{m.text}</p>
            <p className="aj-detail">{m.detail}</p>
            <p className="aj-stat"><b>{m.stat[0]}</b><span>{m.stat[1]}</span></p>
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
