import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/altiusnxt_logo_white.png'
import badgeIso9001 from '../assets/awards/tuv-iso-9001.png'
import badgeIso27001 from '../assets/awards/tuv-iso-27001.png'
import badgeB2bea from '../assets/awards/b2bea-member-badge.svg'
import linkedinLogo from '../assets/linkedin.png'
import './Footer.css'
import Icon from './ui/Icon.jsx'

/* Editable content ---------------------------------------------------- */
const NAV = [
  {
    id: 'product', title: 'Product',
    links: [
      { label: 'CatalogWiz', to: '/catalogwiz' },
      { label: 'AI Readiness Report', to: '/ai-readiness-report' },
      { label: 'Product Schema Markup', to: '/product-schema-markup' },
      { label: 'Category Attribute Guide', to: '/category-attributes' },
      { label: 'Try CatalogWiz on a sample', to: '/catalogwiz#try' },
    ],
  },
  {
    id: 'company', title: 'Company',
    links: [
      { label: 'About Us', to: '/about-us' },
      { label: 'Case Studies', to: '/resources?tab=case-studies' },
      { label: 'Resources', to: '/resources' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    id: 'resources', title: 'Resources',
    links: [
      { label: 'Insights', to: '/resources?tab=blogs' },
      { label: 'Events', to: '/resources?tab=events' },
      { label: 'FAQs', to: '/resources?tab=faqs' },
    ],
  },
]

// Official badge artwork is used exactly as supplied (never recolored, cropped or restyled).
const BADGES = [
  { img: badgeIso9001, w: 912, h: 928, alt: 'TÜV Austria ISO 9001:2015 certification' },
  { img: badgeIso27001, w: 940, h: 936, alt: 'TÜV Austria ISO/IEC 27001:2022 certification' },
  { img: badgeB2bea, w: 1825, h: 2001, alt: 'B2BEA Member badge' },
]

// Decorative AI Readiness micro-visual (also rendered as pills on mobile)
const CHIPS = [
  { t: 'Product Identity', x: 6, y: 4 },
  { t: 'Structured Data', x: 44, y: 22 },
  { t: 'AI Discoverability', x: 66, y: 48 },
  { t: 'Specifications', x: 22, y: 56 },
  { t: 'Taxonomy', x: 50, y: 80 },
]
const PILLS = ['Product identity', 'Specifications', 'Structured data']

const LEGAL = [
  { label: 'Privacy', to: '/privacy-policy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Sitemap', to: '/sitemap' },
  // Add { label: 'Cookie Policy', to: '…' } here once that page exists.
]

const PhoneIcon = () => <Icon name="phone" size={16} />
const MailIcon = () => <Icon name="mail" size={16} />
const PinIcon = () => <Icon name="pin" size={18} />
const LinkedInIcon = () => <img className="ft-in" src={linkedinLogo} alt="" width="22" height="22" />

const FooterLink = ({ link }) => {
  const inner = <><span>{link.label}</span><i aria-hidden="true"><Icon name="arrow-right" size={14} /></i></>
  return link.to
    ? <Link className="ft-link" to={link.to}>{inner}</Link>
    : <a className="ft-link" href={link.href}>{inner}</a>
}

export default function Footer() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  const [open, setOpen] = useState({}) // mobile accordion; desktop always shows every group

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) {
      const f = requestAnimationFrame(() => setSeen(true))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <footer ref={ref} className={`ft${seen ? ' on' : ''}`}>
      {/* faint technical grid + taxonomy nodes */}
      <svg className="ft-motif" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs><pattern id="ft-grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#fff" strokeWidth="1" /></pattern></defs>
        <rect width="1440" height="900" fill="url(#ft-grid)" />
        <g fill="none" stroke="#fff" strokeWidth="1"><path d="M60 560 H160 V640 H280 M160 640 V720" /><path d="M1300 520 H1380 V600" /></g>
        <g fill="var(--orange)"><circle cx="60" cy="560" r="3" /><circle cx="160" cy="640" r="3" /><circle cx="280" cy="640" r="3" /><circle cx="160" cy="720" r="3" /><circle cx="1300" cy="520" r="3" /><circle cx="1380" cy="600" r="3" /></g>
      </svg>

      <div className="ft-wrap">
        {/* 1 · Pre-footer CTA */}
        <section className="ft-cta ft-rise" style={{ '--d': '0ms' }} aria-labelledby="ft-cta-h">
          <div className="ft-cta-copy">
            <p className="ft-eyebrow">Ready to check your product data?</p>
            <h2 id="ft-cta-h">Is AI recommending your products, or a competitor’s?</h2>
            <p className="ft-cta-text">Paste one product page. We ask ChatGPT, Claude, Gemini and Perplexity the questions your buyers ask, show who they recommend, and a product data engineer approves your free report.</p>
            <div className="ft-cta-act">
              <Link className="btn btn-primary" to="/ai-readiness-report">Free AI Readiness Report <Icon name="arrow-right" /></Link>
              <Link className="ft-cta-link" to="/catalogwiz">Explore CatalogWiz <Icon name="arrow-right" /></Link>
            </div>
            <small>One product page. Actionable findings. No obligation.</small>
            <ul className="ft-pills" aria-label="What the report covers">{PILLS.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>

          <div className="ft-viz" aria-hidden="true">
            <svg viewBox="0 0 560 260" preserveAspectRatio="none" focusable="false">
              <g fill="none" strokeLinecap="round">
                <path className="c1" pathLength="1" d="M10 200 C120 120 220 60 330 100 S470 190 550 90" />
                <path className="c2" pathLength="1" d="M0 150 C110 190 230 110 340 120 S480 40 560 70" />
                <path className="c3" pathLength="1" d="M60 250 C170 190 300 220 400 170 S520 190 556 150" />
              </g>
              <g fill="var(--orange)" className="nodes">
                <circle cx="108" cy="148" r="3.5" /><circle cx="250" cy="82" r="4" /><circle cx="332" cy="112" r="6" /><circle cx="436" cy="182" r="3.5" /><circle cx="520" cy="112" r="3.5" /><circle cx="548" cy="82" r="3" />
              </g>
              <circle className="pulse" r="5" cx="0" cy="0" style={{ offsetPath: 'path("M10 200 C120 120 220 60 330 100 S470 190 550 90")' }} />
              <circle className="pulse p2" r="4" cx="0" cy="0" style={{ offsetPath: 'path("M0 150 C110 190 230 110 340 120 S480 40 560 70")' }} />
              <circle className="pulse p3" r="3.5" cx="0" cy="0" style={{ offsetPath: 'path("M60 250 C170 190 300 220 400 170 S520 190 556 150")' }} />
            </svg>
            {CHIPS.map((c, i) => (
              <span key={c.t} className="ft-chip" style={{ left: `${c.x}%`, top: `${c.y}%`, '--i': i }}><i />{c.t}</span>
            ))}
          </div>
        </section>

        {/* 2 · Brand + navigation */}
        <div className="ft-main">
          <div className="ft-brand ft-rise" style={{ '--d': '100ms' }}>
            <Link to="/" aria-label="AltiusNxt home"><img className="ft-logo" src={logo} alt="AltiusNxt" width="186" height="80" /></Link>
            <p className="ft-statement">Industrial product data, engineered for AI search.</p>
            <p className="ft-about">AltiusNxt’s product data engineers enrich and verify catalogs for industrial distributors, suppliers and manufacturers, then test them on Google and AI assistants.</p>
            <p className="ft-trust">Since 2007 · Farmington Hills, MI and Coimbatore, India.</p>
            <a className="ft-social" href="https://www.linkedin.com/company/altiusnxt-tech" target="_blank" rel="noopener noreferrer"><LinkedInIcon /> LinkedIn / Follow AltiusNxt <Icon name="arrow-right" /></a>
          </div>

          <nav className="ft-nav" aria-label="Footer">
            {NAV.map((g, i) => (
              <div key={g.id} className={`ft-group ft-rise${open[g.id] ? ' open' : ''}`} style={{ '--d': `${160 + i * 70}ms` }}>
                <h3>
                  <button type="button" aria-expanded={!!open[g.id]} aria-controls={`ft-links-${g.id}`} onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}>
                    {g.title}<Icon name="chevron-down" size={16} className="ft-chev" />
                  </button>
                </h3>
                <ul id={`ft-links-${g.id}`}>
                  {g.links.map((l) => <li key={l.label}><FooterLink link={l} /></li>)}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* 3 · Offices + partners & certifications (one compact strip) */}
        <section className="ft-strip ft-rise" style={{ '--d': '380ms' }} aria-label="Offices, partners and certifications">
          <div className="ft-office">
            <h3><PinIcon />United States</h3>
            <address>
              <p>31700 West Thirteen Mile Road, Suite 205<br />Farmington Hills, MI 48334</p>
              <p className="ln"><PhoneIcon /><a href="tel:+13134869697">+1 313 486 9697</a></p>
              <p className="ln"><MailIcon /><a href="mailto:sales@altiusnxt.com">sales@altiusnxt.com</a></p>
            </address>
          </div>
          <div className="ft-office">
            <h3><PinIcon />India</h3>
            <address>
              <p>56-C, Bharathi Park, 2nd Cross<br />Saibaba Colony, Coimbatore, Tamil Nadu 641011</p>
              <p className="ln"><PhoneIcon /><span><em>Sales</em> <a href="tel:+919952317740">+91 9952317740</a></span></p>
              <p className="ln"><PhoneIcon /><span><em>Careers</em> <a href="tel:+917708182828">+91 7708182828</a></span></p>
            </address>
          </div>
          <div className="ft-certs">
            <h3>Partners &amp; certifications</h3>
            <ul>
              {BADGES.map((b, i) => (
                <li key={b.alt} className="ft-rise" style={{ '--d': `${480 + i * 100}ms` }}><img src={b.img} alt={b.alt} width={b.w} height={b.h} loading="lazy" /></li>
              ))}
            </ul>
          </div>
        </section>

        {/* 4 · Legal bar */}
        <div className="ft-bottom ft-rise" style={{ '--d': '600ms' }}>
          <span>© 2026 AltiusNxt Technologies Pvt Ltd</span>
          <ul>
            {LEGAL.map((l) => <li key={l.label}><Link to={l.to}>{l.label}</Link></li>)}
          </ul>
        </div>
      </div>
    </footer>
  )
}
