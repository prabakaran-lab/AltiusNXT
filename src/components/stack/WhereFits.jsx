import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Check, FileSpreadsheet, FileText, Globe, Image as ImageIcon, RotateCcw, ShieldCheck, ShoppingBag, Sparkles, Store } from 'lucide-react'
import Icon from '../ui/Icon.jsx'
import './WhereFits.css'

/* "Where CatalogWiz fits": a scroll-driven product story.
   Messy supplier data -> CatalogWiz AI + human verification -> the customer's own PIM / ERP (enriched, not replaced)
   -> every commerce channel -> results feed back in.
   One function, apply(p), draws the whole scene for a progress value p (0..1): it is driven by the page scroll on
   desktop (the section is pinned while it plays), by a timed run when it scrolls into view on phones and short screens,
   and shows the finished state for visitors who prefer reduced motion. Replay and the step buttons are always available.
   Illustrative sample data: the Schneider Electric TELGV3P73 motor circuit breaker used across the page. */

const SOURCES = [
  { label: 'Supplier feeds', icon: FileSpreadsheet, snip: 'TELGV3P73, 73, , ?' },
  { label: 'Spec sheets & PDFs', icon: FileText, snip: 'rating … 73 A ? … 690' },
  { label: 'Product images', icon: ImageIcon, snip: 'IMG_0412.jpg · no data' },
  { label: 'Manufacturer sites', icon: Globe, snip: 'schneider-electric.com' },
]
const OUTPUTS = [
  { label: 'Storefront', icon: Store },
  { label: 'Marketplaces', icon: ShoppingBag },
  { label: 'AI assistants', icon: Bot },
  { label: 'AI shopping agents (UCP)', icon: Bot },
]
// the first row is what the supplier sent; the other four are the gaps CatalogWiz fills
const ROWS = [['Series', 'TeSys Deca'], ['Current rating', '73 A'], ['AC voltage rating', '690 V ac'], ['Interrupting rating', '65 kA'], ['Mounting type', 'DIN Rail']]
const STEPS = [
  { short: 'Supplier data', t: 'Messy supplier data.', d: 'Feeds, spec sheets, images and manufacturer sites arrive incomplete and inconsistent.' },
  { short: 'AI enrichment', t: 'CatalogWiz AI enriches it.', d: 'It reads every source and fills the missing attributes, so nothing is left blank.' },
  { short: 'Expert check', t: 'A specialist verifies it.', d: 'A product data specialist checks each value against the manufacturer’s documentation.' },
  { short: 'Your PIM / ERP', t: 'Your PIM / ERP is updated.', d: 'The verified data is written into the system you already use. Nothing is replaced.' },
  { short: 'Every channel', t: 'Every channel stays current.', d: 'Storefronts, marketplaces, AI assistants and shopping agents get the same clean data, and the results feed back in.' },
]
const BOUNDS = [0, 0.26, 0.55, 0.68, 0.88, 1.01]

