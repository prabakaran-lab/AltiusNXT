const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, init) {
  const res = await fetch(`${BASE}/api${path}`, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

const post = (path, body) =>
  request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const sendContact = (payload) => post('/contact', payload)

export const quickScan = (url) => post('/quick-scan', { url })

/**
 * Report generation runs live AI research for several minutes, so the server accepts the request
 * immediately and the report is collected by polling. Resolves with the finished report payload
 * (same shape the synchronous endpoint used to return). `onProgress` receives
 * { stage, elapsedMs } on every poll.
 */
export async function submitLead(payload, { onProgress, intervalMs = 4000, timeoutMs = 15 * 60 * 1000 } = {}) {
  const { jobId } = await post('/leads', payload)
  const started = Date.now()
  for (;;) {
    await new Promise((r) => setTimeout(r, intervalMs))
    const job = await request(`/leads/${jobId}`)
    onProgress?.({ stage: job.stage, elapsedMs: job.elapsedMs })
    if (job.status === 'done') return job
    if (job.status === 'failed') throw new Error(job.error || 'Report generation failed. Please try again.')
    if (Date.now() - started > timeoutMs) throw new Error('Report generation is taking longer than expected. Please try again in a few minutes.')
  }
}
