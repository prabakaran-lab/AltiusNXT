import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import caseScrewman from '../assets/resources/case-screwman.jpg'
import caseKempston from '../assets/resources/case-kempston.webp'
import caseRoseScientific from '../assets/resources/case-rose-scientific.png'
import blogDataCleansing from '../assets/resources/blog-data-cleansing.webp'
import blogEcommercePlatform from '../assets/resources/blog-ecommerce-platform.webp'
import blogAttributeDevelopment from '../assets/resources/blog-attribute-development.webp'
import './ContentHub.css'
import Icon from './ui/Icon.jsx'

/* ------------------------------------------------------------------
   Editable content. Add items freely: each tab shows the first
   FEATURED_COUNT and links to the full library. No dates, ratings or
   statistics are stated because none exist in the source content.
   ------------------------------------------------------------------ */
const FEATURED_COUNT = 3

const TABS = [
  {
    id: 'stories',
    label: 'Customer Success Stories',
    hint: 'Real customer outcomes',
    kind: 'case study',
    viewAll: { label: 'View all case studies', href: '/resources?tab=case-studies' },
    items: [
      {
        category: 'Fasteners & Tools',
        title: 'The Screwman expands its digital presence with a modern B2B ecommerce experience',
        excerpt: 'A long-established fastener and hand-tools specialist modernized its ecommerce presence to improve product discovery and support business growth.',
        outcome: '15,000+ products live on a new B2B store',
        name: 'The Screwman',
        img: caseScrewman,
        alt: 'The Screwman fastener and hand-tools ecommerce store',
        url: 'https://altiusnxt.com/the-screwman-tightens-its-business-presence-with-a-new-e-store/',
        to: '/resources/case-studies/the-screwman',
      },
      {
        category: 'Electrical & Industrial Distribution',
        title: 'How product data enrichment improved discoverability for Kempston Controls',
        excerpt: 'Structured product content, clearer specifications and enriched product information helped improve the online customer experience.',
        outcome: '50,000+ products enriched',
        name: 'Kempston Controls',
        img: caseKempston,
        alt: 'Kempston Controls electrical and electronic components online catalog',
        url: 'https://altiusnxt.com/data-enrichment-improves-kempston-controls-website-traffic/',
        to: '/resources/case-studies/kempston-controls',
      },
      {
        category: 'Scientific Equipment',
        title: 'Rose Scientific transforms a static website into a scalable ecommerce experience',
        excerpt: 'A modern ecommerce platform helped turn complex scientific product information into a more structured and accessible digital buying experience.',
        outcome: '“Learn, adapt and deliver.” Dharno Neel, Rose Scientific',
        name: 'Rose Scientific',
        img: caseRoseScientific,
        alt: 'Rose Scientific ecommerce platform for scientific equipment',
        url: 'https://altiusnxt.com/rose-scientific-canada-from-static-site-to-dynamic-ecommerce-powerhouse/',
        to: '/resources/case-studies/rose-scientific-canada',
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights & Resources',
    hint: 'Guides, articles & expertise',
    kind: 'article',
    viewAll: { label: 'View all resources', href: '/resources?tab=blogs' },
    items: [
      {
        category: 'Article · Product Data',
        title: 'Why Product Data Cleansing Matters for B2B Ecommerce',
        excerpt: 'Learn how cleaner, standardized product data improves search, product discovery, customer experience and ecommerce operations.',
        name: 'Why Product Data Cleansing Matters for B2B Ecommerce',
        img: blogDataCleansing,
        alt: 'Product data cleansing for a B2B ecommerce store',
        url: 'https://altiusnxt.com/why-product-data-cleansing-is-a-game-changer-for-ecommerce-stores/',
        to: '/resources/blog/product-data-cleansing-game-changer',
      },
      {
        category: 'Article · Ecommerce',
        title: 'How Product Data Enrichment Strengthens Ecommerce Performance',
        excerpt: 'Explore how taxonomy, attributes, specifications and enriched product content create better digital buying experiences.',
        name: 'How Product Data Enrichment Strengthens Ecommerce Performance',
        img: blogEcommercePlatform,
        alt: 'Ecommerce platform showing enriched product content',
        url: 'https://altiusnxt.com/unlocking-ecommerce-success-how-to-implement-a-platform-that-converts/',
        to: '/resources/blog/implement-ecommerce-platform-that-converts',
      },
      {
        category: 'Article · Attributes & PIM',
        title: 'Building Better Product Attributes for Ecommerce and PIM',
        excerpt: 'Learn how structured attributes, standardized units and complete technical specifications improve product consistency across channels.',
        name: 'Building Better Product Attributes for Ecommerce and PIM',
        img: blogAttributeDevelopment,
        alt: 'Structured product attributes and specifications for ecommerce and PIM',
        url: 'https://altiusnxt.com/elevating-your-e-commerce-strategy-with-product-attribute-development/',
        to: '/resources/blog/product-attribute-development',
      },
    ],
  },
]

// Structured data only from values that exist above (no dates, authors, ratings or stats).
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': TABS.map((tab) => ({
    '@type': 'ItemList',
    name: tab.label,
    itemListElement: tab.items.slice(0, FEATURED_COUNT).map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Article', headline: item.title, description: item.excerpt, url: item.url },
    })),
  })),
}

