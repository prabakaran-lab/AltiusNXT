import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import workbenchHero from '../assets/home/workbench-hero.png'
import WorkbenchStates from './WorkbenchStates.jsx'
import Icon from './ui/Icon.jsx'

export default function WorkbenchShowcase() {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)

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
    }, { threshold: window.innerWidth < 768 ? 0.04 : 0.18 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Subtle pointer parallax (desktop, fine pointer only), eased in one rAF loop
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const canTilt = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!canTilt.matches || reduce.matches) return

    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let frame = 0
    let running = false

    const tick = () => {
      current.x += (target.x - current.x) * 0.05
      current.y += (target.y - current.y) * 0.05
      stage.style.setProperty('--mx', current.x.toFixed(4))
      stage.style.setProperty('--my', current.y.toFixed(4))
      if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
        frame = requestAnimationFrame(tick)
      } else {
        running = false
      }
    }
    const kick = () => {
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }
    const onMove = (e) => {
      const r = stage.getBoundingClientRect()
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
      kick()
    }
    const onLeave = () => {
      target.x = 0
      target.y = 0
      kick()
    }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <section id="wbs" ref={sectionRef} className="wbs" aria-labelledby="wbs-heading">
      <div className="wbs-bg" aria-hidden="true">
        <span className="wbs-blob wbs-blob-a" />
        <span className="wbs-blob wbs-blob-b" />
        <span className="wbs-dots wbs-dots-a" />
        <span className="wbs-dots wbs-dots-b" />
        <svg className="wbs-orbit" viewBox="0 0 800 800" fill="none"><circle cx="400" cy="400" r="380" /><circle cx="400" cy="400" r="290" /></svg>
      </div>

      <div className="wrap wbs-wrap">
        <div className="wbs-main">
        <div className="wbs-copy">
          <span className="wbs-eyebrow wbs-r" style={{ '--i': 0 }}><i aria-hidden="true" />CatalogWiz Product Data Workbench</span>
          <h2 id="wbs-heading" className="wbs-title wbs-r" style={{ '--i': 1 }}>
            Turn fragmented product data into <span>complete, channel-ready</span> content.
          </h2>
          <p className="wbs-sub wbs-r" style={{ '--i': 2 }}>One workspace for the people who build and approve the record.</p>
          <p className="wbs-lede wbs-r" style={{ '--i': 3 }}>
            Review taxonomy, classification, schema, enrichment, digital assets and quality in context.
            A human approval path makes it clear when a record is ready to move forward.
          </p>
          <Link className="wbs-cta wbs-r" style={{ '--i': 4 }} to="/how-it-works">
            Explore CatalogWiz Workbench <Icon name="arrow-right" />
          </Link>
        </div>

        <div className="wbs-visual">
          <WorkbenchStates />
          <div ref={stageRef} className="wbs-stage">
            <div className="wbs-glow" aria-hidden="true" />
            <div className="wbs-tilt">
              <img
                className="wbs-img"
                src={workbenchHero}
                alt="CatalogWiz Workbench: product table with AI Enrichment, Smart Taxonomy, Quality Validation and Multi-Channel Publishing panels"
                width="1586"
                height="992"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
        </div>

        <div className="wbs-governance" aria-labelledby="wbs-review-title">
          <div className="wbs-review-intro">
            <p className="home-eyebrow">Human review and governance</p>
            <h3 id="wbs-review-title">A record moves forward when the right people approve it.</h3>
          </div>
          <ol className="wbs-review-steps">
            <li><span>01</span><strong>Data Analyst</strong><small>Prepare and check the product record</small></li>
            <li><span>02</span><strong>Account Manager</strong><small>Review customer requirements</small></li>
            <li><span>03</span><strong>Category Manager</strong><small>Approve the category and publish state</small></li>
          </ol>
          <p className="wbs-review-note">If rejected: comment → revise → resubmit. When approved: next stage unlocked → publish.</p>
        </div>
      </div>
    </section>
  )
}
