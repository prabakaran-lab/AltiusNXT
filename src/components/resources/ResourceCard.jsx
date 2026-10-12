import { Link } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import { itemPath } from '../../data/resources.js'

const TYPE_LABEL = { event: 'Event', 'case-study': 'Case study', blog: 'Blog' }

export default function ResourceCard({ item }) {
  return (
    <article className="rs-card">
      <Link className="rs-card-link" to={itemPath(item)}>
        <ImagePlaceholder
          ratio="16 / 10"
          image={item.image}
          alt={item.title}
          label={item.type === 'event' ? `Featured image – ${item.title.split(' – ')[0]}` : `Featured image – ${TYPE_LABEL[item.type]}`}
        />
        <div className="rs-card-body">
          <span className="rs-badge">{TYPE_LABEL[item.type]}</span>
          {item.date && (
            <p className="rs-card-meta">
              <Icon name="events" size={14} /><time dateTime={item.startDate}>{item.date}</time>
              <Icon name="pin" size={14} /><span>{item.venue} · {item.stand}</span>
            </p>
          )}
          <h3>{item.title}</h3>
          <p className="rs-card-summary">{item.summary}</p>
          <span className="rs-more">Read more <Icon name="arrow-right" size={15} /></span>
        </div>
      </Link>
    </article>
  )
}
