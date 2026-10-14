import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Plus } from 'lucide-react'
import './HomeFaq.css'

const QUESTIONS = [
  ['Do we need to replace our PIM or ERP?', 'No. CatalogWiz enriches and cleans your product data, then sends it into the platform you already use: your PIM, ERP or eCommerce store. No PIM? It works without one.'],
  ['Is my product data ready for UCP?', "UCP (Universal Commerce Protocol) is Google's open standard that lets AI shopping agents find, compare and buy products for a buyer. Agents rely on complete, consistent attributes, prices and stock. CatalogWiz fills those gaps and a data specialist human-verifies every value, so your catalog is UCP-ready."],
  ['Can CatalogWiz handle complex industrial products?', 'Yes. The workflows are built for technical products: specifications, identifiers, taxonomy, attributes, images, datasheets and validation, for industrial and other technical catalogs.'],
  ['How is the enriched data checked?', 'Every AI suggestion is reviewed by a product data specialist against the manufacturer documentation. A record only moves to approval after that review, and nothing is published until you sign off. Corrections go back with comments.'],
  ['Can we publish to our existing commerce platform?', 'Yes. Approved records can be delivered to storefronts, marketplaces, PIM / MDM systems and APIs. Share your platforms with a Product Data Expert and they will confirm the right integration route.'],
  ['What does the free AI Readiness Report test?', 'It tests one product page: which AI crawlers can read it, how ChatGPT, Claude, Gemini and Perplexity answer real buyer questions, how your price and stock compare, and a 15-point scorecard covering identity, specifications and structured data. You also get a prioritised fix plan.'],
  ['Is our data handled securely?', 'AltiusNxt is certified to ISO 27001 for information security and ISO 9001 for quality management by TÜV Austria. Nothing is published to your channels without your approval.'],
  ['Can we start with one category or a pilot?', 'Yes. Most teams start with a focused scope, such as one category or one product page. A Product Data Expert can agree a pilot with you before you decide on a wider rollout.'],
]

export default function HomeFaq() {
  const ref = useRef(null)
  const [open, setOpen] = useState(0)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.2 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <section className={`hq${seen ? ' seen' : ''}`} ref={ref} aria-labelledby="hq-title">
      <div className="hq-wrap">
        <div className="hq-intro">
          <p className="hq-eyebrow">Common questions</p>
          <h2 id="hq-title">Answers before you <em>get started.</em></h2>
          <p className="hq-sub">The questions teams ask before choosing a product-data workflow or an AI diagnostic.</p>

          <div className="hq-help">
            <b>Still have a question?</b>
            <small>A Product Data Expert will reply with a clear answer, no sales pressure.</small>
            <div>
              <Link className="hq-mail" to="/contact#contact-form"><Mail size={15} />Talk to an expert</Link>
            </div>
          </div>
        </div>

        <ul className="hq-list">
          {QUESTIONS.map(([q, a], i) => {
            const on = open === i
            return (
              <li key={q} className={on ? 'on' : ''} style={{ '--i': i }}>
                <h3>
                  <button type="button" aria-expanded={on} aria-controls={`hq-a${i}`} id={`hq-q${i}`} onClick={() => setOpen(on ? -1 : i)}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="q">{q}</span>
                    <span className="ico"><Plus size={16} strokeWidth={2.6} /></span>
                  </button>
                </h3>
                <div className="panel" id={`hq-a${i}`} role="region" aria-labelledby={`hq-q${i}`}>
                  <div><p>{a}</p></div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
