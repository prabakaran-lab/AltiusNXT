import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import heroInsights from '../assets/resources/hero-insights.webp'
import heroInsightsSm from '../assets/resources/hero-insights-sm.webp'
import './AboutHero.css'
import './ResourcesList.css'
import caseScrewman from '../assets/resources/case-screwman.jpg'
import caseKempston from '../assets/resources/case-kempston.webp'
import caseRoseScientific from '../assets/resources/case-rose-scientific.png'
import eventIrx from '../assets/resources/event-irx.jpg'
import eventToolfair from '../assets/resources/event-toolfair.jpg'
import eventChemuk from '../assets/resources/event-chemuk.jpg'
import blogDataCleansing from '../assets/resources/blog-data-cleansing.webp'
import blogEcommercePlatform from '../assets/resources/blog-ecommerce-platform.webp'
import blogDataNormalization from '../assets/resources/blog-data-normalization.png'
import blogAttributeDevelopment from '../assets/resources/blog-attribute-development.webp'
import UiIcon from '../components/ui/Icon.jsx'
import wpBlogs from '../data/wpBlogs.json'

const ITEMS = [
  { featured: 1, type: 'blog', date: 'May 28, 2025', sort: '2025-05-28', img: blogDataCleansing, title: 'Why Product Data Cleansing is a Game Changer for eCommerce Stores', excerpt: 'In the fast-paced world of eCommerce, your product data is either working for you or against you.', meta: '5 min read', to: '/resources/blog/product-data-cleansing-game-changer', url: 'https://altiusnxt.com/why-product-data-cleansing-is-a-game-changer-for-ecommerce-stores/' },
  { featured: 2, type: 'blog', date: 'May 22, 2025', sort: '2025-05-22', img: blogEcommercePlatform, title: 'Unlocking eCommerce Success: How to Implement a Platform That Converts', excerpt: 'eCommerce implementation involves more than selecting a platform — it takes careful planning, execution and ongoing optimization.', meta: '8 min read', to: '/resources/blog/implement-ecommerce-platform-that-converts', url: 'https://altiusnxt.com/unlocking-ecommerce-success-how-to-implement-a-platform-that-converts/' },
  { featured: 3, type: 'blog', date: 'May 19, 2025', sort: '2025-05-19', img: blogDataNormalization, title: 'Stay Ahead in 2025: How Data Normalization Boosts eCommerce Efficiency', excerpt: 'How industrial distributors and retailers can leverage data normalization to enhance eCommerce operations and deliver better customer experiences.', meta: '6 min read', to: '/resources/blog/data-normalization-2025', url: 'https://altiusnxt.com/stay-ahead-in-2025-how-data-normalization-boosts-ecommerce-efficiency-for-industrial-distributors-and-retailers/' },
  { featured: 4, type: 'blog', date: 'April 7, 2025', sort: '2025-04-07', img: blogAttributeDevelopment, title: 'Elevating Your E-Commerce Strategy with Product Attribute Development', excerpt: 'Product attribute development is the backbone of a successful online store.', meta: '6 min read', to: '/resources/blog/product-attribute-development', url: 'https://altiusnxt.com/elevating-your-e-commerce-strategy-with-product-attribute-development/' },
  { featured: 5, type: 'event', date: 'November 2026', sort: '2026-11-02', img: eventToolfair, title: 'B2B eCommerce World Americas 2026', excerpt: 'Meet the AltiusNxt team in Indianapolis. Bring your own product data and see CatalogWiz in action.', meta: 'Indianapolis, IN', url: 'https://b2becommerceworld.org/americas', upcoming: true },
  { featured: 6, type: 'case', date: 'March 28, 2025', sort: '2025-03-28', img: caseKempston, title: 'Data Enrichment Improves Kempston Controls Website Traffic', excerpt: 'How a data enrichment initiative boosted website traffic for this long-established distributor of electrical and electronic components.', meta: '7 min read', to: '/resources/case-studies/kempston-controls', url: 'https://altiusnxt.com/data-enrichment-improves-kempston-controls-website-traffic/' },
  { type: 'case', date: 'February 2025', sort: '2025-02-14', img: caseScrewman, title: 'The Screwman Tightens Its Business Presence with a New E-Store', excerpt: 'A nearly four-decade fastener and hand-tools specialist launched a new eCommerce store to expand its business presence.', meta: '6 min read', to: '/resources/case-studies/the-screwman', url: 'https://altiusnxt.com/the-screwman-tightens-its-business-presence-with-a-new-e-store/' },
  { type: 'case', date: 'January 2025', sort: '2025-01-20', img: caseRoseScientific, title: 'Rose Scientific: From Static Site to Dynamic eCommerce Powerhouse', excerpt: 'Transformation from a static website to a dynamic eCommerce platform for this scientific equipment distributor.', meta: '7 min read', to: '/resources/case-studies/rose-scientific-canada', url: 'https://altiusnxt.com/rose-scientific-canada-from-static-site-to-dynamic-ecommerce-powerhouse/' },
  { type: 'event', date: '21–22 May 2025', sort: '2025-05-21', img: eventChemuk, title: 'CHEMUK 2025', excerpt: 'Chemical industry trade show where AltiusNxt Technologies exhibited its product data solutions.', meta: 'CHEMUK Expo · Stand A144', to: '/resources/events/chemuk-2025', url: 'https://altiusnxt.com/chemuk-2025/' },
  { type: 'event', date: '15–16 May 2025', sort: '2025-05-15', img: eventToolfair, title: 'Toolfair Harrogate 2025', excerpt: 'Exhibition focused on product data solutions — AltiusNxt showcased consistent product data offerings.', meta: 'Harrogate · Stand E58', to: '/resources/events/toolfair-harrogate-2025', url: 'https://altiusnxt.com/toolfair-harrogate-2025-15th-16th-may/' },
  { type: 'event', date: '13–14 May 2025', sort: '2025-05-13', img: eventIrx, title: 'IRX 2025', excerpt: 'Industry expo where AltiusNxt exhibited its product data solutions.', meta: 'NEC Birmingham', to: '/resources/events/irx-2025', url: 'https://altiusnxt.com/irx-2025/' },
]

