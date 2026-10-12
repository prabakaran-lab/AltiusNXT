import { AlignLeft, Package, Send, ShieldCheck, Check, CircleHelp, Download, FileSpreadsheet, FileText, Globe, Image as ImageIcon, Pencil, Search, ShoppingCart, Sparkles, Tag, X } from 'lucide-react'
import { TESYS } from '../sampleProduct.js'
import shopify from '../../assets/channels/shopify.webp'
import woocommerce from '../../assets/channels/woocommerce.webp'
import magento from '../../assets/channels/magento.webp'
import bigcommerce from '../../assets/channels/bigcommerce.webp'
import amazon from '../../assets/channels/amazon.webp'
import flipkart from '../../assets/channels/flipkart.webp'
import { ALL_ATTRS, ATTRS, PRODUCT, SOURCES } from './data.js'

const breaker = TESYS.images.front
const LOGOS = { Shopify: shopify, WooCommerce: woocommerce, Magento: magento, BigCommerce: bigcommerce, Amazon: amazon, Flipkart: flipkart }
const on = (b) => (b ? ' on' : '')
const SRC_ICON = { xls: FileSpreadsheet, pdf: FileText, img: ImageIcon }
const NOTE_QUOTES = ATTRS.map((a) => a.quote)

/* ---------- narrator: what the visitor should take away, ticking as the scene plays ---------- */
export function narrator(stage, s) {
  switch (stage) {
    case 0: return { stat: ['3 → 1', 'sources become one product record'], t: 'Connect supplier data', d: 'Excel, PDF and image files become one raw product record, and the gaps show up immediately.', items: [['Supplier Excel imported', s.imported[0]], ['Technical PDF imported', s.imported[1]], ['Product image imported', s.imported[2]], ['3 missing attributes detected', s.missing >= 3]] }
    case 1: return { stat: ['5 → 17', 'attributes after AI enrichment'], t: 'AI finds what is missing', d: 'CatalogWiz AI reads the datasheet, matches each value to its source and builds the full record.', items: [['Voltage rating found', s.rows[0] === 'found'], ['Breaking capacity found', s.rows[1] === 'found'], ['Poles normalised', s.rows[2] === 'found'], ['Mounting suggested', s.rows[3] === 'found'], ['12 more attributes extracted', s.extra === 12], ['Title, taxonomy and SEO written', s.done]] }
    case 2: return { stat: [`${s.done ?? 0} / 4`, 'values checked by a data specialist'], t: 'Experts verify every value', d: 'A product data specialist checks each AI suggestion against the manufacturer document.', items: [['AC voltage rating verified', s.voltage === 'done'], ['Interrupting rating verified', s.breaking === 'done'], ['Product taxonomy accepted', s.taxonomy === 'done'], ['Mounting type flagged, then corrected', s.mounting === 'done']] }
    case 3: return { stat: ['17 / 17', 'attributes verified and approved'], t: 'Approved before it goes live', d: 'The record passes a final quality gate. Nothing is published without human sign-off.', items: [['Quality checks passed', s.checks === 4], ['Human verified & approved', s.stamp]] }
    default: return { stat: ['1 → 6', 'example channels, one clean record'], t: 'Ready for every channel', d: 'The approved record becomes a complete product page, ready for your storefronts.', items: [['Content, taxonomy and SEO ready', s.checks === 4], ['Channel selected', s.selected], ['Product page complete', s.success]] }
  }
}

function Ring({ value, tone = 'orange', size = 56 }) {
  const r = 24, C = 2 * Math.PI * r
  return (
    <span className={`wt-ring ${tone}`} style={{ width: size, height: size }} role="img" aria-label={`Completeness ${value}%`}>
      <svg viewBox="0 0 60 60"><circle cx="30" cy="30" r={r} className="t" /><circle cx="30" cy="30" r={r} className="v" strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)} /></svg>
      <b>{value}<small>%</small></b>
    </span>
  )
}
const RAIL = [Package, Sparkles, Tag, ShieldCheck, Send]
function Brand({ label, active = 0, crumb = 'Products' }) {
  return (
    <>
      <nav className="wt-rail" aria-hidden="true">{RAIL.map((Ico, i) => <span key={i} className={i === active ? 'on' : ''}><Ico size={15} /></span>)}</nav>
      <header className="wt-ch">
        <span className="wt-dots"><i /><i /><i /></span>
        <span className="wt-logo"><b>Catalog<em>Wiz</em></b><i>AI</i></span>
        <span className="wt-crumb">{crumb}<u>{PRODUCT.sku}</u></span>
        <span className="wt-chl"><i />{label}</span>
      </header>
    </>
  )
}
function Act({ text, live }) {
  return (
    <div className={`wt-act2${live ? ' live' : ''}`} aria-live="polite">
      <span className="wt-spark"><Sparkles size={12} /></span>
      <b key={text}>{text}</b>
      <span className="wt-dots3"><i /><i /><i /></span>
    </div>
  )
}
function Thumb({ scanning, size = 72 }) {
  return <span className={`wt-th${scanning ? ' scanning' : ''}`} style={{ width: size, height: size }}><img src={breaker} alt="" /></span>
}

