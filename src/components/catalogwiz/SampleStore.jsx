import { useState } from 'react'
import { ChevronRight, FileText, ImageOff, Search, ShieldCheck, ShoppingCart, Truck, User } from 'lucide-react'
import './SampleStore.css'

/* A catalog sample shown the way a live enrichment is shown: as a distributor's real-looking product page.
   BEFORE is the page as the raw supplier file makes it (supplier title, one flat category, no description, the few fields
   the supplier sent). AFTER is the same page with the enrichment placed into it, each change marked with the same badges
   as a live result (Enriched taxonomy / title / description, Added enrichment, Tidied value).
   Everything comes from the sample's data (sampleResult.js); nothing is written here per product. */

const STORE = 'Sample Industrial Supply'
const NAV = ['Electrical', 'Bearings & PT', 'Tools', 'Safety', 'Janitorial', 'Welding', 'Office']

function Badge({ children, tone }) {
  return <span className={`ss-badge${tone ? ` ${tone}` : ''}`}>{children}</span>
}

function Photo({ src }) {
  const [bad, setBad] = useState(false)
  if (!src || bad) return <span className="ss-noimg"><ImageOff size={30} /></span>
  return <img src={src} alt="" onError={() => setBad(true)} draggable={false} />
}

const kindOf = (a) => (!a.before ? 'add' : String(a.before).trim() !== String(a.value).trim() ? 'fix' : 'same')

export default function SampleStore({ r, variant }) {
  const after = variant === 'after'
  const crumbs = after ? ['Home', ...(r.after.taxonomy || [])] : (r.before.crumbs || ['Home'])
  const title = after ? r.after.title : r.before.title
  const rows = after
    ? r.after.attributes.map((a) => ({ label: a.label, value: a.value, kind: kindOf(a) }))
    : r.before.attributes.map(([label, value]) => ({ label, value, kind: 'same' }))
  const added = rows.filter((x) => x.kind === 'add').length
  const sku = (r.before.attributes.find(([l]) => /^sku$/i.test(l)) || [])[1]
  const brand = after ? r.after.attributes.find((a) => /^mfr\. name$/i.test(a.label))?.value : ''

  return (
    <div className={`ss${after ? ' is-after' : ''}`}>
      {/* the store's own header */}
      <header className="ss-top">
        <b className="ss-logo"><i />{STORE}</b>
        <span className="ss-search"><Search size={14} />Search by part number or keyword</span>
        <span className="ss-acts"><span><User size={15} />Account</span><span><ShoppingCart size={15} />Quote list</span></span>
      </header>
      <nav className="ss-nav">{NAV.map((n) => <span key={n}>{n}</span>)}</nav>

      <div className="ss-body">
        <p className="ss-bc">
          {crumbs.map((c, i) => (
            <span key={`${c}-${i}`} className={after && i > 0 ? 'new' : ''}>{i > 0 && <ChevronRight size={12} />}{c}</span>
          ))}
          {after && <Badge>Enriched taxonomy</Badge>}
        </p>

        <div className="ss-prod">
          <div className="ss-gal">
            <div className="ss-img"><Photo src={r.image} /></div>
            <div className="ss-thumbs"><i className="on"><Photo src={r.image} /></i><i /><i /></div>
          </div>
          <div className="ss-info">
            {brand && <p className="ss-brand">{brand}</p>}
            <h1 className={after ? 'mark' : ''}>{title}{after && <Badge>Enriched title</Badge>}</h1>
            <p className="ss-ids">{sku && <span>SKU: <b>{sku}</b></span>}<span>Stock: <b className="ok">In stock</b></span></p>
            <div className="ss-buy">
              <span className="ss-qty"><i>−</i><b>1</b><i>+</i></span>
              <span className="ss-btn">Add to quote</span>
            </div>
            <ul className="ss-perks">
              <li><Truck size={14} />Ships in 1–2 business days</li>
              <li><ShieldCheck size={14} />Genuine manufacturer stock</li>
              <li><FileText size={14} />{after ? 'Datasheet available' : 'Datasheet on request'}</li>
            </ul>
          </div>
        </div>

        <section className="ss-sec" data-cw-focus={after ? '' : undefined}>
          <h2>Description{after && <Badge>Enriched description</Badge>}</h2>
          {after && r.after.description
            ? <p className="ss-desc">{r.after.description}</p>
            : <p className="ss-empty">No product description provided by the supplier.</p>}
        </section>

        <section className="ss-sec">
          <h2>Specifications{after && <><Badge tone="green">{rows.length} attributes</Badge>{added > 0 && <Badge>{added} added enrichment</Badge>}</>}</h2>
          <table className="ss-spec">
            <tbody>
              {rows.map((x, i) => (
                <tr key={`${x.label}-${i}`} className={x.kind}>
                  <th scope="row">{x.label}</th>
                  <td>{x.value}{x.kind === 'add' && <Badge>Added enrichment</Badge>}{x.kind === 'fix' && <Badge tone="yellow">Tidied value</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ss-rel">
          <h2>Related products</h2>
          <div className="ss-rel-row">{[0, 1, 2, 3].map((i) => <span key={i}><i /><b /><b className="s" /></span>)}</div>
        </section>
      </div>
      <footer className="ss-foot">© {STORE} · Sample store for illustration</footer>
    </div>
  )
}
