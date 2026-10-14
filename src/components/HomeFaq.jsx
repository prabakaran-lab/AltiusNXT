import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, Send } from 'lucide-react'
import { sendContact } from '../services/api.js'
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

const EMPTY = { name: '', email: '', company: '', designation: '', message: '', website: '' }

export default function HomeFaq() {
  const ref = useRef(null)
  const [open, setOpen] = useState(0)
  const [seen, setSeen] = useState(false)
  // the "Still have a question?" contact form (same API and fields as the Contact page)
  const [f, setF] = useState(EMPTY)
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setState('sending'); setErr('')
    try {
      await sendContact(f)
      setState('sent'); setF(EMPTY)
    } catch (x) {
      setState('error'); setErr(x.message || 'Something went wrong.')
    }
  }

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

          <div className="hq-help hq-formcard">
            <b>Still have a question?</b>
            <small>A Product Data Expert will reply with a clear answer, no sales pressure.</small>
            {state === 'sent' ? (
              <div className="hq-done" role="status">
                <span className="tick"><Check size={20} strokeWidth={3.2} /></span>
                <strong>Message sent</strong>
                <p>Thank you. We have emailed you a confirmation and a Product Data Expert will reply shortly.</p>
                <button type="button" className="hq-again" onClick={() => setState('idle')}>Send another message</button>
              </div>
            ) : (
              <form className="hq-form" onSubmit={submit}>
                <div className="hq-row">
                  <label><span>Your name <i>*</i></span><input name="name" autoComplete="name" required value={f.name} onChange={set('name')} placeholder="Jane Doe" /></label>
                  <label><span>Work email <i>*</i></span><input name="email" type="email" autoComplete="email" required value={f.email} onChange={set('email')} placeholder="jane@company.com" /></label>
                </div>
                <div className="hq-row">
                  <label><span>Company</span><input name="company" autoComplete="organization" value={f.company} onChange={set('company')} placeholder="Company name" /></label>
                  <label><span>Designation</span><input name="designation" autoComplete="organization-title" value={f.designation} onChange={set('designation')} placeholder="Head of eCommerce" /></label>
                </div>
                <label><span>How can we help? <i>*</i></span><textarea name="message" rows={3} required minLength={10} value={f.message} onChange={set('message')} placeholder="Tell us about your catalog and what you would like to improve." /></label>
                <input className="hq-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
                <div className="hq-actions">
                  <button type="submit" className="hq-send" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : <>Send message <Send size={15} /></>}</button>
                  <small>By sending, you agree to our <Link to="/privacy-policy">Privacy Policy</Link>.</small>
                </div>
                <p className={`hq-err${state === 'error' ? ' on' : ''}`} role="alert">{state === 'error' && err}</p>
              </form>
            )}
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
