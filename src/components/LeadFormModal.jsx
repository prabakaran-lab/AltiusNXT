import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'

const EMPTY = {
  firstName: '',
  lastName: '',
  company: '',
  companyWebsite: '',
  email: '',
  jobTitle: '',
  revenueBracket: '',
}

const REVENUE_BRACKETS = [
  { value: '', label: "Prefer not to say / not sure" },
  { value: 'under_5m', label: 'Under $5M' },
  { value: '5m_25m', label: '$5M – $25M' },
  { value: '25m_100m', label: '$25M – $100M' },
  { value: 'over_100m', label: '$100M+' },
]

// Rough timings from real runs: page fetch ~10s, Gemini analysis ~15s, PDF + emails ~3s.
// Purely cosmetic staging (no live progress from the server) so a ~25-30s wait doesn't look frozen.
const PROGRESS_STAGES = [
  { at: 0, label: 'Generating your report…' },
  { at: 1500, label: 'Reading the product page…' },
  { at: 10000, label: 'Running the AI analysis…' },
  { at: 23000, label: 'Building your PDF…' },
  { at: 26000, label: 'Sending it over…' },
]

function useProgressLabel(active) {
  const [label, setLabel] = useState(PROGRESS_STAGES[0].label)

  useEffect(() => {
    if (!active) {
      setLabel(PROGRESS_STAGES[0].label)
      return
    }
    const timers = PROGRESS_STAGES.map((stage) => setTimeout(() => setLabel(stage.label), stage.at))
    return () => timers.forEach(clearTimeout)
  }, [active])

  return label
}

export default function LeadFormModal({ onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(EMPTY)
  const progressLabel = useProgressLabel(submitting)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <Modal title="Get your AI Readiness Report" onClose={onClose}>
      <p className="modal-sub">
        Thirty seconds to fill in. Your report is then built live — ChatGPT, Claude and Gemini are queried the
        way buyers ask, and real sellers are benchmarked — which takes a few minutes. We'll email it to you too.
      </p>
      <form className="lead-form" onSubmit={handleSubmit}>
        <div className="lead-form-row">
          <div className="field">
            <label htmlFor="firstName">First name *</label>
            <input id="firstName" required value={form.firstName} onChange={update('firstName')} />
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name *</label>
            <input id="lastName" required value={form.lastName} onChange={update('lastName')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="company">Company name *</label>
          <input id="company" required value={form.company} onChange={update('company')} />
        </div>
        <div className="field">
          <label htmlFor="companyWebsite">Company website</label>
          <input id="companyWebsite" type="url" placeholder="https://" value={form.companyWebsite} onChange={update('companyWebsite')} />
        </div>
        <div className="field">
          <label htmlFor="revenueBracket">Approximate annual revenue</label>
          <select id="revenueBracket" value={form.revenueBracket} onChange={update('revenueBracket')}>
            {REVENUE_BRACKETS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <span className="field-hint">Only used to size the revenue-at-risk estimate — never shared beyond this report.</span>
        </div>
        <div className="lead-form-row">
          <div className="field">
            <label htmlFor="email">Work email *</label>
            <input id="email" type="email" required value={form.email} onChange={update('email')} />
          </div>
          <div className="field">
            <label htmlFor="jobTitle">Job Title</label>
            <input id="jobTitle" type="text" value={form.jobTitle} onChange={update('jobTitle')} />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
          {submitting ? progressLabel : 'Get my report'}
        </button>
        {submitting && <p className="modal-sub" style={{ marginTop: 10, marginBottom: 0, textAlign: 'center' }}>Starting your report — progress will show on the page in a moment.</p>}
      </form>
    </Modal>
  )
}
