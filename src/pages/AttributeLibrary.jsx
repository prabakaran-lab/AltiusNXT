import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, CircleAlert, Layers, ListChecks, Play } from 'lucide-react'
import { ALL_CATEGORIES, CATEGORIES } from './attributeLibraryData.js'
import { TESYS } from '../components/sampleProduct.js'
import { SAMPLES } from '../components/catalogSamples.js'
import './AttributeLibrary.css'

const IMG = { electronic: TESYS.images.front, industrial: SAMPLES.bearings.img, tools: SAMPLES.tools.img, medical: SAMPLES.medical.img, janitorial: SAMPLES.janitorial.img, ppe: SAMPLES.gloves.img, office: SAMPLES.office.img, welding: SAMPLES.welding.img, fire: SAMPLES.fire.img }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const TOTAL_ATTRS = CATEGORIES.reduce((n, c) => n + c.attrs.length, 0)

/* the AI's script for one category: [time, text] */
function script(c) {
  const n = c.attrs.length
  const step = Math.min(0.22, 5.2 / n)
  const aEnd = 1.3 + n * step
  const mStart = aEnd + 0.6
  const sStart = mStart + 0.5 + c.miss.length * 0.55 + 0.5
  const v = c.spell.vars.length
  const done = sStart + 0.6 + v * 0.3 + 1.3
  return {
    n, step, aEnd, mStart, sStart, done,
    lines: [
      [0.1, `Looking at ${c.name.toLowerCase()}…`],
      [0.9, `A strong ${c.name.toLowerCase().replace(/s$/, '')} record carries ${n} attributes.`],
      [mStart, `${c.miss.length} of them are easy to skip, and buyers filter on them.`],
      [sStart, `Suppliers also disagree on how to write ${c.spell.attr.toLowerCase()}.`],
      [done - 0.9, `Normalised to one value: ${c.spell.to}. Use this as your starting schema.`],
    ],
  }
}

