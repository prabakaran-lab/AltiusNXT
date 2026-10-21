import Button from './ui/Button.jsx'
import Icon from './ui/Icon.jsx'
import './HomeHero.css'

function HeroContent() {
  return (
    <div className="hh-copy">
      <p className="hh-kicker">Industrial product data · Engineered for AI search</p>
      <h1 id="hh-h">Industrial product data enrichment.<br /><em>Verified by engineers. Found by AI.</em></h1>
      <p className="hh-sub">Incomplete supplier data means buyers and AI assistants pick another seller. AltiusNxt’s product data engineers, with 15+ years in industrial catalogs, enrich every SKU with CatalogWiz AI, check every value against the manufacturer source, and test the result on ChatGPT, Claude, Gemini, Perplexity and Google.</p>
      <div className="hh-actions">
        <Button to="/ai-readiness-report">Get my free AI Readiness Report</Button>
        <Button variant="outline" icon="mail" iconPosition="start" to="/contact">Talk to a Product Data Engineer</Button>
      </div>
      <ul className="hh-trust">
        <li><Icon name="award" size={17} />Since 2007 · 15M+ products enriched</li>
        <li><Icon name="factory" size={17} />Clients in 15+ countries</li>
        <li><Icon name="users" size={17} />ISO 9001 &amp; ISO 27001 (TÜV Austria)</li>
      </ul>
    </div>
  )
}

/* The animated workflow that used to sit beside the copy now lives in the CatalogWiz story section below the hero. */
export default function HomeHero({ children }) {
  return (
    <section className="hh hero-std" aria-labelledby="hh-h">
      <div className="hh-wrap">
        <HeroContent />
        {children}
      </div>
    </section>
  )
}
