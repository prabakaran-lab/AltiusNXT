import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ArrowRight, BarChart3, CalendarDays, Check, FileCheck2, FileText, Fingerprint, Link2, ListTree, Mail, MapPin, ScanSearch, ShieldCheck, X } from 'lucide-react'
import { TESYS } from '../components/sampleProduct.js'
import badgeIso9001 from '../assets/awards/tuv-iso-9001.png'
import badgeIso27001 from '../assets/awards/tuv-iso-27001.png'
import badgeB2bea from '../assets/awards/b2bea-member-badge.svg'

/* Sections of the /ai-readiness-report page below the hero. Anything with the `rv` class fades up when it
   scrolls into view (see useReveal); `--d` sets the stagger. */

export function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const els = [...root.querySelectorAll('.rv')]
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('in'))
      return undefined
    }
    const io = new IntersectionObserver((hits) => {
      hits.forEach((h) => { if (h.isIntersecting) { h.target.classList.add('in'); io.unobserve(h.target) } })
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [rootRef])
}

/* Counts up from zero once its parent `.rv` has revealed. */
export function Num({ to, delay = 0 }) {
  const [n, setN] = useState(0)
  const [calm] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [el, setEl] = useState(null)
  useEffect(() => {
    if (!el || calm) return undefined
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now() + delay
      const step = (now) => {
        const t = Math.max(0, Math.min(1, (now - t0) / 1100))
        setN(Math.round(to * (1 - (1 - t) ** 3)))
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [el, to, calm, delay])
  return <span ref={setEl}>{calm ? to : n}</span>
}

const PAGES = [
  ['Summary', 'The headline finding and three key numbers'],
  ['AI search results', 'Six buyer queries on four AI engines, and who got named'],
  ['The five gaps', 'What is missing on your page, ranked by impact.'],
  ['Current and enriched page', 'Side-by-side mock-up, before and after'],
  ['Commercial impact', 'Price comparison and an illustrative cost of doing nothing'],
  ['Recommended next steps', 'A walkthrough or a complimentary three-product assessment'],
]
const QUERIES = [
  ['“Where to buy [your product] in [your country]?”', 'Sellers cited: overseas retailers and two marketplaces'],
  ['“[Your product] specifications, sterile, latex free?”', 'Sellers cited: three international suppliers'],
  ['“Best [category] supplier for a clinic in [your country]?”', 'Sellers cited: four local distributors'],
]

export function ReceiveSection() {
  return (
    <section className="rp-sec rp-white" aria-labelledby="rp-recv">
      <div className="rp-wrap">
        <header className="rp-head rv">
          <span className="rp-eb">What you receive</span>
          <h2 id="rp-recv">A 6-page report on how AI sees your product. <em>And what to fix.</em></h2>
          <p>We run buyer-style searches in ChatGPT, Claude, Gemini and Perplexity, then check your page field by field. Here is what the report covers, with an anonymized sample result.</p>
        </header>
        <div className="rp-recv">
          <div className="rp-box rv">
            <span className="rp-chip">Your 6 pages</span>
            <ol className="rp-pages">
              {PAGES.map(([t, d], i) => (
                <li key={t} className="rv" style={{ '--d': i + 1 }}><i>{i + 1}</i><div><b>{t}</b><small>{d}</small></div></li>
              ))}
            </ol>
          </div>
          <div className="rp-box rv" style={{ '--d': 2 }}>
            <span className="rp-chip">Sample result (anonymized)</span>
            <ul className="rp-qs">
              {QUERIES.map(([q, s], i) => (
                <li key={q} className="rv" style={{ '--d': i + 2 }}>
                  <i>Q</i>
                  <div><b>{q}</b><small>{s}</small><em><X size={12} strokeWidth={3.4} />Your company: Not cited</em></div>
                </li>
              ))}
            </ul>
            <p className="rp-fine">Illustrative sample. Your report shows what the engines actually said about your page.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const HOW = [
  { t: 'Paste one product page', d: 'Choose a product you want AI to recommend. We only read the public page.', Ico: Link2 },
  { t: 'We test it live', d: 'We ask ChatGPT, Claude, Gemini and Perplexity the same buyer questions and record every answer as evidence.', Ico: ScanSearch },
  { t: 'You get your expert-approved report', d: 'A product data expert verifies and approves every report before it reaches you: the gaps, the fixes in priority order and a before and after example.', Ico: FileText },
]

export function HowSection() {
  return (
    <section className="rp-sec" aria-labelledby="rp-how">
      <div className="rp-wrap">
        <header className="rp-head rp-center rv">
          <span className="rp-eb">How it works</span>
          <h2 id="rp-how">From one URL to a clear report, <em>in three steps.</em></h2>
        </header>
        <div className="rhw rv">
          <div className="rhw-track" aria-hidden="true"><i /></div>
          <ol className="rhw-grid">
            {HOW.map(({ t, d, Ico }, i) => (
              <li key={t} style={{ '--i': i }}>
                <span className="rhw-badge"><Ico size={22} strokeWidth={2.2} /></span>
                <small>Step {i + 1}</small>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function LevelsSection() {
  return (
    <section className="rp-sec rp-white" aria-labelledby="rp-lvl">
      <div className="rp-wrap">
        <header className="rp-head rv">
          <span className="rp-eb">Two levels of detail</span>
          <h2 id="rp-lvl">Start free. <em>Go deeper by email.</em></h2>
          <p>The report you get after pasting your URL is written in plain language for decision-makers. For the technical scoring behind it, ask us for the detailed audit.</p>
        </header>
        <div className="lv-grid">
          <article className="lv-card rv">
            <span className="rp-chip">Free</span>
            <h3>Free AI Readiness Report (expert-verified)</h3>
            <p>Six pages on what AI engines say about one product page, and what to change.</p>
            <ul>
              <li><Check size={15} strokeWidth={3} />Six buyer queries on four AI engines</li>
              <li><Check size={15} strokeWidth={3} />Five gaps and an enriched-page mock-up</li>
              <li><Check size={15} strokeWidth={3} />Illustrative cost of doing nothing, which you can replace with your real figures</li>
            </ul>
            <a className="btn btn-primary" href="#arr-top">Get my free report <ArrowRight size={16} /></a>
          </article>
          <article className="lv-card hot rv" style={{ '--d': 2 }}>
            <span className="rp-chip">By email request</span>
            <h3>Detailed AI Visibility Audit (on request)</h3>
            <p>The scoring behind your report: how well AI can find, understand and recommend your product.</p>
            <ul>
              <li><Check size={15} strokeWidth={3} />15-point scorecard across Find, Understand and Recommend</li>
              <li><Check size={15} strokeWidth={3} />AI query logs</li>
              <li><Check size={15} strokeWidth={3} />Price benchmark and recommended page rebuild</li>
              <li><Check size={15} strokeWidth={3} />Page snapshot and full attribute map on request</li>
            </ul>
            <a className="btn btn-outline" href="mailto:manoj@altiusnxt.com?subject=Detailed%20audit%20report%20request&body=Product%20page%20URL%3A%0ACompany%3A%0AName%20and%20role%3A"><Mail size={16} />Email us for the detailed audit</a>
          </article>
        </div>
      </div>
    </section>
  )
}

/* Scroll story: the product page on the left builds up layer by layer as each step on the right passes the middle of the screen. */
const LAYERS = [
  { n: 1, Ico: Fingerprint, short: 'Identity', t: 'Identity and taxonomy', q: 'Can AI resolve the product?', d: 'Manufacturer, MPN, GTIN and classification (UNSPSC / eClass / ETIM). Without a clear identity, AI cannot tell this breaker from a look-alike.', ex: ['Schneider Electric', 'MPN TELGV3P73', 'Motor Protection Circuit Breakers'], c: '#2f5fae' },
  { n: 2, Ico: ListTree, short: 'Attributes', t: 'Attribute normalization', q: 'Can AI read the specs?', d: 'One schema per category, with units and values written the same way on every product, validated against benchmark distributor sites.', ex: ['Current rating: 73 A', 'AC voltage: 690 V', 'Mounting: DIN Rail'], c: '#2f78b5' },
  { n: 3, Ico: ShieldCheck, short: 'Verification', t: 'Expert verification', q: 'Are the specs right?', d: 'A domain expert signs off on every spec against the source. No guessed values reach your page.', ex: ['Checked against the datasheet', 'Signed off by a data specialist'], c: '#1f9a8a' },
  { n: 4, Ico: FileCheck2, short: 'Compliance', t: 'Technical and compliance data', q: 'Can AI trust the product?', d: 'Datasheets, certifications and ratings are published as data, with images and documents linked so claims can be checked.', ex: ['Datasheet PDF', 'UL 60947-4-1', 'IEC/EN 60947-2'], c: '#5aa356' },
  { n: 5, Ico: Link2, short: 'Relationships', t: 'Relationships', q: 'Can AI answer “what fits, what’s equivalent”?', d: 'Cross-references, mating parts, substitutes and variants connect the product to everything around it.', ex: ['Cross-reference', 'Mating part', 'Substitute', 'Variant'], c: '#d9a21f' },
  { n: 6, Ico: FileText, short: 'Authority', t: 'Authority content', q: 'Would AI choose it?', d: 'Application prose, buying guides and answers to real buyer questions give AI a reason to pick you over the next seller.', ex: ['Application: motor protection', 'Buying guide', 'Buyer Q&A'], c: '#f2862a' },
  { n: 7, Ico: BarChart3, short: 'Signals', t: 'Discoverability signals and monitoring', q: 'Does AI actually cite it?', d: 'A JSON-LD graph and answer-ready pages make the product easy to cite, and we re-score it across AI engines to keep it that way.', ex: ['JSON-LD graph', 'Answer-ready page', 'Re-scored across AI engines'], c: '#ff6a1a' },
]
const ENGINES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity']

export function LayersSection() {
  const [active, setActive] = useState(() => ('IntersectionObserver' in window ? 0 : 7))
  const stepRefs = useRef([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver((hits) => {
      hits.forEach((h) => { if (h.isIntersecting) setActive(Number(h.target.dataset.n)) })
    }, { rootMargin: '-42% 0px -42% 0px' })
    stepRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const cur = LAYERS[Math.max(active, 1) - 1]
  const pct = Math.round((active / 7) * 100)

  return (
    <section className="rp-sec rp-layers" aria-labelledby="rp-lay">
      <div className="rp-wrap">
        <header className="rp-head rv">
          <span className="rp-eb">The framework</span>
          <h2 id="rp-lay">The 7 layers that make a product page <em>AI-ready.</em></h2>
          <p>AI search engines and shopping assistants only recommend products they can identify, read, trust and compare. Scroll to watch one real product page get built from the bottom up, and see where your five gaps map onto these layers.</p>
        </header>

        <div className="st">
          <div className="st-stage" aria-hidden="true">
            <div className="st-ask" key={active}>
              <span>{active === 0 ? 'Start' : 'AI asks'}</span>
              <b>{active === 0 ? 'Can AI recommend this product?' : cur.q}</b>
              {active === 7 && <em>Yes. It gets cited.</em>}
            </div>

            <div className="st-card">
              <div className="st-head">
                <span className="st-pic"><img src={TESYS.images.front} alt="" /></span>
                <div>
                  <b>Motor Circuit Breaker, 3P, 690 V ac, 65 kA</b>
                  <small>A real catalog product, built layer by layer</small>
                </div>
              </div>
              <ul className="st-blocks">
                {LAYERS.map(({ n, Ico, short, ex, c }) => (
                  <li key={n} className={`st-blk${active >= n ? ' on' : ''}${active === n ? ' now' : ''}`} style={{ '--c': c, '--n': n }}>
                    <span className="st-bico"><Ico size={16} strokeWidth={2.3} /></span>
                    <div>
                      <small>Layer {n} · {short}</small>
                      <p>
                        {ex.map((x) => <span key={x}>{x}</span>)}
                        {n === 7 && ENGINES.map((e) => <span key={e} className="eng"><Check size={11} strokeWidth={3.4} />{e}</span>)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="st-meter">
              <div><span>AI readiness</span><b>{pct}%</b></div>
              <i><u style={{ width: `${pct}%` }} /></i>
              <small>{active} of 7 layers in place</small>
            </div>
          </div>

          <ol className="st-steps">
            {LAYERS.map(({ n, Ico, t, q, d, ex, c }) => (
              <li key={n} ref={(el) => { stepRefs.current[n - 1] = el }} data-n={n} className={active === n ? 'now' : active > n ? 'past' : ''} style={{ '--c': c }}>
                <span className="st-num">{n}</span>
                <span className="st-sico"><Ico size={22} strokeWidth={2.1} /></span>
                <h3>{t}</h3>
                <p className="st-q">{q}</p>
                <p className="st-d">{d}</p>
                <p className="st-ex">{ex.map((x) => <span key={x}>{x}</span>)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

const CERTS = [
  [badgeIso9001, 'ISO 9001:2015', 'Quality Management · TÜV Austria'],
  [badgeIso27001, 'ISO/IEC 27001:2022', 'Information Security · TÜV Austria'],
  [badgeB2bea, 'B2B Ecommerce Association', '2026 member'],
]

export function NextSection() {
  return (
    <section className="rp-sec" aria-labelledby="rp-next">
      <div className="rp-wrap">
        <header className="rp-head rp-center rv">
          <span className="rp-eb">Recommended next steps</span>
          <h2 id="rp-next">Two ways to go <em>through the findings.</em></h2>
        </header>
        <div className="lv-grid">
          <article className="lv-card rv">
            <span className="rp-chip">Option A · Virtual</span>
            <h3>20-minute walkthrough</h3>
            <p>A screen-share with our catalog team to review the fuller audit: the AI query logs, your gaps and the proposed page rebuild. Bring your real revenue figures and we’ll replace the illustrative model with a precise one on the call.</p>
            <RouterLink className="btn btn-primary" to="/contact#contact-form" target="_blank" rel="noopener">Book a walkthrough <ArrowRight size={16} /></RouterLink>
          </article>
          <article className="lv-card rv" style={{ '--d': 2 }}>
            <span className="rp-chip">Option B · Complimentary assessment</span>
            <h3>Three products of your choice</h3>
            <p>Send us three product pages you care about most. No sales figures needed. We show you live how AI search responds to each one today, and what it would have to work with after enrichment. No proposal or commitment required.</p>
            <a className="btn btn-outline" href="mailto:manoj@altiusnxt.com?subject=Three%20product%20pages%20for%20assessment&body=Product%20page%20URLs%3A%0A1.%0A2.%0A3.">Send three product pages</a>
          </article>
        </div>
        <div className="tr rv">
          <div className="tr-event">
            <span className="rp-chip">Meet us in person</span>
            <h3>B2B eCommerce World Americas</h3>
            <ul>
              <li><CalendarDays size={17} />Nov 2-3</li>
              <li><MapPin size={17} />JW Marriott Indianapolis</li>
            </ul>
            <p>Find us at the show and bring your report. We’ll walk through it with you.</p>
          </div>
          <div className="tr-certs">
            <p className="tr-title">Certified and trusted</p>
            <ul>
              {CERTS.map(([src, name, sub], i) => (
                <li key={name} style={{ '--d': i + 2 }} className="rv">
                  <span><img src={src} alt={name} loading="lazy" /></span>
                  <b>{name}</b>
                  <small>{sub}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="rp-fine rp-center rv">AltiusNxt Technologies is certified to ISO 9001:2015 (Quality Management) and ISO/IEC 27001:2022 (Information Security Management) by TÜV Austria, and is a 2026 member of the B2B Ecommerce Association.</p>
      </div>
    </section>
  )
}

export const AI_READINESS_FAQ = [
  ['Which page should I submit?', 'A single product page for one product, such as a page for one drill, one glove or one part number. A homepage or a category listing with many products can’t be checked.'],
  ['Which AI assistants do you test?', 'ChatGPT, Claude, Gemini and Perplexity. We run six buyer-style queries with live web search, then ask each engine to review your page. Answers are kept as evidence.'],
  ['Is the report really free?', 'Yes. One product page, actionable findings, no obligation. Any enrichment work would be scoped and quoted separately, only if you ask for it.'],
  ['How do I get the detailed score report?', 'Email manoj@altiusnxt.com with your product page URL and ask for the detailed audit. It includes the 15-point scorecard for Find, Understand and Recommend, plus the AI query logs.'],
  ['Do I need to share my revenue?', 'No. The commercial impact page uses a clearly labeled illustrative figure. We replace it with your real number only if you choose to share it on a call.'],
  ['Do you need access to my website?', 'No. We use your live public product page, the manufacturer’s catalog and public seller listings.'],
  ['Will I get the same answers if I ask AI myself?', 'Maybe not. AI answers vary between runs and engines, so the report is a snapshot. We keep the full transcripts and can re-run any query live with you.'],
  ['Is a person involved?', 'Yes. AI runs the tests, and a product data expert verifies and approves every report before we send it to you.'],
  ["Does the report cover UCP?", "Yes. We flag the product details AI shopping agents using Google's Universal Commerce Protocol (UCP) need, such as identifiers, attributes, price and stock."],
]

export function FaqSection() {
  return (
    <section className="rp-sec rp-white" aria-labelledby="rp-faq">
      <div className="rp-wrap rp-faqgrid">
        <header className="rp-head rv">
          <span className="rp-eb">FAQ</span>
          <h2 id="rp-faq">Answers before <em>you get started.</em></h2>
          <p>Short answers on what we test, what you receive and what it costs.</p>
        </header>
        <div className="rp-faqs">
          {AI_READINESS_FAQ.map(([q, a], i) => (
            <details key={q} className="rv" style={{ '--d': Math.min(i, 4) }} open={i === 0}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </div>
    </section>
  )
}
