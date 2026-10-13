import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ScanLine, Search, Sparkles, Tag } from 'lucide-react'
import { TESYS } from '../sampleProduct.js'
import { SAMPLES } from '../catalogSamples.js'
import { CATEGORIES } from '../../pages/attributeLibraryData.js'
import './EnrichDemo.css'

/* The nine real catalog products from the Category Attribute Guide. Raw rows are a deliberately messy supplier version
   (units glued on, "Y" for "Yes"); "norm" rows fix those, "fill" rows are attributes found in the spec sheet. */
const IMG = { electronic: TESYS.images.front, industrial: SAMPLES.bearings.img, tools: SAMPLES.tools.img, medical: SAMPLES.medical.img, janitorial: SAMPLES.janitorial.img, ppe: SAMPLES.gloves.img, office: SAMPLES.office.img, welding: SAMPLES.welding.img, fire: SAMPLES.fire.img }
const NAME = { electronic: 'Motor circuit breaker, 3 pole', industrial: 'Ball bearing, 0.625 in bore', tools: '18 V hammer drill driver', medical: 'IV giving set, non vented', janitorial: 'Hot water pressure washer', ppe: 'Cut-resistant work glove', office: '10-digit desk calculator', welding: 'Stick/TIG welder, 200 A', fire: 'Single-jacket fire hose' }
const PERSONAS = { electronic: ['Electrician', 'Facility manager'], industrial: ['Maintenance engineer', 'Buyer'], tools: ['Contractor', 'DIY buyer'], medical: ['Nurse', 'Procurement'], janitorial: ['Facility manager', 'Contractor'], ppe: ['Safety officer', 'Site manager'], office: ['Office manager', 'Student'], welding: ['Fabricator', 'Workshop owner'], fire: ['Fire officer', 'Safety manager'] }
const messy = (v) => v.replace(/(\d)\s+([A-Za-zµ°%Ω]+)/g, '$1$2').replace(/^Yes$/, 'Y').replace(/^No$/, 'N')
const simple = ([, v]) => v.length <= 22 && !v.includes(' · ')

const SUPPLIER_FIELDS = { electronic: 5, industrial: 3, tools: 4, medical: 3, janitorial: 4, ppe: 5, office: 3, welding: 4, fire: 5 }
const MAX_FILL = 24
const PRODUCTS = CATEGORIES.map((c) => {
  const sku = c.ref.split(' · ')[1].replace(/\s*\(.*\)/, '')
  const pool = c.attrs.filter(simple)
  /* each supplier sends a different, small set (3 to 5 fields, SKU included, up to 2 of them messy); CatalogWiz fills the rest of the category schema */
  const nSup = SUPPLIER_FIELDS[c.id] - 1
  const normSrc = pool.filter(([, v]) => messy(v) !== v).slice(0, 2)
  const plain = pool.filter((x) => !normSrc.includes(x)).slice(0, nSup - normSrc.length)
  const base = pool.filter((x) => normSrc.includes(x) || plain.includes(x))
  const rest = pool.filter((x) => !base.includes(x))
  const missSet = new Set(c.miss)
  const fillSrc = [...rest.filter(([l]) => missSet.has(l)), ...rest.filter(([l]) => !missSet.has(l))].slice(0, MAX_FILL)
  const people = PERSONAS[c.id]
  return {
    id: c.id, name: NAME[c.id], tag: c.name, img: IMG[c.id], personas: people,
    raw: [['SKU', sku], ...base.map(([l, v]) => [l, normSrc.some(([x]) => x === l) ? messy(v) : v])],
    changes: [
      ...normSrc.map(([l, v], i) => ({ k: 'norm', l, from: messy(v), to: v, who: people[i % 2], why: 'Standard unit and spacing, so filters and comparison work.' })),
      ...fillSrc.map(([l, v], i) => ({ k: 'fill', l, to: v, who: people[(i + 1) % 2], why: `Answers a common buyer question about ${l.toLowerCase()}.` })),
    ],
  }
})
const SCAN_END = 6.4
const MSGS = (p) => [`Checking “SKU: ${p.raw[0][1]}”…`, 'Reading the product photo…', 'Reading the spec sheet…', 'Normalising units and values…', 'Filling missing attributes…']

