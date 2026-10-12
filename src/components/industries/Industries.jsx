import { useEffect, useRef, useState } from 'react'
import { Calculator, Check, ChevronDown, ChevronRight, Cog, Droplets, Flame, Folder, FolderOpen, Hammer, Hand, Package, ShieldCheck, Siren, Sparkles, Stethoscope, Tag, Zap } from 'lucide-react'
import { TESYS } from '../sampleProduct.js'
import { SAMPLES } from '../catalogSamples.js'
import { ALL_ATTRS } from '../walkthrough/data.js'
import './Industries.css'

/* Illustrative sample records only (real catalog pages used as examples).
   `tree` holds three taxonomy levels; the first name of each level is the branch the product is placed in, the rest are siblings. */
const fromSample = (id, label, icon, sibs) => {
  const x = SAMPLES[id]
  return { id, label, icon, img: x.img, title: x.rich.title, rows: x.rich.rows, tree: x.rich.taxonomy.map((n, i) => [n, ...sibs[i]]) }
}
const CATS = [
  { id: 'electronic', label: 'Electronic Supplies & Components', icon: Zap, img: TESYS.images.front, title: TESYS.title, rows: ALL_ATTRS.slice(0, 10),
    tree: TESYS.taxonomy.map((n, i) => [n, ...[['Connectors & Terminals', 'Relays & Contactors'], ['Fuses', 'Surge Protectors'], ['Miniature Circuit Breakers', 'Molded Case Breakers']][i]]) },
  fromSample('bearings', 'Industrial Supply', Cog, [['Fluid Power', 'Fasteners'], ['Belts & Chains', 'Gears'], ['Roller Bearings', 'Bearing Housings']]),
  fromSample('tools', 'Hand, Power & Machine Tools', Hammer, [['Hardware', 'Abrasives'], ['Saws', 'Sanders'], ['Corded Drills', 'Drill Presses']]),
  fromSample('medical', 'Medical Supplies', Stethoscope, [['Surgical Supplies', 'Diagnostics'], ['Syringes', 'Wound Care'], ['Extension Sets', 'Infusion Pumps']]),
  fromSample('janitorial', 'Janitorial Supplies', Droplets, [['Trash Liners', 'Dispensers'], ['Floor Machines', 'Vacuums'], ['Cold Water Washers', 'Steam Cleaners']]),
  fromSample('gloves', 'Safety & PPE', Hand, [['Eye Protection', 'Fall Protection'], ['Head Protection', 'Hearing Protection'], ['Chemical Gloves', 'Disposable Gloves']]),
  fromSample('office', 'Office Supplies', Calculator, [['Paper', 'Writing'], ['Binding', 'Labels'], ['Scientific Calculators', 'Printing Calculators']]),
  fromSample('welding', 'Gas & Welding', Flame, [['Cutting', 'Safety Gear'], ['Consumables', 'Torches'], ['MIG Welders', 'Plasma Cutters']]),
  fromSample('fire', 'Fire Protection & Safety Supplies', Siren, [['Gas Detection', 'Signage'], ['Extinguishers', 'Fire Blankets'], ['Double-Jacket Hoses', 'Fire Nozzles']]),
]

