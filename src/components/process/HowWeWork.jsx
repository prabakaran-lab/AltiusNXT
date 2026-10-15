import { useEffect, useRef, useState } from 'react'
import { Check, FileSpreadsheet, FileText, Image as ImageIcon, ShieldCheck, Sparkles, Store, ShoppingBag, Boxes } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { TESYS } from '../sampleProduct.js'
import './HowWeWork.css'

const breaker = TESYS.images.front
const STEP_S = 4.6
const HOLD_S = 3
const STEPS = [
  { n: '01', title: 'Share your data', you: 'Send supplier files, a PIM export, or just a product URL.', we: 'We connect and read every source.' },
  { n: '02', title: 'AI enriches. Engineers verify.', you: 'Nothing to do. Review the result if you like.', we: 'CatalogWiz AI fills the gaps, then a product data engineer checks each value against the datasheet.' },
  { n: '03', title: 'Go live on your channels', you: 'Approve the record.', we: 'We deliver channel-ready content to your storefront, marketplaces and PIM.' },
]
const ROWS = [['AC voltage rating', '690 V ac'], ['Interrupting rating', '65 kA'], ['Mounting type', 'DIN Rail'], ['Series', 'TeSys Deca']]
const CHANNELS = [['Storefront', Store], ['Marketplaces', ShoppingBag], ['PIM / ERP', Boxes]]

function VisShare() {
  return (
    <div className="hw-vis v1">
      <div className="hwz"><span className="hwcap">Drop supplier data</span>
        <div className="hwchips">
          <span className="hwf xl"><FileSpreadsheet size={14} />pricelist.xlsx</span>
          <span className="hwf pd"><FileText size={14} />datasheet.pdf</span>
          <span className="hwf im"><ImageIcon size={14} />TELGV3P73.jpg</span>
        </div>
      </div>
      <div className="hwgot"><Check size={13} strokeWidth={3.4} />3 sources connected</div>
    </div>
  )
}
function VisEnrich() {
  return (
    <div className="hw-vis v2">
      <div className="hwrec">
        <header><img src={breaker} alt="" /><div><b>{TESYS.sku}</b><small>Motor circuit breaker</small></div><span className="hwai"><Sparkles size={11} />AI</span></header>
        <ul>{ROWS.map(([l, v], i) => <li key={l} style={{ '--i': i }}><em>{l}</em><span className="hwgap">···</span><b>{v}</b></li>)}</ul>
        <div className="hwscan" />
      </div>
      <div className="hwver"><span className="hwav">PD</span><div><b>Data engineer</b><small>Verified against datasheet</small></div><ShieldCheck size={15} /></div>
    </div>
  )
}
function VisLive() {
  return (
    <div className="hw-vis v3">
      <div className="live-h"><img src={breaker} alt="" /><div><b>Approved record</b><small>{TESYS.sku} · 17 attributes</small></div></div>
      <ul>{CHANNELS.map(([l, Ico], i) => <li key={l} style={{ '--i': i }}><span className="hwic"><Ico size={14} /></span><b>{l}</b><i className="hwsw"><u /></i><em>Live</em></li>)}</ul>
    </div>
  )
}
const VIS = [VisShare, VisEnrich, VisLive]

export default function HowWeWork() {
  const ref = useRef(null)
  const state = useRef({ t: 0, visible: false, reduced: false, manual: -1 })
  const [t, setT] = useState(0)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const s = state.current
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => { s.reduced = mq.matches; if (mq.matches) setT(STEP_S * 3 + 0.1) }
    read()
    mq.addEventListener('change', read)
    const io = new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; if (e.isIntersecting) setSeen(true) }, { threshold: window.innerWidth < 768 ? 0.04 : 0.3 })
    io.observe(ref.current)
    let raf = 0
    let last = performance.now()
    let acc = 0
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (s.visible && !s.reduced && !document.hidden) {
        s.t = (s.t + dt) % (STEP_S * 3 + HOLD_S)
        acc += dt
        if (acc >= 0.04) { acc = 0; setT(s.t) }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); mq.removeEventListener('change', read); io.disconnect() }
  }, [])

  const jump = (i) => { state.current.t = i * STEP_S + 0.05; setT(state.current.t) }
  const active = Math.min(2, Math.floor(t / STEP_S))
  const settled = t >= STEP_S * 3
  const line = Math.min(1, t / (STEP_S * 3))

  return (
    <section className={`hw${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="hw-title">
      <div className="hw-wrap">
        <header className="hw-head">
          <p className="hw-eyebrow">How we work with you</p>
          <h2 id="hw-title">From your files to live product pages, <em>in three steps.</em></h2>
          <p className="hw-sub">You stay in control. Nothing is published without your sign-off, and your team does not need to do the technical work.</p>
        </header>

        <div className="hw-track" aria-hidden="true"><i style={{ transform: `scaleX(${line})` }} /></div>

        <ol className="hw-grid">
          {STEPS.map((s, i) => {
            const Vis = VIS[i]
            const cls = settled || i < active ? 'done' : i === active ? 'on' : ''
            return (
              <li key={s.n} className={`hw-card ${cls}`} style={{ '--d': `${i * 120}ms` }}>
                <button type="button" className="hw-badge" onClick={() => jump(i)} aria-label={`Show step ${s.n}: ${s.title}`}><span>{cls === 'done' ? <Check size={14} strokeWidth={3.4} /> : s.n}</span></button>
                <Vis />
                <h3>{s.title}</h3>
                <p className="you"><b>You</b>{s.you}</p>
                <p className="we"><b>We</b>{s.we}</p>
              </li>
            )
          })}
        </ol>

        <div className="hw-cta"><Button to="/ai-readiness-report">Start with a free AI Readiness Report</Button><Button variant="outline" to="/how-it-works#catalogwiz">See CatalogWiz in action</Button></div>
      </div>
    </section>
  )
}
