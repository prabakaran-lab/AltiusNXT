import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, FileSpreadsheet, Sparkles } from 'lucide-react'
import breaker from '../../assets/home/circuit-breaker.webp'
import Icon from '../ui/Icon.jsx'
import './WhoItsFor.css'

/* ---------- animated mini visuals (CSS keyframes; they run only while the section is on screen) ---------- */
function Count({ to, go }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!go) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const f = requestAnimationFrame(() => setN(to))
      return () => cancelAnimationFrame(f)
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 2200)
      setN(Math.round(to * (1 - (1 - t) ** 3)))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [go, to])
  return <>{n.toLocaleString('en-US')}</>
}

const PATHS = ['M126 95 C 164 95, 172 36, 208 36', 'M126 95 L 208 95', 'M126 95 C 164 95, 172 154, 208 154']

function VisMaker() {
  return (
    <svg viewBox="0 0 320 190" className="wf-svg" role="img" aria-label="One master product record syndicated to a web store, distributors and marketplaces">
      <g fill="none" strokeLinecap="round" className="wf-paths">
        {PATHS.map((d) => <path key={d} d={d} className="base" />)}
        {PATHS.map((d, i) => <path key={`l${d}`} d={d} className="flow" style={{ '--i': i }} />)}
      </g>
      <g className="wf-src">
        <rect x="10" y="62" width="116" height="66" rx="12" />
        <image href={breaker} x="17" y="72" width="30" height="30" />
        <text x="52" y="86" className="t1">TELGV3P73</text>
        <text x="52" y="100" className="t2">Master record</text>
        <rect x="18" y="114" width="98" height="4" rx="2" className="bar" />
        <rect x="18" y="114" width="98" height="4" rx="2" className="fill" />
      </g>
      {[['Web store', 36], ['Distributors', 95], ['Marketplaces', 154]].map(([t, y], i) => (
        <g key={t} className="wf-out" style={{ '--i': i }}>
          <rect x="208" y={y - 16} width="106" height="32" rx="10" />
          <circle cx="223" cy={y} r="5" className="dot" />
          <text x="235" y={y + 3.5}>{t}</text>
        </g>
      ))}
    </svg>
  )
}

function VisDistributor({ go }) {
  const rows = ['pricelist_A.xlsx', 'catalog_2026.csv', 'supplier_B.pdf', 'brammer_feed.xml']
  return (
    <div className="wf-dist">
      <div className="wf-dist-top"><span><FileSpreadsheet size={13} />Supplier files</span><b><Count to={12480} go={go} /> <small>SKUs enriched</small></b></div>
      <ul>
        {rows.map((r, i) => (
          <li key={r} style={{ '--i': i }}>
            <span className="f">{r}</span>
            <span className="st raw">Incomplete</span>
            <span className="st ok"><Check size={10} strokeWidth={3.4} />Enriched</span>
            <i />
          </li>
        ))}
      </ul>
      <p className="wf-note">Example batch · illustrative</p>
    </div>
  )
}

function VisEcom() {
  return (
    <div className="wf-ecom">
      <div className="wf-page">
        <div className="wf-pbar"><i /><i /><i /></div>
        <div className="wf-pbody">
          <span className="wf-img"><img src={breaker} alt="" /></span>
          <div className="wf-lines"><b className="w1" /><b className="w2" /><b className="w3" /><em><Check size={9} strokeWidth={3.4} />In stock</em></div>
        </div>
        <div className="wf-seo"><Sparkles size={11} />Structured title · specs · SEO</div>
      </div>
      <div className="wf-metrics">
        <div className="m"><small>AI search rank</small><span className="swap"><b className="a">#47</b><b className="b">#1</b></span></div>
        <div className="m"><small>Page completeness</small><div className="bars"><i style={{ '--h': '30%' }} /><i style={{ '--h': '52%' }} /><i style={{ '--h': '78%' }} /><i style={{ '--h': '98%' }} /></div></div>
      </div>
    </div>
  )
}

const CARDS = [
  { id: 'mfr', tag: 'Manufacturers', title: 'Clean, consistent data for every channel.', pts: ['One governed product record', 'Syndicate to distributors and marketplaces', 'Fewer data-quality complaints from partners'], to: '/how-it-works#catalogwiz', cta: 'See how it works', vis: () => <VisMaker /> },
  { id: 'dist', tag: 'Distributors', title: 'Thousands of supplier SKUs, enriched fast.', pts: ['Normalise messy supplier files', 'Fill missing attributes from datasheets', 'Human-verified before it goes live'], to: '/how-it-works#catalogwiz', cta: 'See the workflow', vis: (go) => <VisDistributor go={go} /> },
  { id: 'ecom', tag: 'Ecommerce teams', title: 'Product pages that rank and convert.', pts: ['Structured titles, specs and SEO', 'Ready for AI search and buyer questions', 'Publish to Shopify, WooCommerce, Magento'], to: '/ai-readiness-report', cta: 'Get a free AI Readiness Report', vis: () => <VisEcom /> },
]

export default function WhoItsFor() {
  const ref = useRef(null)
  const [go, setGo] = useState(false)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      setGo(e.isIntersecting)
      if (e.isIntersecting) setSeen(true)
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.25 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <section className={`wf${go ? ' go' : ''}${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="wf-title">
      <div className="wf-wrap">
        <header className="wf-head">
          <p className="wf-eyebrow">Who it is for</p>
          <h2 id="wf-title">Built for teams that sell <em>technical products.</em></h2>
          <p className="wf-sub">Whether you make the product, distribute it, or sell it online, CatalogWiz turns messy supplier data into content buyers and AI search can trust.</p>
        </header>
        <div className="wf-grid">
          {CARDS.map((c, i) => (
            <article className="wf-card" key={c.id} style={{ '--d': `${i * 120}ms` }}>
              <div className="wf-vis">{c.vis(go)}</div>
              <div className="wf-body">
                <span className="wf-tag">{c.tag}</span>
                <h3>{c.title}</h3>
                <ul>{c.pts.map((p) => <li key={p}><Check size={13} strokeWidth={3.2} />{p}</li>)}</ul>
                <Link to={c.to} className="wf-link">{c.cta}<Icon name="arrow-right" /></Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
