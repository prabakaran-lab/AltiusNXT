import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Send } from 'lucide-react'
import { sendContact } from '../services/api.js'
import './HomeFaq.css'

/* The "Still have a question?" contact form: same API and fields as the Contact page and the Home FAQ.
   Its styles (.hq-*) live in HomeFaq.css. */
const EMPTY = { name: '', email: '', company: '', designation: '', message: '', website: '' }

export default function QuestionForm({ title = 'Still have a question?', note = 'A product data engineer will reply with a clear answer, no sales pressure.' }) {
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

  return (
    <div className="hq-help hq-formcard">
      <b>{title}</b>
      <small>{note}</small>
      {state === 'sent' ? (
        <div className="hq-done" role="status">
          <span className="tick"><Check size={20} strokeWidth={3.2} /></span>
          <strong>Message sent</strong>
          <p>Thank you. We have emailed you a confirmation and a product data engineer will reply shortly.</p>
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
  )
}
