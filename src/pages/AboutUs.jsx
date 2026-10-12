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

export default function AboutUs() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="ah" aria-labelledby="ah-title">
        <div className="ah-wrap">
          <div className="ah-copy">
            <p className="ah-eyebrow ah-r" style={{ '--d': '0ms' }}>About AltiusNxt</p>
            <h1 id="ah-title" className="ah-r" style={{ '--d': '80ms' }}>
              Over three decades of expertise in <span>product data.</span>
            </h1>
            <p className="ah-lede ah-r" style={{ '--d': '170ms' }}>
              AltiusNxt helps manufacturers and distributors transform product information into
              accurate, structured and AI-ready content for modern commerce.
            </p>
            <dl className="ah-stats">
              {[['20+', 'Years of expertise'], ['500+', 'Global clients'], ['15M+', 'Products enriched']].map(([n, l], i) => (
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
              width="1586" height="992" fetchPriority="high"
              alt="AltiusNxt team reviewing enriched product data on screen: extract supplier data, enrich with AI, validate and structure, publish to channels"
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
