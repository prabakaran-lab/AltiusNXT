import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import multimeterImg from '../assets/home/multimeter.png'
import logoShopify from '../assets/integrations/shopify.svg'
import logoWoo from '../assets/integrations/woocommerce.svg'
import logoBigcommerce from '../assets/integrations/bigcommerce.svg'
import logoEbay from '../assets/integrations/ebay.svg'
import logoGoogle from '../assets/integrations/google.svg'
import './PublishFlow.css'
import Icon from './ui/Icon.jsx'

/* ------------------------------------------------------------------
   Publishing — a top-to-bottom story:
   product → CatalogWiz enrichment → approved record → publish → channels.
   One timeline of timeouts drives all state; CSS handles the motion.
   Illustrative sample record, not a customer deployment.
   ------------------------------------------------------------------ */

const CHANNELS = [
  { label: 'Shopify', logo: logoShopify, done: 'Published' },
  { label: 'WooCommerce', logo: logoWoo, done: 'Published' },
  { label: 'BigCommerce', logo: logoBigcommerce, done: 'Published' },
  { label: 'Magento', mark: 'M', color: '#ee672f', done: 'Published' },
  { label: 'Amazon', mark: 'a', color: '#ff9900', done: 'Published' },
  { label: 'eBay', logo: logoEbay, done: 'Published' },
  { label: 'Walmart', mark: '✱', color: '#d99a00', done: 'Published' },
  { label: 'PIM / MDM', icon: 'db', done: 'Synced' },
  { label: 'GMC', logo: logoGoogle, done: 'Published' },
  { label: 'Custom API', icon: 'api', done: 'Synced' },
]

const SOURCES = ['Supplier data', 'Technical datasheet', 'Product images', 'Specifications']
const TAXONOMY = ['Test & Measurement', 'Electrical Test Equipment', 'Digital Multimeters']
const ATTRS = [
  ['DC Voltage', '600 V'], ['AC Voltage', '600 V'], ['Current', '10 A'],
  ['Resistance', '60 MΩ'], ['Frequency', '10 MHz'], ['CAT Rating', 'CAT III 600 V'],
]
const QUALITY = ['Specifications complete', 'Attributes complete', 'Assets attached', 'Taxonomy mapped']
const TRUST = ['Identity verified', 'Taxonomy mapped', 'Attributes enriched', 'Specifications validated', 'Images & documents attached', 'Channel requirements passed']
const FLOW = ['Enriched', 'Mapped', 'Validated', 'Approved']
const DONE_LIST = ['Product content synced', 'Specifications synced', 'Images & documents synced', 'Channel-ready content delivered']
const BENEFITS = ['One source of truth', 'Validated before publish', 'Keep your existing stack', 'Channel-ready output']

const INIT = { prod: false, src: 0, pulse: false, id: false, tax: 0, attrs: 0, q: 0, flow: 0, trust: 0, btn: 0, ch: Array(CHANNELS.length).fill(0), complete: false }
const FINAL = { prod: true, src: 4, pulse: true, id: true, tax: 3, attrs: 6, q: 4, flow: 4, trust: 6, btn: 3, ch: Array(CHANNELS.length).fill(2), complete: true }

const Check = ({ size = 12 }) => <Icon name="check" size={size} strokeWidth={3} />
const ICONS = { db: 'database', api: 'api' }
const BTN = ['Publish locked', 'Publish ready', 'Publishing…']

const Connector = ({ on, label }) => (
  <div className={`pbl-conn${on ? ' on' : ''}`} aria-hidden="true">
    <span className="pbl-conn-line"><i /></span>
    {label && <em>{label}</em>}
  </div>
)

