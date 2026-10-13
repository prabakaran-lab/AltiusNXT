import { useEffect, useRef, useState } from 'react'

import conrad from '../assets/logos/01-Conrad.webp'
import brammer from '../assets/logos/02-Brammer-Rubix.webp'
import euAutomation from '../assets/logos/03-EU-Automation.webp'
import hayley from '../assets/logos/04-Hayley.webp'
import northern from '../assets/logos/05-Northern-Heating-Plumbing-Supplies.webp'
import drewRogers from '../assets/logos/06-Drew-and-Rogers.webp'
import fowkesBros from '../assets/logos/07-Fowkes-Bros.webp'
import mroStop from '../assets/logos/08-MRO-Stop.webp'
import rgTech from '../assets/logos/09-RG-Tech-and-Son.webp'
import supplyVan from '../assets/logos/10-SupplyVan.webp'
import tradeToolsSeriously from '../assets/logos/11-TradeTools-SeriouslyBetter.webp'
import tradeToolsRight from '../assets/logos/12-TradeTools-RightTools.webp'
import traversTool from '../assets/logos/13-Travers-Tool-Co.webp'
import vallen from '../assets/logos/14-Vallen-Sonepar.webp'
import velleman from '../assets/logos/15-Velleman.webp'
import ad from '../assets/logos/16-AD.webp'
import cef from '../assets/logos/17-CEF.webp'
import amerhart from '../assets/logos/18-Amerhart.webp'
import accessTronik from '../assets/logos/19-Access-Tronik.webp'
import communica from '../assets/logos/20-Communica.webp'
import kruse from '../assets/logos/21-Kruse-Electronic-Components.webp'
import './AboutPortfolio.css'
import Icon from '../components/ui/Icon.jsx'

export const COMPANIES = [
  { name: 'Conrad', src: conrad },
  { name: 'Brammer (powered by Rubix)', src: brammer },
  { name: 'EU Automation', src: euAutomation },
  { name: 'Hayley', src: hayley },
  { name: 'Northern Heating & Plumbing Supplies', src: northern },
  { name: 'Drew & Rogers', src: drewRogers },
  { name: 'Fowkes Bros.', src: fowkesBros },
  { name: 'MRO Stop', src: mroStop },
  { name: 'RG Tech & Son', src: rgTech },
  { name: 'SupplyVan.com', src: supplyVan },
  { name: 'TradeTools — Seriously Better', src: tradeToolsSeriously },
  { name: 'TradeTools — Right Tools', src: tradeToolsRight },
  { name: 'Travers Tool Co., Inc.', src: traversTool },
  { name: 'Vallen (A Sonepar Company)', src: vallen },
  { name: 'Velleman', src: velleman },
  { name: 'AD', src: ad },
  { name: 'CEF', src: cef },
  { name: 'Amerhart', src: amerhart },
  { name: 'Access Tronik', src: accessTronik },
  { name: 'Communica', src: communica },
  { name: 'Kruse Electronic Components', src: kruse },
]

const INDUSTRIES = ['Industrial', 'Electrical', 'Tools & hardware', 'Building supplies', 'Automotive', 'Healthcare']
const ROW_A = COMPANIES.slice(0, 11)
const ROW_B = COMPANIES.slice(11)

const Tile = ({ c, hidden }) => (
  <li className="apf-tile" aria-hidden={hidden || undefined}>
    <img src={c.src} alt={hidden ? '' : c.name} title={c.name} loading="lazy" />
  </li>
)

const Row = ({ items, reverse, label }) => (
  <div className={`apf-row${reverse ? ' rev' : ''}`} role="group" aria-label={label}>
    <ul className="apf-track">
      {items.map((c) => <Tile key={c.src} c={c} />)}
      {items.map((c) => <Tile key={`d-${c.src}`} c={c} hidden />)}
    </ul>
  </div>
)

export default function AboutPortfolio() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const f = requestAnimationFrame(() => setOn(true))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} className={`apf${on ? ' on' : ''}`} aria-labelledby="apf-title">
      <div className="apf-wrap">
        <header className="apf-head">
          <p className="apf-eyebrow apf-r" style={{ '--d': '0ms' }}>Our portfolio</p>
          <h2 id="apf-title" className="apf-r" style={{ '--d': '80ms' }}>Trusted across complex <span>B2B product categories.</span></h2>
          <p className="apf-lede apf-r" style={{ '--d': '170ms' }}>
            We support manufacturers, distributors and digital commerce teams across industrial, electrical, tools, hardware,
            building supplies, automotive, healthcare and other technical product categories.
          </p>
        </header>

        <ul className="apf-ind" aria-label="Industries served">
          {INDUSTRIES.map((t, i) => <li key={t} className="apf-r" style={{ '--d': `${240 + i * 60}ms` }}>{t}</li>)}
        </ul>
        <p className="apf-note apf-r" style={{ '--d': '620ms' }}>Complex catalogs · Technical attributes · Thousands of SKUs</p>
      </div>

      <div className="apf-logos apf-r" style={{ '--d': '700ms' }}>
        {/* desktop: two slow marquee rows */}
        <div className="apf-rows">
          <Row items={ROW_A} label="Client logos, row 1" />
          <Row items={ROW_B} reverse label="Client logos, row 2" />
        </div>
        {/* mobile: one swipeable rail */}
        <ul className="apf-rail" aria-label="Client logos">
          {COMPANIES.map((c) => <Tile key={c.src} c={c} />)}
        </ul>
      </div>

      <div className="apf-wrap">
        <div className="apf-proof apf-r" style={{ '--d': '800ms' }}>
          <ul>
            <li><b>20+</b> years of team expertise</li>
            <li><b>500+</b> global clients</li>
            <li><b>15M+</b> products enriched</li>
          </ul>
          <a href="#testimonials">See customer success stories <Icon name="arrow-right" /></a>
        </div>
      </div>
    </section>
  )
}
