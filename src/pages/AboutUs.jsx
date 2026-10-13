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
        title="About AltiusNxt | Product Data Enrichment Company Since 2007"
        description="AltiusNxt is a product data enrichment company. Since 2007 we have enriched 15M+ products for 500+ manufacturers and distributors in 15+ countries."
        keywords={['product data management company', 'product data enrichment company', 'catalog management services', 'product information management services']}
        structuredData={[breadcrumb('/about-us', 'About Us')]}
      />
      {/* ---- Hero ---- */}
      <section className="ah" aria-labelledby="ah-title">
        <div className="ah-wrap">
          <div className="ah-copy">
            <p className="ah-eyebrow ah-r" style={{ '--d': '0ms' }}>About AltiusNxt · Since 2007</p>
            <h1 id="ah-title" className="ah-r" style={{ '--d': '80ms' }}>
              The product data partner <span>for B2B industrial distributors.</span>
            </h1>
            <p className="ah-lede ah-r" style={{ '--d': '170ms' }}>
              For nearly two decades, AltiusNxt has helped B2B industrial distributors in 15+ countries, from Fortune 500
              companies to mid-sized and small businesses, turn messy supplier data into accurate, human-verified product
              content. With 15M+ products enriched for 500+ distributors since 2007, we make complex technical catalogues
              easier to find on Google, easier to buy from on every channel, and visible in all LLMs.
            </p>
            <dl className="ah-stats">
              {[['20+', 'Years of team expertise'], ['500+', 'Global clients'], ['15M+', 'Products enriched'], ['15+', 'Countries']].map(([n, l], i) => (
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
              alt="A product data specialist reviewing an enriched product page on a laptop"
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
