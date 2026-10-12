import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import productImg from '../assets/home/weg-rw27.webp'
import './RecordBuild.css'
import Icon from './ui/Icon.jsx'

/* ------------------------------------------------------------------
   "Build the product record": raw supplier sources -> a real product
   (WEG RW27 overload relay) -> CatalogWiz builds one trusted record.
   The record shows the most useful sample fields only (the product has more).
   Illustrative sample data. Viewport-triggered, not pinned.
   ------------------------------------------------------------------ */

const PRODUCT_NAME = 'WEG RW27 Series Overload Relay 11 to 17 A 1NO/1NC'

const SOURCES = [
  { t: 'XLSX', s: 'Spreadsheets', i: 'sheet' },
  { t: 'CSV', s: 'Product files', i: 'file' },
  { t: 'PDF', s: 'Supplier catalogs', i: 'file' },
  { t: 'ERP', s: 'System exports', i: 'database' },
  { t: 'Images', s: 'Product photos', i: 'image' },
  { t: 'SKU / MPN', s: 'Identifiers', i: 'barcode' },
  { t: 'Technical Specs', s: 'Data sheets', i: 'file' },
]

const GROUPS = [
  { id: 'identity', label: 'Identity', rows: [
    { k: 'sku', n: 'SKU', v: 'RW27-2D3-U017' },
    { k: 'series', n: 'Series', v: 'RW27' },
    { k: 'type', n: 'Product Type', v: 'Overload Relay' },
  ] },
  { id: 'electrical', label: 'Electrical', rows: [
    { k: 'current', n: 'Current Rating', v: '11–17 A', raw: '11 to 17 amp' },
    { k: 'voltage', n: 'Voltage Rating', v: '690 V' },
    { k: 'pole', n: 'Pole Configuration', v: '3P' },
    { k: 'power', n: 'Power Rating', v: '7.5 kW' },
  ] },
  { id: 'technical', label: 'Technical', rows: [
    { k: 'reset', n: 'Reset Method', v: 'Automatic / Manual' },
    { k: 'terminal', n: 'Terminal Type', v: 'Screw' },
    { k: 'normal', n: 'Normal State', v: '1NO/1NC' },
    { k: 'temp', n: 'Operating Temperature', v: '−25°C to +60°C' },
  ] },
]
const ORDER = ['sku', 'series', 'type', 'current', 'pole', 'voltage', 'power', 'reset', 'terminal', 'normal', 'temp']
const TAXONOMY = ['Electrical', 'Industrial Controls & Automation', 'Relays, Contactors & Accessories', 'Overload Relays']
const CHECKS = ['Product identity', 'Technical attributes', 'Taxonomy', 'Specifications']
const CHANNELS = ['Ecommerce', 'Marketplace', 'PIM / MDM', 'API', 'AI Discovery']
const STAGES = ['Ingest', 'Extract', 'Structure', 'Validate', 'Ready']

const INIT = { rows: 0, product: false, conn: 0, src: SOURCES.map(() => 0), fields: 0, extracting: false, tax: 0, std: false, val: 0, validating: false, trusted: false, ready: 0, stage: -1 }
const FINAL = { rows: SOURCES.length, product: true, conn: 2, src: SOURCES.map(() => 2), fields: ORDER.length, extracting: false, tax: TAXONOMY.length, std: true, val: CHECKS.length, validating: false, trusted: true, ready: CHANNELS.length, stage: 5 }

const prefersReduced = () => typeof window !== 'undefined' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(max-width: 760px)').matches)

