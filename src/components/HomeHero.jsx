import Button from './ui/Button.jsx'
import Icon from './ui/Icon.jsx'
import './HomeHero.css'

function HeroContent() {
  return (
    <div className="hh-copy">
      <p className="hh-kicker">CatalogWiz AI × Human Expertise</p>
      <h1 id="hh-h">AI-Powered Product Data Enrichment.<br /><em>Human-Verified Accuracy.</em></h1>
      <p className="hh-sub">CatalogWiz AI fills the gaps in your product catalog, and every value is human-verified by our product data experts before it goes live. The result: complete, accurate product content that ranks on Google, sells on your store and is ready for AI search and AI shopping agents.</p>
      <div className="hh-actions">
        <Button to="/ai-readiness-report">Get Free AI Readiness Report</Button>
        <Button variant="outline" icon="play" iconPosition="start" to="/how-it-works#catalogwiz">See CatalogWiz in Action</Button>
      </div>
      <ul className="hh-trust">
        <li><Icon name="award" size={17} />Since 2007</li>
        <li><Icon name="factory" size={17} />Clients in 15+ countries</li>
        <li><Icon name="users" size={17} />Human-verified product data</li>
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
