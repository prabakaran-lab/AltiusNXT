import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Check, Layers, Ruler, Send, ShieldCheck, Tag, X } from 'lucide-react'
import badgeIso9001 from '../assets/awards/tuv-iso-9001.png'
import badgeIso27001 from '../assets/awards/tuv-iso-27001.png'
import badgeB2bea from '../assets/awards/b2bea-member-badge.svg'
import Walkthrough from '../components/walkthrough/Walkthrough.jsx'
import EnrichDemo from '../components/catalogwiz/EnrichDemo.jsx'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'
import './HomeRefinement.css'
import './HomePolish.css'
import './HomeSystem.css'
import './CatalogWiz.css'

/* /catalogwiz: the product page. Reuses only the Home sections that explain CatalogWiz itself (walkthrough, categories, integrations, FAQ). */

const WT_HEAD = {
  eyebrow: 'How it works',
  title: <>From supplier file to verified product page <em>in five steps.</em></>,
  sub: 'Watch one sample product go from raw supplier files to a finished, engineer-verified product page. The demo plays on its own, or click any step.',
}
const GIVE = [
  { t: 'One clean product record', d: 'Excel, PDF and image files become one product record, with every gap flagged.', Ico: Layers },
  { t: 'Engineer-verified, with sources', d: 'Every value links to the datasheet page it came from, checked by a product data engineer before it goes live.', Ico: ShieldCheck },
  { t: 'Ready for every channel', d: 'Approved product data goes live on your eCommerce store, marketplaces, PIM, ERP and AI shopping agents using UCP.', Ico: Send },
]
const UCP_POINTS = [
  { t: 'Complete attributes agents can compare', d: 'Every spec an agent filters on is filled in, not left blank.', Ico: Layers },
  { t: 'Consistent identifiers and units', d: 'Brand, MPN and GTIN match the manufacturer, with the same unit and format on every product.', Ico: Ruler },
  { t: 'Accurate price and stock', d: 'Agents only buy what they can see is available, at the right price.', Ico: Tag },
]
const PROOF = [['15M+', 'products enriched'], ['500+', 'distributors'], ['15+', 'countries']]
const BADGES = [[badgeIso9001, 'TÜV Austria ISO 9001:2015'], [badgeIso27001, 'TÜV Austria ISO/IEC 27001:2022'], [badgeB2bea, 'B2B Ecommerce Association member']]

function useReveal(ref) {
  useEffect(() => {
    const els = [...ref.current.querySelectorAll('.cw-rv')]
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.classList.add('in')); return undefined }
    const io = new IntersectionObserver((hits) => hits.forEach((h) => { if (h.isIntersecting) { h.target.classList.add('in'); io.unobserve(h.target) } }), { threshold: 0.18 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ref])
}

