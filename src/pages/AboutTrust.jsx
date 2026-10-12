import { useEffect, useRef, useState } from 'react'
import tuv9001 from '../assets/awards/tuv-iso-9001.png'
import tuv27001 from '../assets/awards/tuv-iso-27001.png'
import b2beaBadge from '../assets/awards/b2bea-member-badge.svg'
import './AboutTrust.css'

const ITEMS = [
  {
    n: '01', label: 'Quality management', logo: tuv9001, alt: 'TÜV Austria ISO 9001:2015 certification mark',
    title: 'ISO 9001:2015', sub: 'Quality Management System',
    text: 'Demonstrates a structured commitment to consistent quality, documented processes and continual improvement.',
  },
  {
    n: '02', label: 'Information security', logo: tuv27001, alt: 'TÜV Austria ISO/IEC 27001:2022 certification mark',
    title: 'ISO/IEC 27001:2022', sub: 'Information Security Management',
    text: 'Supports disciplined controls for protecting information, managing risk and maintaining secure operational practices.',
  },
  {
    n: '03', label: 'Industry recognition', logo: b2beaBadge, alt: 'B2B Ecommerce Association member badge', wide: true,
    title: 'B2B Ecommerce Association', sub: 'Industry membership',
    text: 'Connects AltiusNxt with the wider B2B digital-commerce community and industry best practices.',
  },
]

export default function AboutTrust() {
  const ref = useRef(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const f = requestAnimationFrame(() => setOn(true))
      return () => cancelAnimationFrame(f)
    }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: window.innerWidth < 768 ? 0.04 : 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} className={`at${on ? ' on' : ''}`} aria-labelledby="at-title">
      <div className="at-wrap">
        <div className="at-copy">
          <p className="at-eyebrow at-r" style={{ '--d': '0ms' }}>Trust &amp; recognition</p>
          <h2 id="at-title" className="at-r" style={{ '--d': '80ms' }}>Certified for quality.<br /><span>Recognized for industry expertise.</span></h2>
          <p className="at-lede at-r" style={{ '--d': '170ms' }}>
            Our quality, information-security and digital-commerce practices are supported by recognized certifications and industry associations.
          </p>
          <ul className="at-pillars at-r" style={{ '--d': '250ms' }}>
            <li>Quality</li><li>Security</li><li>B2B commerce</li>
          </ul>
        </div>

        <div className="at-panel at-r" style={{ '--d': '300ms' }}>
          {ITEMS.map((it, i) => (
            <article key={it.title} className={`at-item${it.wide ? ' wide' : ''} at-r`} style={{ '--d': `${420 + i * 140}ms` }}>
              <div className="at-logo"><img src={it.logo} alt={it.alt} loading="lazy" /></div>
              <div className="at-text">
                <p className="at-label"><span>{it.n}</span>{it.label}</p>
                <h3>{it.title}</h3>
                <p className="at-sub">{it.sub}</p>
                <p className="at-body">{it.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <p className="at-strip at-r" style={{ '--d': '900ms' }}>
        <span>Quality management</span><i aria-hidden="true" /><span>Information security</span><i aria-hidden="true" /><span>B2B digital commerce</span>
      </p>
    </section>
  )
}
