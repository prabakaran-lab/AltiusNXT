import { useEffect, useRef } from 'react'

import imgEnrichment from '../assets/home/cap-enrichment.jpg'
import imgTaxonomy from '../assets/home/cap-taxonomy.jpg'
import imgAttributes from '../assets/home/cap-attributes.jpg'

const CARDS = [
  {
    n: '01',
    title: 'Product Data Enrichment',
    text: 'Turn incomplete supplier information into complete, consistent and marketplace-ready product content.',
    tags: ['Descriptions', 'Specifications', 'Features', 'Data Quality'],
    img: imgEnrichment,
    alt: 'Product data specialist enriching a valve listing on dual monitors',
  },
  {
    n: '02',
    title: 'Product Taxonomy Services',
    text: 'Build intuitive product hierarchies and classifications that make products easier to navigate, search and discover.',
    tags: ['Classification', 'Hierarchies', 'Mapping', 'Navigation'],
    img: imgTaxonomy,
    alt: 'Specialist reviewing a product category tree in a warehouse',
  },
  {
    n: '03',
    title: 'Product Attribute Development',
    text: 'Create standardized attributes, values and units that improve product filtering, comparison and downstream channel consistency.',
    tags: ['Attributes', 'Units', 'Validation', 'Standardization'],
    img: imgAttributes,
    alt: 'Engineer measuring a valve body to verify its attribute values',
  },
]

export default function CapabilitiesShowcase() {
  const sectionRef = useRef(null)

  // Scroll reveal
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (!('IntersectionObserver' in window)) {
      section.classList.add('is-in')
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add('is-in')
        observer.disconnect()
      }
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.2 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Desktop-only motion: scroll parallax on the cards + cursor tilt / image shift per card
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || reduce.matches) return

    let scrollFrame = 0
    const updateScroll = () => {
      scrollFrame = 0
      const r = section.getBoundingClientRect()
      const vh = window.innerHeight
      // -1 when the section is entering from below, +1 when leaving above
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)))
      section.style.setProperty('--sp', p.toFixed(4))
    }
    const onScroll = () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll)
    }
    updateScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    const cleanups = []
    section.querySelectorAll('.cap-card').forEach((card) => {
      let frame = 0
      let nx = 0
      let ny = 0
      const apply = () => {
        frame = 0
        card.style.setProperty('--rx', (ny * -1.2).toFixed(3))
        card.style.setProperty('--ry', (nx * 1.4).toFixed(3))
        card.style.setProperty('--ix', (nx * -3).toFixed(2))
        card.style.setProperty('--iy', (ny * -3).toFixed(2))
      }
      const onMove = (e) => {
        const r = card.getBoundingClientRect()
        nx = ((e.clientX - r.left) / r.width - 0.5) * 2
        ny = ((e.clientY - r.top) / r.height - 0.5) * 2
        if (!frame) frame = requestAnimationFrame(apply)
      }
      const onLeave = () => {
        nx = 0
        ny = 0
        if (!frame) frame = requestAnimationFrame(apply)
      }
      card.addEventListener('pointermove', onMove)
      card.addEventListener('pointerleave', onLeave)
      cleanups.push(() => {
        cancelAnimationFrame(frame)
        card.removeEventListener('pointermove', onMove)
        card.removeEventListener('pointerleave', onLeave)
      })
    })

    return () => {
      cancelAnimationFrame(scrollFrame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return (
    <section id="cap" ref={sectionRef} className="cap" aria-labelledby="cap-heading">
      <div className="cap-bg" aria-hidden="true">
        <span className="cap-glow" />
        <span className="cap-dots" />
        <svg className="cap-orbit" viewBox="0 0 800 800" fill="none"><circle cx="400" cy="400" r="380" /><circle cx="400" cy="400" r="270" /></svg>
      </div>

      <div className="wrap cap-wrap">
        <div className="cap-copy">
          <span className="cap-eyebrow cap-r" style={{ '--i': 0 }}><i aria-hidden="true" />Our core capabilities</span>
          <h2 id="cap-heading" className="cap-title">
            <span className="cap-line" style={{ '--i': 1 }}><span>Turn product knowledge</span></span>
            <span className="cap-line" style={{ '--i': 2 }}><span>into a <em className="cap-wipe">competitive</em></span></span>
            <span className="cap-line" style={{ '--i': 3 }}><span><em className="cap-wipe cap-wipe-2">advantage.</em></span></span>
          </h2>
          <p className="cap-lede cap-r" style={{ '--i': 5 }}>
            We combine deep product-data expertise, proven processes, and intelligent technology to transform
            complex supplier information into structured, accurate, commerce-ready content that improves
            discovery, conversion, and customer experience.
          </p>
        </div>

        <div className="cap-stage">
          <svg className="cap-line-svg" viewBox="0 0 1000 400" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path pathLength="1" d="M0 250 C 180 120, 330 120, 500 215 S 820 330, 1000 150" />
          </svg>
          <ol className="cap-cards">
            {CARDS.map((c, i) => (
              <li key={c.n} className={`cap-slot cap-slot-${i + 1}`} style={{ '--i': i }}>
                <article className="cap-card">
                  <div className="cap-tilt">
                    <div className="cap-media">
                      <img src={c.img} alt={c.alt} width="1000" height="667" loading="lazy" decoding="async" />
                      <span className="cap-fade" aria-hidden="true" />
                      <span className="cap-chip" aria-hidden="true">{c.n}</span>
                      <svg className="cap-nodes" viewBox="0 0 48 32" fill="none" aria-hidden="true">
                        <path d="M6 24 18 10 30 20 42 6" />
                        <circle cx="6" cy="24" r="2.4" /><circle cx="18" cy="10" r="2.4" /><circle cx="30" cy="20" r="2.4" /><circle className="live" cx="42" cy="6" r="2.8" />
                      </svg>
                    </div>
                    <div className="cap-body">
                      <h3>{c.title}</h3>
                      <p>{c.text}</p>
                      <ul className="cap-tags">
                        {c.tags.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    </div>
                  </div>
                  <span className="cap-sweep" aria-hidden="true" />
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
