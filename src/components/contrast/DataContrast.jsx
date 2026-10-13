import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlignLeft, BarChart3, Bot, Calculator, Check, Cog, Droplets, Flame, FileSpreadsheet, FileText, Globe, Hammer, Hand, Search, ShieldCheck, Siren, Sparkles, Stethoscope, Tag, Zap } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { TESYS } from '../sampleProduct.js'
import { SAMPLES } from '../catalogSamples.js'
import './DataContrast.css'

const breaker = TESYS.images.front

/* Sample products: real catalog pages. Values come from those pages, so each demo shows what CatalogWiz would output for them. */
const ICONS = { fire: Siren, welding: Flame, gloves: Hand, office: Calculator, janitorial: Droplets, medical: Stethoscope, tools: Hammer, bearings: Cog }
const LABELS = { bearings: 'Industrial Supply', tools: 'Hand, Power & Machine Tools', medical: 'Medical Supplies', janitorial: 'Janitorial Supplies', gloves: 'Safety & PPE', office: 'Office Supplies', welding: 'Gas & Welding', fire: 'Fire Protection & Safety Supplies' }
const fromSample = (id) => { const x = SAMPLES[id]; return { id, label: LABELS[id], icon: ICONS[id], img: x.img, query: x.query, answer: x.answer, raw: x.raw, rich: x.rich } }
const CATEGORIES = [
  {
    id: 'electrical', label: 'Electronic Supplies & Components', icon: Zap, img: breaker,
    query: 'Find a 3-pole motor circuit breaker, 73 A, 690 V ac, 65 kA, DIN rail mount.',
    answer: 'TELGV3P73: Schneider Electric TeSys Deca, 3-pole, 62-73 A, 690 V ac, 65 kA, DIN rail mount.',
    raw: { title: 'GV3P73 MOTOR CB 3P', missing: ['Pole Configuration', 'AC Voltage Rating', 'Interrupting Rating', 'Trip Mechanism', 'Mounting Type', 'Terminal Connection', 'IP Rating', 'Technical Description'] },
    rich: {
      title: TESYS.title, meta: 'SKU: TELGV3P73 | Brand: Schneider Electric | MPN: TELGV3P73',
      rows: [['Current Rating', '73 A'], ['Number of Poles', '3'], ['AC Voltage Rating', '690 V ac'], ['Interrupting Rating', '65 kA'], ['Trip Mechanism', 'Thermal Magnetic'], ['Mounting Type', 'DIN Rail'], ['Terminal Connection', 'Screw Clamp'], ['Trip Type', 'Type F'], ['IP Rating', 'IP20'], ['Series', 'TeSys Deca']],
      taxonomy: TESYS.taxonomy, seo: 'Motor Circuit Breaker 3P | 73 A, 690 V ac, 65 kA | TeSys Deca',
    },
  },
  ...['bearings', 'tools', 'medical', 'janitorial', 'gloves', 'office', 'welding', 'fire'].map(fromSample),
]

/* the rest of the enriched record: description, SEO, keywords */
const CONTENT = {
  electrical: { description: TESYS.description, slug: 'store.example.com › circuit-breakers › motor-protection › telgv3p73', meta: 'Schneider Electric TeSys Deca motor circuit breaker, 3-pole, 62-73 A, 690 V ac, 65 kA, DIN rail mount. Specifications verified by product data experts.', keywords: ['motor circuit breaker', 'TeSys Deca', 'GV3P73', '73 A', '690 V ac', 'DIN rail'] },
  ...Object.fromEntries(Object.entries(SAMPLES).map(([k, x]) => [k, { description: x.description, slug: x.slug, meta: x.meta, keywords: x.keywords }])),
}