// timing of each data packet (in story progress, 0..1)
const SRC_A = [0.06, 0.095, 0.13, 0.165]
const SRC_D = 0.12
const EP_A = [0.3, 0.37, 0.44, 0.51]
const EP_D = 0.09
const PC_A = [0.7, 0.745, 0.79, 0.835]
const PC_D = 0.09
const FB_A = [0.89, 0.935]
const FB_D = 0.1
const PACKETS = [
  ...SRC_A.map((a, i) => ({ id: `s${i}`, route: `src${i}`, a, d: SRC_D, kind: 'raw' })),
  ...EP_A.map((a, i) => ({ id: `e${i}`, route: 'ep', a, d: EP_D, kind: 'rich' })),
  ...PC_A.map((a, i) => ({ id: `c${i}`, route: `pc${i}`, a, d: PC_D, kind: 'ok' })),
  ...FB_A.map((a, i) => ({ id: `f${i}`, route: 'fb', a, d: FB_D, kind: 'fb' })),
]
const ROUTES = [
  ...SOURCES.map((_, i) => ({ id: `src${i}`, kind: 'raw' })),
  { id: 'ep', kind: 'rich' },
  { id: 'back', kind: 'back' },
  ...OUTPUTS.map((_, i) => ({ id: `pc${i}`, kind: 'ok' })),
  { id: 'fb', kind: 'fb' },
]
const RING_C = 2 * Math.PI * 44

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const seg = (p, a, b) => clamp((p - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
const stepOf = (p) => { for (let i = 0; i < 5; i++) if (p < BOUNDS[i + 1]) return i; return 4 }

const detectMode = () => {
  if (typeof window === 'undefined') return 'static'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  return window.innerWidth > 900 && window.innerHeight >= 800 ? 'scrub' : 'auto'
}

export default function WhereFits() {
  const secRef = useRef(null)
  const stageRef = useRef(null)
  const els = useRef({ src: [], ch: [], row: [], pk: {}, path: {} })
  const cur = useRef(0)
  const run = useRef({ replay: null, started: false })
  const [mode, setMode] = useState(detectMode)
  const [step, setStep] = useState(mode === 'static' ? 4 : 0)

  useEffect(() => {
    const onResize = () => setMode(detectMode())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const E = els.current
    const stage = stageRef.current
    const sec = secRef.current
    let lastStep = -1
    let lastText = {}
    const setText = (key, el, text) => { if (el && lastText[key] !== text) { lastText[key] = text; el.textContent = text } }

    /* anchor the connecting lines to the real positions of the cards, so the same story works horizontally and vertically */
    const layout = () => {
      const sr = stage.getBoundingClientRect()
      E.svg.setAttribute('width', sr.width)
      E.svg.setAttribute('height', sr.height)
      const vertical = window.innerWidth <= 900
      const rel = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - sr.left, r: r.right - sr.left, t: r.top - sr.top, b: r.bottom - sr.top, cx: (r.left + r.right) / 2 - sr.left, cy: (r.top + r.bottom) / 2 - sr.top } }
      const curve = (x1, y1, x2, y2) => (vertical
        ? `M${x1} ${y1} C ${x1} ${y1 + (y2 - y1) * 0.55}, ${x2} ${y2 - (y2 - y1) * 0.55}, ${x2} ${y2}`
        : `M${x1} ${y1} C ${x1 + (x2 - x1) * 0.55} ${y1}, ${x2 - (x2 - x1) * 0.55} ${y2}, ${x2} ${y2}`)
      const from = (r) => (vertical ? [r.cx, r.b] : [r.r, r.cy])
      const into = (r) => (vertical ? [r.cx, r.t] : [r.l, r.cy])
      const eng = rel(E.orb)
      const pim = rel(E.pim)
      const d = {}
      E.src.forEach((el, i) => { d[`src${i}`] = curve(...from(rel(el)), ...into(eng)) })
      // stacked: the line to the PIM leaves from under the engine's label, not through it
      d.ep = vertical ? curve(rel(E.engCol).cx, rel(E.engCol).b, ...into(pim)) : curve(...from(eng), ...into(pim))
      E.ch.forEach((el, i) => { d[`pc${i}`] = curve(...from(pim), ...into(rel(el))) })
      if (!vertical) {
        d.back = curve(pim.l, pim.cy + 18, eng.r, eng.cy + 18)
        const chs = rel(E.chCol)
        const col = rel(E.engCol)
        d.fb = `M${chs.cx} ${chs.b + 4} C ${chs.cx} ${chs.b + 74}, ${col.cx} ${col.b + 74}, ${col.cx} ${col.b + 6}`
      } else { d.back = ''; d.fb = '' }
      for (const id of Object.keys(E.path)) {
        const { base, trail } = E.path[id]
        base.setAttribute('d', d[id] || '')
        trail.setAttribute('d', d[id] || '')
        const len = d[id] ? base.getTotalLength() : 0
        E.path[id].len = len
        trail.style.strokeDasharray = `${len} ${len}`
      }
      if (!vertical && E.path.fb.len) {
        const mid = E.path.fb.base.getPointAtLength(E.path.fb.len * 0.5)
        E.fbLabel.style.left = `${mid.x}px`
        E.fbLabel.style.top = `${mid.y}px`
        E.fbLabel.dataset.on = '1'
      } else E.fbLabel.dataset.on = '0'
    }

    /* draws the whole scene for story progress p (0..1) */
    const apply = (p) => {
      // 1. sources fade in, then dim once their data has left
      E.src.forEach((el, i) => {
        const inn = ease(seg(p, i * 0.02, i * 0.02 + 0.08))
        const gone = ease(seg(p, SRC_A[i] + SRC_D * 0.4, SRC_A[i] + SRC_D))
        el.style.opacity = String(inn * (1 - 0.45 * gone))
        el.style.transform = `translate3d(${(1 - inn) * -18}px,0,0)`
        el.dataset.done = gone > 0.6 ? '1' : '0'
      })
      // 2. the engine: wakes up, reads, enriches (ring fills), then verifies
      const state = p < 0.1 ? 'ready' : p < 0.28 ? 'read' : p < 0.56 ? 'enrich' : p < 0.68 ? 'verify' : 'done'
      E.orb.dataset.state = state
      E.orb.style.setProperty('--act', ease(seg(p, 0.1, 0.26)).toFixed(3))
      E.ring.style.strokeDashoffset = String(RING_C * (1 - seg(p, 0.28, 0.56)))
      setText('eng', E.engText, { ready: 'Ready', read: 'Reading sources', enrich: 'Enriching', verify: 'Verifying', done: 'Verified' }[state])
      // 3. the customer's PIM / ERP: gaps fill as the enriched data arrives, then each value is verified
      let filled = 0
      E.row.forEach((el, i) => {
        if (i === 0) { el.style.setProperty('--v', ease(seg(p, 0.56, 0.6)).toFixed(3)); return }
        const t = EP_A[i - 1] + EP_D
        const f = ease(seg(p, t, t + 0.035))
        if (f > 0.5) filled++
        el.style.setProperty('--f', f.toFixed(3))
        el.style.setProperty('--hl', Math.sin(Math.PI * f).toFixed(3))
        el.style.setProperty('--v', ease(seg(p, 0.56 + i * 0.018, 0.6 + i * 0.018)).toFixed(3))
      })
      const count = 1 + filled
      E.bar.style.width = `${(count / ROWS.length) * 100}%`
      setText('count', E.count, `${count} of ${ROWS.length} attributes`)
      setText('pimStatus', E.pimStatus, p < 0.3 ? 'Waiting for data' : p < 0.56 ? 'Enriching…' : p < 0.68 ? 'Verifying…' : 'Complete')
      E.pim.dataset.state = p < 0.3 ? 'wait' : p < 0.68 ? 'work' : 'done'
      E.badge.style.setProperty('--b', ease(seg(p, 0.56, 0.62)).toFixed(3))
      // 4. channels light up one after another as verified data reaches them
      E.ch.forEach((el, i) => {
        const x = ease(seg(p, PC_A[i] + PC_D - 0.02, PC_A[i] + PC_D + 0.03))
        el.style.setProperty('--x', x.toFixed(3))
      })
      // 5. results feed back in
      E.fbLabel.style.setProperty('--fb', ease(seg(p, 0.88, 0.94)).toFixed(3))
      // lines + data packets
      const tmax = {}
      for (const pk of PACKETS) {
        const t = clamp((p - pk.a) / pk.d)
        tmax[pk.route] = Math.max(tmax[pk.route] || 0, t)
        const c = E.pk[pk.id]
        const route = E.path[pk.route]
        if (!c || !route || !route.len) continue
        if (t > 0 && t < 1) {
          const pt = route.base.getPointAtLength(route.len * ease(t))
          c.setAttribute('cx', pt.x.toFixed(1))
          c.setAttribute('cy', pt.y.toFixed(1))
          c.style.opacity = String(Math.min(1, t * 8, (1 - t) * 8))
        } else c.style.opacity = '0'
      }
      for (const id of Object.keys(E.path)) {
        const { trail, len } = E.path[id]
        const k = id === 'back' ? ease(seg(p, 0.3, 0.6)) : tmax[id] || 0
        trail.style.strokeDashoffset = String(len * (1 - ease(k)))
      }
      E.prog.style.width = `${p * 100}%`
      const s = stepOf(p)
      if (s !== lastStep) { lastStep = s; setStep(s) }
    }

    layout()
    apply(mode === 'static' ? 1 : cur.current)
    const ro = new ResizeObserver(() => { layout(); apply(mode === 'static' ? 1 : cur.current) })
    ro.observe(stage)
    if (mode === 'static') return () => ro.disconnect()

    const scrollTarget = () => {
      const r = sec.getBoundingClientRect()
      const total = r.height - window.innerHeight
      return total > 0 ? clamp(-r.top / total) : 0
    }
    let raf = 0
    let visible = false
    const tick = (now) => {
      const rp = run.current.replay
      if (rp) {
        cur.current = clamp((now - rp.start) / rp.dur)
        if (cur.current >= 1) run.current.replay = null
      } else if (mode === 'scrub') {
        const target = scrollTarget()
        const diff = target - cur.current
        cur.current = Math.abs(diff) < 0.0004 ? target : cur.current + diff * 0.14
      }
      apply(cur.current)
      if (visible || run.current.replay) raf = requestAnimationFrame(tick)
      else raf = 0
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) {
        wake()
        if (mode === 'auto' && !run.current.started && e.intersectionRatio > 0.3) { run.current.started = true; run.current.replay = { start: performance.now(), dur: 12000 } }
      }
    }, { rootMargin: '200px 0px', threshold: [0, 0.3] })
    io.observe(sec)
    window.addEventListener('scroll', wake, { passive: true })
    wake()
    run.current.wake = wake
    return () => { io.disconnect(); ro.disconnect(); window.removeEventListener('scroll', wake); cancelAnimationFrame(raf) }
  }, [mode])

  const replay = () => {
    if (mode === 'scrub') {
      const r = secRef.current.getBoundingClientRect()
      if (r.top > 0 || r.bottom < window.innerHeight) secRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    run.current.replay = { start: performance.now(), dur: 12000 }
    run.current.started = true
    run.current.wake?.()
  }
  const jump = (i) => {
    run.current.replay = null
    if (mode === 'scrub') {
      const r = secRef.current.getBoundingClientRect()
      const total = r.height - window.innerHeight
      window.scrollTo({ top: window.scrollY + r.top + total * (BOUNDS[i] + 0.012), behavior: 'smooth' })
    } else {
      cur.current = BOUNDS[i] + 0.012
      run.current.wake?.()
    }
  }

  const E = els.current
  return (
    <section className={`wh wh--${mode}`} ref={secRef} aria-labelledby="wh-title">
      <div className="wh-pin">
        <div className="wh-wrap">
          <header className="wh-head">
            <p className="wh-pill">Where CatalogWiz fits</p>
            <h2 id="wh-title">Your platform stores the data. <em>CatalogWiz does the work.</em></h2>
            <p className="wh-sub">Keep your PIM, ERP or eCommerce platform. CatalogWiz enriches your product data, our experts verify it, and the clean data flows straight back into the system you already use. No PIM? It works without one too.</p>
          </header>

          <div className="wh-stage" ref={stageRef} role="group" aria-label="Supplier feeds, spec sheets, images and manufacturer sites flow into CatalogWiz AI, which enriches and verifies the data and writes it into your PIM or ERP. The PIM then publishes to storefronts, marketplaces, AI assistants and AI shopping agents using UCP, and the results feed back in.">
            <svg className="wh-svg" ref={(n) => { E.svg = n }} aria-hidden="true">
              {ROUTES.map((r) => (
                <g key={r.id} className={`wh-r ${r.kind}`}>
                  <path className="base" ref={(n) => { if (n) E.path[r.id] = { ...(E.path[r.id] || {}), base: n } }} />
                  <path className="trail" ref={(n) => { if (n) E.path[r.id] = { ...(E.path[r.id] || {}), trail: n } }} />
                </g>
              ))}
              {PACKETS.map((pk) => <circle key={pk.id} className={`pk ${pk.kind}`} r="5" ref={(n) => { E.pk[pk.id] = n }} />)}
            </svg>

            <div className="wh-col wh-srcs">
              {SOURCES.map(({ label, icon: Ico, snip }, i) => (
                <div key={label} className="wh-src" ref={(n) => { E.src[i] = n }}>
                  <span className="ico"><Ico size={15} /></span>
                  <span className="tx"><b>{label}</b><code>{snip}</code></span>
                </div>
              ))}
            </div>

            <div className="wh-col wh-eng" ref={(n) => { E.engCol = n }}>
              <div className="wh-orb" ref={(n) => { E.orb = n }} data-state="ready">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="trk" cx="50" cy="50" r="44" />
                  <circle className="bar" cx="50" cy="50" r="44" strokeDasharray={RING_C} strokeDashoffset={RING_C} ref={(n) => { E.ring = n }} />
                </svg>
                <span className="core"><Sparkles size={30} /></span>
                <span className="halo" /><span className="halo h2" />
              </div>
              <p className="wh-eng-l"><b>CatalogWiz AI</b><small>+ human review</small><em ref={(n) => { E.engText = n }}>Ready</em></p>
            </div>

            <div className="wh-col wh-pimc">
              <div className="wh-pim" ref={(n) => { E.pim = n }} data-state="wait">
                <header><b>Your PIM / ERP</b><span>System of record</span></header>
                <div className="wh-pim-p"><small>TELGV3P73</small><em ref={(n) => { E.pimStatus = n }}>Waiting for data</em></div>
                <ul>
                  {ROWS.map(([l, v], i) => (
                    <li key={l} ref={(n) => { E.row[i] = n }} className={i === 0 ? 'given' : ''}>
                      <span>{l}</span>
                      {i === 0 ? <b className="val">{v}</b> : (
                        <>
                          <b className="gap">···</b>
                          <b className="val">{v}</b>
                        </>
                      )}
                      <i className="ver"><Check size={10} strokeWidth={3.6} /></i>
                    </li>
                  ))}
                </ul>
                <div className="wh-pim-m"><span className="meter"><i ref={(n) => { E.bar = n }} /></span><small ref={(n) => { E.count = n }}>1 of 5 attributes</small></div>
                <div className="wh-pim-f" ref={(n) => { E.badge = n }}><ShieldCheck size={12} />Verified by a data specialist</div>
              </div>
              <p className="wh-keep">Enriched in place, never replaced</p>
            </div>

            <div className="wh-col wh-chs" ref={(n) => { E.chCol = n }}>
              {OUTPUTS.map(({ label, icon: Ico }, i) => (
                <div key={label} className="wh-ch" ref={(n) => { E.ch[i] = n }}>
                  <span className="ico"><Ico size={15} /></span>
                  <b>{label}</b>
                  <em><i />Live</em>
                </div>
              ))}
            </div>
            <p className="wh-fb" ref={(n) => { E.fbLabel = n }}>Results feed back in</p>
          </div>

          <div className="wh-steps">
            <ol>
              {STEPS.map((s, i) => (
                <li key={s.short}>
                  <button type="button" className={step === i ? 'on' : i < step ? 'past' : ''} aria-current={step === i ? 'step' : undefined} onClick={() => jump(i)}>
                    <span>{i + 1}</span>{s.short}
                  </button>
                </li>
              ))}
            </ol>
            <span className="wh-prog" aria-hidden="true"><i ref={(n) => { E.prog = n }} /></span>
            {mode !== 'static' && <button type="button" className="wh-replay" onClick={replay}><RotateCcw size={14} />Replay</button>}
          </div>
          <p className="wh-cap" aria-live="polite"><b>{STEPS[step].t}</b> {STEPS[step].d}</p>

          <p className="wh-cta"><Link to="/how-it-works#catalogwiz">See how CatalogWiz fits your stack <Icon name="arrow-right" /></Link></p>
          <p className="wh-foot">Illustrative sample data · sample product TELGV3P73</p>
        </div>
      </div>
    </section>
  )
}