export default function AttributeLibrary() {
  const panelRef = useRef(null)
  const st = useRef({ t0: 0, visible: false, tour: true })
  const [id, setId] = useState(CATEGORIES[0].id)
  const [t, setT] = useState(0)
  const [seen, setSeen] = useState(false)
  const [calm] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const c = useMemo(() => CATEGORIES.find((x) => x.id === id), [id])
  const S = useMemo(() => script(c), [c])

  useEffect(() => {
    document.title = 'Category Attribute Guide | AltiusNxt'
    const f = requestAnimationFrame(() => setSeen(true))
    return () => cancelAnimationFrame(f)
  }, [])

  useEffect(() => {
    const s = st.current
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting }, { threshold: window.innerWidth < 768 ? 0.04 : 0.2 })
    io.observe(panelRef.current)
    return () => io.disconnect()
  }, [])

  /* run the script for the selected category; while visible and untouched, tour to the next one */
  useEffect(() => {
    const s = st.current
    if (calm) { const f = requestAnimationFrame(() => setT(99)); return () => cancelAnimationFrame(f) }
    s.t0 = performance.now()
    let raf = 0
    const loop = (now) => {
      if (s.visible && !document.hidden) {
        const el = (now - s.t0) / 1000
        setT(el)
        if (s.tour && el > S.done + 2.2) {
          const i = CATEGORIES.findIndex((x) => x.id === id)
          setId(CATEGORIES[(i + 1) % CATEGORIES.length].id)
          return
        }
      } else s.t0 = now - (st.current.pausedAt ?? 0)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [id, S.done, calm])

  const pick = (x) => {
    st.current.tour = false
    setT(0)
    setId(x)
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }))
  }

  const cur = [...S.lines].reverse().find(([a]) => t >= a) || S.lines[0]
  const typed = calm ? cur[1] : cur[1].slice(0, Math.floor(clamp((t - cur[0]) / 0.9, 0, 1) * cur[1].length))
  const shown = clamp(Math.floor((t - 1.3) / S.step) + 1, 0, S.n)
  const flagsOn = (i) => t >= S.mStart + 0.5 + i * 0.55
  const varsOn = clamp(Math.floor((t - (S.sStart + 0.6)) / 0.3) + 1, 0, c.spell.vars.length)
  const normOn = t >= S.sStart + 0.6 + c.spell.vars.length * 0.3 + 0.2
  const done = t >= S.done
  const scanIdx = t >= 1.3 && t < S.aEnd ? shown - 1 : -1
  const list = CATEGORIES
  const missSet = new Set(c.miss)

  return (
    <div className={`al${seen ? ' seen' : ''}`}>
      <section className="al-hero">
        <div className="al-wrap">
          <span className="al-pill">Free reference</span>
          <h1>The Category Attribute Guide</h1>
          <p className="al-lead">What attributes should a <em>motor circuit breaker</em> record carry? A <em>fire hose</em>? A <em>cut-resistant glove</em>? Nobody publishes the answer, because it lives in the heads of the people who have run the category for twenty years.</p>
          <p className="al-lead2">So we wrote it down. {CATEGORIES.length} categories, each with the complete attribute schema of a real catalog product: the attributes that matter, the ones that are easy to overlook, and how suppliers can write the same value several ways. Watch CatalogWiz AI walk through each one. No signup.</p>
          <ul className="al-stats"><li><i><Layers size={18} /></i><div><b>{CATEGORIES.length}</b><span>Product categories</span></div></li><li><i><ListChecks size={18} /></i><div><b>{TOTAL_ATTRS}</b><span>Attributes documented</span></div></li></ul>
        </div>
      </section>

      <section className="al-demo" ref={panelRef}>
        <div className="al-wrap">
          <div className="al-panel" aria-live="polite">
            <header className="al-ai">
              <span className="dots" aria-hidden="true"><i /><i /><i /></span>
              <b>CatalogWiz AI</b>
              <p>{typed}{!done && !calm && <i className="caret" />}</p>
              <em>{c.name}</em>
              <u style={{ transform: `scaleX(${calm ? 1 : clamp(t / S.done, 0, 1)})` }} />
            </header>
            <div className="al-body">
              <div className="al-sch">
                <h2><Layers size={14} />{c.name} schema <small>{c.attrs.length} attributes · {c.miss.length} to watch</small></h2>
                <p className="al-ref">Full schema of a real product: {c.ref}</p>
                <ul key={c.id}>
                  {c.attrs.map(([l, v], i) => {
                    const on = calm || i < shown
                    const miss = missSet.has(l)
                    const flag = calm || flagsOn(c.miss.indexOf(l))
                    return (
                      <li key={l} className={`${on ? 'on' : ''}${i === scanIdx ? ' scan' : ''}${miss && flag ? ' miss' : ''}${v.length > 58 ? ' wide' : ''}`}>
                        <span className="l">{l}</span>
                        <span className="v">{v}</span>
                        {miss && <em className={flag ? 'on' : ''}><CircleAlert size={11} />Easy to skip</em>}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <aside className="al-side">
                <h3>How suppliers spell <b>{c.spell.attr}</b></h3>
                <div className="vars">
                  {c.spell.vars.map((x, i) => <span key={x} className={`m${calm || i < varsOn ? ' on' : ''}${normOn || calm ? ' gone' : ''}`}>{x}</span>)}
                </div>
                <div className={`arrow${normOn || calm ? ' on' : ''}`} aria-hidden="true"><i /></div>
                <div className={`norm${normOn || calm ? ' on' : ''}`}><Check size={14} strokeWidth={3.4} />{c.spell.to}</div>
                <p className={`note${done || calm ? ' on' : ''}`}>One physical value, {c.spell.vars.length} spellings. Filters only work once they agree.</p>
                <div className={`al-ref2${done || calm ? ' on' : ''}`}>
                  <span className="pic"><img src={IMG[c.id]} alt="" /></span>
                  <div><small>Reference product</small><b>{c.ref.split(' · ')[0]}</b><em>{c.ref.split(' · ')[1]} · {c.attrs.length} attributes on its page</em></div>
                </div>
                <div className={`al-missing${done || calm ? ' on' : ''}`}>
                  <small><CircleAlert size={12} />Easy to overlook, and buyers filter on them.</small>
                  <div>{c.miss.map((m, i) => <span key={m} style={{ '--i': i }}>{m}</span>)}</div>
                </div>
                <div className={`sum${done || calm ? ' on' : ''}`}>
                  <div><b>{c.attrs.length}</b><span>attributes</span></div>
                  <div><b>{c.miss.length}</b><span>to watch</span></div>
                  <div><b>{c.spell.vars.length} → 1</b><span>spellings</span></div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="al-lib">
        <div className="al-wrap">
          <header className="al-head">
            <h2>Example schemas for selected categories</h2>
            <p>We build comprehensive product data schemas across all industry categories. The highlighted categories serve as selected examples, showcasing the quality, depth, and precision of our work.</p>
            <ul className="cat-chips" aria-label="All industry categories">
              {ALL_CATEGORIES.map((c) => <li key={c.name} className={c.id ? 'on' : ''}>{c.name}</li>)}
            </ul>
          </header>
          <ul className="al-grid">
            {ALL_CATEGORIES.filter((c) => c.id).map((cat, i) => {
              const x = list.find((c) => c.id === cat.id)
              return (
                <li key={cat.name} style={{ '--i': i }}>
                    <button type="button" className={`al-card${id === x.id ? ' on' : ''}`} onClick={() => pick(x.id)} aria-pressed={id === x.id}>
                      <b>{cat.name}</b>
                      <span>{x.attrs.length} attributes<i />{x.miss.length} to watch</span>
                      <u>Selected product: {x.ref}</u>
                      <em>{id === x.id ? 'Playing above' : 'Watch the AI explain it'}{id === x.id ? <Play size={12} /> : <ArrowRight size={13} />}</em>
                    </button>
                </li>
              )
            })}
          </ul>
          <p className="al-foot">Attribute schemas are transcribed from one real product page per category; the “easy to skip” flags and spelling examples are our editorial suggestions, not audit results. CatalogWiz adapts them to your catalog, then a data specialist reviews every attribute.</p>
        </div>
      </section>
    </div>
  )
}
