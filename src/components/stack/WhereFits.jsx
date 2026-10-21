import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Check, FileSpreadsheet, FileText, Globe, Image as ImageIcon, ShoppingBag, Sparkles, Store } from 'lucide-react'
import Icon from '../ui/Icon.jsx'
import './WhereFits.css'

/* Illustrative sample data: the same Schneider Electric TELGV3P73 motor circuit breaker used across the page.
   One 8 second loop drives the whole diagram, so every moment is in step with the next:
     0.4 to 2.0s   labelled data packets leave the four sources and are absorbed by CatalogWiz AI
     2.0 to 3.0s   the hub pulses, its progress ring fills, a beam carries the record into your PIM / ERP
     3.1 to 5.6s   the PIM card receives it and each attribute is enriched in turn
     5.8 to 7.0s   the verified record flows out to every channel, and each one goes live
     6.9 to 8.0s   the results come back round the loop */

const SOURCES = [
  { label: 'Supplier feeds', icon: FileSpreadsheet, chip: '73A' },
  { label: 'Spec sheets & PDFs', icon: FileText, chip: 'p.4 Icu' },
  { label: 'Product images', icon: ImageIcon, chip: 'IMG' },
  { label: 'Manufacturer sites', icon: Globe, chip: '690VAC' },
]
const OUTPUTS = [
  { label: 'Storefront', icon: Store },
  { label: 'Marketplaces', icon: ShoppingBag },
  { label: 'AI assistants', icon: Bot },
  { label: 'AI shopping agents (UCP)', icon: Bot },
]
const ROWS = [['Current rating', '73 A'], ['AC voltage rating', '690 V ac'], ['Interrupting rating', '65 kA'], ['Mounting type', 'DIN Rail'], ['Series', 'TeSys Deca']]

const SRC_Y = [70, 160, 250, 340]
const OUT_Y = [75, 165, 255, 345]
const srcPath = (y) => `M250 ${y} C 296 ${y}, 288 205, 326 205`
const outPath = (y) => `M780 205 C 852 205, 858 ${y}, 930 ${y}`
const FEEDBACK = 'M1045 330 V 352 C 1045 400, 1010 410, 950 410 H 460 C 396 410, 370 392, 370 254'
const LOOP = 8 // seconds

// rising data bits behind the diagram: left %, delay, duration, glyph
const BITS = [[6, -2, 13, '01'], [12, -9, 16, '•'], [19, -5, 11, '10'], [27, -12, 15, '▪'], [34, -3, 12, '1'], [41, -8, 17, '01'], [49, -14, 13, '•'], [57, -6, 11, '0'], [64, -10, 16, '10'], [72, -1, 14, '▪'], [79, -7, 12, '01'], [86, -13, 15, '•'], [93, -4, 11, '1']]

const pct = (x, w) => `${(x / w) * 100}%`

// a packet that rides a path between two moments of the loop, then is gone until the loop comes round again
function Packet({ href, from, to, className = '', children }) {
  const a = from / LOOP
  const b = to / LOOP
  return (
    <g className={`pk ${className}`}>
      {children}
      <animateMotion dur={`${LOOP}s`} repeatCount="indefinite" calcMode="spline" keyPoints="0;0;1;1" keyTimes={`0;${a};${b};1`} keySplines="0 0 1 1;.5 0 .3 1;0 0 1 1"><mpath href={href} /></animateMotion>
      <animate attributeName="opacity" dur={`${LOOP}s`} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes={`0;${a};${a + 0.012};${b - 0.012};${b};1`} />
    </g>
  )
}

function PimCard() {
  return (
    <div className="wh-pim">
      <header><b>Your PIM / ERP</b><span>System of record</span></header>
      <div className="wh-pim-p"><small>TELGV3P73</small><em className="run">Enriching…</em><em className="done"><Check size={10} strokeWidth={3.4} />Complete</em></div>
      <ul>
        {ROWS.map(([l, v], i) => (
          <li key={l} style={{ '--i': i }}>
            <span>{l}</span>
            <b className="gap">···</b>
            <b className="val">{v}</b>
          </li>
        ))}
      </ul>
      <div className="wh-pim-f"><Sparkles size={11} />Verified by a data specialist</div>
    </div>
  )
}

