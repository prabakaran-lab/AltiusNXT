import { useCallback, useEffect, useRef, useState } from 'react'
import vellemanLogo from '../assets/logos/15-Velleman.webp'
import euAutomationLogo from '../assets/logos/03-EU-Automation.webp'
import traversLogo from '../assets/logos/13-Travers-Tool-Co.webp'
import './AboutTestimonials.css'
import Icon from '../components/ui/Icon.jsx'

/* Quotes and attributions are the approved testimonial text, unchanged.
   `outcome` repeats a fact that is stated in the quote itself. */
const TESTIMONIALS = [
  {
    quote: 'At Velleman we were faced with a huge project of onboarding +10,000 products into our PIM system. We discovered an ideal partner in AltiusNxt, who is assisting us in cleansing and enriching our data. AltiusNxt possesses expertise in product modeling data and knows how to handle projects of this kind. This made the collaboration smooth and successful.',
    name: 'Bennie Hebbelynck', title: 'Chief Information Officer', company: 'Velleman', logoSrc: vellemanLogo,
    outcome: '10,000+ products onboarded into their PIM system', preview: '10,000+ products onboarded into a PIM',
  },
  {
    quote: 'Consistently saw 90% of product enquires and over 30% of conversions due to the rich data enriched by Altius.',
    name: 'Frazer Cox', title: 'Development Team Leader', company: 'EU Automation, UK', logoSrc: euAutomationLogo,
    outcome: '90% of product enquiries and over 30% of conversions, from enriched data', preview: 'Rich data behind enquiries and conversions',
  },
  {
    quote: 'Working with AltiusNxt was a very positive experience. Their team successfully delivered unique content that was articulated clearly. When adjustments were required, they responded quickly. Communication back and forth was very efficient.',
    name: 'Alan Cohen', title: 'Project Manager, Product Marketing', company: 'Travers Tool Co., Inc.', logoSrc: traversLogo,
    outcome: 'Quick to respond. Efficient communication.', preview: 'Quick to respond, efficient communication',
  },
  {
    quote: "Our company has been working with AltiusNxt for close to two years on the full development of our new ecommerce website with more than 15,000 products. Throughout this time, we've developed a robust collaborative partnership. The entire process has been smooth and communication is consistently effective, regardless of your location when using their services. We are eager for the launch of our website in the next month and look forward to all our future projects with the company.",
    name: 'Greg Lurie', title: 'Finance | Marketing | IT', company: 'Screwman', logoText: 'THE SCREW MAN',
    outcome: 'Ecommerce website build with more than 15,000 products', preview: 'Ecommerce build with 15,000+ products',
  },
  {
    quote: "AltiusNxt has helped us enrich our SKU data with more than 50,000 products, and we are extremely satisfied with the data. It conveys the image of us being a leading authority on the products we offer. With the updated data, we've observed an approximate 23% increase in revenue from last year to this year. Remember that this result is due to a combination of factors, including the comprehensive data provided by AltiusNxt.",
    name: 'Mark Jansen', title: 'Digital Marketing Manager', company: 'Kempston Controls, UK', logoText: 'KEMPSTON CONTROLS',
    outcome: 'SKU data enriched for more than 50,000 products', preview: '50,000+ products enriched',
  },
]
const N = TESTIMONIALS.length

const Logo = ({ t, small }) => (
  <span className={`atm-logo${small ? ' sm' : ''}${t.logoSrc ? '' : ' text'}`}>
    {t.logoSrc ? <img src={t.logoSrc} alt={small ? '' : `${t.company} logo`} /> : <b>{t.logoText}</b>}
  </span>
)

