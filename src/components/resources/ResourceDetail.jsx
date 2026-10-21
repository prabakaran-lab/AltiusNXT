import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon.jsx'
import ImagePlaceholder from './ImagePlaceholder.jsx'
import SectionBlocks from './SectionBlocks.jsx'
import CtaBlock from './CtaBlock.jsx'
import useDocumentMeta from './useDocumentMeta.js'
import useBreadcrumbSeo from './useBreadcrumbSeo.js'
import { setHead, addStructuredData } from '../../ssrHead.js'
import { calendarUrl, readingMinutes, tocFor } from './toc.js'
import { sanitizeArticle } from './sanitize.js'
import { LinkedInMark, XMark } from './BrandMarks.jsx'
import { blogs, caseStudies, itemPath } from '../../data/resources.js'

const TYPE_LABEL = { event: 'Event', 'case-study': 'Case study', blog: 'Blog' }

function ReadingProgress() {
  const bar = useRef(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return <div className="rs-progress" aria-hidden="true"><span ref={bar} /></div>
}

function ShareButtons({ title }) {
  const [toast, setToast] = useState('')
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const url = typeof window === 'undefined' ? '' : window.location.href
  const enc = encodeURIComponent
  const say = (message) => {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2400)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      say('Link copied to clipboard')
    } catch {
      say('Copy failed — press Ctrl+C on the address bar')
    }
  }

  return (
    <div className="rs-share">
      <span className="rs-share-label"><Icon name="share" size={16} /> Share</span>
      <a className="rs-share-btn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><LinkedInMark /> LinkedIn</a>
      <a className="rs-share-btn" href={`https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"><XMark /> Twitter</a>
      <a className="rs-share-btn" href={`mailto:?subject=${enc(title)}&body=${enc(`${title}\n${url}`)}`} aria-label="Share by email"><Icon name="mail" size={17} /> Email</a>
      <button className="rs-share-btn" type="button" onClick={copy} aria-label="Copy link"><Icon name="copy" size={17} /> Copy Link</button>
      <div className="rs-toast" role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
    </div>
  )
}

function Toc({ entries }) {
  const [active, setActive] = useState(entries[0]?.id)
  useEffect(() => {
    const els = entries.map((e) => document.getElementById(e.id)).filter(Boolean)
    if (!els.length || !('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver((hits) => {
      const visible = hits.filter((h) => h.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActive(visible.target.id)
    }, { rootMargin: '-90px 0px -65% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [entries])
  return (
    <nav className="rs-toc" aria-label="On this page">
      <h2>On this page</h2>
      <ol>
        {entries.map((e) => (
          <li key={e.id}><a href={`#${e.id}`} aria-current={active === e.id ? 'true' : undefined}>{e.text}</a></li>
        ))}
      </ol>
    </nav>
  )
}