export default function CatalogWiz() {
  const root = useRef(null)
  useReveal(root)

  return (
    <div className="home-page cw-page" ref={root}>
      <PageSeo
        title="CatalogWiz | AI Product Data Enrichment, Engineer-Verified"
        description="CatalogWiz enriches supplier data with AI, then AltiusNxt engineers verify every value against the manufacturer source. Delivered to your PIM, ERP or store."
        keywords={['AI product data enrichment software', 'product data enrichment tool', 'catalog enrichment software', 'PIM data enrichment', 'product attribute extraction', 'product data cleansing', 'UCP-ready product data', 'agentic commerce']}
        structuredData={[
          breadcrumb('/catalogwiz', 'CatalogWiz'),
          { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'CatalogWiz', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'AI product data enrichment software with human verification built in.' },
          { '@context': 'https://schema.org', '@type': 'Service', name: 'CatalogWiz', serviceType: 'AI product data enrichment', provider: { '@type': 'Organization', name: 'AltiusNxt Technologies' }, description: 'AI product data enrichment, verified by AltiusNxt product data engineers against the manufacturer source before it reaches your PIM, ERP or store.', areaServed: 'Worldwide' },
        ]}
      />
      <section className="cwh" id="cw-promise" aria-labelledby="cwh-t">
        <div className="cwh-glow" aria-hidden="true" />
        <div className="cwh-wrap">
          <p className="cwh-kicker">CatalogWiz · AI enrichment + engineer verification</p>
          <h1 id="cwh-t">Messy supplier data in. <em>Verified product data out.</em></h1>
          <p className="cwh-sub">CatalogWiz is AltiusNxt’s product data enrichment platform. Upload supplier spreadsheets, PDF datasheets and images. AI fills the missing attributes, taxonomy and descriptions. Then an AltiusNxt product data engineer checks every value against the manufacturer source before it goes to your store, PIM, marketplaces and Google Merchant Center.</p>
          <div className="cwh-act">
            <Link className="btn btn-primary" to="/contact">Talk to a Product Data Engineer <ArrowRight size={16} /></Link>
            <a className="btn btn-outline" href="#catalogwiz">See how it works</a>
          </div>

          <ul className="cwh-give" aria-label="What CatalogWiz gives you">
            {GIVE.map(({ t, d, Ico }, i) => (
              <li key={t} style={{ '--i': i }}>
                <span className="g-ico"><Ico size={24} strokeWidth={2} /></span>
                <b>{t}</b>
                <p>{d}</p>
              </li>
            ))}
          </ul>

          <div className="cwh-proof">
            <ul className="cwh-nums">
              {PROOF.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}
            </ul>
            <span className="cwh-div" aria-hidden="true" />
            <ul className="cwh-badges" aria-label="Certifications">
              {BADGES.map(([src, alt]) => <li key={alt}><img src={src} alt={alt} loading="lazy" /></li>)}
            </ul>
          </div>
        </div>
      </section>

      <Walkthrough head={WT_HEAD} />

      <section className="cw-ucp" id="ucp" aria-labelledby="cw-ucp-title">
        <div className="cw-wrap">
          <header className="cw-ucp-head">
            <p className="cwh-kicker">Ready for AI shopping agents</p>
            <h2 id="cw-ucp-title">Product data AI agents can <em>compare, trust and buy.</em></h2>
            <p>AI assistants are starting to shop for buyers. Google's Universal Commerce Protocol (UCP) and OpenAI's Agentic Commerce Protocol (ACP) let agents find, compare and check out. Both depend on the same thing: complete, consistent product data with the right price and stock. CatalogWiz builds that data. Your commerce platform or Merchant Center handles the protocol connection, and we tell you which one applies to you.</p>
          </header>

          <div className="cw-ucp-grid">
            <ul className="cw-ucp-pts">
              {UCP_POINTS.map(({ t, d, Ico }) => (
                <li key={t}>
                  <span className="ico"><Ico size={22} strokeWidth={2} /></span>
                  <div><b>{t}</b><p>{d}</p></div>
                </li>
              ))}
            </ul>

            <figure className="cw-agent" aria-label="Example: an AI shopping agent compares two listings of the same product">
              <figcaption><Bot size={16} />AI shopping agent: &ldquo;Find a 3-pole motor circuit breaker, 73 A, 690 V ac, DIN rail mount.&rdquo;</figcaption>
              <div className="cw-agent-cols">
                <div className="cw-agent-card skip">
                  <small>Supplier listing</small>
                  <b>5 of 17 details (29%)</b>
                  <ul>
                    <li><X size={13} strokeWidth={3} />AC voltage rating missing</li>
                    <li><X size={13} strokeWidth={3} />Mounting type missing</li>
                    <li><X size={13} strokeWidth={3} />Price and stock missing</li>
                  </ul>
                  <span className="res">Skipped: agent cannot compare it</span>
                </div>
                <div className="cw-agent-card pick">
                  <small>After CatalogWiz</small>
                  <b>17 of 17 details (100%)</b>
                  <ul>
                    <li><Check size={13} strokeWidth={3} />690 V ac, engineer-verified</li>
                    <li><Check size={13} strokeWidth={3} />DIN rail mount</li>
                    <li><Check size={13} strokeWidth={3} />Price and stock included</li>
                  </ul>
                  <span className="res">Shortlisted for the buyer</span>
                </div>
              </div>
              <p className="cw-agent-note">Illustrative example · sample product TELGV3P73</p>
            </figure>
          </div>
        </div>
      </section>

      <EnrichDemo>
        <div className="cw-ctacard">
          <h3>Simple pricing logic: bigger scope, <em>bigger engagement, tailored quote.</em></h3>
          <p>Tell us what you need and we will put a number on it.</p>
          <div className="cwh-act">
            <Link className="btn btn-primary" to="/contact">Talk to a Product Data Engineer <ArrowRight size={16} /></Link>
            <Link className="btn btn-outline" to="/ai-readiness-report">Get Free AI Readiness Report</Link>
          </div>
        </div>
      </EnrichDemo>

    </div>
  )
}
