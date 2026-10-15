import { useEffect, useRef, useState } from 'react'
import { Bot, Check, CircleAlert, FileText, MessagesSquare, Scale, Search, SearchX, ShoppingCart, X } from 'lucide-react'
import { TESYS } from '../components/sampleProduct.js'
import { useSearchParams } from 'react-router-dom'
import { quickScan, submitLead } from '../services/api.js'
import LeadFormModal from '../components/LeadFormModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import PageSeo, { breadcrumb } from '../components/PageSeo.jsx'
import { AI_READINESS_FAQ, FaqSection, HowSection, LayersSection, LevelsSection, NextSection, Num, ReceiveSection, useReveal } from './ReportSections.jsx'
import './AIReadinessReport.css'

/* The four numbers tell the story in order: you give one page, we ask six questions, on four engines, and find five gaps. */
const STORY = [
  { n: 1, k: 'You give us', d: 'product page is all we need', Ico: FileText },
  { n: 6, k: 'We ask', d: 'buyer-style queries run for you', Ico: MessagesSquare },
  { n: 4, k: 'On', d: 'AI engines: ChatGPT, Claude, Gemini and Perplexity', Ico: Bot },
  { n: 5, k: 'We find', d: 'gaps that stop AI recommending you', Ico: SearchX },
]
const WHY_STEPS = [
  { t: 'Find', d: 'The agent looks for products that match what the buyer asked for. If it cannot read your page, you are not in the results.', Ico: Search },
  { t: 'Compare', d: 'It compares specs, part numbers, price and stock side by side. Missing or inconsistent details drop you out.', Ico: Scale },
  { t: 'Choose', d: 'Who does AI name, and why them? The report shows what to fix so that seller is you.', Ico: ShoppingCart },
]
const ENGINES = ['ChatGPT', 'Claude', 'Gemini', 'Perplexity']

