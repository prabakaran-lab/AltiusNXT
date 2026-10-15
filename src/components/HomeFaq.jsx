import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Send } from 'lucide-react'
import { sendContact } from '../services/api.js'
import './HomeFaq.css'

const QUESTIONS = [
  ['Who checks the data: your engineers or my team?', 'Our engineers. Every AI-drafted value is checked by an AltiusNxt product data engineer against the manufacturer source before you see it. Your team approves the result; it does not have to do the checking.'],
  ['How is AltiusNxt different from AI enrichment software?', 'Software gives your team a faster review queue. We give you verified data: our engineers carry the accuracy work, and we test the result on AI assistants and Google.'],
  ['Can you show which competitors AI recommends instead of us?', 'Yes. The free AI Readiness Report records which sellers ChatGPT, Claude, Gemini and Perplexity name for your buyers’ questions. The paid audit tracks this across your top categories.'],
  ['How much does enrichment cost?', 'It depends on the category and how many attributes each product needs. We start with a free 20-SKU sample, then quote a fixed price for a pilot (from $X).'],
  ['Do we need to replace our PIM or ERP?', 'No. CatalogWiz enriches and cleans your product data, then sends it into the platform you already use: your PIM, ERP or eCommerce store. No PIM? It works without one.'],
  ['Is my product data ready for UCP and ACP?', "UCP (Google) and ACP (OpenAI) let AI agents compare and buy products. Both rely on complete, consistent product data, accurate price and stock. CatalogWiz builds and verifies that data. The protocol connection itself runs through your commerce platform or Google Merchant Center, and we’ll tell you which applies to you."],
  ['Can CatalogWiz handle complex industrial products?', 'Yes. The workflows are built for technical products: specifications, identifiers, taxonomy, attributes, images, datasheets and validation, for industrial and other technical catalogs.'],
  ['How is the enriched data checked?', 'Every AI-drafted value is checked by an AltiusNxt product data engineer against the manufacturer documentation. A record only moves to approval after that review, and nothing is published until you sign off. Corrections go back with comments. Found a wrong value? We correct it free.'],
  ['Can we publish to our existing commerce platform?', 'Yes. Approved records can be delivered to storefronts, marketplaces, PIM / MDM systems and APIs. Share your platforms with a Product Data Engineer and they will confirm the right integration route.'],
  ['What does the free AI Readiness Report test?', 'It tests one product page: which AI crawlers can read it, how ChatGPT, Claude, Gemini and Perplexity answer real buyer questions, how your price and stock compare, and a 15-point scorecard covering identity, specifications and structured data. You also get a prioritised fix plan.'],
  ['Is our data handled securely?', 'AltiusNxt is certified to ISO 27001 for information security and ISO 9001 for quality management by TÜV Austria. Nothing is published to your channels without your approval.'],
  ['Can we start with one category or a pilot?', 'Yes. Most teams start with a focused scope, such as one category or one product page. A Product Data Engineer can agree a pilot with you before you decide on a wider rollout.'],
]

const EMPTY = { name: '', email: '', company: '', designation: '', topic: 'Talk to a Product Data Engineer', message: '', website: '' }

export default function HomeFaq() {
  const ref = useRef(null)
  const [open, setOpen] = useState(0)
  const [seen, setSeen] = useState(false)
  const [f, setF] = useState(EMPTY)
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setState('sending'); setErr('')
    try { await sendContact(f); setState('sent'); setF(EMPTY) } catch (x) { setState('error'); setErr(x.message || 'Something went wrong.') }
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

          <div className="hq-help">
            <b>Still have a question?</b>
            <small>A product data engineer will reply with a clear answer, no sales pressure.</small>
            {state === 'sent' ? (
              <p className="hq-ok" role="status"><Check size={16} strokeWidth={3} />Thank you. A product data engineer will reply shortly.</p>
            ) : (
              <form className="hq-form" onSubmit={submit}>
                <input className="hq-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
                <div className="r2">
                  <label><span>Your name <i>*</i></span><input name="name" autoComplete="name" required value={f.name} onChange={set('name')} placeholder="Jane Doe" /></label>
                  <label><span>Work email <i>*</i></span><input name="email" type="email" autoComplete="email" required value={f.email} onChange={set('email')} placeholder="jane@company.com" /></label>
                </div>
                <div className="r2">
                  <label><span>Company</span><input name="company" autoComplete="organization" value={f.company} onChange={set('company')} placeholder="Company name" /></label>
                  <label><span>Designation</span><input name="designation" autoComplete="organization-title" value={f.designation} onChange={set('designation')} placeholder="e.g. Head of eCommerce" /></label>
                </div>
                <label><span>How can we help? <i>*</i></span><textarea name="message" rows={3} required minLength={10} value={f.message} onChange={set('message')} placeholder="Tell us about your catalog and what you would like to improve." /></label>
                <button className="hq-mail" type="submit" disabled={state === 'sending'}><Send size={15} />{state === 'sending' ? 'Sending…' : 'Send message'}</button>
                {state === 'error' && <p className="hq-err" role="alert">{err}</p>}
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