export default function ContentHub() {
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)
  const [bar, setBar] = useState({ x: 0, w: 0 })
  const sectionRef = useRef(null)
  const tabRefs = useRef([])
  const listRef = useRef(null)
  const [rail, setRail] = useState([0, 0]) // active card per panel when the grid is a mobile swipe rail

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect() }
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Keep the sliding underline aligned with the active tab (also on resize / font load).
  useLayoutEffect(() => {
    const measure = () => {
      const t = tabRefs.current[active]
      if (t) setBar({ x: t.offsetLeft, w: t.offsetWidth })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (listRef.current) ro.observe(listRef.current)
    return () => ro.disconnect()
  }, [active])

  const onKeyDown = (e) => {
    const last = TABS.length - 1
    let next = null
    if (e.key === 'ArrowRight') next = active === last ? 0 : active + 1
    else if (e.key === 'ArrowLeft') next = active === 0 ? last : active - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    setActive(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <section ref={sectionRef} className={`ch${visible ? ' is-visible' : ''}`} aria-labelledby="ch-heading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="ch-wrap">
        <header className="ch-head">
          <div className="ch-intro">
            <p className="ch-eyebrow ch-rise" style={{ '--d': '0ms' }}>Customer proof &amp; expert insights</p>
            <h2 id="ch-heading" className="ch-rise" style={{ '--d': '70ms' }}>
              Learn from real outcomes. <span>Build with proven expertise.</span>
            </h2>
            <p className="ch-lede ch-rise" style={{ '--d': '150ms' }}>
              Explore how manufacturers and distributors improve their product data, ecommerce performance and digital operations — then dive into practical insights from our product-data experts.
            </p>
          </div>

          <div className="ch-tabs ch-rise" style={{ '--d': '230ms' }}>
            <div className="ch-tablist" role="tablist" aria-label="Customer proof and expert insights" ref={listRef} onKeyDown={onKeyDown}>
              {TABS.map((tab, i) => (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[i] = el }}
                  id={`ch-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  aria-controls={`ch-panel-${tab.id}`}
                  tabIndex={active === i ? 0 : -1}
                  className={`ch-tab${active === i ? ' on' : ''}`}
                  onClick={() => setActive(i)}
                >
                  <strong>{tab.label}</strong>
                  <small>{tab.hint}</small>
                </button>
              ))}
              <span className="ch-bar" aria-hidden="true" style={{ transform: `translateX(${bar.x}px)`, width: bar.w }} />
            </div>
          </div>
        </header>

        {/* Both panels are always in the DOM (crawlable); inactive ones are only visually hidden. */}
        <div className="ch-panels">
          {TABS.map((tab, i) => {
            const items = tab.items.slice(0, FEATURED_COUNT)
            return (
              <div
                key={tab.id}
                id={`ch-panel-${tab.id}`}
                role="tabpanel"
                aria-labelledby={`ch-tab-${tab.id}`}
                className={`ch-panel${active === i ? ' on' : ''}`}
                tabIndex={active === i ? 0 : -1}
              >
                <ul
                  className="ch-grid"
                  data-panel={i}
                  tabIndex={0}
                  aria-label={`${tab.label}, swipe or scroll sideways`}
                  onScroll={(e) => {
                    const el = e.currentTarget
                    const first = el.children[0]
                    if (!first) return
                    const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0')
                    const idx = Math.round(el.scrollLeft / step)
                    setRail((r) => (r[i] === idx ? r : r.map((v, j) => (j === i ? idx : v))))
                  }}
                >
                  {items.map((item, n) => (
                    <li key={item.url} className="ch-cell ch-rise" style={{ '--d': `${330 + n * 90}ms` }}>
                      <article className={`ch-card ${tab.id}`}>
                        <Link className="ch-media" to={item.to} tabIndex={-1} aria-hidden="true">
                          <img src={item.img} alt={item.alt} loading="lazy" />
                        </Link>
                        <div className="ch-body">
                          <p className="ch-cat">{item.category}</p>
                          <h3><Link to={item.to}>{item.title}</Link></h3>
                          <p className="ch-excerpt">{item.excerpt}</p>
                          <div className="ch-foot">
                            {item.outcome && <span className="ch-outcome"><i aria-hidden="true" />{item.outcome}</span>}
                            <Link className="ch-read" to={item.to} aria-label={`Read ${item.name}${tab.kind === 'case study' ? ' case study' : ' article'}`}>
                              {tab.kind === 'case study' ? 'Read case study' : 'Read article'} <Icon name="arrow-right" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
                <div className="ch-dots" aria-hidden="true">{items.map((it, n) => <i key={it.url} className={rail[i] === n ? 'on' : ''} />)}</div>
                {tab.items.length > FEATURED_COUNT || tab.viewAll ? (
                  <div className="ch-all"><Link to={tab.viewAll.href}>{tab.viewAll.label} <Icon name="arrow-right" /></Link></div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
