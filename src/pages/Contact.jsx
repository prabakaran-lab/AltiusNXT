import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { sendContact } from '../services/api.js'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'
import Turnstile, { TURNSTILE_ENABLED } from '../components/Turnstile.jsx'
import './Contact.css'

const OFFICES = [
  { id: 'us', name: 'United States', addr: ['31700 West Thirteen Mile Road, Suite 205', 'Farmington Hills, MI 48334'], phones: [['', '+1 313 486 9697', '+13134869697']] },
  { id: 'in', name: 'India', addr: ['56-C, Bharathi Park, 2nd Cross', 'Saibaba Colony, Coimbatore, Tamil Nadu 641011'], phones: [['Sales', '+91 9952317740', '+919952317740'], ['Careers', '+91 7708182828', '+917708182828']] },
]
// hpField: the honeypot. Named away from common words like "website" / "url" / "company" on purpose —
// Chrome and other browsers can autofill a hidden field from a saved address/business profile based on
// its name alone, even with autocomplete="off", which silently triggered the honeypot for real visitors
// (the form said "Message sent" but nothing was ever saved or emailed). An unrecognizable name isn't a
// known autofill category, so nothing fills it.
const EMPTY = { name: '', email: '', company: '', designation: '', message: '', hpField: '' }

export default function Contact() {
  const ref = useRef(null)
  const [f, setF] = useState(() => ({ ...EMPTY, message: (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('message')) || '' }))
  const [state, setState] = useState('idle') // idle | sending | sent | error
  const [err, setErr] = useState('')
  const [seen, setSeen] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)

  useEffect(() => {
    document.title = 'Contact | AltiusNxt'
    const f0 = requestAnimationFrame(() => setSeen(true))
    return () => cancelAnimationFrame(f0)
  }, [])

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (TURNSTILE_ENABLED && !captchaToken) { setState('error'); setErr('Please complete the captcha.'); return }
    setState('sending'); setErr('')
    try {
      await sendContact({ ...f, turnstileToken: captchaToken })
      setState('sent'); setF(EMPTY)
    } catch (x) {
      setState('error'); setErr(x.message || 'Something went wrong.')
    } finally {
      captchaRef.current?.reset(); setCaptchaToken('')
    }
  }

  const mailto = `mailto:sales@altiusnxt.com?subject=${encodeURIComponent('Website enquiry')}&body=${encodeURIComponent(`${f.message}\n\n${f.name}${f.designation ? `, ${f.designation}` : ''}${f.company ? `, ${f.company}` : ''}`)}`

  return (
    <div className={`ct${seen ? ' seen' : ''}`} ref={ref}>
      <PageSeo
        title="Contact AltiusNxt | Talk to a Product Data Engineer"
        description="Talk to a product data expert about product data enrichment, catalog management and CatalogWiz. Offices in the USA and India."
        keywords={['contact AltiusNxt', 'product data expert', 'product data enrichment services', 'catalog management services', 'CatalogWiz demo']}
        structuredData={[breadcrumb('/contact', 'Contact')]}
      />
      <section className="ct-hero">
        <div className="ct-wrap">
          <p className="ct-eyebrow">Contact</p>
          <h1>Let&rsquo;s talk about your <em>product data.</em></h1>
          <p className="ct-lead">Tell us what you are working on. A product data engineer will reply within one business day with a clear answer and no sales pressure.</p>
          <ul className="ct-quick">
            <li><Clock size={15} />Reply within one business day</li>
            <li><Check size={15} strokeWidth={3} />No obligation</li>
            <li><Check size={15} strokeWidth={3} />Your details stay private</li>
          </ul>
        </div>
      </section>

      <section className="ct-main">
        <div className="ct-wrap ct-grid">
          <form id="contact-form" className="ct-form" onSubmit={submit} noValidate={false} aria-describedby="ct-status">
            {state === 'sent' ? (
              <div className="ct-done" role="status">
                <span className="tick"><Check size={26} strokeWidth={3.2} /></span>
                <h2>Message sent</h2>
                <p>Thank you. We have emailed you a confirmation and a product data engineer will reply shortly.</p>
                <button type="button" className="btn btn-outline" onClick={() => setState('idle')}>Send another message</button>
              </div>
            ) : (
              <>
                <h2>Send us a message</h2>
                <div className="ct-row">
                  <label><span>Your name <i>*</i></span><input name="name" autoComplete="name" required value={f.name} onChange={set('name')} placeholder="Jane Doe" /></label>
                  <label><span>Work email <i>*</i></span><input name="email" type="email" autoComplete="email" required value={f.email} onChange={set('email')} placeholder="jane@company.com" /></label>
                </div>
                <div className="ct-row">
                  <label><span>Company</span><input name="company" autoComplete="organization" value={f.company} onChange={set('company')} placeholder="Company name" /></label>
                  <label><span>Designation</span><input name="designation" autoComplete="organization-title" value={f.designation} onChange={set('designation')} placeholder="Head of eCommerce" /></label>
                </div>
                <label><span>How can we help? <i>*</i></span><textarea name="message" rows={6} required minLength={10} value={f.message} onChange={set('message')} placeholder="Tell us about your catalog, channels and what you would like to improve." /></label>
                <input className="ct-hp" name="hp_field" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.hpField} onChange={set('hpField')} />
                <Turnstile ref={captchaRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
                <div className="ct-actions">
                  <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : <>Send message <Send size={16} /></>}</button>
                  <small>By sending, you agree to our <a href="/privacy-policy">Privacy Policy</a>.</small>
                </div>
                <p id="ct-status" className={`ct-err${state === 'error' ? ' on' : ''}`} role="alert">
                  {state === 'error' && <>{err} <a href={mailto}>Email us directly instead <ArrowRight size={13} /></a></>}
                </p>
              </>
            )}
          </form>

          <aside className="ct-side">
            <div className="ct-card">
              <h3>Talk to us directly</h3>
              <ul className="ct-list">
                <li><span className="ic"><Mail size={17} /></span><div><small>Email</small><a href="mailto:sales@altiusnxt.com">sales@altiusnxt.com</a></div></li>
                <li><span className="ic"><Phone size={17} /></span><div><small>Sales, India</small><a href="tel:+919952317740">+91 9952317740</a></div></li>
                <li><span className="ic"><Phone size={17} /></span><div><small>Sales, United States</small><a href="tel:+13134869697">+1 313 486 9697</a></div></li>
              </ul>
            </div>

            <div className="ct-card">
              <h3>Our offices</h3>
              <div className="ct-offices">
                {OFFICES.map((o) => (
                  <div key={o.id} className="ct-office">
                    <b><MapPin size={15} />{o.name}</b>
                    <p>{o.addr[0]}<br />{o.addr[1]}</p>
                    {o.phones.map(([l, t, h]) => <a key={h} href={`tel:${h}`}>{l && <em>{l}</em>}{t}</a>)}
                  </div>
                ))}
              </div>
            </div>

            <a className="ct-cta" href="/ai-readiness-report">
              <div><b>Not ready to talk yet?</b><small>Get a free AI Readiness Report for one product page.</small></div>
              <ArrowRight size={18} />
            </a>
          </aside>
        </div>
      </section>
    </div>
  )
}
