import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Check, Cpu, FileSpreadsheet, FileText, Globe, Image as ImageIcon, Mail, RotateCcw, ShieldCheck, ShoppingBag, Sparkles, Store } from 'lucide-react'
import Icon from '../ui/Icon.jsx'
import './WhereFits.css'

/* "Where CatalogWiz fits": a scroll-driven product film in five scenes.
     1 The mess        supplier documents float in, incomplete and contradicting each other
     2 Transformation  they converge into the CatalogWiz workbench; AI extracts, structures, enriches, validates
     3 Human check     a data specialist reviews what the AI is less sure about and approves it
     4 The result      the supplier record becomes a verified, commerce-ready product page (Before -> After wipe)
     5 Everywhere      zoom out: the record sits in the customer's own PIM / ERP and flows to every channel
   One pure function, apply(p), draws the whole film for a progress value p (0..1). It is driven by the page scroll on
   desktop (the stage is pinned while it plays), by a timed run when it scrolls into view on phones and short screens,
   and by the chapter list for visitors who prefer reduced motion. Illustrative sample data: the Schneider Electric
   TELGV3P73 motor circuit breaker used across the site. */

const SCENES = [
  { n: '01', k: 'The mess', t: 'Supplier data arrives broken.', d: 'Feeds with blank cells. Specs buried on page four of a PDF. Images with no data. Every supplier sends something different, and none of it is ready to sell.', tags: ['Blank cells', 'Conflicting values', 'Specs trapped in PDFs'] },
  { n: '02', k: 'The transformation', t: 'CatalogWiz AI rebuilds the record.', d: 'It reads every source, extracts each value, structures it to one standard, fills the gaps and checks it against the manufacturer’s own documentation.', tags: ['Extract', 'Structure', 'Enrich', 'Validate'] },
  { n: '03', k: 'Human check', t: 'Then a specialist signs it off.', d: 'A product data specialist reviews what the AI is less sure about, compares it with the source document, and approves every value. Nothing goes live on a guess.', tags: ['Reviewed against the source', 'Approved by a person'] },
  { n: '04', k: 'The result', t: 'A record that is ready to sell.', d: 'Two attributes become thirty-three. The same product, now complete, consistent and verified, with schema markup ready for search and AI.', tags: ['33 verified attributes', 'Schema ready', 'UCP ready'] },
  { n: '05', k: 'Everywhere', t: 'Enriched in your system. Live in every channel.', d: 'The verified record is written back into the PIM or ERP you already run. Nothing is replaced. From there it reaches your storefront, marketplaces, AI assistants and shopping agents, and the results feed back in. No PIM? It works without one too.', tags: ['Your PIM / ERP stays', 'No rip and replace'] },
]
const BOUNDS = [0, 0.17, 0.5, 0.7, 0.88, 1.001]
const ANCHOR = [0.05, 0.4, 0.62, 0.85, 0.99]

