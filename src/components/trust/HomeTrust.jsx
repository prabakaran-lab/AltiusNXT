import { COMPANIES } from '../../pages/AboutPortfolio.jsx'
import Icon from '../ui/Icon.jsx'
import './HomeTrust.css'

const STATS = [['20+', 'years of team expertise'], ['500+', 'global clients'], ['15M+', 'products enriched']]
const ROW_A = COMPANIES.slice(0, 11)
const ROW_B = COMPANIES.slice(11)

const Row = ({ items, reverse, label }) => (
  <div className={`ht-row${reverse ? ' rev' : ''}`} role="group" aria-label={label}>
    <ul className="ht-track">
      {[...items, ...items].map((c, i) => (
        <li key={`${c.src}-${i}`} className="ht-logo" aria-hidden={i >= items.length || undefined}>
          <img src={c.src} alt={i >= items.length ? '' : c.name} title={c.name} loading="lazy" />
        </li>
      ))}
    </ul>
  </div>
)

export default function HomeTrust() {
  return (
    <section className="ht" aria-labelledby="ht-title">
      <div className="ht-wrap">
        <div className="ht-head">
          <div>
            <p className="ht-eyebrow">Trusted by industrial leaders</p>
            <h2 id="ht-title">Trusted across complex <em>B2B product categories.</em></h2>
          </div>
          <ul className="ht-stats">
            {STATS.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}
          </ul>
        </div>
      </div>
      <div className="ht-logos">
        <Row items={ROW_A} label="Client logos, row 1" />
        <Row items={ROW_B} reverse label="Client logos, row 2" />
      </div>
      <div className="ht-wrap ht-foot">
        <p>Industrial · Electrical · Tools &amp; hardware · Building supplies · Automotive · Healthcare</p>
        <a href="/about-us#testimonials">See customer success stories <Icon name="arrow-right" /></a>
      </div>
    </section>
  )
}
