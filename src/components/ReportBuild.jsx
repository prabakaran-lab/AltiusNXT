import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import './ReportBuild.css'

/* The "building your report" scene: the four AI engines send live answers into a 3D stack of six report pages.
   The page being written lifts up and fills line by line, finished pages turn green, pages still to come are ghosts.
   The server only reports a stage name and elapsed time, so the page timing is cosmetic (about 30 s per page) and is
   pinned to the last page once the server says it is laying out the PDF. */

const ENGINES = [
  { name: 'ChatGPT', col: '#10a37f', x: 13, y: 15, q: ['Who supplies 73 A motor circuit breakers?', 'Best distributor for TeSys Deca near me?', 'Where can I buy TELGV3P73 today?'] },
  { name: 'Claude', col: '#d97757', x: 87, y: 15, q: ['Which seller lists full specs for this breaker?', 'Compare suppliers by price and stock', 'Who is a trusted source for this part?'] },
  { name: 'Gemini', col: '#4285f4', x: 13, y: 78, q: ['Show distributors with the MPN on the page', 'Alternatives to this 3-pole breaker', 'Which listing has a datasheet linked?'] },
  { name: 'Perplexity', col: '#20808d', x: 87, y: 78, q: ['Where to buy a 690 V ac motor breaker?', 'Which stores are cited for this product?', 'Who ships the same day?'] },
]
const PAGES = [
  { t: 'Summary', d: 'The headline and key numbers' },
  { t: 'AI search results', d: 'Who each AI engine names' },
  { t: 'The five gaps', d: 'What is missing, ranked' },
  { t: 'Current vs enriched', d: 'Your page, before and after' },
  { t: 'Commercial impact', d: 'Price and cost of doing nothing' },
  { t: 'Next steps', d: 'What to do first' },
]
const PAGE_MS = 30000

export default function ReportBuild({ progress, elapsed }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2400)
    return () => clearInterval(t)
  }, [])

  const ms = progress?.elapsedMs || 0
  const stageText = progress?.stage || ''
  const finishing = /laying out|emailing|done/i.test(stageText)
  const active = finishing ? PAGES.length - 1 : Math.min(PAGES.length - 1, Math.floor(ms / PAGE_MS))
  const allDone = /emailing|done/i.test(stageText)
  const e = tick % ENGINES.length
  const eng = ENGINES[e]
  const query = eng.q[Math.floor(tick / ENGINES.length) % eng.q.length]

  return (
    <div className="rb3">
      <div className="rb3-scene" aria-hidden="true">
        <i className="rb3-glow" />
        <svg className="rb3-beams" viewBox="0 0 680 330" preserveAspectRatio="none">
          {ENGINES.map((g, i) => {
            const x = (g.x / 100) * 680
            const y = (g.y / 100) * 330
            const d = `M${x} ${y} Q ${(x + 340) / 2} ${y < 165 ? y + 30 : y - 30} 340 172`
            return (
              <g key={g.name} className={i === e ? 'hot' : ''}>
                <path className="base" d={d} />
                <path className="flow" d={d} style={{ stroke: g.col, animationDelay: `${i * -0.4}s` }} />
                <circle r="4.5" fill={g.col}><animateMotion dur={`${2.2 + i * 0.3}s`} repeatCount="indefinite" path={d} /></circle>
              </g>
            )
          })}
        </svg>

        {ENGINES.map((g, i) => (
          <span key={g.name} className={`rb3-eng${i === e ? ' hot' : ''}`} style={{ left: `${g.x}%`, top: `${g.y}%`, '--c': g.col }}>
            <i />{g.name}
          </span>
        ))}

        <div className="rb3-stack">
          {PAGES.map((p, i) => {
            const state = allDone || i < active ? 'done' : i === active ? 'on' : 'wait'
            return (
              <div key={p.t} className={`rb3-page ${state}`} style={{ '--i': i }}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <span className="bar" />
                <span className="ln l1" /><span className="ln l2" /><span className="ln l3" /><span className="ln l4" />
                <span className="blk" />
                <em><Check size={12} strokeWidth={3.6} /></em>
                <u />
              </div>
            )
          })}
        </div>
      </div>

      <div className="rb3-copy" aria-live="polite">
        <h3>{allDone ? 'Packaging and emailing your report…' : 'Your AI Readiness Report is being written'}</h3>
        <div className="rb3-tick" key={tick} style={{ '--c': eng.col }}>
          <i /><b>{eng.name}</b><span>“{query}”</span><em>answered</em>
        </div>
        <ul className="rb3-list">
          {PAGES.map((p, i) => {
            const state = allDone || i < active ? 'ok' : i === active ? 'run' : ''
            return <li key={p.t} className={state}><span>{state === 'ok' ? <Check size={10} strokeWidth={3.8} /> : null}</span><b>{p.t}</b><small>{p.d}</small></li>
          })}
        </ul>
        <small className="rb3-foot">Live answers from 4 AI engines and real sellers, so this takes 3–6 minutes. Keep this tab open. Elapsed: {elapsed}</small>
      </div>
    </div>
  )
}
