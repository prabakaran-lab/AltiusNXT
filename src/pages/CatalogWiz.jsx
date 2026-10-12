import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Layers, Send, ShieldCheck } from 'lucide-react'
import badgeIso9001 from '../assets/awards/tuv-iso-9001.png'
import badgeIso27001 from '../assets/awards/tuv-iso-27001.png'
import badgeB2bea from '../assets/awards/b2bea-member-badge.svg'
import Walkthrough from '../components/walkthrough/Walkthrough.jsx'
import EnrichDemo from '../components/catalogwiz/EnrichDemo.jsx'
import './HomeRefinement.css'
import './HomePolish.css'
import './HomeSystem.css'
import './CatalogWiz.css'

/* /catalogwiz: the product page. Reuses only the Home sections that explain CatalogWiz itself (walkthrough, categories, integrations, FAQ). */

const WT_HEAD = {
  eyebrow: '02 · How it works',
  title: <>How CatalogWiz runs, <em>step by step.</em></>,
  sub: 'Watch one real product go from raw supplier files to a published, human-verified record. The demo plays on its own, or click any step.',
}
const GIVE = [
  { t: 'One governed record', d: 'Excel, PDF and image files become one structured product record, with every gap flagged.', Ico: Layers },
  { t: 'Verified accuracy', d: 'AI drafts every value. A data specialist checks it against the manufacturer source.', Ico: ShieldCheck },
  { t: 'Ready everywhere', d: 'Approved records flow to storefronts, marketplaces, PIM / MDM systems and APIs.', Ico: Send },
]
const PROOF = [['20+', 'years of expertise'], ['500+', 'global clients'], ['15M+', 'products enriched']]
const BADGES = [[badgeIso9001, 'TÜV Austria ISO 9001:2015'], [badgeIso27001, 'TÜV Austria ISO/IEC 27001:2022'], [badgeB2bea, 'B2B Ecommerce Association member']]

const CHAPTERS = [
  ['cw-promise', 'The promise'],
  ['catalogwiz', 'How it works'],
  ['try', 'Try it'],
]

/* Side rail that shows where you are in the five-chapter story and jumps between chapters. */
function ChapterNav() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const els = CHAPTERS.map(([id]) => document.getElementById(id))
    const io = new IntersectionObserver((hits) => {
      hits.forEach((h) => { if (h.isIntersecting) setActive(els.indexOf(h.target)) })
    }, { rootMargin: '-45% 0px -45% 0px' })
    els.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])
  return (
    <nav className="cw-chap" aria-label="CatalogWiz story chapters">
      <ol>
        {CHAPTERS.map(([id, label], i) => (
          <li key={id} className={active === i ? 'on' : active > i ? 'past' : ''}>
            <a href={`#${id}`}><span>{label}</span><i>{i + 1}</i></a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function useReveal(ref) {
  useEffect(() => {
    const els = [...ref.current.querySelectorAll('.cw-rv')]
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach((e) => e.classList.add('in')); return undefined }
    const io = new IntersectionObserver((hits) => hits.forEach((h) => { if (h.isIntersecting) { h.target.classList.add('in'); io.unobserve(h.target) } }), { threshold: 0.18 })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ref])
}

export default function CatalogWiz() {
  const root = useRef(null)
  useReveal(root)

  useEffect(() => {
    const prev = document.title
    document.title = 'CatalogWiz: AI product data enrichment, human-verified | AltiusNxt'
    let m = document.querySelector('meta[name="description"]')
    const created = !m
    if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m) }
    const old = m.content
    m.content = 'CatalogWiz turns supplier files into accurate, structured, AI-ready product data. AI enriches every attribute and a data specialist verifies it before anything is published.'
    return () => { document.title = prev; if (created) m.remove(); else m.content = old }
  }, [])

  return (
    <div className="home-page cw-page" ref={root}>
      <section className="cwh" id="cw-promise" aria-labelledby="cwh-t">
        <div className="cwh-glow" aria-hidden="true" />
        <div className="cwh-wrap">
          <p className="cwh-kicker">01 · The promise</p>
          <h1 id="cwh-t">The product data workbench. <em>AI-enriched, human-verified.</em></h1>
          <p className="cwh-sub">CatalogWiz turns supplier files into accurate, structured, AI-ready product data. AI fills in every attribute, and a data specialist checks each value against the manufacturer source before anything is published.</p>
          <div className="cwh-act">
            <Link className="btn btn-primary" to="/contact">Talk to a Product Data Expert <ArrowRight size={16} /></Link>
            <a className="btn btn-outline" href="#catalogwiz">See how it works</a>
          </div>

          <ul className="cwh-give" aria-label="What CatalogWiz gives you">
            {GIVE.map(({ t, d, Ico }, i) => (
              <li key={t} style={{ '--i': i }}>
                <span className="g-ico"><Ico size={24} strokeWidth={2} /></span>
                <b>{t}</b>
                <p>{d}</p>
              </li>
            ))}
          </ul>

          <div className="cwh-proof">
            <ul className="cwh-nums">
              {PROOF.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}
            </ul>
            <span className="cwh-div" aria-hidden="true" />
            <ul className="cwh-badges" aria-label="Certifications">
              {BADGES.map(([src, alt]) => <li key={alt}><img src={src} alt={alt} loading="lazy" /></li>)}
            </ul>
          </div>
        </div>
      </section>

      <Walkthrough head={WT_HEAD} />

      <EnrichDemo>
        <div className="cw-ctacard">
          <h3>Start with one category, <em>or one product page.</em></h3>
          <p>Share a sample of your supplier data and a Product Data Expert will show you what CatalogWiz makes of it. No obligation.</p>
          <div className="cwh-act">
            <Link className="btn btn-primary" to="/contact">Talk to a Product Data Expert <ArrowRight size={16} /></Link>
            <Link className="btn btn-outline" to="/ai-readiness-report">Get Free AI Readiness Report</Link>
          </div>
        </div>
      </EnrichDemo>

      <ChapterNav />
    </div>
  )
}