const DWELL = 9.5
const T_PROD = 0.15
const T_COL = [0.9, 1.6, 2.3] // each taxonomy level locks onto its branch
const T_BEAM_END = 3.0
const T_SCHEMA = 3.1, T_ROW = 0.28
const T_DONE = T_SCHEMA + 10 * T_ROW + 0.7
const typeOf = (v) => (/^yes\b/i.test(v) ? 'Yes / No' : /^[≥<>]?\s?\d/.test(v) ? 'Number + unit' : 'Text / list')
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export default function Industries() {
  const ref = useRef(null)
  const st = useRef({ idx: 0, t: 0, visible: false, reduced: false })
  const [idx, setIdx] = useState(0)
  const [t, setT] = useState(0)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const s = st.current
    s.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (s.reduced) { s.t = DWELL - 0.5; setT(s.t) }
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; if (e.isIntersecting) setSeen(true) }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(ref.current)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (s.visible && !s.reduced && !document.hidden) {
        s.t += dt
        acc += dt
        if (s.t >= DWELL) { s.t = 0; s.idx = (s.idx + 1) % CATS.length; setIdx(s.idx) }
        if (acc >= 0.033) { acc = 0; setT(s.t) }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); io.disconnect() }
  }, [])

  const pick = (i) => { const s = st.current; s.idx = i; s.t = s.reduced ? DWELL - 0.5 : 0; setIdx(i); setT(s.t) }
  const c = CATS[idx]
  const n = c.rows.length
  const prog = clamp((t - 0.7) / (T_BEAM_END - 0.7), 0, 1)
  const nRows = clamp(Math.floor((t - T_SCHEMA) / T_ROW) + 1, 0, n)
  const nVals = clamp(Math.floor((t - T_SCHEMA - 0.2) / T_ROW) + 1, 0, n)
  const done = t >= T_DONE
  const pct = Math.round(22 + 78 * (nVals / n))
  const phase = t < T_BEAM_END ? 0 : done ? 2 : 1
  const SAY = ['Placing the product in your taxonomy…', `Applying the category schema · ${nVals} of ${n} fields`, 'Classified, standardised and human verified']
  const locked = (i) => t >= T_COL[i]

  return (
    <section className={`ind${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="ind-title">
      <div className="ind-wrap">
        <header className="ind-head">
          <p className="ind-eyebrow">Taxonomy &amp; schema, per category</p>
          <h2 id="ind-title">Every category gets its own <em>taxonomy and attribute schema.</em></h2>
          <p className="ind-sub">CatalogWiz places each product in the right branch of your category tree, then fills the attribute set that buyers in that category actually filter by.</p>
        </header>

        <ul className="ind-cats" role="tablist" aria-label="Product categories">
          {CATS.map((x, i) => {
            const I = x.icon
            return (
              <li key={x.id}>
                <button type="button" role="tab" aria-selected={i === idx} className={i === idx ? 'on' : ''} onClick={() => pick(i)}>
                  <I size={15} />{x.label}
                  <i style={{ transform: `scaleX(${i === idx ? Math.min(1, t / DWELL) : 0})` }} />
                </button>
              </li>
            )
          })}
        </ul>

        <div className={`ixa${done ? ' is-done' : ''}`} role="tabpanel">
          <div className="ixa-win">
            <span className="ixa-dots"><i /><i /><i /></span>
            <span className="ixa-url">app.catalogwiz.ai / taxonomy / <b>{c.tree[2][0]}</b></span>
            <em className={done ? 'ok' : ''}>{done ? <Check size={11} strokeWidth={3.6} /> : <i />}{done ? 'Verified' : 'Working'}</em>
          </div>

          <div className="ixa-app">
            <nav className="ixa-rail" aria-hidden="true">
              {[Package, Folder, Tag, ShieldCheck].map((Ico, i) => <span key={i} className={i === 1 ? 'on' : ''}><Ico size={15} /></span>)}
            </nav>

            <div className="ixa-main">
              <header className="ixa-top">
                <span className="ixa-logo"><b>Catalog<em>Wiz</em></b><i>AI</i></span>
                <span className="ixa-crumb">Taxonomy<u>{c.label}</u></span>
                <span className="ixa-steps">
                  {['Classify', 'Standardise', 'Verify'].map((l, i) => (
                    <span key={l} className={i < phase ? 'done' : i === phase ? 'now' : ''}><i>{i < phase ? <Check size={10} strokeWidth={3.8} /> : i + 1}</i>{l}</span>
                  ))}
                </span>
              </header>

              <div className="ixa-act"><span className="ixa-spark"><Sparkles size={12} /></span><b key={phase}>{SAY[phase]}</b>{!done && <span className="ixa-d3"><i /><i /><i /></span>}</div>

              <div className="ixa-cols">
                <aside className="ixa-tree" aria-label="Category tree">
                  <h4>Category tree</h4>
                  <ul>
                    <li className="root on"><ChevronDown size={13} /><FolderOpen size={14} />All products</li>
                    {c.tree.map((level, li) => (
                      <li key={li} className={`grp${li > 0 && !locked(li - 1) ? ' wait' : ''}`} style={{ '--l': li }}>
                        <ul>
                          {[level[1], level[0], level[2]].map((name, ni) => {
                            const pick = ni === 1
                            const hit = pick && locked(li)
                            const cur = pick && li === 2 && locked(2)
                            return (
                              <li key={name} className={`node${pick ? ' pick' : ''}${hit ? ' hit' : ''}${cur ? ' cur' : ''}${t >= T_COL[li] - 0.5 && !pick ? ' dim' : ''}${t >= T_COL[li] + 0.4 && !pick ? ' gone' : ''}`}>
                                {pick && locked(li) && li < 2 ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                {hit ? <FolderOpen size={14} /> : <Folder size={14} />}
                                <span>{name}</span>
                                {cur && <em><Check size={10} strokeWidth={3.8} />Assigned</em>}
                              </li>
                            )
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </aside>

                <section className="ixa-rec" aria-label="Product record">
                  <div className={`ixa-prod${t >= T_PROD ? ' on' : ''}${done ? ' ok' : ''}`}>
                    <span className="ixa-pic"><img src={c.img} alt="" /><u style={{ top: `${prog * 100}%`, opacity: prog > 0 && prog < 1 ? 1 : 0 }} /></span>
                    <div className="ixa-pt"><small>{done ? 'Classified record' : 'Incoming product'}</small><b>{c.title}</b>
                      <span className="ixa-path">{c.tree.map((l) => l[0]).map((n, i) => <span key={n} className={locked(i) ? 'on' : ''}>{n}</span>)}</span>
                    </div>
                    <span className="ixa-ring" style={{ '--p': pct }}><i>{pct}<small>%</small></i></span>
                  </div>

                  <div className={`ixa-tbl${t >= T_SCHEMA - 0.4 ? ' on' : ''}`}>
                    <div className="ixa-th"><span>Attribute</span><span>Type</span><span>Value</span><span /></div>
                    <ul>
                      {c.rows.map(([l, v], i) => (
                        <li key={l} className={`${nRows > i ? 'on' : ''}${nVals > i ? ' fill' : ''}${nRows === i + 1 && nVals <= i ? ' scan' : ''}`}>
                          <span className="ixa-l">{l}</span>
                          <em>{typeOf(v)}</em>
                          <b>{nVals > i ? v : ''}</b>
                          <i>{nVals > i ? <Check size={9} strokeWidth={4} /> : null}</i>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <footer className={`ixa-foot${done ? ' on' : ''}${nVals > 0 ? ' run' : ''}`}>
                <span><Check size={12} strokeWidth={3.4} />Taxonomy mapped</span>
                <span><Check size={12} strokeWidth={3.4} />{n} attributes standardised</span>
                <span><Check size={12} strokeWidth={3.4} />Human verified</span>
                <small>{nVals}/{n} fields · {pct}% complete</small>
              </footer>
            </div>
          </div>
        </div>

        <p className="ind-note">Each category has its own tree and schema · Units and values standardised <span>· Illustrative sample records from public product pages</span></p>
      </div>
    </section>
  )
}