export default function AboutTestimonials() {
  const ref = useRef(null)
  const railRef = useRef(null)
  const [on, setOn] = useState(false)
  const [i, setI] = useState(0)
  const [rail, setRail] = useState(0)

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

  const go = useCallback((n) => setI((n + N) % N), [])

  const onRailScroll = () => {
    const r = railRef.current
    if (!r) return
    const card = r.firstElementChild
    const step = card ? card.getBoundingClientRect().width + 12 : 1
    setRail(Math.max(0, Math.min(N - 1, Math.round(r.scrollLeft / step))))
  }
  const railTo = (n) => {
    const r = railRef.current
    if (!r) return
    const card = r.children[n]
    if (card) r.scrollTo({ left: card.offsetLeft - r.offsetLeft - 20, behavior: 'smooth' })
  }

  const t = TESTIMONIALS[i]

  return (
    <section ref={ref} id="testimonials" className={`atm${on ? ' on' : ''}`} aria-labelledby="atm-title">
      <div className="atm-wrap">
        <header className="atm-head">
          <p className="atm-eyebrow atm-r" style={{ '--d': '0ms' }}>Client testimonials</p>
          <h2 id="atm-title" className="atm-r" style={{ '--d': '80ms' }}>Real results. <span>Real relationships.</span></h2>
          <p className="atm-lede atm-r" style={{ '--d': '170ms' }}>
            Hear from manufacturers and distributors who trusted AltiusNxt with product data enrichment, PIM onboarding and eCommerce builds.
          </p>
        </header>

        {/* desktop: featured testimonial + selector */}
        <div className="atm-stage">
          <div className="atm-feature atm-r" style={{ '--d': '260ms' }} aria-live="polite">
            <span className="atm-qm" aria-hidden="true">&ldquo;</span>
            <figure key={i} className="atm-fig">
              <blockquote><p>{t.quote}</p></blockquote>
              <p className="atm-outcome"><span>Outcome</span>{t.outcome}</p>
              <figcaption>
                <Logo t={t} />
                <span className="atm-id">
                  <strong>{t.company}</strong>
                  <span>{t.name}</span>
                  <em>{t.title}</em>
                </span>
              </figcaption>
            </figure>
            <div className="atm-ctrl">
              <button type="button" onClick={() => go(i - 1)} aria-label="Previous testimonial"><Icon name="arrow-left" /></button>
              <button type="button" onClick={() => go(i + 1)} aria-label="Next testimonial"><Icon name="arrow-right" /></button>
              <span>{String(i + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}</span>
            </div>
          </div>

          <ul className="atm-nav" aria-label="Choose a testimonial">
            {TESTIMONIALS.map((x, k) => (
              <li key={x.company} className="atm-r" style={{ '--d': `${340 + k * 70}ms` }}>
                <button type="button" className={k === i ? 'on' : ''} aria-current={k === i ? 'true' : undefined} onClick={() => setI(k)}>
                  <Logo t={x} small />
                  <span>
                    <strong>{x.company}</strong>
                    <small>{x.preview}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* mobile: swipeable cards */}
        <div className="atm-mobile atm-r" style={{ '--d': '260ms' }}>
          <ul className="atm-rail" ref={railRef} onScroll={onRailScroll} aria-label="Client testimonials">
            {TESTIMONIALS.map((x) => (
              <li key={x.company} className="atm-card">
                <span className="atm-qm" aria-hidden="true">&ldquo;</span>
                <blockquote><p>{x.quote}</p></blockquote>
                <p className="atm-outcome"><span>Outcome</span>{x.outcome}</p>
                <div className="atm-cap">
                  <Logo t={x} />
                  <span className="atm-id">
                    <strong>{x.company}</strong>
                    <span>{x.name}</span>
                    <em>{x.title}</em>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="atm-dots">
            <button type="button" className="atm-arrow" aria-label="Previous testimonial" disabled={rail === 0} onClick={() => railTo(rail - 1)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg></button>
            {TESTIMONIALS.map((x, k) => (
              <button key={x.company} type="button" className={k === rail ? 'on' : ''} aria-label={`Show testimonial from ${x.company}`} aria-current={k === rail ? 'true' : undefined} onClick={() => railTo(k)} />
            ))}
            <button type="button" className="atm-arrow" aria-label="Next testimonial" disabled={rail === N - 1} onClick={() => railTo(rail + 1)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </div>
    </section>
  )
}