export default function WhereFits() {
  const ref = useRef(null)
  const [go, setGo] = useState(false)
  const [seen, setSeen] = useState(false)
  const [calm, setCalm] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setCalm(mq.matches)
    read()
    mq.addEventListener('change', read)
    const io = new IntersectionObserver(([e]) => { setGo(e.isIntersecting); if (e.isIntersecting) setSeen(true) }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(ref.current)
    return () => { mq.removeEventListener('change', read); io.disconnect() }
  }, [])
  const dots = go && !calm
  const stageRef = useRef(null)
  const move = (e) => {
    const el = stageRef.current
    if (!el || calm || e.pointerType === 'touch') return
    const b = el.getBoundingClientRect()
    el.style.setProperty('--mx', (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3))
    el.style.setProperty('--my', (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3))
  }
  const leave = () => { const el = stageRef.current; if (el) { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0') } }

  return (
    <section className={`wh${go ? ' go' : ''}${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="wh-title">
      <div className="wh-wrap">
        <header className="wh-head">
          <p className="wh-pill">Works with your stack</p>
          <h2 id="wh-title">Keep your PIM. <em>We deliver verified data into it.</em></h2>
          <p className="wh-sub">No new platform to learn. CatalogWiz reads supplier feeds, datasheets, images and manufacturer sites. Our engineers verify each value, and the approved record goes straight into the PIM, ERP or store you already run: Akeneo, Pimcore, inRiver, Salsify, SAP, Shopify, Magento or BigCommerce. No PIM? We deliver clean files.</p>
        </header>

        {/* desktop diagram */}
        <div className="wh-stage" ref={stageRef} onPointerMove={move} onPointerLeave={leave} role="img" aria-label="Supplier feeds, spec sheets, images and manufacturer sites flow into CatalogWiz AI, which enriches your PIM. The PIM publishes to storefronts, marketplaces, AI assistants and AI shopping agents using UCP, and results feed back in.">
          <div className="wh-aura" aria-hidden="true"><i /><i /><i /></div>
          <div className="wh-fx" aria-hidden="true">
            <div className="wh-bits">{BITS.map((b, n) => <span key={n} style={{ left: `${b[0]}%`, '--d': `${b[1]}s`, '--t': `${b[2]}s` }}>{b[3]}</span>)}</div>
            <i className="sweep" />
          </div>
          <svg className="wh-svg" viewBox="0 0 1200 440" aria-hidden="true">
            <defs>
              <linearGradient id="wh-lgs" gradientUnits="userSpaceOnUse" x1="250" y1="0" x2="326" y2="0"><stop offset="0" stopColor="#d5deec" /><stop offset="1" stopColor="#ff9a5c" /></linearGradient>
              <linearGradient id="wh-lgo" gradientUnits="userSpaceOnUse" x1="780" y1="0" x2="930" y2="0"><stop offset="0" stopColor="#ff6a1a" /><stop offset="1" stopColor="#ffc09a" /></linearGradient>
              {SRC_Y.map((y, i) => <path key={`s${i}`} id={`wh-s${i}`} d={srcPath(y)} />)}
              {OUT_Y.map((y, i) => <path key={`o${i}`} id={`wh-o${i}`} d={outPath(y)} />)}
              <path id="wh-h" d="M414 198 H 500" />
              <path id="wh-f" d={FEEDBACK} />
            </defs>
            <g fill="none" strokeLinecap="round">
              {SRC_Y.map((y, i) => <path key={`sb${i}`} d={srcPath(y)} className="b dr" pathLength="1" />)}
              {OUT_Y.map((y, i) => <path key={`ob${i}`} d={outPath(y)} className="b o dr" pathLength="1" />)}
              <path d="M414 198 H 500" className="b o" />
              <path d="M500 214 H 414" className="b back" />
              <path d={FEEDBACK} className="b fb" />
              {/* energy streaks that flow along the lines while their part of the story is playing */}
              {SRC_Y.map((y, i) => <path key={`sf${i}`} d={srcPath(y)} className="fl s" pathLength="1" style={{ '--i': i }} />)}
              <path d="M414 198 H 500" className="fl h" pathLength="1" />
              {OUT_Y.map((y, i) => <path key={`of${i}`} d={outPath(y)} className="fl o" pathLength="1" style={{ '--i': i }} />)}
            </g>
            {dots && (
              <g>
                {SRC_Y.map((y, i) => (
                  <Packet key={`ps${i}`} href={`#wh-s${i}`} from={0.4 + i * 0.25} to={1.9 + i * 0.1} className="chip">
                    <rect x="-23" y="-10" width="46" height="20" rx="6" /><text y="3.6" textAnchor="middle">{SOURCES[i].chip}</text>
                  </Packet>
                ))}
                <Packet href="#wh-h" from={2.2} to={3.0} className="core"><circle r="6" /></Packet>
                {OUT_Y.map((y, i) => <Packet key={`po${i}`} href={`#wh-o${i}`} from={5.8 + i * 0.18} to={6.7 + i * 0.18} className="out"><circle r="5" /></Packet>)}
                <Packet href="#wh-f" from={6.9} to={7.95} className="back"><circle r="5" /></Packet>
              </g>
            )}
          </svg>

          {SOURCES.map(({ label, icon: Ico }, i) => (
            <div key={label} className={`wh-node src s${i}`} style={{ left: pct(40, 1200), top: pct(SRC_Y[i], 440), '--i': i }}><span className="ico"><Ico size={14} /></span>{label}<em className="st"><u className="sp" /><u className="ck"><Check size={11} strokeWidth={3.6} /></u></em></div>
          ))}

          <div className="wh-hub" style={{ left: pct(370, 1200), top: pct(205, 440) }}>
            <span /><span /><span /><i className="shock" /><i className="orb o1" /><i className="orb o2" />
            <svg className="arc" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="1" /></svg>
            <Sparkles size={26} />
          </div>
          <div className="wh-hub-l" style={{ left: pct(370, 1200), top: pct(112, 440) }}>CatalogWiz AI<small>+ human review</small></div>
          <div className="wh-sync" style={{ left: pct(457, 1200), top: pct(178, 440) }}>Updates both ways</div>

          <div className="wh-pim-wrap" style={{ left: pct(500, 1200), top: pct(205, 440) }}>
            <p className="wh-cnt"><b /> of 33 attributes</p>
            <PimCard />
            <span className="wh-badge"><Check size={11} strokeWidth={3.8} />Verified<i className="burst">{[0, 1, 2, 3, 4, 5, 6, 7].map((n) => <s key={n} style={{ '--k': n }} />)}</i></span>
          </div>

          {OUTPUTS.map(({ label, icon: Ico }, i) => (
            <div key={label} className={`wh-node out o${i}`} style={{ left: pct(930, 1200), top: pct(OUT_Y[i], 440), '--i': i }}><span className="ico"><Ico size={14} /></span>{label}<em className="lv">Live</em><i /></div>
          ))}
          <div className="wh-back" style={{ left: pct(705, 1200), top: pct(410, 440) }}>Results feed back in</div>
        </div>

        {/* phones / tablets: simple vertical flow */}
        <div className="wh-flow" aria-hidden="true">
          <div className="row">{SOURCES.map(({ label, icon: Ico }) => <span key={label} className="chip"><Ico size={13} />{label}</span>)}</div>
          <div className="arr"><i /><i /><i /></div>
          <div className="hubm"><span className="ball"><Sparkles size={20} /></span><b>CatalogWiz AI</b><small>+ human review</small></div>
          <div className="arr"><i /><i /><i /></div>
          <PimCard />
          <div className="arr"><i /><i /><i /></div>
          <div className="row out">{OUTPUTS.map(({ label, icon: Ico }) => <span key={label} className="chip dark"><Ico size={13} />{label}</span>)}</div>
        </div>

        <p className="wh-cta"><Link to="/how-it-works#catalogwiz">See how CatalogWiz fits your stack <Icon name="arrow-right" /></Link></p>
        <p className="wh-foot">Illustrative sample data · sample product TELGV3P73</p>
      </div>
    </section>
  )
}
