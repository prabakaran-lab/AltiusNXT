import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsLeftRight, Check, ImageOff, Search, ShoppingCart } from 'lucide-react'
import './LiveBeforeAfter.css'

/* The visitor's own product page, before and after CatalogWiz, in the same interactive window as the homepage's
   "Before & after" section (same styles, toggle, draggable wipe and pop-in). Everything shown comes from the real
   enrichment result for the submitted URL: the scraped title, description, image, identifiers, attributes and
   values on the Before side, and the enriched title, description and verified attributes on the After side. */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const sameValue = (a, b) => String(a).toLowerCase().replace(/\s+/g, '') === String(b).toLowerCase().replace(/\s+/g, '')
const BRAND_RE = /^(brand|manufacturer|mfr|make)\b/i
const ID_RE = /\b(part|sku|mpn|model|item|catalog(?:ue)?|style|upc|ean|gtin|product code|article)\b/i

/** The identity block: brand / manufacturer and part-number style rows, from the attributes the page (or enrichment) really has. */
function identityRows(pairs, max = 4) {
  const rows = []
  const seen = new Set()
  for (const [label, value] of pairs) {
    const isBrand = BRAND_RE.test(label)
    const isId = ID_RE.test(label) && /\d/.test(value) && value.length <= 40
    if (!isBrand && !isId) continue
    const k = norm(value)
    if (!k || seen.has(k)) continue
    seen.add(k)
    rows.push([label, value])
    if (rows.length >= max) break
  }
  return rows
}

function Product({ src }) {
  const [bad, setBad] = useState(false)
  if (!src || bad) return <span className="lba-noimg" role="img" aria-label="No product image found"><ImageOff size={26} /></span>
  return <img src={src} alt="" onError={() => setBad(true)} />
}

function Shell({ host, shownUrl, children }) {
  return (
    <div className="lba-page">
      <div className="lba-bar"><i /><i /><i /><span title={shownUrl}>{shownUrl}</span></div>
      <div className="lba-nav"><b><i />{host}</b><Search size={12} /><ShoppingCart size={13} /></div>
      {children}
    </div>
  )
}