/* one cycle: type the buyer's question → AI search misses on raw data → CatalogWiz AI enriches → AI search finds the product */
const T_TYPE = 2.4, T_MISS = 3.4, T_START = 6.6, T_ROW = 0.6, T_END = 22.5
/* hand-off: the supplier files appear one by one, upload to CatalogWiz one by one, and only then does the CatalogWiz screen open */
const T_SRC = 3.9, T_UP = 5.0
const SRCI = [{ n: 'Datasheet.pdf', I: FileText }, { n: 'Supplier.xlsx', I: FileSpreadsheet }, { n: 'Product page', I: Globe }]
/* per-category AI-match score: [before, after] */
const SCORES = { electrical: [29, 100], bearings: [24, 96], tools: [31, 97], medical: [15, 95], janitorial: [27, 98], gloves: [21, 96], office: [34, 99], welding: [12, 94], fire: [19, 97] }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function stateAt(c, t) {
  const n = c.rich.rows.length
  const rows = clamp(Math.floor((t - T_START - 0.3) / T_ROW + 1), 0, n)
  const rowsDone = T_START + 0.3 + n * T_ROW
  const progress = clamp((t - T_START) / (rowsDone + 5.0 - T_START), 0, 1)
  const final = rowsDone + 5.4
  const [lo, hi] = SCORES[c.id] || [18, 98]
  const after = (m) => t >= rowsDone + m
  return {
    chars: Math.round(c.query.length * clamp(t / T_TYPE, 0, 1)), typing: t < T_TYPE,
    searching: t >= T_TYPE && t < T_MISS, missed: t >= T_MISS,
    enriching: t >= T_START && t < final, rows, n,
    title: after(0), taxonomy: clamp(Math.floor((t - rowsDone - 0.2) / 0.3) + 1, 0, 3), desc: after(1.2), seo: after(2.2), meta: after(2.9), kw: clamp(Math.floor((t - rowsDone - 3.5) / 0.28) + 1, 0, 9),
    scan: progress, done: t >= final, answer: clamp(Math.round(((t - final) / 1.6) * c.answer.length), 0, c.answer.length),
    before: lo, score: t < T_START ? (t >= T_MISS ? lo : 0) : Math.round(lo + (hi - lo) * progress),
    pct: t < T_START ? 22 : Math.round(22 + 60 * (rows / n) + (after(1.2) ? 6 : 0) + (after(2.2) ? 5 : 0) + (after(3.0) ? 3 : 0) + (t >= rowsDone + 4.2 ? 2 : 0)),
  }
}