export default function PublishFlow() {
  const [s, setS] = useState(INIT)
  const stageRef = useRef(null)
  const timers = useRef([])
  const started = useRef(false)
  const reduced = useRef(false)

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const run = useCallback(() => {
    clear()
    setS(INIT)
    const q = (ms, fn) => timers.current.push(setTimeout(fn, ms))
    const patch = (o) => setS((p) => ({ ...p, ...o }))
    const setCh = (i, v) => setS((p) => ({ ...p, ch: p.ch.map((x, j) => (j === i ? v : x)) }))

    q(80, () => patch({ prod: true }))
    SOURCES.forEach((_, k) => q(450 + k * 180, () => patch({ src: k + 1 })))
    q(1300, () => patch({ pulse: true }))
    q(1800, () => patch({ id: true }))
    for (let k = 1; k <= 3; k++) q(1900 + k * 220, () => patch({ tax: k }))
    for (let k = 1; k <= 6; k++) q(2500 + k * 200, () => patch({ attrs: k }))
    for (let k = 1; k <= 4; k++) q(3900 + k * 230, () => patch({ q: k }))
    q(4900, () => patch({ flow: 1 }))
    q(5200, () => patch({ flow: 2 }))
    for (let k = 1; k <= 6; k++) q(5300 + k * 170, () => patch({ trust: k }))
    q(6500, () => patch({ flow: 3 }))
    q(6800, () => patch({ flow: 4, btn: 1 }))
    q(7500, () => patch({ btn: 2 }))
    CHANNELS.forEach((_, i) => {
      q(8000 + i * 140, () => setCh(i, 1))
      q(8000 + i * 140 + 480, () => setCh(i, 2))
    })
    q(8000 + 9 * 140 + 700, () => patch({ btn: 3, complete: true }))
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced.current || !('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => setS(FINAL))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        run()
        io.disconnect()
      }
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.15 })
    io.observe(el)
    return () => { io.disconnect(); clear() }
  }, [run])

  const publishing = s.btn >= 2
  const working = s.pulse && s.flow < 4

  return (
    <section className="pbl" aria-labelledby="pbl-heading">
      <div className="pbl-wrap">
        <header className="pbl-head">
          <div>
            <span className="pbl-kicker">Publishing</span>
            <h2 id="pbl-heading">Enrich once. <span>Publish everywhere.</span></h2>
          </div>
          <div className="pbl-head-r">
            <p>CatalogWiz turns incomplete product information into one enriched, validated and approved product record — then distributes channel-ready content to your existing ecommerce platforms, marketplaces, PIM / MDM systems and APIs.</p>
            <Link to="/resources" className="pbl-link">View all integrations <Icon name="arrow-right" /></Link>
          </div>
        </header>

        <div ref={stageRef} className={`pbl-stage${s.complete ? ' is-complete' : ''}`}>
          <div className="pbl-bar">
            <span>Illustrative publishing workflow · sample product record</span>
            <button type="button" onClick={() => { started.current = true; if (reduced.current) setS(FINAL); else run() }}>Replay publishing demo ↻</button>
          </div>

          {/* 01 Product */}
          <div className={`pbl-product${s.prod ? ' in' : ''}`}>
            <div className="pbl-photo"><img src={multimeterImg} alt="Industrial digital multimeter" width="1254" height="1254" /></div>
            <div className="pbl-prod-info">
              <span className="pbl-step">01 · Product</span>
              <h3>Industrial Digital Multimeter</h3>
              <ul className="pbl-src">
                {SOURCES.map((t, i) => <li key={t} className={s.src > i ? 'on' : ''}>{t}</li>)}
              </ul>
            </div>
          </div>

          <Connector on={s.pulse} />

          {/* 02 CatalogWiz */}
          <div className={`pbl-wb${s.pulse ? ' in' : ''}${working ? ' working' : ''}`}>
            <div className="pbl-wb-head">
              <span className="pbl-brand"><i aria-hidden="true" />CatalogWiz <b>Workbench</b></span>
              <span className="pbl-step">02 · Enrichment</span>
              <span className={`pbl-st${s.flow === 4 ? ' ok' : ''}`} aria-live="polite">{s.flow === 4 ? 'Approved' : s.pulse ? 'Enriching…' : 'Waiting for product'}</span>
            </div>
            <div className="pbl-wb-grid">
              <section className="pbl-col">
                <h4>Product identity</h4>
                <dl className={`pbl-id${s.id ? ' on' : ''}`}>
                  <div><dt>SKU</dt><dd>DMM-6000</dd></div>
                  <div><dt>MPN</dt><dd>DM6000-PRO</dd></div>
                  <div><dt>Type</dt><dd>Digital multimeter</dd></div>
                </dl>
              </section>
              <section className="pbl-col">
                <h4>Taxonomy</h4>
                <ol className="pbl-tax">
                  {TAXONOMY.map((t, i) => <li key={t} className={s.tax > i ? 'on' : ''} style={{ '--l': i }}>{i ? '↳ ' : ''}{t}</li>)}
                </ol>
              </section>
              <section className="pbl-col">
                <h4>Key attributes</h4>
                <ul className="pbl-attrs">
                  {ATTRS.map(([n, v], i) => (
                    <li key={n} className={s.attrs > i ? 'on' : s.attrs === i && s.pulse ? 'run' : ''}><span>{n}</span><b>{s.attrs > i ? v : '—'}</b></li>
                  ))}
                </ul>
              </section>
              <section className="pbl-col">
                <h4>Quality</h4>
                <ul className="pbl-q">
                  {QUALITY.map((t, i) => <li key={t} className={s.q > i ? 'on' : ''}><span className="d"><Check size={9} /></span>{t}</li>)}
                </ul>
              </section>
            </div>
          </div>

          <Connector on={s.flow >= 1} />

          {/* 03 Approved master record */}
          <div className={`pbl-appr${s.flow === 4 ? ' ok' : ''}`}>
            <div className="pbl-appr-l">
              <span className="pbl-step">03 · Approval</span>
              <h3>{s.flow === 4 ? 'Trusted product record' : 'Validating master record…'}</h3>
              <ol className="pbl-flow" aria-label="Approval workflow">
                {FLOW.map((t, i) => <li key={t} className={s.flow > i ? 'on' : s.flow === i && s.pulse ? 'run' : ''}>{s.flow > i ? <Check size={11} /> : <i />}{t}</li>)}
              </ol>
            </div>
            <ul className="pbl-trust">
              {TRUST.map((t, i) => <li key={t} className={s.trust > i ? 'on' : ''}><Check size={11} />{t}</li>)}
            </ul>
            <div className="pbl-pub">
              <span className={`pbl-stamp${s.flow === 4 ? ' on' : ''}`}>Approved for publishing</span>
              <span className={`pbl-btn b${s.btn}`} role="status">{s.btn === 3 ? <><Check size={13} /> Published</> : BTN[s.btn]}</span>
            </div>
          </div>

          <Connector on={publishing} label="One publish action" />

          {/* 04 Channels */}
          <div className={`pbl-chs${publishing ? ' go' : ''}`}>
            <span className="pbl-step pbl-step-c">04 · Connected channels</span>
            <ul className="pbl-grid">
              {CHANNELS.map((c, i) => {
                const st = s.ch[i]
                return (
                  <li key={c.label} className={`pbl-ch${st === 1 ? ' sync' : ''}${st === 2 ? ' done' : ''}`}>
                    <span className="pbl-logo">
                      {c.logo && <img src={c.logo} alt="" />}
                      {c.mark && <span style={{ color: c.color }}>{c.mark}</span>}
                      {c.icon && <Icon name={ICONS[c.icon]} size={18} />}
                    </span>
                    <strong>{c.label}</strong>
                    <small>{st === 2 ? <><Check size={10} /> {c.done}</> : st === 1 ? <><span className="spin" aria-hidden="true" /> Syncing</> : <><span className="dash" aria-hidden="true" /> Waiting</>}</small>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={`pbl-ok${s.complete ? ' on' : ''}`} role="status">
            <strong><span><Check size={11} /></span>Publishing complete</strong>
            <ul>{DONE_LIST.map((t) => <li key={t}><Check size={11} />{t}</li>)}</ul>
            <b>10 connected destinations updated</b>
          </div>
        </div>

        <ul className="pbl-benefits">
          {BENEFITS.map((t) => <li key={t}><Check size={12} />{t}</li>)}
        </ul>
      </div>
    </section>
  )
}