ITEMS.push(...wpBlogs.map((b) => ({ type: 'blog', date: b.publishedLabel, sort: b.published, img: b.image, title: b.title, excerpt: b.summary, meta: `${b.minutes} min read`, to: `/resources/blog/${b.slug}`, url: b.originalUrl })))

const TYPE_LABEL = { blog: 'Blog', case: 'Case study', event: 'Event' }
const TYPE_CTA = { blog: 'Read article', case: 'Read case study', event: 'View event details' }

const GENERAL_FAQS = [
  { q: 'What is Product Data Enrichment?', a: 'Product data enrichment enhances product information by adding detailed attributes, images, descriptions and metadata — improving search visibility, customer experience and conversion rates.' },
  { q: 'What is PIM, and how does it help industrial distributors and retailers?', a: 'Product Information Management (PIM) centralizes and standardizes product data, streamlining content enrichment, classification and multichannel distribution.' },
  { q: 'How does AltiusNxt integrate with my existing systems?', a: 'Through seamless API-based connections to PIM systems (Akeneo, Pimcore, InRiver, Salsify, Stibo Systems), ERP systems (SAP, Oracle, Microsoft Dynamics), and eCommerce platforms (Shopify, Magento, WooCommerce, BigCommerce).' },
  { q: 'How does AltiusNxt ensure data accuracy?', a: 'We use AI-driven validation, automated content scorecards and manual quality checks to ensure data consistency, accuracy and compliance with industry standards.' },
  { q: 'What is a Proof of Concept (POC) and how does it relate to the demo?', a: 'A POC is a focused, short-term project that lets you test our solution in your own environment, using your own data — the most common next step after a demo.' },
  { q: 'What ISO certification has AltiusNxt received?', a: 'AltiusNxt has achieved ISO 9001:2015 and ISO/IEC 27001:2022 certifications from TÜV Austria.' },
  { q: 'Is my product data secure with AltiusNxt?', a: 'Yes — we implement enterprise-grade security protocols to protect product data across all systems and integrations.' },
]