export default function DataContrast() {
  const rootRef = useRef(null)
  const run = useRef({ idx: 0, t: 0, visible: false, reduced: false })
  const [idx, setIdx] = useState(0)
  const [t, setT] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => { run.current.reduced = mq.matches; if (mq.matches) { run.current.t = T_END - 0.5; setT(T_END - 0.5) } }
    read(); mq.addEventListener('change', read)
    const io = new IntersectionObserver(([e]) => { run.current.visible = e.isIntersecting }, { threshold: window.innerWidth < 768 ? 0.04 : 0.2 })
    io.observe(rootRef.current)
    return () => { mq.removeEventListener('change', read); io.disconnect() }
  }, [])

  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now
      const r = run.current
      if (r.visible && !r.reduced && !r.freeze && !document.hidden) {
        r.t += dt; acc += dt
        if (r.t >= T_END) { r.idx = (r.idx + 1) % CATEGORIES.length; r.t = 0; setIdx(r.idx) }
        if (acc >= 0.04) { acc = 0; setT(r.t) }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__dcx = (i, tt) => { run.current.freeze = true; run.current.idx = i; run.current.t = tt; setIdx(i); setT(tt) }
    return () => { delete window.__dcx }
  }, [])

  const pick = useCallback((i) => { run.current.idx = i; run.current.t = run.current.reduced ? T_END - 0.5 : 0; setIdx(i); setT(run.current.t) }, [])

  const c = CATEGORIES[idx]
  const s = stateAt(c, t)
  const sku = (c.rich.meta.match(/SKU:\s*([^|]+?)\s*\|/) || [null, c.id])[1]
  const take = t >= T_START - 0.4 && t < T_START + 1.6
  const uploading = t >= T_UP && t < T_START + 0.3
  const srcState = (i) => (s.done ? 'ok' : t >= T_UP + i * 0.45 + 0.45 ? 'up' : t >= T_UP + i * 0.45 ? 'now' : t >= T_SRC + i * 0.4 ? 'in' : '')
  const actText = s.done ? 'Enriched and human verified · ready to publish' : s.enriching ? (s.rows < s.n ? `Extracting “${c.rich.rows[Math.min(s.rows, s.n - 1)][0]}” · ${s.rows + 1} of ${s.n}` : !s.desc ? 'Writing the product description…' : !s.seo ? 'Building the SEO title and meta description…' : 'Generating keywords…') : 'Waiting for supplier data…'

  return (
    <section className={`dcx${s.done ? ' is-done' : ''}`} ref={rootRef} aria-labelledby="dcx-title">
      <div className="dcx-wrap">
        <header className="dcx-head">
          <p className="dcx-pill">Better data · Better discovery</p>
          <h2 id="dcx-title">Product data enrichment that gets your products <em>found in AI search.</em></h2>
          <p className="dcx-sub">Watch an AI buyer search twice: once on an incomplete listing, and once after CatalogWiz AI enriches every attribute and our experts verify it.</p>
        </header>

        <div className="dcx-tabs" role="tablist" aria-label="Product categories">
          {CATEGORIES.map((k, i) => {
            const Ico = k.icon
            return <button type="button" role="tab" key={k.id} aria-selected={i === idx} className={i === idx ? 'on' : ''} onClick={() => pick(i)}><Ico size={16} />{k.label}{i === idx && <i style={{ transform: `scaleX(${clamp(t / T_END, 0, 1)})` }} />}</button>
          })}
        </div>

        <div className={`dcx-query${s.searching ? ' searching' : ''}`}>
          <span className="dcx-q-ico"><Sparkles size={20} /></span>
          <div>
            <small>A buyer asks AI:</small>
            <b>“{c.query.slice(0, s.chars)}{s.typing && <span className="dcx-caret" />}{!s.typing && '”'}</b>
          </div>
          <span className="dcx-q-btn"><Search size={18} /></span>
          <span className={`dcx-q-match ${s.missed ? (s.done ? 'ok' : 'no') : ''}`}><i />{s.done ? 'Top match found' : s.missed ? 'No confident match' : s.searching ? 'Searching listings…' : 'Matching product information'}</span>
        </div>

        <div className={`dz${s.enriching ? ' is-work' : ''}${s.done ? ' is-done' : ''}`}>
          {/* metric strip: the number that matters */}
          <div className="dz-meter">
            <div className="dz-m before"><small>Before</small><b>{s.missed ? s.before : 0}<i>%</i></b><span>AI match</span></div>
            <div className="dz-track" aria-hidden="true">
              <span className="dz-fill" style={{ width: `${clamp(s.score, 0, 100)}%` }} />
              <span className="dz-head" style={{ left: `${clamp(s.score, 0, 100)}%`, opacity: s.enriching || s.done ? 1 : 0 }} />
              <em>CatalogWiz AI</em>
            </div>
            <div className={`dz-m after${s.done ? ' ok' : ''}`}><small>After</small><b>{s.score}<i>%</i></b><span>AI match</span></div>
          </div>

          <div className="dz-stage">
            {/* ---------- BEFORE ---------- */}
            <article className={`dz-card dz-before${s.enriching ? ' is-read' : ''}${s.done ? ' is-old' : ''}`}>
              <header><span className="dz-dots"><i /><i /><i /></span><b>Before</b><span>supplier listing</span><em><i />{s.done ? 'Unchanged' : 'Incomplete'}</em></header>
              <div className="dz-bt">
                <span className="dz-bpic"><img src={c.img} alt="" /></span>
                <div><small>Supplier title</small><b>{c.raw.title}</b><p>SKU — · Brand — · MPN —</p></div>
              </div>
              <ul className="dz-brow">{c.rich.rows.slice(0, 3).map(([l, v]) => <li key={l} className="have"><span>{l}</span><b>{v}</b></li>)}</ul>
              <div className="dz-bnote"><span>No description</span><span>No taxonomy</span><span>No SEO</span></div>
              <div className={`dz-bai${s.missed ? ' on' : ''}`}><Bot size={15} /><div><small>AI buyer answer</small><b>“I couldn’t find a product that confirms those specifications.”</b></div><em>#47</em></div>
              <i className="dz-bscan" style={{ top: `${s.enriching ? s.scan * 100 : 0}%`, opacity: s.enriching ? 1 : 0 }} />
            </article>

            {/* ---------- AI CORE ---------- */}
            <div className={`dz-core${s.enriching || uploading ? ' work' : ''}${s.done ? ' done' : ''}${t < T_UP - 0.2 ? ' idle' : ''}`} aria-hidden="true">
              <ul className="dz-src">
                {SRCI.map((x, i) => (
                  <li key={x.n} className={srcState(i)}><x.I size={14} /><span>{x.n}</span></li>
                ))}
              </ul>
              <div className="dz-feed"><i /><i /><i /></div>
              <div className="dz-orb">
                {take && <u key="burst" className="dz-burst" />}
                <span className="r1" /><span className="r2" /><span className="r3" />
                <b>{s.done ? <Check size={26} strokeWidth={3} /> : <Sparkles size={24} />}</b>
              </div>
              <small>{s.done ? 'Verified' : 'CatalogWiz AI'}</small>
              <span className="dz-count">{s.rows}<i>/{s.n}</i> fields</span>
              <div className="dz-lane"><i />{s.enriching && s.rows > 0 && s.rows <= s.n && <span key={s.rows} className="dz-chip">{c.rich.rows[s.rows - 1][1]}</span>}</div>
            </div>

            {/* ---------- AFTER ---------- */}
            <article className={`dz-card dz-after${s.rows > 0 || s.done ? '' : ' idle'}`}>
              <header>
                <span className="dz-dots"><i /><i /><i /></span>
                <span className="dz-url">app.catalogwiz.ai / enrich / <b>{sku}</b></span>
                <span className="dz-steps">
                  {['Read', 'Enrich', 'Verify'].map((l, i) => {
                    const ph = s.done ? 2 : s.enriching ? 1 : 0
                    return <span key={l} className={i < ph || (s.done && i === 2) ? 'done' : i === ph ? 'now' : ''}>{i < ph || (s.done && i === 2) ? <Check size={10} strokeWidth={4} /> : <i>{i + 1}</i>}{l}</span>
                  })}
                </span>
                <em className={s.done ? 'ok' : ''}>{s.done ? <Check size={11} strokeWidth={3.6} /> : <i />}{s.done ? 'Verified' : s.enriching ? 'Enriching' : 'Waiting'}</em>
              </header>

              <div className="dz-act">
                <span className="dz-spark"><Sparkles size={12} /></span>
                <b key={actText}>{actText}</b>
                <u style={{ transform: `scaleX(${s.done ? 1 : s.enriching ? s.scan : 0})` }} />
              </div>

              <div className="dz-ab">
                <div className={`dz-pic${s.enriching ? ' scanning' : ''}`}>
                  <img src={c.img} alt="" className={s.rows > 0 ? '' : 'dim'} />
                  <i className="tl" /><i className="tr" /><i className="bl" /><i className="br" />
                  <u style={{ top: `${s.scan * 100}%`, opacity: s.enriching ? 1 : 0 }} />
                  <span className="dz-dial"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" className="t" /><circle cx="18" cy="18" r="15" className="v" strokeDasharray="94.2" strokeDashoffset={94.2 * (1 - s.score / 100)} /></svg><b>{s.score}</b></span>
                </div>

                <div className="dz-rec">
                  <div className="dz-title">
                    <h3 key={s.title ? 'rich' : 'raw'} className={s.title ? 'rich' : 'raw'}>{s.title ? c.rich.title : c.raw.title}</h3>
                    <div className="dz-path">{c.rich.taxonomy.map((x, i) => <span key={x} className={s.taxonomy > i ? 'on' : ''}>{x}</span>)}</div>
                  </div>
                  <div className="dz-tbl">
                    {c.rich.rows.map(([l, v], i) => {
                      const on = s.rows > i
                      const active = s.enriching && s.rows === i
                      return (
                        <span key={l} className={`${on ? 'on' : ''}${active ? ' active' : ''}`}>
                          <i>{on ? <Check size={9} strokeWidth={4} /> : null}</i>
                          <em>{l}</em>
                          <b className={active ? 'sug' : ''}>{on || active ? v : '···'}</b>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="dz-three">
                <div className={`dz-blk${s.desc ? ' on' : ''}`}>
                  <small><AlignLeft size={11} />Description</small>
                  {s.desc ? <p key="d" className="wipe">{CONTENT[c.id].description}</p> : <p className="ph"><i /><i /><i /></p>}
                </div>
                <div className={`dz-blk${s.seo ? ' on' : ''}`}>
                  <small><Globe size={11} />In search results</small>
                  {s.seo ? <div key="s" className="dz-serp"><span>{CONTENT[c.id].slug}</span><b>{c.rich.seo}</b><p>{CONTENT[c.id].meta}</p></div> : <p className="ph"><i /><i /></p>}
                </div>
                <div className={`dz-blk${s.kw ? ' on' : ''}`}>
                  <small><Tag size={11} />Keywords</small>
                  <div className="dz-kw">{CONTENT[c.id].keywords.map((k, i) => <span key={k} className={s.kw > i ? 'on' : ''}>{k}</span>)}</div>
                </div>
              </div>

              <div className={`dz-ai${s.done ? ' on' : ''}`}>
                <span className="dz-bot"><Bot size={16} /></span>
                <div><small>AI buyer answer</small><b>{s.done ? <>“{c.answer.slice(0, s.answer)}{s.answer < c.answer.length && <span className="dcx-caret" />}{s.answer >= c.answer.length && '”'}</> : 'Waiting for enriched data…'}</b></div>
                <span className="dz-rank">{s.done ? <><Check size={11} strokeWidth={3.6} />Rank #1</> : 'Rank —'}</span>
                <span className="dz-ver"><ShieldCheck size={13} />{s.done ? 'Human verified' : 'Not verified'}</span>
              </div>
            </article>
          </div>
        </div>

        <aside className="dcx-cta">
          <span className="dcx-cta-ico"><BarChart3 size={24} /></span>
          <div><h3>Don’t Let Missing Product Data Limit Discovery.</h3><p>CatalogWiz AI enriches product attributes, descriptions, taxonomy, and SEO content, with expert validation for greater accuracy and consistency.</p></div>
          <div className="dcx-cta-btns">
            <Button to="/how-it-works#catalogwiz">See CatalogWiz in Action</Button>
            <Button variant="outline" to="/ai-readiness-report">Get Free AI Readiness Report</Button>
          </div>
        </aside>
        <p className="dcx-foot"><Activity size={11} />Illustrative demo built from public product pages. Brand names belong to their owners and are shown only as examples; AltiusNxt is not affiliated with them.</p>
      </div>
    </section>
  )
}
