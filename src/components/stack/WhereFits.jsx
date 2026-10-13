import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Check, FileSpreadsheet, FileText, Globe, Image as ImageIcon, ShoppingBag, Sparkles, Store } from 'lucide-react'
import Icon from '../ui/Icon.jsx'
import './WhereFits.css'

/* Illustrative sample data: the same Schneider Electric TELGV3P73 motor circuit breaker used across the page. */
const SOURCES = [
  { label: 'Supplier feeds', icon: FileSpreadsheet },
  { label: 'Spec sheets & PDFs', icon: FileText },
  { label: 'Product images', icon: ImageIcon },
  { label: 'Manufacturer sites', icon: Globe },
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

const pct = (x, w) => `${(x / w) * 100}%`

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

  return (
    <section className={`wh${go ? ' go' : ''}${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="wh-title">
      <div className="wh-wrap">
        <header className="wh-head">
          <p className="wh-pill">Where CatalogWiz fits</p>
          <h2 id="wh-title">Your platform stores the data. <em>CatalogWiz does the work.</em></h2>
          <p className="wh-sub">Keep your PIM, ERP or eCommerce platform. CatalogWiz enriches your product data, our experts verify it, and the clean data flows straight back into the system you already use. No PIM? It works without one too.</p>
        </header>

        {/* desktop diagram */}
        <div className="wh-stage" role="img" aria-label="Supplier feeds, spec sheets, images and manufacturer sites flow into CatalogWiz AI, which enriches your PIM. The PIM publishes to storefronts, marketplaces, AI assistants and AI shopping agents using UCP, and results feed back in.">
          <svg className="wh-svg" viewBox="0 0 1200 440" aria-hidden="true">
            <defs>
              {SRC_Y.map((y, i) => <path key={`s${i}`} id={`wh-s${i}`} d={srcPath(y)} />)}
              {OUT_Y.map((y, i) => <path key={`o${i}`} id={`wh-o${i}`} d={outPath(y)} />)}
              <path id="wh-h" d="M414 198 H 500" />
              <path id="wh-f" d={FEEDBACK} />
            </defs>
            <g fill="none" strokeLinecap="round">
              {SRC_Y.map((y, i) => <path key={`sb${i}`} d={srcPath(y)} className="b" />)}
              {OUT_Y.map((y, i) => <path key={`ob${i}`} d={outPath(y)} className="b o" />)}
              <path d="M414 198 H 500" className="b o" />
              <path d="M500 214 H 414" className="b back" />
              <path d={FEEDBACK} className="b fb" />
            </g>
            {dots && (
              <g>
                {SRC_Y.map((y, i) => <circle key={`sd${i}`} r="4.5" className="d"><animateMotion dur="3.2s" begin={`${i * 0.5}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".5 0 .3 1"><mpath href={`#wh-s${i}`} /></animateMotion></circle>)}
                <circle r="4.5" className="d"><animateMotion dur="1.6s" begin="1.1s" repeatCount="indefinite"><mpath href="#wh-h" /></animateMotion></circle>
                {OUT_Y.map((y, i) => <circle key={`od${i}`} r="4.5" className="d"><animateMotion dur="2.4s" begin={`${1.6 + i * 0.4}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".5 0 .3 1"><mpath href={`#wh-o${i}`} /></animateMotion></circle>)}
                <circle r="4" className="d fbd"><animateMotion dur="6s" begin="0.5s" repeatCount="indefinite"><mpath href="#wh-f" /></animateMotion></circle>
              </g>
            )}
          </svg>

          {SOURCES.map(({ label, icon: Ico }, i) => (
            <div key={label} className="wh-node src" style={{ left: pct(40, 1200), top: pct(SRC_Y[i], 440), '--i': i }}><span className="ico"><Ico size={14} /></span>{label}</div>
          ))}

          <div className="wh-hub" style={{ left: pct(370, 1200), top: pct(205, 440) }}><span /><span /><span /><Sparkles size={26} /></div>
          <div className="wh-hub-l" style={{ left: pct(370, 1200), top: pct(124, 440) }}>CatalogWiz AI<small>+ human review</small></div>
          <div className="wh-sync" style={{ left: pct(457, 1200), top: pct(178, 440) }}>Updates both ways</div>

          <div className="wh-pim-wrap" style={{ left: pct(500, 1200), top: pct(205, 440) }}><PimCard /></div>

          {OUTPUTS.map(({ label, icon: Ico }, i) => (
            <div key={label} className="wh-node out" style={{ left: pct(930, 1200), top: pct(OUT_Y[i], 440), '--i': i }}><span className="ico"><Ico size={14} /></span>{label}<i /></div>
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
