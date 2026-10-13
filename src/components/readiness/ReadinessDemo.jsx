import { useEffect, useRef, useState } from 'react'
import { Bot, Check, FileText, Globe, Link2, Minus, Search, Sparkles, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import './ReadinessDemo.css'

/* Illustrative walkthrough of the free AI Readiness Report (same stages as the real report). Sample data only. */
const URL_TEXT = 'store.example.com/circuit-breakers/telgv3p73'
const LOOP = 31
const T = { type: 2.6, press: 3.0, crawl: 3.6, ask: 7.4, price: 12.4, audit: 15.6, report: 20.2 }

const CRAWLERS = ['Browser', 'Googlebot', 'Google-Extended', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Bingbot']
const ENGINES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity']
const QUESTIONS = ['TELGV3P73 price', 'Part number & specs', 'Where to buy', 'Cheapest in stock', 'Best 73 A motor breaker', 'Fits my panel?']
const CITED = new Set(['2-2', '3-3']) // question-engine cells where the page was named
const SELLERS = [
  { n: 'Seller A', p: 3275, note: 'sold out', mute: true },
  { n: 'Seller B', p: 3807, note: 'unavailable', mute: true },
  { n: 'Your page', p: 4450, note: 'in stock', you: true },
  { n: 'Seller C', p: 4605, note: 'out of stock', mute: true },
  { n: 'Manufacturer', p: 4673, note: 'in stock' },
  { n: 'Seller D', p: 5362, note: 'list price' },
]
const PILLARS = [
  { n: 'Can AI find you?', w: '30%', s: 40, to: 85, cells: ['p', 'h', 'h', 'f', 'f'] },
  { n: 'Can AI understand you?', w: '30%', s: 50, to: 95, cells: ['f', 'h', 'p', 'h', 'h'] },
  { n: 'Will AI recommend you?', w: '40%', s: 40, to: 90, cells: ['p', 'h', 'h', 'f', 'f'] },
]
const CAUSES = ['No specification table', 'No manufacturer part number', 'Broken structured data']
const STEPS = ['Paste one product page URL', 'We test which AI crawlers can read it', 'We ask ChatGPT, Claude, Gemini and Perplexity', 'We benchmark price and audit 15 checks', 'An expert approves your six-page report by email']

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1)

export default function ReadinessDemo() {
  const ref = useRef(null)
  const clock = useRef({ t: 0, visible: false, reduced: false })
  const [t, setT] = useState(0)

  useEffect(() => {
    const c = clock.current
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => { c.reduced = mq.matches; if (mq.matches) setT(T.report + 8.6) }
    read()
    if (import.meta.env.DEV) window.__ar = (v) => { c.visible = false; c.t = v; setT(v) }
    mq.addEventListener('change', read)
    const io = new IntersectionObserver(([e]) => { c.visible = e.isIntersecting }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(ref.current)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (c.visible && !c.reduced && !document.hidden) {
        c.t = (c.t + dt) % LOOP
        acc += dt
        if (acc >= 0.04) { acc = 0; setT(c.t) }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); mq.removeEventListener('change', read); io.disconnect() }
  }, [])

  const phase = t < T.crawl ? 'in' : t < T.ask ? 'crawl' : t < T.price ? 'ask' : t < T.audit ? 'price' : t < T.report ? 'audit' : 'rep'
  const step = { in: 0, crawl: 1, ask: 2, price: 3, audit: 3, rep: 4 }[phase]
  const chars = Math.round(URL_TEXT.length * seg(t, 0.2, T.type))
  const pressed = t >= T.press && t < T.press + 0.3

  const crawlN = clamp(Math.floor((t - T.crawl - 0.3) / 0.28), 0, 10)
  const cell = (q, e) => clamp((t - T.ask - 0.4 - (q * 4 + e) * 0.13), 0, 1) > 0
  const askDone = (q, e) => cell(q, e)
  const citedN = [...CITED].filter((k) => { const [q, e] = k.split('-').map(Number); return askDone(q, e) }).length
  const priceP = seg(t, T.price + 0.3, T.price + 2.2)
  const auditP = seg(t, T.audit + 0.2, T.audit + 4.0)
  const rep0 = T.report
  const score = Math.round(43 * seg(t, rep0 + 0.3, rep0 + 1.8))
  const afterP = seg(t, rep0 + 5.4, rep0 + 7.4)
  const overall = Math.round(score + (90 - 43) * afterP)

  return (
    <section className="ar" id="ai-readiness" ref={ref} aria-labelledby="ar-title">
      <div className="ar-wrap">
        <div className="ar-copy">
          <p className="ar-pill">Free AI Readiness Report</p>
          <h2 id="ar-title">Paste one product page. <em>See how AI sees it.</em></h2>
          <p className="ar-sub">Paste the link to one product page. We check whether AI tools can read it, ask ChatGPT, Claude, Gemini and Perplexity the questions your buyers ask, compare your price, and run 15 quick checks (grouped into the 5 gaps that matter most). A product data expert verifies and approves your six-page AI Readiness Report, then we email it to you with what to fix first.</p>
          <ol className="ar-steps">
            {STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'cur' : ''}><span>{i < step ? <Check size={11} strokeWidth={3.6} /> : i + 1}</span>{s}</li>)}
          </ol>
          <div className="ar-cta"><Button to="/ai-readiness-report">Get my free report</Button><small>No credit card. Takes a minute to submit. Your report arrives by email after expert review.</small></div>
        </div>

        <div className="ar-card" role="img" aria-label="Animated example of the AI Readiness Report: crawler access test, buyer questions on four AI engines, price benchmark, a 15-point scorecard, and a score that improves after fixes.">
          <div className="ar-bar"><i /><i /><i /><span>catalogwiz.ai / ai-readiness-report</span><em className={phase === 'in' ? '' : 'live'}><b />{phase === 'rep' ? 'Report ready' : phase === 'in' ? 'Ready' : 'Running'}</em></div>
          <div className={`ar-body ph-${phase}`}>

            {/* 1 · input */}
            <div className={`ar-view in${phase === 'in' ? ' on' : ''}`}>
              <h3>Check how AI sees your product</h3>
              <label className="ar-field act"><Link2 size={16} /><span>{URL_TEXT.slice(0, chars) || 'Paste a product page URL'}{phase === 'in' && chars < URL_TEXT.length && <b className="caret" />}</span></label>
              <div className="ar-row2"><span className="ar-field sm">Your company</span><span className="ar-field sm">Work email</span></div>
              <button type="button" tabIndex={-1} className={`ar-go${pressed ? ' press' : ''}${chars >= URL_TEXT.length ? ' ready' : ''}`}><Sparkles size={15} />Run free report</button>
              <p className="ar-hint">One product page is enough to start.</p>
            </div>

            {/* 2 · crawler access */}
            <div className={`ar-view${phase === 'crawl' ? ' on' : ''}`}>
              <div className="ar-hd"><span className="n">1</span><div><b>Who is allowed to read the page?</b><small>We request the live page 10 times, changing only the crawler</small></div><strong className={crawlN === 10 ? 'ok' : ''}>{crawlN} / 10</strong></div>
              <ul className="ar-crawl">
                {CRAWLERS.map((c, i) => (
                  <li key={c} className={i < crawlN ? 'ok' : i === crawlN ? 'run' : ''}><span className="d">{i < crawlN ? <Check size={11} strokeWidth={3.6} /> : null}</span><b>{c}</b><em>{i < crawlN ? '200 OK' : i === crawlN ? 'requesting…' : ''}</em></li>
                ))}
              </ul>
              <p className={`ar-note${crawlN === 10 ? ' on' : ''}`}><Check size={13} strokeWidth={3.4} />Access is not the problem. What the crawler finds is.</p>
            </div>

            {/* 3 · buyer questions */}
            <div className={`ar-view${phase === 'ask' ? ' on' : ''}`}>
              <div className="ar-hd"><span className="n">2</span><div><b>Six buying questions, four AI engines</b><small>None of the questions names your store or URL</small></div><strong className={citedN ? 'no' : ''}>{citedN} of 24 cite you</strong></div>
              <div className="ar-grid">
                <div className="gh"><span />{ENGINES.map((e) => <span key={e} title={e}><Bot size={11} /><em>{e}</em><b>{e[0]}</b></span>)}</div>
                {QUESTIONS.map((q, qi) => (
                  <div className="gr" key={q}>
                    <span className="q">{q}</span>
                    {ENGINES.map((e, ei) => {
                      const on = askDone(qi, ei)
                      const hit = CITED.has(`${qi}-${ei}`)
                      return <span key={e} className={`c${on ? (hit ? ' hit' : ' miss') : ''}`}>{on ? (hit ? <Check size={11} strokeWidth={3.6} /> : <X size={11} strokeWidth={3.6} />) : <i />}</span>
                    })}
                  </div>
                ))}
              </div>
              <p className="ar-note on bad">Engines named other sellers every time. Your page was almost invisible.</p>
            </div>

            {/* 4 · price benchmark */}
            <div className={`ar-view${phase === 'price' ? ' on' : ''}`}>
              <div className="ar-hd"><span className="n">3</span><div><b>Price and market position</b><small>Single-unit price, same configuration, 6 sellers</small></div><strong className="ok">Cheapest in stock</strong></div>
              <ul className="ar-price">
                {SELLERS.map((s, i) => (
                  <li key={s.n} className={`${s.you ? 'you' : ''}${s.mute ? ' mute' : ''}`}>
                    <span>{s.n}</span><i><em style={{ width: `${(s.p / 5362) * 100 * clamp(priceP * 1.4 - i * 0.12, 0, 1)}%` }} /></i><b>${s.p.toLocaleString('en-US')}</b><small>{s.note}</small>
                  </li>
                ))}
              </ul>
              <p className={`ar-note${priceP > 0.9 ? ' on' : ''}`}><Check size={13} strokeWidth={3.4} />You win on price and stock. AI still cannot confirm what you sell.</p>
            </div>

            {/* 5 · 15-point audit */}
            <div className={`ar-view${phase === 'audit' ? ' on' : ''}`}>
              <div className="ar-hd"><span className="n">4</span><div><b>15-point diagnostic scorecard</b><small>Pass = 100 · Partial = 50 · Fail = 0</small></div><strong>{Math.round(auditP * 15)} / 15</strong></div>
              <div className="ar-sc">
                {PILLARS.map((p, pi) => (
                  <div className="pl" key={p.n}>
                    <div className="top"><b>{p.n}</b><small>weight {p.w}</small></div>
                    <div className="chips">
                      {p.cells.map((c, ci) => {
                        const on = auditP * 15 > pi * 5 + ci
                        return <span key={ci} className={`k${on ? ` ${c}` : ''}`}>{on ? (c === 'p' ? 'PASS' : c === 'h' ? 'PARTIAL' : 'FAIL') : '···'}</span>
                      })}
                    </div>
                    <div className="meter"><i style={{ width: `${p.s * seg(auditP * 15, pi * 5, pi * 5 + 5)}%` }} /><u /></div>
                    <strong>{Math.round(p.s * seg(auditP * 15, pi * 5, pi * 5 + 5))}</strong>
                  </div>
                ))}
              </div>
              <p className="ar-note on">Weighted total: 0.30 × 40 + 0.30 × 50 + 0.40 × 40 = <b>43</b></p>
            </div>

            {/* 6 · report */}
            <div className={`ar-view rep${phase === 'rep' ? ' on' : ''}`}>
              <div className="ar-rh">
                <div className="ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" className="t" /><circle cx="32" cy="32" r="27" className={`v${afterP > 0.5 ? ' good' : ''}`} strokeDasharray={170} strokeDashoffset={170 * (1 - overall / 100)} /></svg><b>{overall}</b><small>/100</small></div>
                <div>
                  <small>AI Readiness score</small>
                  <h4>{afterP > 0.5 ? 'Strong foundation once the fixes land' : 'Cheapest in stock, yet AI cannot recommend it'}</h4>
                  <p>{afterP > 0.5 ? 'Illustrative score after fixes 1 to 4' : 'Target for AltiusNxt-ready pages: 70'}</p>
                </div>
              </div>
              <div className="ar-pb">
                {PILLARS.map((p, i) => (
                  <div className={`row${t >= rep0 + 0.8 + i * 0.25 ? ' on' : ''}`} key={p.n}>
                    <span>{p.n.replace(/\?$/, '')}</span>
                    <i><em style={{ width: `${p.s + (p.to - p.s) * afterP}%` }} className={afterP > 0.5 ? 'good' : ''} /><u /></i>
                    <b>{Math.round(p.s + (p.to - p.s) * afterP)}</b>
                  </div>
                ))}
              </div>
              <div className="ar-causes">
                {CAUSES.map((c, i) => <span key={c} className={t >= rep0 + 2.2 + i * 0.35 ? 'on' : ''}><Minus size={11} strokeWidth={3.4} />{c}</span>)}
              </div>
              <div className={`ar-fix${t >= rep0 + 4.4 ? ' on' : ''}`}><Sparkles size={13} />CatalogWiz fixes: spec table · manufacturer part number · decoded schema · one product name</div>
              <div className={`ar-sent${t >= rep0 + 7.8 ? ' on' : ''}`}><FileText size={14} /><b>Six-page report</b><span>emailed to you with the fix plan</span><Search size={12} /><Globe size={12} /></div>
            </div>

          </div>
        </div>
      </div>
      <p className="ar-foot">Illustrative example · sample product TELGV3P73 · scores and prices are not real customer results</p>
    </section>
  )
}
