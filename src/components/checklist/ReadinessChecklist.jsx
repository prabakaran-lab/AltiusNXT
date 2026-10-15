import { useEffect, useRef, useState } from 'react'
import { Check, CircleHelp, ListChecks, RotateCcw, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import './ReadinessChecklist.css'

/* Based on the 15-point AI Readiness scorecard. Self-assessment only, not a real audit. */
const ITEMS = [
  { id: 'mpn', t: 'Manufacturer part number shown on the page', why: 'AI matches your listing to the manufacturer record by this number.' },
  { id: 'spec', t: 'A specification table, not just a paragraph', why: 'Buyers and AI compare discrete facts: voltage, rating, size, material.' },
  { id: 'name', t: 'One consistent product name everywhere', why: 'Title, URL and description that disagree make AI hesitate to cite you.' },
  { id: 'schema', t: 'Product schema markup (hidden labels AI can read)', why: 'AI reads this first. Broken or encoded text hides your product.' },
  { id: 'ids', t: 'Brand, part number (MPN) and barcode (GTIN) in the schema', why: 'It lets engines confirm the exact item you sell.' },
  { id: 'doc', t: 'Datasheet or manual linked for verification', why: 'AI trusts pages whose claims it can check against documents.' },
  { id: 'buy', t: 'Price, stock and delivery clearly stated', why: 'Engines recommend pages that answer the buying decision.' },
  { id: 'faq', t: 'Answers to buyer questions (fit, compatibility, what is included)', why: 'These are exactly the questions people ask AI assistants.' },
]

/* the demo page passes two checks and fails the rest, like most pages we scan */
const DEMO_PASS = new Set([2, 6])

function band(n) {
  if (n <= 2) return { label: 'Hard for AI to recommend', tone: 'bad' }
  if (n <= 5) return { label: 'Partly ready for AI search', tone: 'mid' }
  return { label: 'Strong foundation', tone: 'good' }
}

export default function ReadinessChecklist() {
  const ref = useRef(null)
  const [on, setOn] = useState(() => new Set())
  const [seen, setSeen] = useState(false)
  const [scan, setScan] = useState(0)
  const touched = useRef(false)
  const timers = useRef([])

  /* a gentle demo that scans the page the way the report does and passes two checks and flags the rest as missing, until the visitor takes over */
  useEffect(() => {
    const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
    const run = () => {
      clear()
      setOn(new Set())
      setScan(0)
      ITEMS.forEach((_, k) => {
        timers.current.push(setTimeout(() => { if (touched.current) return; setScan(k + 1); if (DEMO_PASS.has(k)) setOn((s) => new Set(s).add(k)) }, 900 + k * 800))
      })
      timers.current.push(setTimeout(() => { if (!touched.current) run() }, 900 + ITEMS.length * 800 + 4000))
    }
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); if (!touched.current && !calm) run() } else if (!touched.current) clear()
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.35 })
    io.observe(ref.current)
    return () => { io.disconnect(); clear() }
  }, [])

  const toggle = (i) => {
    touched.current = true
    timers.current.forEach(clearTimeout)
    setScan(0)
    setOn((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  }
  const reset = () => { touched.current = true; timers.current.forEach(clearTimeout); setScan(0); setOn(new Set()) }

  const n = on.size
  const score = Math.round((n / ITEMS.length) * 100)
  const b = band(n)
  const missing = ITEMS.map((x, i) => ({ ...x, i })).filter((x) => !on.has(x.i)).slice(0, 3)
  const C = 2 * Math.PI * 52

  return (
    <section className={`rc${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="rc-title">
      <div className="rc-wrap">
        <header className="rc-head">
          <p className="rc-eyebrow">Quick self-check</p>
          <h2 id="rc-title">Is your product page <em>AI-ready?</em></h2>
          <p className="rc-sub">Tick what your page already does. Your score updates as you go. Most pages we scan miss several of these. It takes 30 seconds, and no email is needed.</p>
        </header>

        <div className="rc-grid">
          <fieldset className="rc-list">
            <legend className="visually-hidden">AI-readiness checklist</legend>
            {ITEMS.map((x, i) => {
              const ck = on.has(i)
              const fail = !ck && i < scan
              return (
                <label key={x.id} className={`rc-item${ck ? ' on' : ''}${fail ? ' fail' : ''}`} style={{ '--i': i }}>
                  <input type="checkbox" checked={ck} onChange={() => toggle(i)} />
                  <span className="box">{fail ? <X size={14} strokeWidth={3.6} /> : <Check size={14} strokeWidth={3.6} />}</span>
                  <span className="tx"><b>{x.t}</b><small>{x.why}</small></span>
                </label>
              )
            })}
          </fieldset>

          <aside className={`rc-result ${b.tone}`} aria-live="polite">
            <div className="rc-gauge">
              <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" className="t" /><circle cx="60" cy="60" r="52" className="v" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} /></svg>
              <div><b>{score}</b><small>/ 100</small></div>
            </div>
            <p className="rc-count">{n} of {ITEMS.length} checks in place</p>
            <h3 key={b.label}>{b.label}</h3>

            <div className="rc-missing">
              {n === ITEMS.length ? (
                <p className="all"><Check size={14} strokeWidth={3.4} />Nice. Now see how AI engines actually treat your page.</p>
              ) : (
                <>
                  <small>Biggest gaps to close</small>
                  <ul>{missing.map((m) => <li key={m.id}><CircleHelp size={13} />{m.t}</li>)}</ul>
                </>
              )}
            </div>

            <Button to="/ai-readiness-report">Get my free AI Readiness Report</Button>
            <p className="rc-fine">Our report tests this on ChatGPT, Claude, Gemini and Perplexity. This checklist is a self-assessment, not an audit. Want to know which competitor AI names instead? Get the free report.</p>
            <button type="button" className="rc-reset" onClick={reset}><RotateCcw size={12} />Clear checks</button>
          </aside>
        </div>
        <p className="rc-foot"><ListChecks size={13} />Based on the 15-point AI Readiness scorecard</p>
      </div>
    </section>
  )
}
