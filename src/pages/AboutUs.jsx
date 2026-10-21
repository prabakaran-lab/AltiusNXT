import AboutTestimonials from './AboutTestimonials.jsx'
import AboutGlobal from './AboutGlobal.jsx'
import AboutEvents from './AboutEvents.jsx'
import AboutPortfolio from './AboutPortfolio.jsx'
import heroTeam from '../assets/about/hero-team.webp'
import heroTeamSm from '../assets/about/hero-team-sm.webp'
import './AboutHero.css'
import AboutPurpose from './AboutPurpose.jsx'
import AboutJourney from './AboutJourney.jsx'
import AboutTrust from './AboutTrust.jsx'
import Icon from '../components/ui/Icon.jsx'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'

export default function AboutUs() {
  return (
    <>
      <PageSeo
        title="About AltiusNxt | Industrial Product Data Engineers Since 2007"
        description="Since 2007, AltiusNxt has enriched 15M+ products for industrial distributors and manufacturers in 15+ countries. Offices in Michigan, USA and Coimbatore, India."
        keywords={['product data management company', 'product data enrichment company', 'catalog management services', 'product information management services']}
        structuredData={[breadcrumb('/about-us', 'About Us')]}
      />
      {/* ---- Hero ---- */}
      <section className="ah" aria-labelledby="ah-title">
        <div className="ah-wrap">
          <div className="ah-copy">
            <p className="ah-eyebrow ah-r" style={{ '--d': '0ms' }}>About AltiusNxt · Since 2007</p>
            <h1 id="ah-title" className="ah-r" style={{ '--d': '80ms' }}>
              Product data engineers <span>for industrial distribution.</span>
            </h1>
            <p className="ah-lede ah-r" style={{ '--d': '170ms' }}>
              Since 2007, AltiusNxt has enriched more than 15 million products for industrial distributors, suppliers and
              manufacturers in 15+ countries, from enterprise distributors to family-owned distributors. Our product data engineers,
              with 15+ years in industrial catalogs, verify every value we deliver. Today we also test how ChatGPT, Gemini,
              Claude, Perplexity and Google read your products, and fix what stops them recommending you.
            </p>
            <dl className="ah-stats">
              {[['2007', 'Founded'], ['15M+', 'Products enriched'], ['500+', 'Distributors'], ['15+', 'Countries']].map(([n, l], i) => (
                <div key={l} className="ah-r" style={{ '--d': `${260 + i * 90}ms` }}><dd>{n}</dd><dt>{l}</dt></div>
              ))}
            </dl>
            <div className="ah-actions ah-r" style={{ '--d': '540ms' }}>
              <a className="ah-btn primary" href="#journey">Our Story <Icon name="arrow-right" /></a>
              <a className="ah-btn" href="#testimonials">What clients say</a>
            </div>
          </div>
          <figure className="ah-media">
            <img
              src={heroTeam}
              srcSet={`${heroTeamSm} 900w, ${heroTeam} 1586w`}
              sizes="(max-width: 900px) 100vw, 54vw"
              width="1920" height="819" fetchPriority="high"
              alt="A buyer reviewing an industrial product page on a laptop"
            />
          </figure>
        </div>
      </section>

      {/* ---- Purpose / Vision / Mission ---- */}
      <AboutPurpose />

      {/* ---- Journey timeline ---- */}
      <AboutJourney />

      {/* ---- Trust & recognition ---- */}
      <AboutTrust />

      {/* ---- Portfolio ---- */}
      <AboutPortfolio />

      {/* ---- Testimonials ---- */}
      <AboutTestimonials />

      {/* ---- Team ---- */}
      <AboutEvents />

      {/* ---- Global presence ---- */}
      <AboutGlobal />
    </>
  )
}
