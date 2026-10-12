import { Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon.jsx'
import ImagePlaceholder from '../../components/resources/ImagePlaceholder.jsx'
import useDocumentMeta from '../../components/resources/useDocumentMeta.js'
import { sections } from '../../data/resources.js'

const CARDS = [
  { key: 'events', icon: 'events', label: 'Events' },
  { key: 'case-studies', icon: 'chart', label: 'Case Studies' },
  { key: 'blog', icon: 'doc', label: 'Blog' },
]

export default function ResourcesOverviewPage() {
  useDocumentMeta('Resources', 'Events, case studies and blog posts from AltiusNxt on product data, attributes and eCommerce.')
  return (
    <>
      <section className="rs-hero" aria-labelledby="rs-over-title">
        <div className="wrap">
          <h1 id="rs-over-title">Resources</h1>
          <p className="rs-hero-sub">Events, customer stories and practical guidance on product data and eCommerce.</p>
        </div>
      </section>
      <section className="wrap rs-list-sec" aria-label="Resource types">
        <div className="rs-grid">
          {CARDS.map(({ key, icon, label }) => {
            const section = sections[key]
            return (
              <article className="rs-card" key={key}>
                <Link className="rs-card-link" to={section.base}>
                  <ImagePlaceholder ratio="16 / 10" label={`Featured image – ${label}`} />
                  <div className="rs-card-body">
                    <span className="rs-badge"><Icon name={icon} size={13} /> {section.items.length} {section.items.length === 1 ? 'item' : 'items'}</span>
                    <h3>{label}</h3>
                    <p className="rs-card-summary">{section.blurb}</p>
                    <span className="rs-more">Browse {label.toLowerCase()} <Icon name="arrow-right" size={15} /></span>
                  </div>
                </Link>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
