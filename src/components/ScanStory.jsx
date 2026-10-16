import { useEffect, useMemo, useState } from 'react'
import './ScanStory.css'

/* The scan waiting screen, told as a short story in five scenes that flow into each other on one stage:
     1 A buyer asks       a question is typed into a chat (built from the product page's own address)
     2 AI goes looking    the four engines light up, beams fan out to a stack of seller pages
     3 It reads your page the visitor's page lifts out and is read line by line
     4 It decides         a pick-ring hops between sellers and lands on "will it be you?"
     5 Finishing up       holds, with a quiet pulse, for as long as the scan takes (it can run 10 to 60 seconds)
   Nothing here claims a result: it shows how AI shops, so the visitor understands what is being checked. */

const SCENES = [0, 4200, 9000, 13800, 18800] // start time of each scene, in ms
const CHAPTERS = ['Asked', 'Searching', 'Reading', 'Deciding']
const CAPTIONS = [
  ['A buyer asks AI', 'Someone types the question your customers ask every day.'],
  ['AI goes looking', 'ChatGPT, Claude, Gemini and Perplexity search the web for sellers.'],
  ['It reads your page', 'Can it find the manufacturer, the part number, the specs and the price?'],
  ['Then it chooses who to name', 'It recommends the seller whose data it can verify. Will it be you?'],
  ['Finishing the last checks', 'Almost there. We are scoring your page on 15 checks.'],
]
const ENGINES = [
  ['ChatGPT', '#10a37f'], ['Claude', '#d97757'], ['Gemini', '#4285f4'], ['Perplexity', '#20808d'],
]
const ROWS = ['Manufacturer', 'Part number', 'Specifications', 'Price', 'Structured data']

// "https://shop.example.com/p/aircon-duct-flat-bend-90-deg-80mm" -> "aircon duct flat bend 90 deg 80mm"
function productPhrase(url) {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() || ''
    const words = decodeURIComponent(seg).replace(/\.[a-z]{2,5}$/i, '').split(/[-_+\s]+/).filter(Boolean)
    const text = words.join(' ')
    const letters = (text.match(/[a-z]/gi) || []).length
    if (words.length >= 2 && letters / Math.max(1, text.length) > 0.5) return text.length > 44 ? `${text.slice(0, 44).trim()}…` : text.toLowerCase()
  } catch { /* fall through */ }
  return 'this product'
}

export default function ScanStory({ url }) {
  const calm = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const [scene, setScene] = useState(calm ? 4 : 0)
  const phrase = productPhrase(url)
  const question = `Where can I buy ${phrase} online?`
  const [typed, setTyped] = useState(calm ? question.length : 0)
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'your page' } })()

  useEffect(() => {
    if (calm) return undefined
    const timers = SCENES.slice(1).map((t, i) => setTimeout(() => setScene(i + 1), t))
    return () => timers.forEach(clearTimeout)
  }, [calm])

  useEffect(() => {
    if (calm || scene > 0) return undefined
    const t = setInterval(() => setTyped((n) => Math.min(question.length, n + 1)), 55)
    return () => clearInterval(t)
  }, [scene, calm, question.length])

  const typedText = scene > 0 ? question : question.slice(0, typed)
  const [title, sub] = CAPTIONS[scene]
  const chapter = Math.min(scene, 3)

  return (
    <div className={`sc s${scene}`}>
      <div className="sc-stage" aria-hidden="true">
        <div className="sc-engines">
          {ENGINES.map(([n, c], i) => <span key={n} className="sc-eng" style={{ '--c': c, '--i': i }}><i />{n}</span>)}
        </div>

        <svg className="sc-beams" viewBox="0 0 560 312" preserveAspectRatio="none">
          {[72, 108, 196, 284].map((y, i) => <path key={y} d={`M252 170 C 276 170, 280 ${y}, 306 ${y}`} style={{ '--i': i }} />)}
        </svg>

        <div className="sc-chat">
          <header><span className="av" />Buyer asks ChatGPT</header>
          <div className="u">{typedText}{scene === 0 && <b className="caret" />}</div>
          <div className="a" key={scene}>
            {scene === 0 && <span className="idle">…</span>}
            {scene === 1 && <><span>Searching the web</span><u><i /><i /><i /></u></>}
            {scene === 2 && <><span>Reading product pages</span><u><i /><i /><i /></u></>}
            {scene === 3 && (
              <div className="rank">
                <span>Choosing who to recommend</span>
                <em className="l1" /><em className="l2" /><em className="l3" />
              </div>
            )}
            {scene === 4 && <><span>Double-checking the details</span><u><i /><i /><i /></u></>}
          </div>
        </div>

        <div className="sc-cards">
          <i className="sc-pick"><b>?</b></i>
          <div className="sc-card seller" style={{ '--i': 0 }}><span className="dot" /><span className="ln w1" /><span className="ln w2" /></div>
          <div className="sc-card seller" style={{ '--i': 1 }}><span className="dot" /><span className="ln w1" /><span className="ln w3" /></div>
          <div className="sc-card yours" style={{ '--i': 2 }}>
            <header><span className="dot" /><b>{host}</b><em>Your page</em></header>
            <ul>{ROWS.map((r, i) => <li key={r} style={{ '--k': i }}><span>{r}</span><i /></li>)}</ul>
            <u />
          </div>
          <div className="sc-card seller" style={{ '--i': 3 }}><span className="dot" /><span className="ln w2" /><span className="ln w1" /></div>
        </div>
      </div>

      <div className="sc-copy" aria-live="polite">
        <ol className="sc-chap" aria-hidden="true">
          {CHAPTERS.map((c, i) => <li key={c} className={chapter > i || scene === 4 ? 'done' : chapter === i ? 'on' : ''}><span>{i + 1}</span>{c}</li>)}
        </ol>
        <h3 key={`t${scene}`}>{title}</h3>
        <p key={`p${scene}`}>{sub}</p>
        <div className="sc-meter" aria-hidden="true"><i /></div>
      </div>
    </div>
  )
}