function Rail({ current, toc }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const term = q.trim()
    navigate(`/resources${term ? `?q=${encodeURIComponent(term)}` : ''}`)
  }
  return (
    <aside className="rs-rail" aria-label="Related resources">
      {toc.length >= 3 && <Toc entries={toc} />}
      <form className="rs-rail-search" role="search" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="rs-side-q">Search resources</label>
        <input id="rs-side-q" type="search" placeholder="Search resources" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" aria-label="Search"><Icon name="search" size={16} /></button>
      </form>
      <section className="rs-rail-block">
        <h2>Case Studies</h2>
        <ul>
          {caseStudies.map((c) => (
            <li key={c.id}><Link to={itemPath(c)} aria-current={c.id === current.id ? 'page' : undefined}>{c.title}</Link></li>
          ))}
        </ul>
      </section>
      <section className="rs-rail-block">
        <h2>Recent Blogs</h2>
        <ul className="has-thumbs">
          {blogs.slice(0, 6).map((b) => (
            <li key={b.id}>
              <Link to={itemPath(b)} aria-current={b.id === current.id ? 'page' : undefined}>
                <ImagePlaceholder ratio="16 / 9" image={b.image} alt="" label="Thumbnail" className="rs-thumb" />
                <span>{b.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

function KeepReading({ items, index, base }) {
  const prev = items[index - 1]
  const next = items[index + 1]
  if (!prev && !next) return null
  const half = (item, dir) => (
    <Link className={`rs-kr is-${dir}`} to={`${base}/${item.slug}`} rel={dir}>
      {item.image && <img src={item.image} alt="" loading="lazy" />}
      <span className="rs-kr-copy">
        <small>{dir === 'prev' ? <><Icon name="arrow-left" size={16} /> Previous</> : <>Next <Icon name="arrow-right" size={16} /></>}</small>
        <strong>{item.title}</strong>
      </span>
    </Link>
  )
  return (
    <nav className="rs-keep" aria-label="More in this section">
      {prev && half(prev, 'prev')}
      {next && half(next, 'next')}
    </nav>
  )
}

/* The ruled strip of key facts under the hero — a data-sheet header for each page. */
function Strip({ item, minutes }) {
  let cells
  if (item.type === 'event') {
    cells = [
      { label: 'Date', value: item.date },
      { label: 'Venue', value: item.venue },
      { label: 'Find us at', value: item.stand },
    ]
  } else if (item.type === 'case-study') {
    cells = item.sections.find((b) => b.type === 'table')?.rows.map(([label, value]) => ({ label, value })) ?? []
  } else {
    cells = [
      { label: 'Written by', value: 'AltiusNxt Team' },
      { label: item.published ? 'Published' : 'Reading time', value: item.published ? item.publishedLabel : `${minutes} min` },
      { label: item.published ? 'Reading time' : 'In this article', value: item.published ? `${minutes} min` : `${tocFor(item.sections).length || item.sections.filter((b) => b.type === 'heading').length} sections` },
    ]
  }
  return (
    <dl className="rs-strip">
      {cells.map((c) => (
        <div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>
      ))}
      {item.type === 'event' && (
        <div className="is-action">
          <a href={calendarUrl(item)} target="_blank" rel="noopener noreferrer"><Icon name="calendar" size={16} /> Add to calendar</a>
        </div>
      )}
    </dl>
  )
}

/* Canonical link, Open Graph tags and Article JSON-LD for imported posts (these have a real publish date). */
function useArticleSeo(item) {
  // Render-time, for the build-time prerender (see ssrHead.js) — the useEffect below never runs
  // server-side. Mirrors exactly what that effect sets, so the static HTML and the hydrated page agree.
  if (item.published) {
    const url = `https://www.altiusnxt.com/resources/blog/${item.slug}`
    setHead({ canonical: url, ogType: 'article', ogImage: item.image })
    addStructuredData({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: item.title, image: item.image, datePublished: item.published, dateModified: item.updated, description: item.seoDescription || item.summary, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'AltiusNxt' }, publisher: { '@type': 'Organization', name: 'AltiusNxt' } })
  }

  useEffect(() => {
    if (!item.published) return undefined
    const url = `https://www.altiusnxt.com/resources/blog/${item.slug}`
    const made = []
    const add = (tag, attrs) => {
      const el = document.createElement(tag)
      Object.entries(attrs).forEach(([k, v]) => { el[k] = v })
      document.head.appendChild(el)
      made.push(el)
    }
    add('link', { rel: 'canonical', href: url })
    ;[['og:type', 'article'], ['og:title', item.seoTitle || item.title], ['og:description', item.seoDescription || item.summary], ['og:url', url], ['og:image', item.image]].forEach(([property, content]) => {
      const el = document.createElement('meta')
      el.setAttribute('property', property)
      el.setAttribute('content', content)
      document.head.appendChild(el)
      made.push(el)
    })
    const twitterCard = document.createElement('meta')
    twitterCard.setAttribute('name', 'twitter:card')
    twitterCard.setAttribute('content', 'summary_large_image')
    document.head.appendChild(twitterCard)
    made.push(twitterCard)
    add('script', { type: 'application/ld+json', text: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: item.title, image: item.image, datePublished: item.published, dateModified: item.updated, description: item.seoDescription || item.summary, mainEntityOfPage: url, author: { '@type': 'Organization', name: 'AltiusNxt' }, publisher: { '@type': 'Organization', name: 'AltiusNxt' } }) })
    return () => made.forEach((el) => el.remove())
  }, [item])
}

/* `items` is the ordered list for this item's section (the same order the listing page shows). */
export default function ResourceDetail({ item, items, section }) {
  const article = useMemo(() => (item.html ? sanitizeArticle(item.html) : null), [item])
  useDocumentMeta((item.seoTitle || item.title).replace(/\s*[|-]\s*AltiusNxt$/i, ''), item.seoDescription || item.summary, [item.title, section?.label, 'product data enrichment', 'AltiusNxt'].filter(Boolean))
  useArticleSeo(item)
  useBreadcrumbSeo([['Resources', '/resources'], ...(section ? [[section.label, section.base]] : []), [item.title]])
  const index = items.findIndex((i) => i.id === item.id)
  const toc = article ? article.toc : tocFor(item.sections)
  const isEvent = item.type === 'event'
  const minutes = item.minutes ?? readingMinutes(item.sections)
  const standCode = isEvent ? item.stand.replace(/^Stand\s+/i, '') : ''

  return (
    <>
      <ReadingProgress />
      <section className="rs-d-hero" aria-labelledby="rs-title">
        {isEvent && <span className="rs-d-ghost" aria-hidden="true">{standCode}</span>}
        <div className="rs-d-hero-wrap">
          <div className="rs-d-copy">
            <nav className="rs-crumbs" aria-label="Breadcrumb">
              <Link to="/resources">Resources</Link>
              <Icon name="chevron-right" size={14} />
              <Link to={`/resources?tab=${section.tab}`}>{section.label}</Link>
            </nav>
            <p className="rs-eyebrow">{TYPE_LABEL[item.type]}</p>
            <h1 id="rs-title">{item.title}</h1>
            <p className="rs-d-sub">{item.subtitle}</p>
            {isEvent && (
              <div className="rs-d-actions">
                <a className="btn btn-primary" href="#rs-contact">Book a meeting <Icon name="arrow-right" size={16} /></a>
              </div>
            )}
          </div>
          <figure className="rs-d-media">
            <ImagePlaceholder ratio="16 / 9" image={item.image} alt={item.title} label={`Featured image – ${item.title.split(' – ')[0]}`} />
          </figure>
        </div>
        <div className="rs-d-strip-wrap">
          <Strip item={item} minutes={minutes} />
        </div>
      </section>

      <div className="wrap rs-layout">
        <article className="rs-main">
          <div className="rs-prose">
            {article
              ? <div className="rs-wp" dangerouslySetInnerHTML={{ __html: article.html }} />
              : <SectionBlocks sections={item.sections} />}
          </div>
          <ShareButtons title={item.title} />
        </article>
        <Rail current={item} toc={toc} />
      </div>

      <KeepReading items={items} index={index} base={section.base} />

      <section className="rs-contact" id="rs-contact">
        <div className="wrap">
          <CtaBlock />
        </div>
      </section>
    </>
  )
}