export default function AIReadinessReport() {
  const [searchParams] = useSearchParams()
  const [url, setUrl] = useState(searchParams.get('url') || '')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [result, setResult] = useState(null)

  const [showLeadForm, setShowLeadForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [leadError, setLeadError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [progress, setProgress] = useState(null)
  const root = useRef(null)
  const resultRef = useRef(null)
  useReveal(root)

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [result])

  const runScan = async (targetUrl) => {
    setScanning(true)
    setScanError('')
    setResult(null)
    try {
      const data = await quickScan(targetUrl)
      setResult(data)
    } catch (err) {
      setScanError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const handleScan = (e) => {
    e.preventDefault()
    runScan(url)
  }

  useEffect(() => {
    const initial = searchParams.get('url')
    if (initial) runScan(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLeadSubmit = async (form) => {
    setSubmitting(true)
    setLeadError('')
    try {
      const data = await submitLead(
        { ...form, url, quickScan: result, origin: window.location.origin },
        {
          onProgress: (p) => {
            setShowLeadForm(false)
            setProgress(p)
          },
        },
      )
      setConfirmation({ firstName: form.firstName, email: form.email, pdfBase64: data.pdfBase64, emailStatus: data.emailStatus })
    } catch (err) {
      setLeadError(err.message)
      setShowLeadForm(true)
    } finally {
      setSubmitting(false)
      setProgress(null)
    }
  }

  const formatElapsed = (ms) => {
    const s = Math.round((ms || 0) / 1000)
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
  }

  return (
    <div ref={root} className="arr-page">
      <PageSeo
        title="Free AI Readiness Report | Does ChatGPT Recommend You?"
        description="Paste one product page. We test it on ChatGPT, Claude, Gemini and Perplexity, show who they recommend instead, and an engineer approves your free report."
        keywords={['AI search visibility', 'AI readiness report', 'product visibility in ChatGPT', 'generative engine optimization eCommerce', 'AI shopping assistant optimization', 'GEO audit']}
        structuredData={[
          breadcrumb('/ai-readiness-report', 'Free AI Readiness Report'),
          { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: AI_READINESS_FAQ.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
        ]}
      />
      <section className="arr-hero" id="arr-top" aria-labelledby="arr-title">
        <div className="arr-glow" aria-hidden="true" />
        <div className="arr-wrap arr-herogrid">
          <div className="arr-copy">
            <p className="arr-eyebrow">Free AI Readiness Report · Expert-verified and approved · One product page</p>
            <h1 id="arr-title">AI is answering your buyers. <em>Is it naming you?</em></h1>
            <p className="arr-lead">Paste one product page. We ask ChatGPT, Claude, Gemini and Perplexity the questions your buyers ask, show you which sellers they recommend instead, and a product data expert verifies and approves your six-page report with the fixes in priority order.</p>
            <form className="url-form" onSubmit={handleScan}>
              <label htmlFor="scan-url" className="visually-hidden">Product page URL</label>
              <input
                id="scan-url"
                name="url"
                type="url"
                placeholder="Paste one product page URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit" disabled={scanning}>
                {scanning ? 'Scanning…' : 'Get my free report'}
              </button>
            </form>
            <p className="field-hint" style={{ marginTop: 8 }}>
              Must be a single product page, not your homepage or a category listing with multiple products on it.
            </p>
            {scanError && <p className="form-error" style={{ marginTop: 14 }}>{scanError}</p>}
            <p className="arr-more">Want the full scorecard and competitor breakdown? <a href="mailto:manoj@altiusnxt.com?subject=Detailed%20audit%20report%20request&body=Product%20page%20URL%3A">Request the AI Visibility &amp; Competitor Audit</a>.</p>
          </div>

          <div className="arr-chat" role="img" aria-label="Illustration of an AI answer that leaves a distributor out">
            <div className="q"><span>Which distributor can supply a 1&quot; crimped wire end brush near me?</span></div>
            <p className="ans">AI assistant recommends:</p>
            <div className="row r1"><i>1</i>Large national marketplace</div>
            <div className="row r2"><i>2</i>Big-box retailer</div>
            <div className="row gap r3"><i>?</i>Your company is not mentioned</div>
            <p className="note">Illustration only. Your report shows what the AI engines actually say about your products.</p>
          </div>
        </div>

        <div className="arr-wrap">
          <p className="arr-storyhead rv">How one product page becomes your report</p>
          <ol className="arr-stats rv">
            {STORY.map(({ n, k, d, Ico }, i) => (
              <li key={d} style={{ '--k': i }}>
                <span className="as-ico"><Ico size={20} strokeWidth={2.2} /></span>
                <small>{k}</small>
                <b><Num to={n} delay={i * 1100 + 300} /></b>
                <span className="as-d">{d}</span>
                <div className="as-vis" aria-hidden="true">
                  {i === 0 && <span className="v-page"><i /><i /><i /><u>yourstore.com/…</u></span>}
                  {i === 1 && [0, 1, 2, 3, 4, 5].map((q) => <span key={q} className="v-q" style={{ '--q': q }}>Q{q + 1}</span>)}
                  {i === 2 && ENGINES.map((e, q) => <span key={e} className="v-eng" style={{ '--q': q }}>{e}</span>)}
                  {i === 3 && [0, 1, 2, 3, 4].map((q) => <span key={q} className="v-gap" style={{ '--q': q }}>✕</span>)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {result && (
        <section className="section bg-white" style={{ paddingTop: 0 }} ref={resultRef}>
          <div className="wrap">
            <div className="scan-result">
              <div className="scan-score" style={{ borderColor: result.score < 50 ? 'var(--orange)' : 'var(--green)' }}>
                <span className="scan-score-num">{result.score}</span>
                <span className="scan-score-label">AI readiness score</span>
              </div>
              <div className="scan-summary">
                <h3>{result.headline}</h3>
                <p style={{ marginBottom: 12 }}>{result.productName}</p>
                <ul className="scan-gaps">
                  {(result.topGaps || []).map((gap, i) => (
                    <li key={i}>{gap}</li>
                  ))}
                </ul>
                {progress ? (
                  <div className="report-progress" role="status" aria-live="polite">
                    <span className="report-progress-spinner" aria-hidden="true" />
                    <div>
                      <strong>Building your report — {progress.stage}…</strong>
                      <span>
                        We query ChatGPT, Claude, Gemini and Perplexity live and benchmark real sellers, so this takes 3–6 minutes.
                        Keep this tab open. Elapsed: {formatElapsed(progress.elapsedMs)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" type="button" onClick={() => setShowLeadForm(true)} disabled={submitting}>
                    Get my AI Readiness Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {showLeadForm && (
        <LeadFormModal
          onClose={() => setShowLeadForm(false)}
          onSubmit={handleLeadSubmit}
          submitting={submitting}
          error={leadError}
        />
      )}

      {confirmation && (
        <ConfirmModal
          onClose={() => setConfirmation(null)}
          firstName={confirmation.firstName}
          email={confirmation.email}
          pdfBase64={confirmation.pdfBase64}
          emailStatus={confirmation.emailStatus}
        />
      )}

      <ReceiveSection />
      <HowSection />
      <LevelsSection />
      <section className="rp-sec rp-why" aria-labelledby="rp-why">
        <div className="rp-wrap">
          <div className="rp-why-head">
            <span className="rp-eb">Why this matters now</span>
            <h2 id="rp-why">AI is moving from recommending <em>to buying.</em></h2>
            <p>Buyers already ask AI assistants which distributor stocks a part. Google's UCP and OpenAI's ACP now let AI agents compare and check out too. Agents pick the seller whose data they can verify. Your free report shows whether that is you today.</p>
          </div>
          <ol className="rp-why-steps" aria-label="How an AI shopping agent buys">
            {WHY_STEPS.map(({ t, d, Ico }, i) => (
              <li key={t}>
                <span className="n">{i + 1}</span>
                <span className="ico"><Ico size={22} strokeWidth={2} /></span>
                <b>{t}</b>
                <p>{d}</p>
              </li>
            ))}
          </ol>
          <div className="rp-why-cta">
            <a className="btn btn-primary" href="#arr-top">Get my free report</a>
            <small>Free. One product page. Expert-verified.</small>
          </div>
        </div>
      </section>
      <LayersSection />
      <NextSection />
      <FaqSection />

      <section className="arr-final" aria-labelledby="arr-final-t">
        <div className="arr-wrap">
          <div className="arr-finalcard rv">
            <div className="af-copy">
            <p className="arr-eyebrow">Ready to check your product data?</p>
            <h2 id="arr-final-t">See how AI-ready your <em>product content really is.</em></h2>
            <p>Start with one product page and discover where your data is complete, where AI may struggle to verify it, and what enrichment could improve.</p>
            <a className="btn btn-primary" href="#arr-top" onClick={(e) => { e.preventDefault(); document.getElementById('arr-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => document.getElementById('scan-url')?.focus({ preventScroll: true }), 600) }}>Get my free report</a>
            <p className="arr-fine">One product page. Actionable findings. No obligation.</p>
            </div>

            <div className="af-scan" aria-hidden="true">
              <div className="af-bar"><i /><i /><i /><span>yourstore.com / product-page</span></div>
              <div className="af-body">
                <div className="af-pic"><img src={TESYS.images.front} alt="" /></div>
                <div className="af-lines"><b /><b /><b /></div>
                <span className="af-beam" />
              </div>
              <ul className="af-checks">
                <li className="ok" style={{ '--k': 0 }}><Check size={13} strokeWidth={3.4} />Part number found</li>
                <li className="bad" style={{ '--k': 1 }}><X size={13} strokeWidth={3.4} />Specification table missing</li>
                <li className="mid" style={{ '--k': 2 }}><CircleAlert size={13} strokeWidth={3} />Structured data incomplete</li>
                <li className="ok" style={{ '--k': 3 }}><Check size={13} strokeWidth={3.4} />Datasheet linked</li>
              </ul>
              <span className="af-tag">AI readiness scan</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
