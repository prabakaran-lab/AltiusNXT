import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'

const BASE = import.meta.env.VITE_API_URL || ''
const CLICKS = 5
const CLICK_WINDOW_MS = 3000
const HOLD_MS = 3000

/* The "©" in the footer. To a visitor it is plain text. Five quick clicks on it (or holding it for three seconds, on a phone)
   opens a small sign-in box for the site owner. Nothing here names or links to the dashboard: the address only comes back from
   the server after the right password, and the dashboard itself is locked on the server. */
export default function AdminGate() {
  const [open, setOpen] = useState(false)
  const taps = useRef([])
  const hold = useRef(0)

  useEffect(() => () => window.clearTimeout(hold.current), [])

  const onClick = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < CLICK_WINDOW_MS), now]
    if (taps.current.length >= CLICKS) { taps.current = []; setOpen(true) }
  }
  const startHold = () => { window.clearTimeout(hold.current); hold.current = window.setTimeout(() => setOpen(true), HOLD_MS) }
  const stopHold = () => window.clearTimeout(hold.current)

  return (
    <>
      <span
        onClick={onClick}
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(e) => { if (hold.current) e.preventDefault() }}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      >©</span>
      {open && <SignIn onClose={() => setOpen(false)} />}
    </>
  )
}

function SignIn({ onClose }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/api/x/session`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) { window.location.assign(data.url); return }
      setError(res.status === 429 ? 'Too many attempts. Try again later.' : 'That did not work.')
    } catch {
      setError('That did not work.')
    }
    setBusy(false)
  }

  return (
    <Modal title="Sign in" onClose={onClose}>
      <form className="lead-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="ag-pw">Password</label>
          <input id="ag-pw" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => { setError(''); setPassword(e.target.value) }} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || !password} style={{ width: '100%', marginTop: 8 }}>Continue</button>
      </form>
    </Modal>
  )
}