export default function LiveBeforeAfter({ r }) {
  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const [pos, setPos] = useState(100)
  const [used, setUsed] = useState(false)
  const [seen, setSeen] = useState(false)
  const [pop, setPop] = useState(false)
  const touched = useRef(false)
  const started = useRef(false)
  const drag = useRef(false)
  const posRef = useRef(100)
  const raf = useRef(0)
  const timer = useRef(0)
  const popT = useRef(0)
  const wasAfter = useRef(false)
  const reduce = useRef(false)

  const attrs = r.after.attributes
  const before = r.before.attributes // [label, value] exactly as the page states them
  const cleaned = attrs.filter((a) => a.before && !sameValue(a.before, a.value))
  const added = attrs.filter((a) => !a.before)
  const crumbs = useMemo(() => {
    const c = attrs.find((a) => /^category$/i.test(a.label))?.before || ''
    return ['Home', ...c.split('>').map((x) => x.trim()).filter(Boolean)]
  }, [attrs])
  const beforeId = useMemo(() => identityRows(before), [before])
  const afterId = useMemo(() => identityRows(attrs.map((a) => [a.label, a.value])), [attrs])
  const shownUrl = r.displayUrl || r.host
  const sources = (r.sources || []).map((s) => s.title).slice(0, 3)

  /* the moment the slider lands on "After", the enriched page pops in (see .lba-layer.after.pop) */
  const track = useCallback((v) => {
    const now = v < 12
    if (now && !wasAfter.current) {
      setPop(true)
      window.clearTimeout(popT.current)
      popT.current = window.setTimeout(() => setPop(false), 2600)
    }
    wasAfter.current = now
  }, [])
  const setFrom = useCallback((clientX) => {
    const b = boxRef.current.getBoundingClientRect()
    const v = Math.max(4, Math.min(96, ((clientX - b.left) / b.width) * 100))
    posRef.current = v
    track(v)
    setPos(v)
  }, [track])
  const glide = useCallback((to, ms = 1300) => {
    cancelAnimationFrame(raf.current)
    const from = posRef.current
    const t0 = performance.now()
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms)
      const v = from + (to - from) * ease(t)
      posRef.current = v
      track(v)
      setPos(v)
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
  }, [track])

  /* on arrival: show the original page, then wipe once to the enriched page; after that the visitor is in control */
  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setSeen(true)
    if (reduce.current) { posRef.current = 0; setPos(0); return undefined }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        timer.current = window.setTimeout(() => { if (!touched.current) glide(0, 1600) }, 1700)
      }
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(rootRef.current)
    return () => { io.disconnect(); window.clearTimeout(timer.current); window.clearTimeout(popT.current); cancelAnimationFrame(raf.current) }
  }, [glide])

  const take = () => { touched.current = true; setUsed(true); window.clearTimeout(timer.current); cancelAnimationFrame(raf.current) }
  const choose = (toAfter) => {
    take()
    if (reduce.current) { posRef.current = toAfter ? 0 : 100; setPos(posRef.current) } else glide(toAfter ? 0 : 100, 1200)
  }
  const down = (e) => { take(); drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); setFrom(e.clientX) }
  const move = (e) => { if (drag.current) setFrom(e.clientX) }
  const up = () => { drag.current = false }

  return (
    <section className={`lba lba-live${seen ? ' seen' : ''}`} ref={rootRef} aria-labelledby="lba-live-title">
      <div className="lba-wrap">
        <header className="lba-head">
          <p className="lba-eyebrow">Before &amp; after CatalogWiz</p>
          <h2 id="lba-live-title">Your product page. <em>Before and after.</em></h2>
          <p className="lba-sub">This is your own listing, read live from {r.host}. Watch it wipe into the enriched page, or drag the handle to compare.</p>
        </header>

        <div className="lba-toggle" role="group" aria-label="Show before or after">
          <i style={{ transform: `translateX(${pos < 50 ? 100 : 0}%)` }} aria-hidden="true" />
          <button type="button" aria-pressed={pos >= 50} className={pos >= 50 ? 'on' : ''} onClick={() => choose(false)}>Before</button>
          <button type="button" aria-pressed={pos < 50} className={pos < 50 ? 'on after' : 'after'} onClick={() => choose(true)}>After</button>
        </div>

        <div className={`lba-stage${pop ? ' burst' : ''}`} ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {/* AFTER: the enriched page */}
          <div className={`lba-layer after${pop ? ' pop' : ''}`}>
            <Shell host={r.host} shownUrl={shownUrl}>
              <ol className="lba-bc">{crumbs.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}</ol>
              <div className="lba-cols">
                <div className="lba-gal"><Product src={r.image} /></div>
                <div className="lba-info">
                  <h3>{r.after.title}</h3>
                  {afterId.length > 0 && (
                    <dl className="lba-id">{afterId.map(([l, v]) => <div key={l}><dt>{l}</dt><dd title={v}>{v}</dd></div>)}</dl>
                  )}
                  <p>{r.after.description || 'The page does not give enough detail to write a description without guessing.'}</p>
                </div>
              </div>
              <section className="lba-card" aria-label="Specifications after">
                <header><b>Specifications</b><span className="lba-chip ok"><Check size={10} strokeWidth={3.4} />{attrs.length} attributes</span></header>
                <div className="lba-spec">
                  {attrs.map((a, i) => (
                    <span key={`${a.label}-${i}`} className={!a.before ? 'add' : sameValue(a.before, a.value) ? '' : 'fix'} style={{ '--k': i }}>
                      <em title={a.label}>{a.label}</em><b title={a.value}>{a.value}</b>
                    </span>
                  ))}
                </div>
              </section>
            </Shell>
          </div>

          {/* BEFORE: the page exactly as it was scraped */}
          <div className="lba-layer before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <Shell host={r.host} shownUrl={shownUrl}>
              <ol className="lba-bc">{crumbs.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}</ol>
              <div className="lba-cols">
                <div className="lba-gal"><Product src={r.image} /></div>
                <div className="lba-info">
                  <h3 className="raw">{r.before.title || 'No product title found'}</h3>
                  {beforeId.length > 0 && (
                    <dl className="lba-id off">{beforeId.map(([l, v]) => <div key={l}><dt>{l}</dt><dd title={v}>{v}</dd></div>)}</dl>
                  )}
                  <p className="raw">{r.before.description || 'No product description on the page.'}</p>
                </div>
              </div>
              <section className="lba-card" aria-label="Specifications before">
                <header><b>Specifications</b><span className="lba-chip bad">{before.length} listed</span></header>
                <div className="lba-spec">
                  {before.length ? before.map(([l, v], i) => <span key={`${l}-${i}`}><em title={l}>{l}</em><b title={v}>{v}</b></span>) : <span className="lba-none"><em>No specifications are listed on this page.</em></span>}
                </div>
              </section>
            </Shell>
          </div>

          <span className={`lba-tag b${pos < 12 ? ' dim' : ''}`}>Before <small>{before.length} attributes</small></span>
          <span className="lba-flash" aria-hidden="true" />
          <span className={`lba-tag a${pos > 88 ? ' dim' : ''}`}>After <small>{attrs.length} attributes</small></span>
          <div className={`lba-handle${pos < 2 || pos > 98 ? ' rest' : ''}`} style={{ left: `${pos}%` }} aria-hidden="true"><span><ChevronsLeftRight size={18} /></span></div>
          <span className={`lba-hint${used ? ' gone' : ''}`} aria-hidden="true">Drag to compare</span>
          <input className="lba-range" type="range" min="0" max="100" value={Math.round(pos)} aria-label="Compare before and after" onChange={(e) => { take(); posRef.current = Number(e.target.value); setPos(posRef.current) }} onPointerDown={(e) => e.stopPropagation()} />
        </div>

        <ul className="lba-points">
          <li><Check size={14} strokeWidth={3} /><b>{before.length} → {attrs.length}</b> attributes, {r.stats.technical} of them technical</li>
          <li><Check size={14} strokeWidth={3} /><b>{cleaned.length}</b> value{cleaned.length === 1 ? '' : 's'} tidied, <b>{added.length}</b> added from verified sources</li>
          <li><Check size={14} strokeWidth={3} /><b>Checked</b> against your page{sources.length ? ` and ${sources.join(', ')}` : ''}</li>
        </ul>

        <details className="lba-changes">
          <summary>See every change ({cleaned.length + added.length})</summary>
          <ul>
            {cleaned.map((a, i) => <li key={`c${i}`}><u className="fix">Tidied</u><b>{a.label}</b><span><s>{a.before}</s> → {a.value}</span></li>)}
            {added.map((a, i) => <li key={`a${i}`}><u className="add">Added</u><b>{a.label}</b><span>{a.value}<small>{a.source === 'web' ? 'manufacturer data' : 'your page'}</small></span></li>)}
            {!cleaned.length && !added.length && <li><span>Nothing could be added without guessing.</span></li>}
          </ul>
        </details>
      </div>
    </section>
  )
}
