/* Client for the live CatalogWiz enrichment demo (POST /api/catalogwiz-demo, then poll). Kept next to the demo
   so nothing outside the CatalogWiz section changes. Same API base as services/api.js. */
import { getUtmParams } from '../../services/hubspotTrack.js'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, init) {
  const res = await fetch(`${BASE}/api${path}`, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/** Sends the visitor's details + page, then polls until the enrichment is ready. `onStage` gets each progress label. */
export async function runLiveEnrichment(payload, { onStage, intervalMs = 2500, timeoutMs = 6 * 60 * 1000 } = {}) {
  // Read at submit time, same as the other forms, so the lead this demo request creates in HubSpot
  // shows where the visitor came from.
  const { jobId } = await request('/catalogwiz-demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, ...getUtmParams() }),
  })
  const started = Date.now()
  let misses = 0
  for (;;) {
    await new Promise((r) => setTimeout(r, intervalMs))
    let job
    try {
      job = await request(`/catalogwiz-demo/${jobId}`)
      misses = 0
    } catch (err) {
      // the server can be briefly unreachable (a restart or deploy); the job resumes on its own, so keep waiting a while
      if (++misses <= 12 && Date.now() - started < timeoutMs) continue
      throw err
    }
    onStage?.(job.stage)
    if (job.status === 'done') return job.result
    if (job.status === 'failed') throw new Error(job.error || 'We could not enrich that page. Please try another product page.')
    if (Date.now() - started > timeoutMs) throw new Error('This is taking longer than expected. Please try again in a few minutes.')
  }
}
