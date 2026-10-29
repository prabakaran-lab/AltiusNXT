import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export const TURNSTILE_ENABLED = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

let scriptPromise = null
function loadScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve()
      const el = document.createElement('script')
      el.src = SCRIPT_SRC
      el.async = true
      el.defer = true
      el.onload = () => resolve()
      el.onerror = () => reject(new Error('load failed'))
      document.head.appendChild(el)
    })
  }
  return scriptPromise
}

/* Cloudflare Turnstile captcha widget. Renders nothing when VITE_TURNSTILE_SITE_KEY is not set, so local
   dev (and any deploy before the key is configured) keeps every form working without it. Parent forms
   should gate submission on TURNSTILE_ENABLED + a verified token, and call ref.current.reset() after every
   submit attempt — a Turnstile token is single-use. */
const Turnstile = forwardRef(function Turnstile({ onVerify, onExpire }, ref) {
  const elRef = useRef(null)
  const widgetId = useRef(null)
  const [error, setError] = useState('')

  useImperativeHandle(ref, () => ({
    reset: () => { if (widgetId.current != null) window.turnstile?.reset(widgetId.current) },
  }))

  useEffect(() => {
    if (!SITE_KEY) return undefined
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !elRef.current || widgetId.current != null) return
        widgetId.current = window.turnstile.render(elRef.current, {
          sitekey: SITE_KEY,
          size: 'normal',
          callback: (token) => onVerify?.(token),
          'expired-callback': () => onExpire?.(),
          'error-callback': () => setError('Could not load the captcha. Please refresh and try again.'),
        })
      })
      .catch(() => setError('Could not load the captcha. Please refresh and try again.'))
    return () => {
      cancelled = true
      if (widgetId.current != null) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!SITE_KEY) return null
  return (
    <div className="turnstile-field">
      <div ref={elRef} />
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
})

export default Turnstile
