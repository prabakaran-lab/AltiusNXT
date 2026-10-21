import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Briefcase, CalendarDays, Home, Info, LayoutGrid, Mail, Newspaper, ScanSearch, Search, Shield, Wrench, X } from 'lucide-react'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'
import { sections, itemPath } from '../data/resources.js'
import './Sitemap.css'

/* The HTML sitemap: every page on the site in one place, for visitors and for crawlers that follow links.
   Every link is always in the page (long lists are only visually collapsed), so crawlers see them all.
   The machine-readable version is /sitemap.xml (generated on every build from the same routes and Resources data). */

const MAIN = [
  { label: 'Home', to: '/', note: 'Industrial product data enrichment, verified by engineers', Ico: Home },
  { label: 'CatalogWiz', to: '/catalogwiz', note: 'AI product data enrichment, engineer-verified', Ico: LayoutGrid },
  { label: 'AI Readiness Report', to: '/ai-readiness-report', note: 'Free report: does AI recommend your products?', Ico: ScanSearch },
  { label: 'About Us', to: '/about-us', note: 'Our story, categories and clients since 2007', Ico: Info },
  { label: 'Resources', to: '/resources', note: 'Guides, case studies and events', Ico: BookOpen },
  { label: 'Contact', to: '/contact', note: 'Talk to a product data engineer', Ico: Mail },
]
const TOOLS = [
  { label: 'Product Schema Studio', to: '/product-schema-markup', note: 'Product schema markup examples for B2B categories' },
  { label: 'Category Attribute Library', to: '/category-attributes', note: 'The attributes every industrial product record needs' },
  { label: 'Try CatalogWiz on a sample', to: '/catalogwiz#try', note: 'See your own product page enriched, free' },
]
const LEGAL = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms of Use', to: '/terms' },
]
const SHOW = 5 // links shown before "Show all"

function Block({ id, title, Ico, items, q, total, wide }) {
  const [open, setOpen] = useState(false)
  const long = items.length > SHOW + 1 && q.length === 0
  if (!items.length) return null
  return (
    <div className={`sm-block${wide ? ' wide' : ''}`} id={id} role="group" aria-labelledby={`${id}-t`}>
      <header>
        <span className="ico"><Ico size={18} /></span>
        <h3 id={`${id}-t`}>{title}</h3>
        <b>{total ?? items.length}</b>
      </header>
      <ul className={long && !open ? 'is-clamped' : ''}>
        {items.map((l) => (
          <li key={l.to}><Link to={l.to}>{l.label}</Link>{l.note && <small>{l.note}</small>}</li>
        ))}
      </ul>
      {long && (
        <button type="button" className="sm-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : `Show all ${items.length}`}
        </button>
      )}
    </div>
  )
}

export default function Sitemap() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const data = useMemo(() => {
    const events = sections.events.items.map((i) => ({ label: i.title, to: itemPath(i) }))
    const cases = sections['case-studies'].items.map((i) => ({ label: i.title, to: itemPath(i) }))
    const blogs = sections.blog.items.map((i) => ({ label: i.title, to: itemPath(i) }))
    return [
      { id: 'sm-tools', title: 'Free tools & libraries', Ico: Wrench, items: TOOLS },
      { id: 'sm-cases', title: 'Case studies', Ico: Briefcase, items: [{ label: 'All case studies', to: '/resources/case-studies' }, ...cases], total: cases.length },
      { id: 'sm-events', title: 'Events', Ico: CalendarDays, items: [{ label: 'All events', to: '/resources/events' }, ...events], total: events.length },
      { id: 'sm-blog', title: 'Blog articles', Ico: Newspaper, items: [{ label: 'All blog posts', to: '/resources/blog' }, ...blogs], total: blogs.length, wide: true },
    ]
  }, [])

  const hit = (l) => !q || `${l.label} ${l.note || ''}`.toLowerCase().includes(q)
  const main = MAIN.filter(hit)
  const groups = data.map((g) => ({ ...g, items: g.items.filter(hit) }))
  const legal = LEGAL.filter(hit)
  const count = main.length + legal.length + groups.reduce((n, g) => n + g.items.length, 0)

  const jump = [{ href: '#sm-main', label: 'Main pages', n: MAIN.length }, ...data.map((g) => ({ href: `#${g.id}`, label: g.title, n: g.total ?? g.items.length }))]

  return (
    <>
      <PageSeo
        title="Sitemap | AltiusNxt"
        description="Every page on the AltiusNxt website: CatalogWiz, the free AI Readiness Report, product data guides, case studies, events and tools."
        keywords={['AltiusNxt sitemap', 'site map']}
        structuredData={[breadcrumb('/sitemap', 'Sitemap')]}
      />
      <section className="sitemap-page">
        <div className="sm-wrap">
          <header className="sm-head">
            <p className="sm-eyebrow">Sitemap</p>
            <h1>Find any page on <em>AltiusNxt</em>.</h1>
            <p className="sm-lede">Search, or jump straight to a section. Search engines can read the machine-readable version at <a href="/sitemap.xml">sitemap.xml</a>.</p>

            <div className="sm-search" role="search">
              <Search size={18} aria-hidden="true" />
              <label className="sm-sr" htmlFor="sm-q">Search the sitemap</label>
              <input id="sm-q" type="search" placeholder="Search pages, articles, case studies…" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
              {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
            </div>

            {!q && (
              <nav className="sm-jump" aria-label="Jump to a section">
                {jump.map((j) => <a key={j.href} href={j.href}>{j.label}<b>{j.n}</b></a>)}
              </nav>
            )}
          </header>

          {q && <p className="sm-count" role="status">{count ? `${count} ${count === 1 ? 'page matches' : 'pages match'} “${query.trim()}”` : `No pages match “${query.trim()}”.`}</p>}

          {main.length > 0 && (
            <div className="sm-main" id="sm-main" role="group" aria-label="Main pages">
              {main.map(({ label, to, note, Ico }) => (
                <Link key={to} to={to} className="sm-tile">
                  <span className="ico"><Ico size={20} /></span>
                  <span className="tx"><b>{label}</b><small>{note}</small></span>
                  <ArrowRight size={16} className="go" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}

          <div className="sm-cols">
            {groups.map((g) => <Block key={g.id} {...g} q={q} />)}
          </div>

          {legal.length > 0 && (
            <nav className="sm-legal" aria-label="Legal pages">
              <span><Shield size={15} />Legal</span>
              {legal.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            </nav>
          )}

        </div>
      </section>
    </>
  )
}
