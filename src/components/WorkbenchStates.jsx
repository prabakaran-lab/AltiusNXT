import { useRef, useState } from 'react'

import productImg from '../assets/home/weg-rw27.webp'
import Icon from './ui/Icon.jsx'

/* Mobile-only companion to the Workbench screenshot: one readable state at a time.
   Sample record (illustrative). Hidden on desktop by CSS. */
const STATES = [
  {
    id: 'taxonomy', label: 'Taxonomy', note: 'The product sits in one clear category path.',
    body: (
      <ol className="wbs-st-path">
        {['Electrical', 'Industrial Controls & Automation', 'Relays, Contactors & Accessories', 'Overload Relays'].map((t, i) => <li key={t} style={{ '--l': i }}>{t}</li>)}
      </ol>
    ),
  },
  {
    id: 'classification', label: 'Classification', note: 'Identity and class are fixed before attributes are built.',
    body: (
      <dl className="wbs-st-rows">
        <div><dt>Product type</dt><dd>Overload Relay</dd></div>
        <div><dt>Series</dt><dd>RW27</dd></div>
        <div><dt>SKU</dt><dd>RW27-2D3-U017</dd></div>
        <div><dt>Status</dt><dd className="ok">Mapped</dd></div>
      </dl>
    ),
  },
  {
    id: 'enrichment', label: 'Enrichment', note: 'Technical attributes are structured and standardized.',
    body: (
      <dl className="wbs-st-rows">
        <div><dt>Current rating</dt><dd>11–17 A</dd></div>
        <div><dt>Voltage rating</dt><dd>690 V</dd></div>
        <div><dt>Pole configuration</dt><dd>3P</dd></div>
        <div><dt>Reset method</dt><dd>Automatic / Manual</dd></div>
      </dl>
    ),
  },
  {
    id: 'assets', label: 'Assets', note: 'Images and documents travel with the record.',
    body: (
      <ul className="wbs-st-checks">
        {['Product image', 'Technical datasheet', 'Manual'].map((a) => <li key={a}><i aria-hidden="true"><Icon name="check" size={12} strokeWidth={3} /></i>{a}</li>)}
      </ul>
    ),
  },
  {
    id: 'approval', label: 'Approval', note: 'A record moves forward when the right people approve it.',
    body: (
      <ol className="wbs-st-steps">
        <li><span>01</span>Data Analyst<small>Prepare and check</small></li>
        <li><span>02</span>Account Manager<small>Review requirements</small></li>
        <li><span>03</span>Category Manager<small>Approve and publish state</small></li>
      </ol>
    ),
  },
]

export default function WorkbenchStates() {
  const [active, setActive] = useState(0)
  const refs = useRef([])

  const onKeyDown = (e) => {
    const last = STATES.length - 1
    let next = null
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    setActive(next)
    refs.current[next]?.focus()
  }

  const cur = STATES[active]
  return (
    <div className="wbs-states" aria-label="CatalogWiz Workbench states (sample record)">
      <div className="wbs-st-tabs" role="tablist" aria-label="Workbench states" onKeyDown={onKeyDown}>
        {STATES.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => { refs.current[i] = el }}
            id={`wbs-st-tab-${s.id}`}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls="wbs-st-panel"
            tabIndex={active === i ? 0 : -1}
            className={active === i ? 'on' : ''}
            onClick={() => setActive(i)}
          >{s.label}</button>
        ))}
      </div>
      <div id="wbs-st-panel" role="tabpanel" aria-labelledby={`wbs-st-tab-${cur.id}`} className="wbs-st-panel">
        <header>
          <img src={productImg} alt="" width="1254" height="1254" loading="lazy" />
          <div><strong>WEG RW27 Series Overload Relay</strong><span>{cur.note}</span></div>
        </header>
        <div key={cur.id} className="wbs-st-body">{cur.body}</div>
      </div>
    </div>
  )
}
