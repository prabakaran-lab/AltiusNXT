import { useRef, useState } from 'react'
import Modal from '../Modal.jsx'
import Turnstile, { TURNSTILE_ENABLED } from '../Turnstile.jsx'

const EMPTY = { name: '', company: '', email: '', phone: '' }
/* Same rule as the server: digits with an optional + ( ) . - and spaces, at least 7 digits. */
const phoneOk = (p) => /^[+()\d][\d\s().+-]{5,24}$/.test(p) && p.replace(/\D/g, '').length >= 7

/* Asks who is requesting the live enrichment demo, before it runs on their product page. */
export default function LiveDemoModal({ url, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const captchaRef = useRef(null)
  const update = (field) => (e) => { setError(''); setForm((f) => ({ ...f, [field]: e.target.value })) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!phoneOk(form.phone.trim())) { setError('Please enter a valid phone number, for example +1 555 123 4567.'); return }
    if (TURNSTILE_ENABLED && !captchaToken) { setError('Please complete the captcha.'); return }
    onSubmit({ ...form, name: form.name.trim(), company: form.company.trim(), email: form.email.trim(), phone: form.phone.trim(), turnstileToken: captchaToken })
  }

  return (
    <Modal title="See CatalogWiz enrich your page" onClose={onClose}>
      <p className="modal-sub">
        Tell us who to send this to, and CatalogWiz will enrich your product page live: a better title and description, plus a
        full set of verified attributes.
      </p>
      <form className="lead-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="ld-url">Your product page</label>
          <input id="ld-url" type="url" value={url} readOnly aria-readonly="true" />
        </div>
        <div className="field">
          <label htmlFor="ld-name">Full name *</label>
          <input id="ld-name" name="name" autoComplete="name" required value={form.name} onChange={update('name')} />
        </div>
        <div className="field">
          <label htmlFor="ld-company">Company name *</label>
          <input id="ld-company" name="company" autoComplete="organization" required value={form.company} onChange={update('company')} />
        </div>
        <div className="lead-form-row">
          <div className="field">
            <label htmlFor="ld-email">Work email *</label>
            <input id="ld-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
          </div>
          <div className="field">
            <label htmlFor="ld-phone">Phone number *</label>
            <input id="ld-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required value={form.phone} onChange={update('phone')} />
          </div>
        </div>
        <Turnstile ref={captchaRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 8 }}>Enrich my page</button>
        <p className="field-hint" style={{ marginTop: 10, textAlign: 'center' }}>We only use these details to follow up on your demo.</p>
      </form>
    </Modal>
  )
}