const SOURCES = [
  { label: 'Supplier feed', icon: FileSpreadsheet },
  { label: 'Spec sheet PDFs', icon: FileText },
  { label: 'Product images', icon: ImageIcon },
  { label: 'Mfr. website', icon: Globe },
]
const PIPE = ['Extract', 'Structure', 'Enrich', 'Validate', 'Approve']
// the first two rows are what the supplier sent; the rest are found and filled by CatalogWiz
const ROWS = [
  { k: 'Brand', v: 'Schneider Electric', src: 'Supplier feed', given: true },
  { k: 'Series', v: 'TeSys Deca', src: 'Supplier feed', given: true },
  { k: 'Current rating', raw: '73A', v: '73 A', src: 'Datasheet p.2' },
  { k: 'AC voltage rating', raw: '690VAC', v: '690 V ac', src: 'Datasheet p.2' },
  { k: 'Interrupting rating', v: '65 kA @ 230/240 V ac', src: 'Datasheet p.4', flag: true, conf: 82 },
  { k: 'Mounting type', v: 'DIN Rail', src: 'Manufacturer site' },
  { k: 'IP rating', v: 'IP20', src: 'Datasheet p.3' },
]
const ORDER_VERIFY = [0, 1, 2, 3, 5, 6]
const SATS = [
  { label: 'Storefront', icon: Store, a: -38 },
  { label: 'Marketplaces', icon: ShoppingBag, a: 38 },
  { label: 'AI assistants', icon: Bot, a: 142 },
  { label: 'AI shopping agents', sub: 'UCP', icon: Cpu, a: 218 },
]
const DOTS = [8, 52, 97, 128, 176, 205, 250, 292, 330]

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const seg = (p, a, b) => clamp((p - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
const lerp = (a, b, t) => a + (b - a) * t
const sceneOf = (p) => { for (let i = 0; i < 5; i++) if (p < BOUNDS[i + 1]) return i; return 4 }

const detectMode = () => {
  if (typeof window === 'undefined') return 'static'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static'
  return window.innerWidth > 900 && window.innerHeight >= 620 ? 'scrub' : 'auto'
}

// offset of an element inside an ancestor, in layout pixels (unaffected by transforms)
const offsetIn = (el, root) => {
  let x = 0
  let y = 0
  let n = el
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

// piecewise path with easing between keys: {t, x, y, o}
const follow = (keys, p) => {
  if (p <= keys[0].t) return keys[0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (p < b.t) { const k = ease(seg(p, a.t, b.t)); return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), o: lerp(a.o, b.o, k) } }
  }
  return keys[keys.length - 1]
}

const Breaker = () => (
  <svg viewBox="0 0 120 150" aria-hidden="true">
    <rect x="20" y="6" width="80" height="138" rx="10" fill="#2a3a55" />
    <rect x="20" y="6" width="80" height="138" rx="10" fill="url(#cs-bk)" />
    <rect x="29" y="15" width="62" height="40" rx="5" fill="#eaf0f8" />
    <rect x="35" y="22" width="34" height="5" rx="2.5" fill="#9fb0c8" />
    <rect x="35" y="32" width="50" height="4" rx="2" fill="#c3cfe0" />
    <rect x="35" y="41" width="26" height="4" rx="2" fill="#c3cfe0" />
    <circle cx="60" cy="86" r="21" fill="#0b1f3a" />
    <circle cx="60" cy="86" r="16" fill="#ff6a1a" />
    <rect x="57" y="72" width="6" height="16" rx="3" fill="#fff" />
    <rect x="29" y="118" width="14" height="19" rx="3" fill="#8b9bb4" /><rect x="53" y="118" width="14" height="19" rx="3" fill="#8b9bb4" /><rect x="77" y="118" width="14" height="19" rx="3" fill="#8b9bb4" />
    <defs><linearGradient id="cs-bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
  </svg>
)

export default function WhereFits() {
  const secRef = useRef(null)
  const trackRef = useRef(null)
  const visRef = useRef(null)
  const boxRef = useRef(null)
  const canvasRef = useRef(null)
  const cur = useRef(0)
  const run = useRef({ replay: null, started: false, wake: null })
  const [mode, setMode] = useState(detectMode)
  const [scene, setScene] = useState(mode === 'static' ? 3 : 0)

  useEffect(() => {
    const onResize = () => setMode(detectMode())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const sec = secRef.current
    const track = trackRef.current
    const vis = visRef.current
    const box = boxRef.current
    const C = canvasRef.current
    const q = (s) => C.querySelector(s)
    const qa = (s) => [...C.querySelectorAll(s)]
    const E = {
      win: q('.cs-win'),
      body: q('.cs-body'),
      rows: qa('.cs-row'),
      srcs: qa('.cs-srcs li'),
      pipe: qa('.cs-pipe li'),
      pipeFill: q('.cs-pipew .line i'),
      status: qa('[data-el="status"]'),
      meter: q('[data-el="meter"]'),
      count: q('[data-el="count"]'),
      vcount: q('[data-el="vcount"]'),
      rev: q('.cs-rev'),
      approve: q('.cs-rev .go'),
      cursor: q('.cs-cursor'),
      nAfter: q('[data-el="nafter"]'),
      sats: qa('.cs-sat'),
      dots: qa('.cs-dot'),
      copy: [...sec.querySelectorAll('.cs-sc')],
      rail: sec.querySelector('.cs-rail'),
    }
    const cache = {}
    const sv = (el, k, v) => el.style.setProperty(k, typeof v === 'number' ? v.toFixed(3) : v)
    const setText = (key, el, text) => { if (el && cache[key] !== text) { cache[key] = text; el.textContent = text } }
    let dim = { cw: 820, ch: 560, rx: 300, ry: 200, vals: [], rowY: 0, rowX: 0, btn: { x: 0, y: 0 }, exit: { x: 0, y: 0 }, ww: 640, wh: 420 }
    let lastScene = -1

    const layout = () => {
      dim.cw = C.offsetWidth
      dim.ch = C.offsetHeight
      const availW = vis.clientWidth
      const availH = mode === 'scrub' ? window.innerHeight - 76 - 56 : Infinity
      const fit = clamp(Math.min(availW / dim.cw, availH / dim.ch), 0.3, 1.3)
      box.style.width = `${dim.cw * fit}px`
      box.style.height = `${dim.ch * fit}px`
      C.style.transform = `scale(${fit})`
      dim.ww = E.win.offsetWidth
      dim.wh = E.win.offsetHeight
      const narrow = dim.cw < 600
      dim.rx = dim.cw * (narrow ? 0.34 : 0.4)
      dim.ry = dim.ch * (narrow ? 0.38 : 0.36)
      sv(C, '--rx', `${dim.rx}`)
      sv(C, '--ry', `${dim.ry}`)
      // cursor targets, in window coordinates
      const r4 = offsetIn(E.rows[4], E.win)
      const v4 = offsetIn(E.rows[4].querySelector('.v'), E.win)
      dim.rowX = v4.x + 36
      dim.rowY = r4.y + r4.h / 2
      const ab = offsetIn(E.approve, E.win)
      dim.btn = { x: ab.x + ab.w / 2, y: ab.y + ab.h / 2 }
      const r6 = offsetIn(E.rows[6], E.win)
      dim.exit = { x: r6.x + 90, y: r6.y + r6.h / 2 + 4 }
    }

    const apply = (p) => {
      // ---- scene 2: documents converge, the workbench rises
      const conv = ease(seg(p, 0.17, 0.33))
      sv(C, '--conv', conv)
      sv(C, '--dop', 1 - ease(seg(conv, 0.45, 0.95)))
      sv(C, '--win', ease(seg(p, 0.2, 0.34)))
      sv(C, '--wbk', 1 - ease(seg(p, 0.7, 0.74)))
      sv(C, '--pgk', ease(seg(p, 0.7, 0.745)))
      sv(C, '--msg', 1 - ease(seg(p, 0.14, 0.24)))
      E.srcs.forEach((el, i) => sv(el, '--on', ease(seg(p, 0.27 + i * 0.014, 0.3 + i * 0.014))))

      // ---- scenes 2 and 3: the record fills in, is flagged, reviewed and approved
      let filled = 0
      let verified = 0
      E.rows.forEach((el, i) => {
        const r = ROWS[i]
        const val = el.querySelector('.val')
        let e
        let text
        if (r.given) { e = ease(seg(p, 0.25 + i * 0.012, 0.31 + i * 0.012)); text = r.v } else {
          const t0 = 0.31 + (i - 2) * 0.015
          e = seg(p, t0, t0 + 0.035)
          const norm = r.raw ? seg(p, i === 2 ? 0.4 : 0.415, i === 2 ? 0.425 : 0.44) : 0
          const base = r.raw && norm < 0.5 ? r.raw : r.v
          text = base.slice(0, Math.ceil(base.length * Math.min(1, e * (norm >= 0.5 ? 9 : 1))))
          if (e <= 0) text = ''
        }
        setText(`v${i}`, val, text)
        const landed = r.given ? 0 : Math.sin(Math.PI * seg(p, 0.31 + (i - 2) * 0.015, 0.31 + (i - 2) * 0.015 + 0.05))
        const normHl = r.raw ? Math.sin(Math.PI * seg(p, i === 2 ? 0.4 : 0.415, i === 2 ? 0.44 : 0.455)) : 0
        if (e > 0.6) filled++
        sv(el, '--e', e)
        sv(el, '--hl', Math.max(landed, normHl))
        sv(el, '--ai', r.flag ? 0 : ease(seg(p, 0.455 + i * 0.007, 0.475 + i * 0.007)))
        sv(el, '--fl', r.flag ? ease(seg(p, 0.485, 0.5)) : 0)
        const vi = r.flag ? ease(seg(p, 0.642, 0.66)) : ease(seg(p, 0.668 + ORDER_VERIFY.indexOf(i) * 0.0085, 0.69 + ORDER_VERIFY.indexOf(i) * 0.0085))
        sv(el, '--v', vi)
        if (vi > 0.5) verified++
        if (r.flag) sv(el, '--sel', ease(seg(p, 0.52, 0.545)) * (1 - ease(seg(p, 0.662, 0.685))))
      })
      sv(E.rev, '--rv', ease(seg(p, 0.54, 0.58)) * (1 - ease(seg(p, 0.66, 0.695))))
      sv(E.rev, '--hi', seg(p, 0.572, 0.6))
      sv(E.rev, '--press', Math.sin(Math.PI * seg(p, 0.628, 0.652)))
      E.rev.dataset.done = p > 0.64 ? '1' : '0'
      const stage = p < 0.31 ? -1 : p < 0.385 ? 0 : p < 0.44 ? 1 : p < 0.47 ? 2 : p < 0.545 ? 3 : 4
      E.pipe.forEach((el, i) => { el.dataset.s = i < stage ? 'done' : i === stage ? 'on' : '' })
      sv(E.pipeFill, 'width', `${seg(p, 0.31, 0.545) * 100}%`)
      const status = p < 0.3 ? 'Waiting for data' : p < 0.5 ? 'AI working' : p < 0.64 ? 'Needs review' : p < 0.7 ? 'Verifying' : 'Verified'
      E.status.forEach((el, i) => { setText(`st${i}`, el, status); el.dataset.s = p < 0.5 ? 'ai' : p < 0.64 ? 'review' : p < 0.7 ? 'ai' : 'ok' })
      sv(E.meter, 'width', `${(filled / ROWS.length) * 100}%`)
      setText('count', E.count, `${filled} of ${ROWS.length} attributes`)
      setText('vcount', E.vcount, verified ? `${verified} verified` : 'None verified yet')

      // the specialist's cursor
      const k = follow([
        { t: 0.5, x: dim.ww + 24, y: dim.wh + 12, o: 0 },
        { t: 0.518, x: dim.ww - 40, y: dim.wh - 60, o: 1 },
        { t: 0.548, x: dim.rowX, y: dim.rowY, o: 1 },
        { t: 0.59, x: dim.rowX, y: dim.rowY, o: 1 },
        { t: 0.626, x: dim.btn.x, y: dim.btn.y, o: 1 },
        { t: 0.658, x: dim.btn.x, y: dim.btn.y, o: 1 },
        { t: 0.7, x: dim.exit.x, y: dim.exit.y, o: 1 },
        { t: 0.716, x: dim.exit.x + 30, y: dim.exit.y + 16, o: 0 },
      ], p)
      E.cursor.style.transform = `translate3d(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px, 0)`
      E.cursor.style.opacity = k.o.toFixed(3)
      sv(E.cursor, '--click', Math.sin(Math.PI * seg(p, 0.628, 0.652)))

      // ---- scene 4: the supplier record becomes a product page (Before -> After wipe)
      const rev = ease(seg(p, 0.755, 0.86))
      sv(C, '--revl', rev)
      setText('nafter', E.nAfter, `${Math.round(2 + 31 * rev)} of 33 attributes`)
      sv(C, '--bd', ease(seg(p, 0.855, 0.885)))

      // ---- scene 5: zoom out to the customer's PIM / ERP and every channel
      const zoom = ease(seg(p, 0.885, 0.945))
      sv(C, '--zoom', zoom)
      sv(C, '--eco', ease(seg(p, 0.9, 0.95)))
      sv(C, '--ring', ease(seg(p, 0.925, 0.97)))
      sv(C, '--fb', ease(seg(p, 0.965, 0.995)))
      const cx = dim.cw / 2
      const cy = dim.ch / 2
      const drift = (p - 0.88) * 70
      E.sats.forEach((el, i) => {
        const a = ((SATS[i].a + drift) * Math.PI) / 180
        el.style.transform = `translate3d(${(cx + dim.rx * Math.cos(a)).toFixed(1)}px, ${(cy + dim.ry * Math.sin(a)).toFixed(1)}px, 0)`
        sv(el, '--s', ease(seg(p, 0.915 + i * 0.012, 0.945 + i * 0.012)))
        sv(el, '--l', ease(seg(p, 0.94 + i * 0.012, 0.96 + i * 0.012)))
      })
      E.dots.forEach((el, i) => {
        const a = ((DOTS[i] - drift * 1.4) * Math.PI) / 180
        const k2 = 1.14 + (i % 3) * 0.1
        el.style.transform = `translate3d(${(cx + dim.rx * k2 * Math.cos(a)).toFixed(1)}px, ${(cy + dim.ry * k2 * Math.sin(a)).toFixed(1)}px, 0)`
      })

      // ---- the words
      const s = sceneOf(p)
      E.copy.forEach((el, i) => {
        const inn = i === 0 ? 1 : ease(seg(p, BOUNDS[i], BOUNDS[i] + 0.04))
        const out = i === 4 ? 0 : ease(seg(p, BOUNDS[i + 1] - 0.035, BOUNDS[i + 1]))
        el.style.opacity = (inn * (1 - out)).toFixed(3)
        el.style.transform = `translate3d(0, ${((1 - inn) * 28 - out * 28).toFixed(1)}px, 0)`
        el.style.visibility = inn * (1 - out) < 0.01 ? 'hidden' : 'visible'
      })
      sv(E.rail, '--p', clamp(p))
      if (s !== lastScene) { lastScene = s; setScene(s) }
    }

    layout()
    apply(mode === 'static' ? ANCHOR[3] : cur.current)
    if (mode === 'static') cur.current = ANCHOR[3]
    const ro = new ResizeObserver(() => { layout(); apply(cur.current) })
    ro.observe(vis)
    window.addEventListener('resize', layout)
    if (mode === 'static') {
      run.current.wake = () => apply(cur.current)
      return () => { ro.disconnect(); window.removeEventListener('resize', layout) }
    }

    const scrollTarget = () => {
      const r = track.getBoundingClientRect()
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
        cur.current = Math.abs(diff) < 0.0004 ? target : cur.current + diff * 0.16
      }
      apply(cur.current)
      raf = visible || run.current.replay ? requestAnimationFrame(tick) : 0
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
    run.current.wake = wake
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (!visible) return
      wake()
      if (mode === 'auto' && !run.current.started && e.intersectionRatio > 0.3) { run.current.started = true; run.current.replay = { start: performance.now(), dur: 26000 } }
    }, { rootMargin: '200px 0px', threshold: [0, 0.3] })
    io.observe(mode === 'scrub' ? track : vis)
    window.addEventListener('scroll', wake, { passive: true })
    wake()
    return () => { io.disconnect(); ro.disconnect(); window.removeEventListener('scroll', wake); window.removeEventListener('resize', layout); cancelAnimationFrame(raf) }
  }, [mode])

  const replay = () => {
    run.current.replay = { start: performance.now(), dur: 26000 }
    run.current.started = true
    run.current.wake?.()
  }
  const jump = (i) => {
    run.current.replay = null
    if (mode === 'scrub') {
      const r = trackRef.current.getBoundingClientRect()
      const total = r.height - window.innerHeight
      window.scrollTo({ top: window.scrollY + r.top + total * ANCHOR[i], behavior: 'smooth' })
    } else {
      cur.current = ANCHOR[i]
      run.current.wake?.()
    }
  }

  return (
    <section className={`cs cs--${mode}`} ref={secRef} aria-labelledby="cs-title">
      <div className="cs-intro">
        <p className="cs-pill">Where CatalogWiz fits</p>
        <h2 id="cs-title">Your platform stores the data. <em>CatalogWiz does the work.</em></h2>
        <p className="cs-sub">Keep your PIM, ERP or eCommerce platform. CatalogWiz enriches your product data, our experts verify it, and the clean data flows straight back into the system you already use. No PIM? It works without one too.</p>
      </div>

      <div className="cs-track" ref={trackRef}>
        <div className="cs-pin">
          <div className="cs-grid">
            <div className="cs-copy">
              <div className="cs-scenes" aria-hidden="true">
                {SCENES.map((s) => (
                  <article key={s.n} className="cs-sc">
                    <p className="cs-eb"><b>{s.n}</b>{s.k}</p>
                    <h3>{s.t}</h3>
                    <p className="cs-d">{s.d}</p>
                    <ul className="cs-tags">{s.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                  </article>
                ))}
              </div>
              <nav className="cs-rail" aria-label="Story chapters">
                <span className="cs-rail-line" aria-hidden="true"><i /></span>
                <ol>
                  {SCENES.map((s, i) => (
                    <li key={s.n}>
                      <button type="button" className={scene === i ? 'on' : i < scene ? 'past' : ''} aria-current={scene === i ? 'step' : undefined} onClick={() => jump(i)} aria-label={`Scene ${s.n}: ${s.k}`}>
                        <span>{s.n}</span>{s.k}
                      </button>
                    </li>
                  ))}
                </ol>
                {mode !== 'static' && <button type="button" className="cs-replay" onClick={replay}><RotateCcw size={13} />Replay</button>}
              </nav>
            </div>

            <div className="cs-vis" ref={visRef}>
              <div className="cs-box" ref={boxRef}>
                <div className="cs-canvas" ref={canvasRef} aria-hidden="true">
                  <i className="cs-glow" />

                  {/* scene 1: the mess */}
                  <div className="cs-doc cs-d1"><div className="in">
                    <header><FileSpreadsheet size={12} />supplier_feed_v3.xlsx</header>
                    <table><tbody>
                      <tr><th>SKU</th><th>Amp</th><th>Volt</th><th>Icu</th></tr>
                      <tr><td>TELGV3P73</td><td>73</td><td className="x" /><td className="x">?</td></tr>
                      <tr><td>TELGV3P60</td><td>6O</td><td>690</td><td className="x" /></tr>
                    </tbody></table>
                  </div></div>
                  <div className="cs-doc cs-d2"><div className="in">
                    <header className="pdf"><FileText size={12} />TeSys_Deca_datasheet.pdf<em>p.4 of 12</em></header>
                    <p className="ln w9" /><p className="ln w7" /><p className="ln w8 hit" /><p className="ln w5" /><p className="ln w9" /><p className="ln w6" />
                    <small className="snip">Icu … 65 kA ? … 690</small>
                  </div></div>
                  <div className="cs-doc cs-d3"><div className="in">
                    <div className="ph"><ImageIcon size={28} /></div>
                    <footer>IMG_0412.jpg<em>no data</em></footer>
                  </div></div>
                  <div className="cs-doc cs-d4"><div className="in">
                    <header className="web"><Globe size={12} />schneider-electric.com</header>
                    <p className="ln w8" /><p className="ln w9" /><p className="ln w5" />
                    <small className="snip">Rated current: 73 A (690 V)</small>
                  </div></div>
                  <div className="cs-doc cs-d5"><div className="in">
                    <header className="mail"><Mail size={12} />Re: price list</header>
                    <p className="tx">Attaching the latest list. Specs to follow, our engineer is out until Monday.</p>
                  </div></div>
                  <div className="cs-doc cs-d6"><div className="in note">
                    <b>Conflict</b>
                    <span>690 V in the feed, 600 V on the website</span>
                  </div></div>
                  <span className="cs-flag f1">Missing: Interrupting rating</span>
                  <span className="cs-flag f2">? 73 A or 63 A</span>
                  <span className="cs-flag f3">No unit</span>

                  {/* scene 5: the customer's PIM / ERP and every channel */}
                  <div className="cs-eco">
                    <i className="wv w1" /><i className="wv w2" /><i className="wv w3" />
                    <i className="wv fbw f1" /><i className="wv fbw f2" />
                    <i className="orbit o1" /><i className="orbit o2" />
                    <div className="cs-disc">
                      <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" /></svg>
                      <p className="dl"><b>Your PIM / ERP</b><small>System of record</small></p>
                      <span className="inplace"><Sparkles size={11} />Enriched in place</span>
                    </div>
                    <p className="cs-keep">Never replaced</p>
                    <p className="cs-fbk"><i />Results feed back in</p>
                  </div>

                  {/* scenes 2 to 4: the CatalogWiz workbench, which becomes the product page */}
                  <div className="cs-win">
                    <div className="cs-chrome">
                      <span className="dots"><i /><i /><i /></span>
                      <span className="t t1"><Sparkles size={12} />CatalogWiz Workbench</span>
                      <span className="t t2"><i className="lock" />store.example.com / telgv3p73</span>
                    </div>
                    <div className="cs-body">
                      <div className="cs-wb">
                        <aside className="cs-srcs">
                          <h4>Sources</h4>
                          <ul>
                            {SOURCES.map(({ label, icon: Ico }) => (
                              <li key={label}><Ico size={13} /><span>{label}</span><i><Check size={9} strokeWidth={3.6} /></i></li>
                            ))}
                          </ul>
                        </aside>
                        <div className="cs-main">
                          <div className="cs-mh">
                            <div><small>Product record</small><b>Motor Circuit Breaker, 3P</b><code>TELGV3P73</code></div>
                            <span className="cs-st" data-el="status" data-s="ai">Waiting for data</span>
                          </div>
                          <div className="cs-pipew">
                            <ol className="cs-pipe">{PIPE.map((t) => <li key={t}>{t}</li>)}</ol>
                            <span className="line"><i /></span>
                          </div>
                          <ul className="cs-rows">
                            {ROWS.map((r) => (
                              <li key={r.k} className="cs-row" data-flag={r.flag ? 1 : 0}>
                                <span className="k">{r.k}</span>
                                <span className="v"><i className="sk" /><b className="val" /></span>
                                <span className="s">{r.src}</span>
                                <span className="st">
                                  <i className="ai"><Sparkles size={9} />AI</i>
                                  {r.flag && <i className="fl">{r.conf}% sure</i>}
                                  <i className="ok"><Check size={11} strokeWidth={3.6} /></i>
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="cs-mf">
                            <span className="meter"><i data-el="meter" /></span>
                            <small data-el="count">0 of 7 attributes</small>
                            <small className="vc" data-el="vcount">None verified yet</small>
                          </div>
                        </div>
                        <aside className="cs-rev" data-done="0">
                          <div className="who"><span className="av">DS</span><span><b>Data specialist</b><small>Reviewing</small></span></div>
                          <p className="fld">Interrupting rating</p>
                          <p className="ai-v"><Sparkles size={10} />AI value <b>65 kA @ 230/240 V ac</b><em>82% sure</em></p>
                          <div className="ev">
                            <small>Datasheet · p.4</small>
                            <p className="ln w9" /><p className="ln w6" />
                            <p className="hl">Icu (breaking capacity) 65 kA @ 230/240 V ac</p>
                            <p className="ln w7" />
                          </div>
                          <div className="act"><span className="ed">Edit</span><span className="go"><i className="a">Approve</i><i className="b"><Check size={12} strokeWidth={3.4} />Approved</i></span></div>
                        </aside>
                      </div>

                      <div className="cs-pg">
                        <div className="cs-pl cs-pgb">
                          <div className="pg-img"><ImageIcon size={26} /><small>No image</small></div>
                          <div className="pg-info">
                            <small className="crumb">Supplier record</small>
                            <h5>MOTOR CIRCUIT BREAKER 3P</h5>
                            <code>TELGV3P73</code>
                            <ul className="spec">
                              <li><span>Brand</span><b>Schneider Electric</b></li>
                              <li><span>Series</span><b>TeSys Deca</b></li>
                              <li className="gap"><span /><i /></li><li className="gap"><span /><i /></li><li className="gap"><span /><i /></li><li className="gap"><span /><i /></li>
                            </ul>
                            <span className="cta off">Add to quote</span>
                          </div>
                        </div>
                        <div className="cs-pl cs-pga">
                          <div className="pg-side">
                            <div className="pg-img"><Breaker /><span className="vbadge"><ShieldCheck size={12} />Verified</span></div>
                            <ul className="thumbs"><li /><li /><li /></ul>
                            <ul className="docs"><li><FileText size={11} />Datasheet PDF</li><li><FileText size={11} />Installation guide</li><li><FileText size={11} />CAD drawing</li></ul>
                          </div>
                          <div className="pg-info">
                            <small className="crumb">Industrial Supply / Circuit Breakers</small>
                            <h5>Schneider Electric TeSys Deca Motor Circuit Breaker, 3P, 73 A, 690 V ac, DIN Rail</h5>
                            <code>Mfr. Part No. TELGV3P73</code>
                            <p className="desc">Thermal-magnetic motor protection for three-phase loads up to 73 A, with front-face padlocking and a three-position handle.</p>
                            <ul className="chips"><li>73 A</li><li>690 V ac</li><li>3 poles</li><li>IP20</li></ul>
                            <ul className="spec">
                              <li><span>Brand</span><b>Schneider Electric</b></li>
                              <li><span>Series</span><b>TeSys Deca</b></li>
                              <li><span>Interrupting rating</span><b>65 kA @ 230/240 V ac</b></li>
                              <li><span>Mounting type</span><b>DIN Rail</b></li>
                              <li className="more"><span>+ 28 more verified attributes</span></li>
                            </ul>
                            <span className="cta">Add to quote</span>
                            <ul className="ready"><li>Schema ready</li><li>UCP ready</li></ul>
                          </div>
                        </div>
                        <i className="cs-div"><b /></i>
                        <span className="cs-tag tb">Before · 2 of 33 attributes</span>
                        <span className="cs-tag ta" data-el="nafter">2 of 33 attributes</span>
                      </div>

                      <span className="cs-cursor">
                        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 9-6.5 1.8L9.7 19.5z" fill="#0b1f3a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                        <em>Data specialist</em>
                      </span>
                    </div>
                  </div>

                  {SATS.map(({ label, sub, icon: Ico }) => (
                    <div key={label} className="cs-sat"><div className="in"><span className="ico"><Ico size={15} /></span><span className="tx"><b>{label}</b>{sub && <small>{sub}</small>}</span><em><i />Live</em></div></div>
                  ))}
                  {DOTS.map((a) => <i key={a} className="cs-dot" />)}
                </div>
              </div>
            </div>
          </div>
          <p className="cs-cta"><Link to="/how-it-works#catalogwiz">See how CatalogWiz fits your stack <Icon name="arrow-right" /></Link><span>Illustrative sample data · sample product TELGV3P73</span></p>
        </div>
      </div>

      <div className="cs-sr">
        <p>The story in five scenes.</p>
        <ol>{SCENES.map((s) => <li key={s.n}><b>{s.t}</b> {s.d}</li>)}</ol>
      </div>
    </section>
  )
}
