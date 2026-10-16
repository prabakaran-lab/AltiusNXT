import { useEffect, useRef, useState } from 'react'
import { Check, Mail, ShieldCheck } from 'lucide-react'
import Modal from './Modal.jsx'
import { sendOtp, verifyOtp } from '../services/api.js'

const EMPTY = { name: '', company: '', email: '', revenueBracket: '' }

const REVENUE_BRACKETS = [
  { value: 'under_5m', label: 'Under $5M' },
  { value: '5m_25m', label: '$5M – $25M' },
  { value: '25m_100m', label: '$25M – $100M' },
  { value: 'over_100m', label: '$100M+' },
]

/* Two steps in one modal:
   1. details  Name, Company, Email, Approximate annual revenue (all required) -> "Send verification code"
   2. code     the visitor types the 6-digit code emailed to them -> verified -> the report starts building
   `verified` ({ email, token }) is kept by the page, so if the build fails and this opens again the visitor is not asked twice. */
export default function LeadFormModal({ onClose, onSubmit, submitting, error, verified, onVerified }) {
  const [form, setForm] = useState(EMPTY)
  const [step, setStep] = useState('details') // details | code
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [wait, setWait] = useState(0)
  const codeRef = useRef(null)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const alreadyVerified = !!verified && verified.email.toLowerCase() === form.email.trim().toLowerCase()

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  const sendCode = async () => {
    setBusy(true); setMsg('')
    try {
      const out = await sendOtp({ email: form.email.trim(), name: form.name.trim() })
      setStep('code'); setCode(''); setWait(out.retryAfter || 30)
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDetails = (e) => {
    e.preventDefault()
    if (alreadyVerified) { onSubmit({ ...form, name: form.name.trim(), verifyToken: verified.token }); return }
    sendCode()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg('')
    try {
      const out = await verifyOtp({ email: form.email.trim(), code })
      onVerified?.({ email: form.email.trim(), token: out.token })
      onSubmit({ ...form, name: form.name.trim(), verifyToken: out.token })
    } catch (err) {
      setMsg(err.message)
      setCode('')
      codeRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const working = busy || submitting

  return (
    <Modal title={step === 'code' ? 'Verify your email' : 'Get your AI Readiness Report'} onClose={onClose}>
      {step === 'details' ? (
        <>
          <p className="modal-sub">
            Enter your details and verify your email. Your report is then built live, with ChatGPT, Claude and Gemini queried the
            way buyers ask. It takes a few minutes, and we will email it to you too.
          </p>
          <form className="lead-form" onSubmit={handleDetails}>
            <div className="field">
              <label htmlFor="name">Name *</label>
              <input id="name" name="name" autoComplete="name" required value={form.name} onChange={update('name')} />
            </div>
            <div className="field">
              <label htmlFor="company">Company name *</label>
              <input id="company" name="company" autoComplete="organization" required value={form.company} onChange={update('company')} />
            </div>
            <div className="field">
              <label htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
            </div>
            <div className="field">
              <label htmlFor="revenueBracket">Approximate annual revenue *</label>
              <select id="revenueBracket" name="revenueBracket" required value={form.revenueBracket} onChange={update('revenueBracket')}>
                <option value="" disabled>Select a range</option>
                {REVENUE_BRACKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
              <span className="field-hint">Only used to size the revenue-at-risk estimate. Never shared beyond this report.</span>
            </div>

            {(msg || error) && <p className="form-error">{msg || error}</p>}

            <button className="btn btn-primary" type="submit" disabled={working} style={{ width: '100%', marginTop: 8, gap: 8 }}>
              {submitting ? 'Starting your report…' : busy ? 'Sending code…' : alreadyVerified ? <><Check size={16} />Email verified: get my report</> : <><Mail size={16} />Send verification code</>}
            </button>
            <p className="field-hint" style={{ textAlign: 'center', margin: 0 }}>We will email a 6-digit code to confirm it is really you.</p>
          </form>
        </>
      ) : (
        <>
          <p className="modal-sub">We emailed a 6-digit code to <strong>{form.email.trim()}</strong>. It expires in 10 minutes.</p>
          <form className="lead-form" onSubmit={handleVerify}>
            <div className="field">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required
                placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ fontSize: 26, letterSpacing: '.5em', textAlign: 'center', fontWeight: 800, height: 56 }}
              />
            </div>

            {(msg || error) && <p className="form-error">{msg || error}</p>}

            <button className="btn btn-primary" type="submit" disabled={working || code.length !== 6} style={{ width: '100%', gap: 8 }}>
              {submitting ? 'Starting your report…' : busy ? 'Verifying…' : <><ShieldCheck size={16} />Verify and get my report</>}
            </button>
            <div className="lead-otp-links">
              <button type="button" disabled={wait > 0 || busy} onClick={sendCode}>{wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}</button>
              <button type="button" onClick={() => { setStep('details'); setMsg('') }}>Change email</button>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}
