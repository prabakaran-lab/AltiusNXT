import { useEffect, useRef, useState } from 'react'
import teamImg from '../assets/about/team-office.webp'
import './AboutTeam.css'
import Icon from '../components/ui/Icon.jsx'

const EXPERTISE = ['Collaboration', 'Innovation', 'Customer Success']

export default function AboutTeam() {
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
    <section ref={ref} id="team" className={`atn${on ? ' on' : ''}`} aria-labelledby="atn-title">
      <div className="atn-wrap">
        <div className="atn-copy">
          <p className="atn-eyebrow atn-r" style={{ '--d': '0ms' }}>People behind the data</p>
          <h2 id="atn-title" className="atn-r" style={{ '--d': '80ms' }}>A team that <span>makes it possible.</span></h2>
          <p className="atn-lede atn-r" style={{ '--d': '170ms' }}>
            Our success is built on the expertise and dedication of our people — a diverse team of product data analysts,
            engineers, taxonomy specialists and ecommerce professionals working together to solve complex challenges.
          </p>
          <a className="atn-btn atn-r" style={{ '--d': '260ms' }} href="mailto:sales@altiusnxt.com?subject=Meet%20the%20AltiusNxt%20team">
            Meet Our Team <Icon name="arrow-right" />
          </a>
        </div>

        <figure className="atn-media atn-r" style={{ '--d': '200ms' }}>
          <img src={teamImg} width="1672" height="941" loading="lazy" alt="AltiusNxt product-data specialists collaborating around a monitor of technical product images in an open office" />
          <figcaption className="atn-card atn-r" style={{ '--d': '600ms' }}>
            <strong><i aria-hidden="true" />Expertise</strong>
            <ul>{EXPERTISE.map((t) => <li key={t}>{t}</li>)}</ul>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
