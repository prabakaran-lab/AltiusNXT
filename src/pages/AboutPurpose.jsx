import { useEffect, useRef, useState } from 'react'
import purposeImg from '../assets/about/purpose-team.webp'
import './AboutPurpose.css'

const SERVE = ['Manufacturers', 'Distributors', 'Industrial ecommerce teams', 'Product-data teams']

export default function AboutPurpose() {
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
    <section ref={ref} className={`ap${on ? ' on' : ''}`} aria-labelledby="ap-title">
      <div className="ap-wrap">
        <figure className="ap-media ap-r" style={{ '--d': '0ms' }}>
          <img
            src={purposeImg}
            width="1586" height="992" loading="lazy"
            alt="AltiusNxt product-data specialists reviewing structured industrial product information on screen"
          />
          <figcaption>
            <b>Product-data expertise</b>
            <span>Manufacturers · Distributors · Industrial commerce</span>
          </figcaption>
        </figure>

        <div className="ap-body">
          <p className="ap-eyebrow ap-r" style={{ '--d': '120ms' }}>Our purpose</p>
          <h2 id="ap-title" className="ap-r" style={{ '--d': '180ms' }}>Better product data.<br />Stronger digital commerce.</h2>
          <p className="ap-intro ap-r" style={{ '--d': '260ms' }}>
            AltiusNxt helps manufacturers and distributors turn complex, fragmented product information into accurate,
            structured and AI-ready content — making products easier to manage, publish, discover and buy across digital channels.
          </p>
          <p className="ap-statement ap-r" style={{ '--d': '340ms' }}>Help technical products become easier to understand, discover and buy.</p>

          <article className="ap-block ap-r" style={{ '--d': '430ms' }}>
            <span className="ap-num">01</span>
            <div>
              <p className="ap-label">Our vision</p>
              <h3>Make trusted product information accessible everywhere buyers look.</h3>
              <p>
                We envision a future where manufacturers and distributors can make complete, accurate and structured product
                information available across ecommerce platforms, marketplaces, product information management (PIM) systems and
                AI-driven discovery experiences — without product-data complexity slowing growth.
              </p>
            </div>
          </article>

          <article className="ap-block ap-r" style={{ '--d': '540ms' }}>
            <span className="ap-num">02</span>
            <div>
              <p className="ap-label">Our mission</p>
              <h3>Turn messy product data into product pages that sell.</h3>
              <p>
                We combine product data experts with AI that works fast. Together we enrich, clean and organise your product
                information so buyers, marketplaces and AI search can find it and trust it.
              </p>
              <p>
                We help manufacturers and distributors reduce manual product-data work, improve content quality and move trusted
                product records into the channels their customers already use.
              </p>
            </div>
          </article>

          <div className="ap-serve ap-r" style={{ '--d': '640ms' }}>
            <span>Who we serve</span>
            <ul>{SERVE.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  )
}