const WORKBENCH_FAQS = [
  { q: 'What is the Catalogwiz Workbench?', a: "AltiusNxt's own product — the workspace where the AI enrichment, taxonomy and attribute development you read about actually happens. Supplier files and existing catalog data come in, AI drafts every attribute, and your team (or ours) reviews and signs off before anything publishes." },
  { q: 'Is Catalogwiz fully automated, or does a person check it?', a: 'Both, by design. Every AI-drafted attribute carries a confidence score. High-confidence values still pass through a review queue; anything low-confidence or safety-related routes to an AltiusNxt domain expert automatically. Nothing reaches your live catalog without a named person signing off on it.' },
  { q: 'Why not just let the AI publish directly?', a: "Because AI is fast but not infallible, especially on safety ratings, compliance marks and exact technical tolerances. Catalogwiz keeps AI for speed and scale, and keeps a human in the loop for judgment — the two aren't in competition, they're doing different jobs." },
  { q: 'Who actually reviews the AI-drafted content?', a: 'Your own category managers for the specs they already know, and AltiusNxt domain experts for the technical or safety-critical values that need outside verification — the same review-and-sign-off workflow shown throughout the Workbench.' },
  { q: 'Does the AI Readiness Report use the same technology as Catalogwiz?', a: 'Yes — the free AI Readiness Report and the deeper AI Discoverability Audit run on the same live-engine-query and page-analysis approach that powers Catalogwiz, so what you see in the report reflects how the product actually behaves.' },
]

const TABS = [
  { id: 'all', label: 'All Resources', icon: 'grid' },
  { id: 'blogs', label: 'News & Blogs', icon: 'doc' },
  { id: 'case-studies', label: 'Case Studies', icon: 'chart' },
  { id: 'events', label: 'Recent Events', icon: 'calendar' },
  { id: 'faqs', label: 'FAQs', icon: 'help' },
]
const TAB_TYPE = { blogs: 'blog', 'case-studies': 'case', events: 'event' }
const TOPICS = ['Product Data', 'eCommerce', 'CatalogWiz', 'AI Readiness', 'Industrial Commerce']

const Icon = ({ name, size = 18 }) => <UiIcon name={name === 'arrow' ? 'arrow-right' : name === 'calendar' ? 'events' : name} size={size} />

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <button type="button" className="faq-question" onClick={() => setOpen((v) => !v)}>
        <span>{q}</span>
        <span className="faq-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="faq-answer">{a}</p>}
    </div>
  )
}

// Items with a page of their own open it in-app; the rest still link out.
function Card({ item, children }) {
  return item.to
    ? <Link className="rl-link" to={item.to}>{children}</Link>
    : <a className="rl-link" href={item.url} target="_blank" rel="noopener noreferrer">{children}</a>
}

const TAB_IDS = TABS.map((t) => t.id)