const RawSvg = ({ children, size = 17, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

const Svg = ({ children, size, sw, ...rest }) => (
  typeof children === 'string'
    ? <Icon name={children} size={size ?? 18} strokeWidth={sw ?? 2} />
    : <RawSvg size={size} sw={sw} {...rest}>{children}</RawSvg>
)
const Tick = ({ size, s }) => <Icon name="check" size={size ?? s ?? 10} strokeWidth={3.4} />

export default function RecordBuild() {
  const [s, setS] = useState(INIT)
  const [paths, setPaths] = useState({ src: [], grp: [], hub: null })
  const [hoverSrc, setHoverSrc] = useState(-1)
  const [hoverGrp, setHoverGrp] = useState('')
  const stageRef = useRef(null)
  const srcRefs = useRef([])
  const prodRef = useRef(null)
  const recRef = useRef(null)
  const grpRefs = useRef({})
  const timers = useRef([])
  const started = useRef(false)

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const run = useCallback(() => {
    clear()
    setS(INIT)
    const q = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    const patch = (o) => setS((p) => ({ ...p, ...o }))
    const setSrc = (i, v) => setS((p) => ({ ...p, src: p.src.map((x, j) => (j === i ? v : x)) }))

    SOURCES.forEach((_, i) => q(80 + i * 80, () => patch({ rows: i + 1 })))        // 1 sources reveal
    q(800, () => patch({ product: true, stage: 0 }))                               // product appears + identified
    q(1300, () => patch({ conn: 1 }))                                              // 2 connectors + pulses
    SOURCES.forEach((_, i) => { q(1400 + i * 100, () => setSrc(i, 1)); q(1400 + i * 100 + 650, () => setSrc(i, 2)) })
    q(2300, () => patch({ conn: 2, stage: 1, extracting: true }))
    ORDER.forEach((_, i) => q(2500 + i * 170, () => patch({ fields: i + 1 })))     // 6 fields fill
    const t0 = 2500 + ORDER.length * 170 + 200
    q(t0 - 100, () => patch({ extracting: false, stage: 2 }))
    TAXONOMY.forEach((_, i) => q(t0 + i * 300, () => patch({ tax: i + 1 })))       // 5 taxonomy builds
    q(t0 + TAXONOMY.length * 300 + 150, () => patch({ std: true }))
    const v0 = t0 + TAXONOMY.length * 300 + 700
    q(v0, () => patch({ stage: 3, validating: true }))                             // validation
    CHECKS.forEach((_, i) => q(v0 + 200 + i * 340, () => patch({ val: i + 1 })))
    const v1 = v0 + 200 + CHECKS.length * 340 + 100
    q(v1, () => patch({ validating: false, trusted: true, stage: 4 }))             // 7 trusted record
    CHANNELS.forEach((_, i) => q(v1 + 400 + i * 180, () => patch({ ready: i + 1 })))
    q(v1 + 400 + CHANNELS.length * 180 + 200, () => patch({ stage: 5 }))
  }, [])

  // start when ~35% of the section is visible (capped for tall mobile layouts)
  useEffect(() => {
    const el = stageRef.current?.closest('section')
    if (!el) return undefined
    if (prefersReduced()) { const f = requestAnimationFrame(() => setS(FINAL)); started.current = true; return () => cancelAnimationFrame(f) }
    if (!('IntersectionObserver' in window)) { const f = requestAnimationFrame(run); return () => { cancelAnimationFrame(f); clear() } }
    const io = new IntersectionObserver(([e]) => {
      const need = Math.min(0.35 * e.boundingClientRect.height, window.innerHeight * 0.45)
      if (e.isIntersecting && e.intersectionRect.height >= need - 1 && !started.current) { started.current = true; run(); io.disconnect() }
    }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) })
    io.observe(el)
    return () => { io.disconnect(); clear() }
  }, [run])

  // connector geometry, rebuilt from the real layout (desktop / tablet only)
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const mq = window.matchMedia('(min-width: 761px)')
    const measure = () => {
      if (!mq.matches || !prodRef.current || !recRef.current) { setPaths({ src: [], grp: [], hub: null }); return }
      const sr = stage.getBoundingClientRect()
      const pr = prodRef.current.getBoundingClientRect()
      const rr = recRef.current.getBoundingClientRect()
      const hx = pr.left - sr.left + pr.width * 0.05
      const hy = pr.top - sr.top + pr.height * 0.5
      const rows = srcRefs.current.filter(Boolean)
      const src = rows.map((el, i) => {
        const r = el.getBoundingClientRect()
        const x0 = r.right - sr.left
        const y0 = r.top - sr.top + r.height / 2
        const bend = x0 + (hx - x0) * 0.5
        const fan = (i - (rows.length - 1) / 2) * 3 // keeps the converging ends a few px apart
        return `M${x0.toFixed(1)} ${y0.toFixed(1)} C${bend.toFixed(1)} ${y0.toFixed(1)} ${bend.toFixed(1)} ${(hy + fan).toFixed(1)} ${hx.toFixed(1)} ${(hy + fan).toFixed(1)}`
      })
      const px = pr.right - sr.left - pr.width * 0.07
      const x1 = rr.left - sr.left
      const grp = GROUPS.map((g, i) => {
        const el = grpRefs.current[g.id]
        if (!el) return ''
        const r = el.getBoundingClientRect()
        const y1 = r.top - sr.top + r.height / 2
        const start = hy + (i - 1) * 6
        const mx = px + (x1 - px) * 0.55
        return `M${px.toFixed(1)} ${start.toFixed(1)} C${mx.toFixed(1)} ${start.toFixed(1)} ${mx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
      })
      setPaths({ src, grp, hub: { x: hx, y: hy } })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  const replay = () => { started.current = true; if (prefersReduced()) setS(FINAL); else run() }
  const fieldIndex = (k) => ORDER.indexOf(k)
  const pct = Math.round(62 + (38 * s.fields) / ORDER.length)
  const status = s.stage >= 5 ? 'Ready for channels' : s.trusted ? 'Trusted record' : s.validating || s.val ? 'Validating' : s.tax ? 'Structuring' : s.extracting || s.fields ? 'Extracting' : s.product ? 'Identified' : 'Waiting'
  const progress = Math.max(0, s.stage + (s.stage >= 5 ? 0 : 0.5)) / 5

  return (
    <section id="catalogwiz-record" className="rb" aria-labelledby="rb-h">
      <div className="rb-wrap">
        <div className="rb-visual">
          <div className="rb-vhead">
            <span>Sample product record <i aria-hidden="true">·</i> illustrative data</span>
            <button type="button" className="rb-replay" onClick={replay}>Replay <span aria-hidden="true">↻</span></button>
          </div>

          <div ref={stageRef} className="rb-stage" style={{ '--p': progress }} role="group" aria-label="Interactive illustration: supplier files are turned into one trusted product record for a WEG RW27 overload relay. Values are illustrative sample data.">
            <span className="rb-vline" aria-hidden="true" />

            {/* raw input rail */}
            <ul className="rb-sources" onMouseLeave={() => setHoverSrc(-1)}>
              {SOURCES.map((src, i) => (
                <li
                  key={src.t}
                  ref={(el) => { srcRefs.current[i] = el }}
                  className={`rb-src${s.rows > i ? ' in' : ''}${s.src[i] === 1 ? ' active' : ''}${s.src[i] === 2 ? ' done' : ''}${[1, 5, 6].includes(i) ? ' extra' : ''}`}
                  onMouseEnter={() => setHoverSrc(i)}
                >
                  <span className="rb-src-icon"><Svg size={16}>{src.i}</Svg></span>
                  <span className="rb-src-text"><strong>{src.t}</strong><small>{src.s}</small></span>
                  <span className="rb-src-ok"><Tick size={9} /></span>
                </li>
              ))}
            </ul>

            {/* real product + taxonomy */}
            <div className="rb-product-col">
              <div ref={prodRef} className={`rb-product${s.product ? ' in' : ''}`}>
                <img src={productImg} alt="WEG RW27 series overload relay, 11 to 17 A, 1NO/1NC" width="1254" height="1254" />
              </div>
              <p className={`rb-ident${s.product ? ' on' : ''}`}><Tick size={9} /> <span><b>Product identified</b>WEG RW27 Series Overload Relay</span></p>
              <div className="rb-tax" aria-label="Taxonomy path">
                <h4>Taxonomy</h4>
                <ol>
                  {TAXONOMY.map((t, i) => (
                    <li key={t} className={s.tax > i ? 'on' : ''}><span>{t}</span>{i < TAXONOMY.length - 1 && <i aria-hidden="true">↓</i>}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* CatalogWiz record */}
            <div ref={recRef} className={`rb-record${s.product ? ' in' : ''}`}>
              <header>
                <span className="rb-brand"><i aria-hidden="true" />CatalogWiz <b>Workbench</b></span>
                <span className={`rb-status${s.stage >= 4 ? ' ok' : ''}`} aria-live="polite">{status}</span>
              </header>
              <div className="rb-record-title">
                <img src={productImg} alt="" width="1254" height="1254" loading="lazy" />
                <div><strong>{PRODUCT_NAME}</strong><span>{s.trusted ? 'Trusted record' : 'Draft record'} · {pct}% complete</span></div>
              </div>
              <i className="rb-meter" aria-hidden="true"><em style={{ transform: `scaleX(${pct / 100})` }} /></i>
              <div className="rb-groups">
                {GROUPS.map((g) => (
                  <div key={g.id} className={`rb-group${hoverGrp === g.id ? ' hl' : ''}`}>
                    <h4 ref={(el) => { grpRefs.current[g.id] = el }}>{g.label}</h4>
                    <dl>
                      {g.rows.map((r) => {
                        const idx = fieldIndex(r.k)
                        const done = s.fields > idx
                        const active = s.extracting && s.fields === idx
                        const showRaw = r.raw && done && !s.std
                        return (
                          <div
                            key={r.k}
                            className={`rb-row${done ? ' done' : ''}${active ? ' active' : ''}${r.raw && s.std ? ' std' : ''}`}
                            onMouseEnter={() => setHoverGrp(g.id)}
                            onMouseLeave={() => setHoverGrp('')}
                          >
                            <dt>{r.n}</dt>
                            <dd>{done ? (showRaw ? <em>{r.raw}</em> : r.v) : '—'}</dd>
                          </div>
                        )
                      })}
                    </dl>
                  </div>
                ))}
                <p className={`rb-more${s.fields >= ORDER.length ? ' on' : ''}`}>+ additional validated attributes</p>
              </div>
              <ul className="rb-checks" aria-label="Validation">
                {CHECKS.map((c, i) => (
                  <li key={c} className={s.val > i ? 'ok' : s.validating && s.val === i ? 'run' : ''}><i>{s.val > i ? <Tick size={8} /> : null}</i>{c}</li>
                ))}
              </ul>
              <div className={`rb-trusted${s.trusted ? ' on' : ''}`}>
                <strong><Tick size={10} /> Trusted product record</strong>
                <ul className={s.ready >= CHANNELS.length ? 'settled' : ''}>
                  {CHANNELS.map((c, i) => <li key={c} className={s.ready > i ? 'on' : ''} data-tip="Ready to publish" tabIndex={0}>{c}</li>)}
                </ul>
              </div>
            </div>

            {/* transformation rail */}
            <ol className="rb-rail" aria-label="Process">
              {STAGES.map((st, i) => (
                <li key={st} className={s.stage > i ? 'done' : s.stage === i ? 'active' : ''}>
                  <span className="rb-rail-dot">{s.stage > i ? <Tick size={9} /> : `0${i + 1}`}</span>
                  <b>{st}</b>
                </li>
              ))}
              <span className="rb-rail-fill" aria-hidden="true" />
            </ol>

            {/* connectors */}
            <svg className="rb-svg" aria-hidden="true" focusable="false">
              {paths.src.map((d, i) => d && (
                <g key={i} className={hoverSrc === i ? 'hl' : hoverSrc > -1 ? 'dim' : ''}>
                  <path className="base" d={d} />
                  <path className={`lit${s.src[i] > 0 ? ' draw' : ''}${s.src[i] === 2 ? ' done' : ''}`} d={d} pathLength="1" />
                </g>
              ))}
              {paths.grp.map((d, i) => d && (
                <g key={GROUPS[i].id} className={hoverGrp === GROUPS[i].id ? 'hl' : ''}>
                  <path className="base" d={d} />
                  <path className={`lit${s.conn >= 2 ? ' draw' : ''}${s.fields > 0 ? ' done' : ''}`} d={d} pathLength="1" />
                </g>
              ))}
              {paths.hub && <circle className={`hub${s.conn > 0 ? ' on' : ''}`} cx={paths.hub.x} cy={paths.hub.y} r="5" />}
            </svg>
            {paths.src.map((d, i) => d && (
              <span key={i} className={`rb-dot${s.src[i] === 1 ? ' run' : ''}`} style={{ offsetPath: `path("${d}")` }} aria-hidden="true" />
            ))}
          </div>
        </div>

        <div className="rb-copy">
          <p className="rb-eyebrow">From raw data to a trusted product record</p>
          <h2 id="rb-h">Turn fragmented supplier data into product content your teams — and systems — can trust.</h2>
          <p className="rb-lede">CatalogWiz brings together supplier files, ERP data, product images and technical documentation, then transforms them into one structured, standardized and validated product record.</p>
          <p className="rb-benefit">Less manual cleanup. Fewer inconsistencies. Faster product launches.</p>
          <div className="rb-actions">
            <a className="btn btn-primary" href="#wbs">Explore CatalogWiz Workbench <Icon name="arrow-right" /></a>
            <a className="rb-link" href="#cap">See How CatalogWiz Works <Icon name="arrow-right" /></a>
          </div>
        </div>
      </div>
    </section>
  )
}
