import { useSearchParams, Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon.jsx'
import ResourceCard from '../../components/resources/ResourceCard.jsx'
import useDocumentMeta from '../../components/resources/useDocumentMeta.js'
import { sections } from '../../data/resources.js'
import { orderedItems } from './ordering.js'

export default function ResourceListingPage({ sectionKey }) {
  const section = sections[sectionKey]
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  useDocumentMeta(section.label, `${section.blurb} AltiusNxt ${section.label.toLowerCase()}.`, [section.label.toLowerCase(), 'product data enrichment', 'catalog management', 'eCommerce product data'])

  const term = query.trim().toLowerCase()
  const visible = orderedItems(section).filter((i) => !term || i.title.toLowerCase().includes(term))

  const onSearch = (e) => {
    const value = e.target.value
    setParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <>
      <section className="rs-hero" aria-labelledby="rs-list-title">
        <div className="wrap">
          <nav className="rs-crumbs" aria-label="Breadcrumb">
            <Link to="/resources">Resources</Link>
            <Icon name="chevron-right" size={14} />
            <span aria-current="page">{section.label}</span>
          </nav>
          <h1 id="rs-list-title">{section.label}</h1>
          <p className="rs-hero-sub">{section.blurb}</p>
        </div>
      </section>

      <section className="wrap rs-list-sec" aria-label={`${section.label} list`}>
        <div className="rs-list-bar">
          <form className="rs-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <Icon name="search" size={16} />
            <label className="visually-hidden" htmlFor="rs-q">Search {section.label.toLowerCase()} by title</label>
            <input id="rs-q" type="search" placeholder={`Search ${section.label.toLowerCase()} by title…`} value={query} onChange={onSearch} />
          </form>
          <p className="rs-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'result' : 'results'}</p>
        </div>
        {visible.length ? (
          <div className="rs-grid">
            {visible.map((item) => <ResourceCard key={item.id} item={item} />)}
          </div>
        ) : (
          <p className="rs-empty">No {section.label.toLowerCase()} match “{query}”. Try a different title.</p>
        )}
      </section>
    </>
  )
}
