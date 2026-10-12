import { Link, useParams } from 'react-router-dom'
import ResourceDetail from '../../components/resources/ResourceDetail.jsx'
import useDocumentMeta from '../../components/resources/useDocumentMeta.js'
import { sections } from '../../data/resources.js'
import { orderedItems } from './ordering.js'

function NotFound({ section }) {
  useDocumentMeta('Not found', 'The page you are looking for could not be found.')
  return (
    <section className="rs-hero" aria-labelledby="rs-nf">
      <div className="wrap rs-notfound">
        <h1 id="rs-nf">We couldn’t find that {section.singular.toLowerCase()}</h1>
        <p className="rs-hero-sub">It may have been moved or the link might be mistyped.</p>
        <div className="rs-nf-actions">
          <Link className="btn btn-primary" to={`/resources?tab=${section.tab}`}>Browse all {section.label.toLowerCase()}</Link>
          <Link className="btn btn-outline-light" to="/resources">Back to resources</Link>
        </div>
      </div>
    </section>
  )
}

export default function ResourceDetailPage({ sectionKey }) {
  const { slug } = useParams()
  const section = sections[sectionKey]
  const items = orderedItems(section)
  const item = items.find((i) => i.slug === slug)
  if (!item) return <NotFound section={section} />
  return <ResourceDetail key={item.id} item={item} items={items} section={section} />
}
