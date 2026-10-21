import { useState } from 'react'
import Icon from '../ui/Icon.jsx'
import { cta } from '../../data/resources.js'
import { trackMailtoClick } from '../../services/hubspotTrack.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY = { name: '', email: '', phone: '', company: '', requirement: '' }

/* Shared CTA + contact form. There is no contact endpoint, so a valid submit opens a pre-filled email to sales. */
export default function CtaBlock() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!values.name.trim()) next.name = 'Please enter your name.'
    if (!values.email.trim()) next.email = 'Please enter your email address.'
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'Please enter a valid email address.'
    if (!values.company.trim()) next.company = 'Please enter your company.'
    setErrors(next)
    if (Object.keys(next).length) return
    const body = [
      `Name: ${values.name}`, `Email: ${values.email}`, `Phone: ${values.phone}`,
      `Company: ${values.company}`, '', values.requirement,
    ].join('\n')
    trackMailtoClick('resources_cta_demo_request_click')
    window.location.href = `mailto:${cta.email}?subject=${encodeURIComponent('Free demo request')}&body=${encodeURIComponent(body)}`
    setSent(true)
    setValues(EMPTY)
  }

  const field = (id, label, required, props = {}) => (
    <div className="rs-field">
      <label htmlFor={`cta-${id}`}>{label}{required && <b aria-hidden="true"> *</b>}</label>
      <input
        id={`cta-${id}`} name={id} value={values[id]} onChange={set(id)} required={required}
        aria-invalid={errors[id] ? 'true' : undefined} aria-describedby={errors[id] ? `cta-${id}-err` : undefined}
        {...props}
      />
      {errors[id] && <span className="rs-field-err" id={`cta-${id}-err`} role="alert">{errors[id]}</span>}
    </div>
  )

  // Keep "High-Quality" together so the headline never breaks at the hyphen.
  const [before, after] = cta.heading.split('High-Quality')

  return (
    <section className="rs-cta" aria-labelledby="rs-cta-title">
      <div className="rs-cta-copy">
        <p className="rs-cta-eyebrow">Free consultation</p>
        <h2 id="rs-cta-title">{before}<span className="nowrap">High-Quality</span>{after}</h2>
        <p className="rs-cta-lead">{cta.text}</p>

        <h3 className="rs-cta-label">Our services</h3>
        <ul className="rs-cta-services">
          {cta.services.map((s) => <li key={s}>{s}</li>)}
        </ul>

        <ul className="rs-cta-contacts">
          {cta.contacts.map((c) => (
            <li key={c.label}>
              <span className="rs-cta-ico"><Icon name={c.icon} size={18} /></span>
              <span><small>{c.label}</small><a href={c.href}>{c.value}</a></span>
            </li>
          ))}
        </ul>
      </div>

      <form className="rs-cta-form" onSubmit={submit} noValidate>
        <div className="rs-cta-form-head">
          <h3>{cta.formHeading}</h3>
          <p>Tell us a little about your catalog and we’ll set up your free demo.</p>
        </div>
        <div className="rs-form-grid">
          {field('name', 'Name', true, { type: 'text', autoComplete: 'name' })}
          {field('email', 'Email address', true, { type: 'email', autoComplete: 'email' })}
          {field('phone', 'Phone', false, { type: 'tel', autoComplete: 'tel' })}
          {field('company', 'Company', true, { type: 'text', autoComplete: 'organization' })}
        </div>
        <div className="rs-field">
          <label htmlFor="cta-requirement">Describe your requirement</label>
          <textarea id="cta-requirement" name="requirement" rows="4" value={values.requirement} onChange={set('requirement')} />
        </div>
        <div className="rs-cta-submit">
          <button className="btn btn-primary" type="submit">Get Free Demo <Icon name="arrow-right" size={16} /></button>
          <p><Icon name="shield" size={14} /> No obligation. We reply from {cta.email}.</p>
        </div>
        {sent && <p className="rs-form-ok" role="status">Thanks — your email app should open with your request ready to send to {cta.email}.</p>}
      </form>
    </section>
  )
}