export default function EnrichDemo({ children }) {
  const nav = useNavigate()
  const demoRef = useRef(null)
  const st = useRef({ pid: null, t0: 0 })
  const [pid, setPid] = useState(null)
  const [t, setT] = useState(0)
  const [who, setWho] = useState('all')
  const [url, setUrl] = useState('')
  const [seen, setSeen] = useState(false)
  const [calm] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const p = useMemo(() => PRODUCTS.find((x) => x.id === pid) || null, [pid])

  useEffect(() => {
    const f = requestAnimationFrame(() => setSeen(true))
    return () => cancelAnimationFrame(f)
  }, [])

  useEffect(() => {
    if (!pid) return undefined
    let raf = 0
    const loop = (now) => {
      const el = (now - st.current.t0) / 1000
      setT(calm ? 99 : Math.min(el, 99))
      if (!calm && el < SCAN_END + 3) raf = requestAnimationFrame(loop)
    }
    st.current.t0 = performance.now()
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [pid, calm])

  const run = (id) => {
    setPid(id); setWho('all'); setT(0)
    requestAnimationFrame(() => demoRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }))
  }
  const submit = (e) => { e.preventDefault(); if (url.trim()) nav(`/ai-readiness-report?url=${encodeURIComponent(url.trim())}`) }

  const done = p && t >= SCAN_END
  const filled = p ? p.changes.filter((c) => c.k === 'fill') : []
  const normed = p ? p.changes.filter((c) => c.k === 'norm') : []
  const total = p ? p.raw.length + filled.length : 0
  const msgs = p ? MSGS(p) : []
  const scanPct = p ? Math.min(1, t / SCAN_END) : 0
  /* one comparison table: every attribute once, with what the supplier sent and what CatalogWiz outputs */
  const rows = useMemo(() => {
    if (!p) return []
    const fix = Object.fromEntries(p.changes.filter((c) => c.k === 'norm').map((c) => [c.l, c]))
    return [
      ...p.raw.map(([l, v]) => ({ l, before: v, after: fix[l] ? fix[l].to : v, k: fix[l] ? 'norm' : 'same', who: fix[l]?.who, why: fix[l]?.why })),
      ...p.changes.filter((c) => c.k === 'fill').map((c) => ({ l: c.l, before: '', after: c.to, k: 'fill', who: c.who, why: c.why })),
    ]
  }, [p])
  const at = Math.min(rows.length - 1, Math.floor(scanPct * rows.length))

  return (
    <div className={`rd${seen ? ' seen' : ''}`} id="try">
      <section className="rd-hero">
        <div className="rd-wrap">
          <span className="rd-pill"><Sparkles size={13} />Your turn · Try it free</span>
          <h2>See your own product, <em>enriched.</em></h2>
          <p className="rd-lead">Paste a product page link, or pick a sample below to see the before and after in seconds.</p>
          <form className="rd-form" onSubmit={submit}>
            <label className="rd-input"><Search size={16} /><input type="url" inputMode="url" placeholder="Paste any product page URL" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Product page URL" /></label>
            <button type="submit" className="btn btn-primary" disabled={!url.trim()}>Check my page <ArrowRight size={16} /></button>
          </form>
          <p className="rd-hint">Pasted pages run through the free AI Readiness Report, with live results from ChatGPT, Claude, Gemini and Perplexity.</p>
          <p className="rd-or">Or pick a sample. They enrich in seconds.</p>
          <ul className="rd-grid">
            {PRODUCTS.map((x, i) => (
              <li key={x.id} style={{ '--i': i }}>
                <button type="button" className={`rd-card${pid === x.id ? ' on' : ''}`} onClick={() => run(x.id)} aria-pressed={pid === x.id}>
                  <span className={`img${x.dark ? ' dark' : ''}`}><img src={x.img} alt="" loading="lazy" /></span>
                  <small>{x.tag}</small>
                  <b>{x.name}</b>
                  <em>{pid === x.id ? 'Showing below' : 'Enrich this'}<ArrowRight size={13} /></em>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rd-demo" ref={demoRef} aria-live="polite">
        <div className="rd-wrap">
          {!p ? (
            <div className="rd-empty"><ScanLine size={22} /><b>Choose a sample above to start</b><span>You will see the raw listing first, then the enriched version.</span></div>
          ) : (
            <div className="rd-stage" key={p.id}>
              <header className={`rd-bar${done ? ' done' : ''}`}>
                <span className="dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="url">app.catalogwiz.ai / enrich / <b>{p.raw[0][1]}</b></span>
                <span className="ai"><b>CatalogWiz <em>AI</em></b></span>
                <em className="st">{done ? `Enriched in ${SCAN_END.toFixed(1)}s` : `${Math.min(t, SCAN_END).toFixed(1)}s`}</em>
                <i className="pg" style={{ transform: `scaleX(${done ? 1 : scanPct})` }} />
              </header>

              <div className="rd-body">
                <div className="rd-head">
                  <div className={`rd-photo${done ? ' done' : ''}`}>
                    <span className="c tl" /><span className="c tr" /><span className="c bl" /><span className="c br" />
                    <img className={p.dark ? 'dark' : ''} src={p.img} alt={p.name} />
                    {!done && <u style={{ top: `${(scanPct * 3 % 1) * 100}%` }} />}
                  </div>
                  <div className="rd-info">
                    <h3>{p.name}</h3>
                    <div className="rd-stats">
                      <div><small>Supplier data</small><b>{p.raw.length}</b></div>
                      <i aria-hidden="true"><ArrowRight size={16} /></i>
                      <div className={`new${done ? ' on' : ''}`}><small>With CatalogWiz</small><b>{done ? total : '·'}</b></div>
                      <ul className={`rd-sum${done ? ' on' : ''}`}><li><b>{normed.length}</b>cleaned up</li><li><b>{filled.length}</b>added from the spec sheet</li></ul>
                    </div>
                  </div>
                  <div className={`rd-who${done ? ' on' : ''}`}>
                    <small>Highlight values for</small>
                    <div>
                      {['all', ...p.personas].map((w) => <button type="button" key={w} disabled={!done} className={who === w ? 'on' : ''} onClick={() => setWho(w)}>{w === 'all' ? 'Every buyer' : w}</button>)}
                    </div>
                  </div>
                </div>

                <div className="rd-main">
                  <div className="rd-line">
                    <p className={`rd-strip${done ? ' ok' : ''}`}>{done ? <Check size={14} strokeWidth={3} /> : <Sparkles size={14} />}{done ? `Done · ${total} structured fields, ${normed.length} cleaned up, ${filled.length} added` : msgs[Math.floor(t / 1.1) % msgs.length]}</p>
                    <ul className="rd-key" aria-hidden="true"><li><i className="sup" />Supplier value</li><li><i className="fix" />Cleaned</li><li><i className="add" />Added by CatalogWiz</li></ul>
                  </div>
                  <ul className="rd-tiles" aria-label="Attributes">
                    {rows.map((r, i) => {
                      const reached = done || i < at
                      const dim = done && who !== 'all' && (r.k === 'same' || r.who !== who)
                      const hot = done && r.k !== 'same' && !dim
                      return (
                        <li key={r.l} className={`rd-tile ${r.k === 'norm' ? 'fixed' : r.k}${reached ? ' on' : ''}${!done && i === at ? ' scan' : ''}${dim ? ' dim' : ''}${hot ? ' hot' : ''}`} style={{ '--i': i }} tabIndex={hot ? 0 : undefined}>
                          {(r.k !== 'fill' || reached) && <small>{r.l}</small>}
                          {r.k === 'fill' ? (reached && <b className="v">{r.after}</b>) : <b className="v">{reached ? r.after : r.before}</b>}
                          {r.k === 'norm' && reached && <s>{r.before}</s>}
                          {done && r.k !== 'same' && <em>{r.k === 'norm' ? 'Cleaned' : 'Added'}</em>}
                          {done && r.k !== 'same' && <p><Tag size={12} />{r.why}</p>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <p className="rd-foot">Illustrative sample products and values. For a live test of your own product page, run the free AI Readiness Report.</p>
          {children}
        </div>
      </section>
    </div>
  )
}