/* ================= 01 · CONNECT ================= */
const DOC_Y = [29.6, 50, 70.4]
const REC_Y = [36, 50, 64]
export function Connect({ s }) {
  const pct = 22 + Math.round(16 * Math.min(1, s.count / 3))
  return (
    <div className="wt-cv wt-c1">
      <div className="wt-docs">
        {SOURCES.map((x, i) => {
          const Ico = SRC_ICON[x.kind]
          return (
            <div className={`wt-doc${on(s.shown[i])}${s.imported[i] ? ' done' : s.importing[i] ? ' run' : ''}`} key={x.id}>
              <span className="wt-di" data-kind={x.kind}>{x.kind === 'img' ? <img src={breaker} alt="" /> : <Ico size={17} />}</span>
              <div><b>{x.title}</b><small>{x.file}</small></div>
              <span className="wt-dst">{s.imported[i] ? <Check size={12} strokeWidth={3.4} /> : s.importing[i] ? <i /> : null}</span>
            </div>
          )
        })}
      </div>
      <svg className="wt-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {DOC_Y.map((y, i) => {
          const d = `M0 ${y} C 55 ${y}, 45 ${REC_Y[i]}, 100 ${REC_Y[i]}`
          return <g key={i}><path className="base" d={d} pathLength="1" /><path className={`lit${on(s.link[i])}${s.imported[i] ? ' flow' : ''}`} d={d} pathLength="1" /></g>
        })}
      </svg>
      <section className={`wt-rec2${on(s.title)}${s.count < 3 ? ' working' : ''}`} aria-label="Raw product record">
        <Brand active={0} crumb="Import" label={s.count === 3 ? 'Import complete' : 'Importing…'} />
        <div className="wt-rb">
          <Act live={s.count < 3 || s.missing < 3} text={s.count < 3 ? `Importing ${SOURCES[s.count].file}…` : s.missing < 3 ? `Scanning record · ${s.missing} missing attribute${s.missing === 1 ? '' : 's'} found` : 'Raw record ready for enrichment'} />
          <div className="wt-rtop">
            <span className={`wt-thw${on(s.thumb)}`}><Thumb size={68} /></span>
            <div className="wt-rt"><b>{PRODUCT.raw}</b><small>SKU {PRODUCT.sku}</small><span className="wt-pill">{PRODUCT.rawCategory}</span></div>
            <Ring value={pct} tone="red" />
          </div>
          <div className="wt-fields">
            <span className={`wt-f ok${on(s.attrs >= 1)}`}><em>Current rating</em><b>73 A</b></span>
            <span className={`wt-f ok${on(s.attrs >= 2)}`}><em>Number of poles</em><b>3P / 3 pole</b></span>
            {ATTRS.filter((a) => !a.supplier).map((a, i) => (
              <span className={`wt-f gap${on(s.missing >= i + 1)}`} key={a.id}><em>{a.label}</em><b /></span>
            ))}
          </div>
          <div className="wt-bar2"><i style={{ transform: `scaleX(${s.count / 3})` }} /></div>
        </div>
      </section>
    </div>
  )
}

