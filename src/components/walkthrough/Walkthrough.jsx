import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeCheck, Check, Plug, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { HOLD, STAGES, stateAt } from './data.js'
import { Approve, Connect, Enrich, Publish, Review, narrator } from './stages.jsx'
import './Walkthrough.css'

const ICONS = [Plug, Sparkles, ShieldCheck, BadgeCheck, Send]
const SUBS = ['Supplier data', 'AI fills the gaps', 'Expert verifies', 'Final sign-off', 'Go live']
const VIEWS = [Connect, Enrich, Review, Approve, Publish]
const SUMMARY = 'Illustrative walkthrough of one motor circuit breaker, Schneider Electric TELGV3P73. Connect: a supplier Excel file, a technical PDF and a product image are imported into a raw record. Enrich: CatalogWiz AI finds missing attributes in the datasheet and suggests values with sources. Review: a product data specialist verifies, edits or flags each value. Approve: the record passes quality checks. Publish: the approved record fills an ecommerce product page preview.'

export default function Walkthrough({ head }) {
  const rootRef = useRef(null)
  const clock = useRef({ stage: 0, t: 0 })
  const run = useRef({ paused: false, visible: false, reduced: false })
  const [stage, setStage] = useState(0)
  const [view, setView] = useState(() => stateAt(0, 0))
  const [reduced, setReduced] = useState(false)
  const sig = useRef('')

  /* push the content state into React only when it actually changes */
  const publish = useCallback(() => {
    const { stage: st, t } = clock.current
    const next = stateAt(st, t)
    const s = JSON.stringify(next)
    if (s !== sig.current) { sig.current = s; setView(next) }
    rootRef.current?.style.setProperty('--sp', Math.min(1, t / STAGES[st].dur).toFixed(3))
  }, [])

  const goto = useCallback((i, settle = false) => {
    clock.current = { stage: i, t: settle ? STAGES[i].dur : 0 }
    setStage(i)
    publish()
  }, [publish])

  /* dev-only QA hook: window.__wt(stage, seconds) freezes the clock at that moment */
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    window.__wt = (i, t) => { run.current.paused = true; clock.current = { stage: i, t }; setStage(i); publish() }
    return () => { delete window.__wt }
  }, [publish])

  /* motion preference */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => { run.current.reduced = mq.matches; setReduced(mq.matches); if (mq.matches) goto(clock.current.stage, true) }
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [goto])

  /* visibility */
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { run.current.visible = e.isIntersecting }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  /* one clock for the whole walkthrough */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const r = run.current
      if (r.visible && !r.paused && !r.reduced && !document.hidden) {
        const c = clock.current
        c.t += dt
        const dur = STAGES[c.stage].dur
        if (c.stage < STAGES.length - 1 && c.t >= dur) { c.stage += 1; c.t = 0; setStage(c.stage) }
        else if (c.stage === STAGES.length - 1 && c.t >= dur + HOLD) { c.stage = 0; c.t = 0; setStage(0) }
        publish()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [publish])

  const jump = (i) => goto(i, run.current.paused || run.current.reduced)

  const View = VIEWS[stage]
  const nar = narrator(stage, view)

  return (
    <section className={`wt${reduced ? ' is-reduced' : ''}`} id="catalogwiz" ref={rootRef} aria-labelledby="wt-title">
      <div className="wt-wrap">
        {head ? (
          <header className="cw-head">
            <p className="cw-eb">{head.eyebrow}</p>
            <h2 id="wt-title">{head.title}</h2>
            <p>{head.sub}</p>
          </header>
        ) : (
          <h2 id="wt-title" className="visually-hidden">From raw supplier data to commerce-ready content</h2>
        )}

        <div className="wt-shell">
          <div className="wt-navrow">
            <nav className="wt-steps" aria-label="Workflow stages">
              {STAGES.map((s, i) => (
                <button type="button" key={s.id} className={`wt-step${i === stage ? ' cur' : ''}${i < stage ? ' done' : ''}`} aria-current={i === stage ? 'step' : undefined} onClick={() => jump(i)}>
                  <span className="wt-step-ico">{i < stage ? <Check size={17} strokeWidth={3} /> : (() => { const Ico = ICONS[i]; return <Ico size={17} /> })()}</span>
                  <span className="wt-step-t"><em>{s.n}</em><b>{s.label}</b><small>{SUBS[i]}</small></span>
                  <span className="wt-step-bar"><i /></span>
                </button>
              ))}
            </nav>
          </div>

          <div className="wt-body" role="group" aria-label={`Stage ${stage + 1} of 5: ${STAGES[stage].label}`}>
            <aside className="wt-narr" key={`n${stage}`}>
              <span className="wt-kick">Stage {STAGES[stage].n} <i>/ 05</i></span>
              <h3>{nar.t}</h3>
              <p>{nar.d}</p>
              <div className="wt-stat"><b>{nar.stat[0]}</b><span>{nar.stat[1]}</span></div>
              <ul>{nar.items.map(([t, ok]) => <li key={t} className={ok ? 'on' : ''}><span><Check size={11} strokeWidth={3.6} /></span>{t}</li>)}</ul>
            </aside>
            <div className="wt-canvas"><div className="wt-stage" key={stage}><View s={view} /></div></div>
          </div>
          <p className="wt-foot">Illustrative sample data · sample product TELGV3P73</p>
        </div>
        <p className="visually-hidden">{SUMMARY}</p>
      </div>
    </section>
  )
}