export default function Resources() {
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [active, setActive] = useState(TAB_IDS.includes(requestedTab) ? requestedTab : 'all')
  const [sort, setSort] = useState('latest')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [email, setEmail] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = ITEMS
      .filter((i) => active === 'all' || i.type === TAB_TYPE[active])
      .filter((i) => !q || `${i.title} ${i.excerpt} ${TYPE_LABEL[i.type]}`.toLowerCase().includes(q))
    // The default "All" view is a curated mix (blogs, the upcoming event, a case study) rather
    // than a pure date sort, which would otherwise front-load every past event.
    if (active === 'all' && !q) {
      return matches
        .filter((i) => i.featured)
        .sort((a, b) => (sort === 'latest' ? a.featured - b.featured : b.featured - a.featured))
    }
    return matches.sort((a, b) => (sort === 'latest' ? b.sort.localeCompare(a.sort) : a.sort.localeCompare(b.sort)))
  }, [active, sort, query])

  const tabsRef = useRef(null)
  const indRef = useRef(null)
  const gridRef = useRef(null)
  const [rail, setRail] = useState(0)

  useLayoutEffect(() => {
    const place = () => {
      const el = tabsRef.current?.querySelector(`[data-id="${active}"]`)
      const ind = indRef.current
      if (!el || !ind) return
      ind.style.width = `${el.offsetWidth}px`
      ind.style.transform = `translateX(${el.offsetLeft}px)`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [active])

  useEffect(() => { setRail(0) }, [active, sort, query])

  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll('.rl-card')
    if (!cards?.length) return undefined
    if (!('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('in')); return undefined }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { rootMargin: '0px 0px -8% 0px' })
    cards.forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [visible])

  const jsonLd = useMemo(() => visible.map((i) => (i.type === 'event'
    ? { '@context': 'https://schema.org', '@type': 'Event', name: i.title, description: i.excerpt, url: i.url, location: { '@type': 'Place', name: i.meta }, organizer: { '@type': 'Organization', name: 'AltiusNxt' } }
    : { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: i.title, description: i.excerpt, datePublished: i.sort, url: i.url, author: { '@type': 'Organization', name: 'AltiusNxt' } })), [visible])

  const subscribe = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    window.location.href = `mailto:sales@altiusnxt.com?subject=${encodeURIComponent('Subscribe to AltiusNxt insights')}&body=${encodeURIComponent(`Please add ${email} to the AltiusNxt insights list.`)}`
  }

  return (
    <>
      {/* ---- Hero ---- */}
      <section className="ah ah-res" aria-labelledby="res-title">
        <div className="ah-wrap">
          <div className="ah-copy">
            <p className="ah-eyebrow ah-r" style={{ '--d': '0ms' }}>Resources</p>
            <h1 id="res-title" className="ah-r" style={{ '--d': '80ms' }}>Insights for <span>smarter product data.</span></h1>
            <p className="ah-lede ah-r" style={{ '--d': '170ms' }}>
              Guides, case studies, events and expert insights to help you enrich, manage and
              optimize your product information for ecommerce and an AI-ready world.
            </p>
            <form className="res-search ah-r" style={{ '--d': '260ms' }} onSubmit={(e) => e.preventDefault()}>
              <span className="res-search-icon"><Icon name="search" /></span>
              <input
                type="search"
                placeholder="Search resources"
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (active === 'faqs') setActive('all') }}
                aria-label="Search resources"
              />
              <button type="submit" aria-label="Search"><Icon name="arrow" /></button>
            </form>
            <div className="res-topics ah-r" style={{ '--d': '340ms' }}>
              <span>Popular topics:</span>
              {TOPICS.map((t) => (
                <button type="button" className="chip" key={t} onClick={() => { setQuery(t); setActive('all') }}>{t}</button>
              ))}
            </div>
          </div>
          <figure className="ah-media">
            <img
              src={heroInsights}
              srcSet={`${heroInsightsSm} 900w, ${heroInsights} 1672w`}
              sizes="(max-width: 900px) 100vw, 54vw"
              width="1672" height="941" fetchPriority="high"
              alt="A product data specialist reviewing a printed product catalog beside a laptop showing a structured product page for a digital multimeter"
            />
          </figure>
        </div>
      </section>

      {/* ---- Filter tabs ---- */}
      <section className="rl-bar-sec">
        <div className="wrap rl-bar">
          <nav className="rl-nav" aria-label="Resource categories">
            <div className="rl-tabs" ref={tabsRef} role="tablist">
              <span className="rl-ind" ref={indRef} aria-hidden="true" />
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active === t.id}
                  data-id={t.id}
                  className={`rl-tab${active === t.id ? ' on' : ''}`}
                  onClick={() => setActive(t.id)}
                >
                  <Icon name={t.icon} size={16} /><span>{t.label}</span>
                </button>
              ))}
            </div>
          </nav>
          {active !== 'faqs' && (
            <label className="rl-sort">
              <span>Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
              </select>
            </label>
          )}
        </div>
      </section>

      {/* ---- Cards ---- */}
      {active !== 'faqs' && (
        <section className="rl-sec" aria-labelledby="rl-title">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <div className="wrap">
            <header className="rl-head">
              <p className="rl-eyebrow">Featured resources</p>
              <div className="rl-head-row">
                <h2 id="rl-title">Latest insights, stories and events</h2>
                <span className="rl-count" aria-live="polite">{visible.length} {visible.length === 1 ? 'Resource' : 'Resources'}</span>
              </div>
              <p className="rl-lead">Expert perspectives, customer success stories and practical guidance from the AltiusNxt team.</p>
            </header>
            {visible.length === 0 ? (
              <p className="rl-empty">No resources match "{query}". Try another topic.</p>
            ) : (
              <div
                className="rl-grid" ref={gridRef} key={`${active}-${sort}-${query}`}
                onScroll={(e) => {
                  const el = e.currentTarget
                  const first = el.children[0]
                  if (!first) return
                  const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0')
                  const idx = Math.round(el.scrollLeft / step)
                  setRail((r) => (r === idx ? r : idx))
                }}
              >
                {visible.map((i, n) => (
                  <article className={`rl-card ${i.type}`} key={i.title} style={{ '--n': n % 3 }}>
                    <Card item={i}>
                      <div className="rl-media">
                        <img src={i.img} alt={`${TYPE_LABEL[i.type]}: ${i.title}`} loading="lazy" />
                        <span className={`rl-badge ${i.type}`}>{TYPE_LABEL[i.type]}</span>
                        {i.type === 'event' && <span className={`rl-status${i.upcoming ? ' up' : ''}`}>{i.upcoming ? 'Upcoming' : 'Past'}</span>}
                      </div>
                      <div className="rl-body">
                        <div className="rl-meta">
                          <time>{i.date}</time>
                          <span><Icon name={i.type === 'event' ? 'pin' : 'clock'} size={13} />{i.meta}</span>
                        </div>
                        <h3>{i.title}</h3>
                        <p>{i.excerpt}</p>
                        <span className="rl-cta">{TYPE_CTA[i.type]} <Icon name="arrow" size={15} /></span>
                      </div>
                    </Card>
                  </article>
                ))}
              </div>
            )}
            {visible.length > 1 && <div className="rl-dots" aria-hidden="true">{visible.map((i, n) => <i key={i.title} className={rail === n ? 'on' : ''} />)}</div>}
          </div>
        </section>
      )}

      {active === 'faqs' && (
        <section className="section bg-white">
          <div className="wrap">
            <h2 className="measure" style={{ marginBottom: 20 }}>Catalogwiz Workbench — Human-in-the-Loop + AI</h2>
            <div className="faq-list" style={{ marginBottom: 48 }}>
              {WORKBENCH_FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
            </div>
            <h2 className="measure" style={{ marginBottom: 20 }}>General</h2>
            <div className="faq-list">
              {GENERAL_FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---- Newsletter ---- */}
      <section className="section bg-white" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <div className="res-newsletter">
            <span className="res-newsletter-icon"><Icon name="mail" size={34} /></span>
            <div className="res-newsletter-copy">
              <p className="kicker" style={{ margin: 0 }}>Stay updated</p>
              <h2 style={{ margin: '4px 0 6px' }}>Get the latest insights in your inbox.</h2>
              <p style={{ margin: 0, color: 'var(--steel)' }}>
                Subscribe to receive new articles, case studies, event updates and practical guides
                on product data, ecommerce and AI readiness.
              </p>
            </div>
            <form className="res-newsletter-form" onSubmit={subscribe}>
              <div className="res-newsletter-row">
                <label className="res-newsletter-input">
                  <Icon name="mail" size={16} />
                  <input type="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <button type="submit" className="btn btn-primary">Subscribe <Icon name="arrow" size={15} /></button>
              </div>
              <span className="res-newsletter-note">No spam. Unsubscribe anytime.</span>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