/* ================= 02 · ENRICH ================= */
const QROW = 38
const QTOP = 40
function AttrTable({ shown, verified }) {
  const cells = [...ALL_ATTRS, ['', '']]
  return (
    <div className={`wt-at${verified ? ' ver' : ''}`}>
      {cells.map(([l, v], i) => {
        const isOn = l && shown(i)
        return <span key={l || 'pad'} className={`wt-ac${isOn ? ' on' : ''}${l ? '' : ' pad'}`}><em>{l}</em><b>{isOn ? v : '···'}</b>{isOn && verified && <Check size={10} strokeWidth={3.6} />}</span>
      })}
    </div>
  )
}
export function Enrich({ s }) {
  const done = (i) => s.rows[i] === 'found'
  const shown = (i) => (i === 0 ? true : i <= 4 ? done(i - 1) : s.extra > i - 5)
  return (
    <div className="wt-cv wt-c2">
      <section className="wt-sheet" aria-label="Technical datasheet">
        <header><FileText size={13} /><b>{SOURCES[1].file}</b><small>page 2</small></header>
        <ul>
          {NOTE_QUOTES.flatMap((q, i) => [
            <li key={`f${i}`} className="faux"><i /><i /></li>,
            <li key={`q${i}`} className={`q ${s.rows[i]}`}><span>{q}</span></li>,
          ])}
        </ul>
      </section>
      <div className={`wt-mid${on(s.active)}`} aria-hidden="true">
        <div className="wt-hub"><span /><span /><span /><Sparkles size={20} /></div>
        <small>CatalogWiz AI</small>
        {ATTRS.map((a, i) => s.rows[i] === 'scan' && <span key={a.id} className="wt-tok" style={{ top: QTOP + QROW * (2 * i + 1) + QROW / 2 }}>{a.ai}</span>)}
      </div>
      <section className={`wt-rec2 enr${s.done ? ' done' : ''}${s.active ? ' working' : ''}`} aria-label="Enriched record">
        <Brand active={1} crumb="Enrichment" label={s.done ? 'Awaiting human review' : `Extracting attributes · ${1 + s.found + s.extra} of ${ALL_ATTRS.length}`} />
        <div className="wt-rb">
          <Act live={!s.done} text={s.done ? 'Enrichment complete · awaiting human review' : s.found < 4 ? `Reading datasheet · matching “${ATTRS[Math.max(0, s.rows.findIndex((r) => r === 'scan'))].label}”…` : s.extra < 12 ? `Extracting attribute ${5 + s.extra} of 17 from datasheet…` : !s.title ? 'Normalising units and values…' : !s.desc ? 'Writing optimised title and taxonomy…' : 'Generating description, SEO title and keywords…'} />
          <div className="wt-rtop">
            <Thumb scanning={s.active} size={60} />
            <div className="wt-rt"><b className={s.title ? '' : 'raw'}>{s.title ? PRODUCT.title : PRODUCT.raw}</b><small>SKU {PRODUCT.sku}{s.title ? ` · ${PRODUCT.maker}` : ''}</small></div>
            <Ring value={s.pct} tone={s.done ? 'green' : 'orange'} size={52} />
          </div>
          <AttrTable shown={shown} />
          <div className="wt-tx">{PRODUCT.taxonomy.map((t, i) => <span key={t} className={on(s.taxonomy > i)}>{t}</span>)}</div>
          <div className="wt-tiles">
            <span className={`wt-tile${on(s.desc)}`}><AlignLeft size={13} />Description</span>
            <span className={`wt-tile${on(s.seo)}`}><Globe size={13} />SEO title</span>
            <span className={`wt-tile${on(s.done)}`}><Tag size={13} />Keywords</span>
          </div>
          <div className={`wt-imgs${on(s.images > 0)}`} aria-label="Enriched product images">
            <em><ImageIcon size={12} />Images · 1 → {1 + s.images}</em>
            <span className="wt-imgs-row">
              <span className="ok"><img src={breaker} alt="" /></span>
              {TESYS.enrichedImages.map((src, i) => <span key={i} className={s.images > i ? 'on' : ''}><img src={src} alt="" /></span>)}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ================= 03 · REVIEW ================= */
const REVIEW = [
  { id: 'voltage', label: 'AC voltage rating', val: '690 V ac', q: 'Rated operational voltage Ue 690 V ac', ev: 'Technical PDF · page 2' },
  { id: 'breaking', label: 'Interrupting rating', val: '65 kA', q: 'Breaking capacity Icu 65 kA at 230/240 V ac', ev: 'Technical PDF · page 3' },
  { id: 'taxonomy', label: 'Product taxonomy', val: 'Motor Protection Breakers', q: 'Fuses & Circuit Breakers › Circuit Breakers › Motor Protection Circuit Breakers', ev: 'Category tree' },
  { id: 'mounting', label: 'Mounting type', val: 'Screw fixing', q: 'Mounting: DIN rail or screw fixing, depending on variant', ev: 'Technical PDF · page 4' },
]
export function Review({ s }) {
  const st = [s.voltage, s.breaking, s.taxonomy, s.mounting]
  const cur = REVIEW[s.active >= 0 ? s.active : Math.max(0, st.filter((x) => x === 'done').length - 1)]
  const warn = s.active === 3 && s.mounting === 'flag'
  return (
    <div className="wt-cv wt-c3">
      <section className={`wt-ev${warn ? ' warn' : ''}`} aria-label="Source evidence">
        <header><FileText size={13} /><b>Source evidence</b><small>{cur.ev}</small></header>
        <div className="wt-evb" key={cur.id}>
          <p>“{cur.q}”</p>
          {warn && <em><CircleHelp size={13} />Two mounting options in the datasheet. The reviewer must confirm the TELGV3P73 variant.</em>}
          {s.active === 3 && s.mounting === 'edit' && <em className="ok"><Check size={13} strokeWidth={3} />Reviewer confirms DIN rail mount for TELGV3P73.</em>}
        </div>
        <div className="wt-faux"><i /><i /><i /><i /></div>
      </section>
      <section className={`wt-rec2 rev${s.active >= 0 ? ' working' : ''}`} aria-label="Review checklist">
        <Brand active={3} crumb="Review" label="Human review" />
        <div className="wt-rb">
          <Act live={!s.complete} text={s.active >= 0 ? `Specialist validating “${REVIEW[s.active].label}” against ${REVIEW[s.active].ev}…` : s.complete ? 'All values verified · ready for approval' : 'Preparing evidence for review…'} />
          <div className="wt-rtop slim">
            <Thumb size={52} />
            <div className="wt-rt"><b>{PRODUCT.title}</b><small>{s.done} of 4 values reviewed</small></div>
            <Ring value={s.pct} tone={s.complete ? 'green' : 'orange'} />
          </div>
          <ul className="wt-rv">
            {REVIEW.map((r, i) => (
              <li key={r.id} className={`${st[i]}${s.active === i ? ' active' : ''}`}>
                <span className="wt-rd">{st[i] === 'done' ? <Check size={12} strokeWidth={3.4} /> : st[i] === 'flag' ? <CircleHelp size={13} /> : st[i] === 'edit' ? <Pencil size={11} /> : null}</span>
                <div className="wt-rl"><b>{r.label}</b><span>{st[i] === 'edit' || (i === 3 && st[i] === 'done') ? 'DIN Rail' : r.val}</span></div>
                {s.active === i && !warn ? (
                  <div className="wt-act"><span className={`ok${s.pressApprove ? ' press' : ''}`}><Check size={11} strokeWidth={3} />Approve</span><span className={s.pressEdit ? 'press' : ''}><Pencil size={10} />Edit</span><span><X size={11} />Reject</span></div>
                ) : <span className={`wt-rs ${st[i]}`}>{st[i] === 'done' ? (i === 2 ? 'Accepted' : 'Verified') : st[i] === 'flag' ? 'Needs review' : st[i] === 'edit' ? 'Editing' : st[i] === 'checking' ? 'Checking…' : 'Pending'}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

/* ================= 04 · APPROVE ================= */
const QUALITY = [['Technical validation', Check], ['Content', AlignLeft], ['Taxonomy', Tag], ['SEO metadata', Globe]]
export function Approve({ s }) {
  return (
    <div className="wt-cv wt-c4">
      <section className={`wt-rec2 fin${s.stamp ? ' approved' : ''}${!s.stamp ? ' working' : ''}`} aria-label="Approved product record">
        <Brand active={3} crumb="Approval" label={s.stamp ? 'Approved' : 'In approval'} />
        <div className="wt-rb">
          <Act live={!s.stamp} text={s.stamp ? 'Approved · signed off by human reviewer' : s.checks < 4 ? `Quality gate · checking ${QUALITY[s.checks][0].toLowerCase()}…` : 'Awaiting final sign-off…'} />
          <div className="wt-rtop">
            <Thumb size={64} />
            <div className="wt-rt"><b>{PRODUCT.title}</b><small>SKU {PRODUCT.sku} · {PRODUCT.maker}</small></div>
          </div>
          <AttrTable shown={(i) => s.specs > i} verified />
          <div className="wt-tx ok">{PRODUCT.taxonomy.map((t) => <span key={t} className={on(s.taxonomy)}>{t}</span>)}</div>
        </div>
        <span className={`wt-seal${on(s.stamp)}`}><Check size={20} strokeWidth={3} /><b>Human Verified<br />&amp; Approved</b></span>
      </section>
      <div className="wt-gate">
        <Ring value={s.checks === 4 ? 100 : 25 * s.checks + 20} tone="green" size={116} />
        <small>Quality score</small>
        <ul>{QUALITY.map(([l, Ico], i) => <li key={l} className={s.checks > i ? 'on' : ''}><span><Ico size={14} /></span><b>{l}</b><i><Check size={12} strokeWidth={3.4} /></i></li>)}</ul>
      </div>
    </div>
  )
}

/* ================= 05 · PUBLISH ================= */
export function Publish({ s }) {
  return (
    <div className="wt-cv wt-c5">
      <div className="wt-left5">
        <div className={`wt-mini${s.flow ? ' go' : ''}`}><Thumb size={44} /><div><b>{PRODUCT.sku}</b><small>Approved record · {ALL_ATTRS.length} attributes</small></div></div>
        <h5>Example destinations</h5>
        <div className={`wt-chan${on(s.channels)}`}>
          {Object.entries(LOGOS).map(([n, src]) => <span key={n} className={`wt-ct${s.selected && n === 'Shopify' ? ' sel' : ''}`}><img src={src} alt={n} /></span>)}
        </div>
        <div className={`wt-up${s.success ? ' done' : ''}${on(s.flow)}`}>
          <div><span>{s.success ? 'Product page ready' : 'Sending product page…'}</span><b>{s.success ? <Check size={13} strokeWidth={3.4} /> : `${s.pct}%`}</b></div>
          <i><u style={{ transform: `scaleX(${s.pct / 100})` }} /></i>
        </div>
        <div className={`wt-scores${on(s.success)}`}>
          <span><b>100</b>Data quality</span><span><b>98</b>SEO</span><span><b>96</b>AI-ready</span>
        </div>
        <p>Illustrative only. No live channel is connected.</p>
      </div>
      {s.fly >= 0 && <span key={s.fly} className="wt-chip-fly" aria-hidden="true">{['Images', 'Title', 'Specs', 'Description', 'Datasheet'][s.fly]}</span>}
      <svg className="wt-wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path className="base" d="M0 50 L100 50" pathLength="1" /><path className={`lit${on(s.flow)}${s.store ? ' flow' : ''}`} d="M0 50 L100 50" pathLength="1" /></svg>
      <section className={`wt-store${on(s.store)}`} aria-label="Ecommerce product page preview">
        <div className="wt-bar"><i /><i /><i /><span>{PRODUCT.url}</span><em className={on(s.success)}><Check size={11} strokeWidth={3.4} />Ready to publish</em></div>
        <div className="wt-snav"><b><i />Sample Industrial Supply</b><span>Products</span><span>Brands</span><span>Documents</span><Search size={12} /><ShoppingCart size={13} /></div>
        <div className="wt-sbody">
          <ol className={`wt-bc${on(s.title)}`}><li>Home</li>{PRODUCT.taxonomy.map((t) => <li key={t}>{t}</li>)}</ol>
          <div className="wt-scols">
            <div className={`wt-galw${on(s.image)}`}>
              <div className="wt-gal"><img src={breaker} alt="" /></div>
              <div className="wt-thumbs"><span className="sel"><img src={breaker} alt="" /></span>{[TESYS.images.side, TESYS.images.drawing, TESYS.images.benefits].map((src, i) => <span key={i}><img src={src} alt="" /></span>)}</div>
            </div>
            <div className="wt-sinfo">
              <h3 className={on(s.title)}>{PRODUCT.title}</h3>
              <small className={on(s.title)}>SKU {PRODUCT.sku} · {PRODUCT.maker} <u>In stock</u></small>
              <p className={on(s.desc)}>{PRODUCT.description}</p>
              <div className={`wt-cta${on(s.docs)}`}><span className="p">Request a quote</span><span><Download size={12} />Datasheet (PDF)</span></div>
            </div>
          </div>
          <div className={`wt-tabs${on(s.specs > 0)}`}><b>Specifications</b><span>Description</span><span>Documents</span></div>
          <div className="wt-spec">
            {ALL_ATTRS.map(([l, v], i) => <span key={l} className={on(s.specs > i)}><em>{l}</em><b>{v}</b></span>)}
          </div>
        </div>
      </section>
    </div>
  )
}
