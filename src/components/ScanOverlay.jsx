import { useEffect, useState } from 'react'
import { Check, Download, X } from 'lucide-react'
import { downloadPdf } from './ConfirmModal.jsx'
import ReportBuild from './ReportBuild.jsx'
import ScanStory from './ScanStory.jsx'
import './ScanOverlay.css'

/* One popup for the whole journey, so the visitor never leaves it:
   scan    the five-scene story (ScanStory) while the product page is scanned
   result  the box dissolves, the score ring draws itself and the score counts up, with the gaps and the report button
   build   the 3D scene again while the full report is generated
   ready   the report is done: download it right here */

const FACES = ['f', 'b', 'r', 'l', 't', 'u']
const R = 70
const C = 2 * Math.PI * R

// counts from 0 to `to` over `ms`, easing out
export function useCountUp(to, run = true, ms = 1600) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!run) return undefined
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm) { const f = requestAnimationFrame(() => setV(to)); return () => cancelAnimationFrame(f) }
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms)
      setV(Math.round(to * (1 - (1 - k) ** 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, run, ms])
  return v
}

export function ScoreRing({ score, size = 140, run = true }) {
  const n = useCountUp(score, run)
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (!run) return undefined
    const f = requestAnimationFrame(() => setDrawn(true)) // one frame later, so the arc grows from empty
    return () => cancelAnimationFrame(f)
  }, [run])
  const good = score >= 50
  const col = good ? 'var(--green)' : 'var(--orange)'
  return (
    <div className="so-ring" style={{ width: size, height: size }} role="img" aria-label={`AI readiness score ${score} out of 100`}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle className="trk" cx="80" cy="80" r={R} />
        <circle className="bar" cx="80" cy="80" r={R} stroke={col} style={{ strokeDasharray: C, strokeDashoffset: run && drawn ? C * (1 - score / 100) : C }} />
      </svg>
      <div className="num"><b>{n}</b><small>AI readiness score</small></div>
    </div>
  )
}

export default function ScanOverlay({ stage, result, url = '', progress, confirmation, onGetReport, onClose, elapsed }) {
  const open = !!stage

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open || !onClose) return undefined
    const onKey = (e) => e.key === 'Escape' && stage !== 'build' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, stage, onClose])

  if (!open) return null
  const settled = stage === 'result' || stage === 'ready'
  const label = { scan: 'Scanning your product page', result: 'Your AI readiness score', build: 'Building your report', ready: 'Your report is ready' }[stage]

  return (
    <div className={`so${settled ? ' is-done' : ''}`} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => { if (e.target === e.currentTarget && stage !== 'build') onClose?.() }}>
      <div className={`so-card${stage === 'build' ? ' wide' : ''}`}>
        {stage !== 'build' && <button type="button" className="so-x" aria-label="Close" onClick={onClose}><X size={18} /></button>}
        {stage === 'build' ? <ReportBuild progress={progress} elapsed={elapsed} /> : stage === 'scan' ? <ScanStory url={url} /> : (
        <>
        <div className="so-scene" aria-hidden="true">
          <i className="so-floor" />
          <div className="so-world">
            <div className="so-cube">
              {FACES.map((f) => (
                <div key={f} className={`so-face ${f}`}>
                  <span className="bar b1" /><span className="bar b2" /><span className="bar b3" /><span className="pill" />
                </div>
              ))}
            </div>
            <i className="so-ringo r1" /><i className="so-ringo r2" /><i className="so-ringo r3" />
            <i className="so-plane" />
            <span className="so-chip c1">MPN</span><span className="so-chip c2">Specs</span><span className="so-chip c3">Schema</span><span className="so-chip c4">Price</span>
          </div>
          <div className="so-reveal">
            {stage === 'ready'
              ? <div className="so-ok"><Check size={64} strokeWidth={3} /></div>
              : <ScoreRing score={result?.score || 0} size={176} run={stage === 'result'} />}
          </div>
        </div>

        <div className="so-copy" aria-live="polite">
          {stage === 'result' && result && (
            <div className="so-result">
              <h3>{result.headline}</h3>
              {result.productName && <p className="pn">{result.productName}</p>}
              <ul className="so-gaps">{(result.topGaps || []).map((g) => <li key={g}>{g}</li>)}</ul>
              <button type="button" className="btn btn-primary so-cta" onClick={onGetReport}>Get my AI Readiness Report</button>
              <small>Free. A product data engineer approves your report.</small>
            </div>
          )}

          {stage === 'ready' && confirmation && (
            <>
              <h3>Report ready</h3>
              <p>
                Thanks{confirmation.firstName ? `, ${confirmation.firstName}` : ''}.{' '}
                {confirmation.emailStatus === 'sent' ? <>We have emailed your AI Readiness Report to <b>{confirmation.email}</b>. </> : 'Your AI Readiness Report is ready to download below. '}
                Look for the QR code inside the PDF: it opens a deeper AI Discoverability Audit.
              </p>
              {confirmation.pdfBase64 && (
                <button type="button" className="btn btn-primary so-cta" onClick={() => downloadPdf(confirmation.pdfBase64)}><Download size={16} />Download PDF</button>
              )}
              <button type="button" className="so-link" onClick={onClose}>Close</button>
            </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
