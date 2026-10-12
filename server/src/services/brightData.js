import { config, isBrightDataConfigured } from '../config.js'

/**
 * Runs a real Google search through Bright Data's SERP API and checks whether
 * the target domain appears anywhere in the results markup. This is the one
 * "live" signal in the report — everything else from Gemini is a modeled estimate.
 *
 * Bright Data's SERP API auth/zone naming can vary by account setup; adjust
 * BRIGHTDATA_SERP_ZONE in .env to match your zone name if this 401s.
 */
export async function checkSearchVisibility({ query, domain }) {
  if (!isBrightDataConfigured()) {
    return { ran: false, reason: 'Bright Data SERP API not configured' }
  }

  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    const res = await fetch('https://api.brightdata.com/serp/req', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.brightData.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zone: config.brightData.serpZone,
        url: searchUrl,
        format: 'raw',
      }),
    })

    if (!res.ok) {
      return { ran: false, reason: `Bright Data request failed (${res.status})` }
    }

    const html = await res.text()
    const mentioned = html.toLowerCase().includes(domain.toLowerCase())
    return { ran: true, query, domain, mentioned }
  } catch (err) {
    return { ran: false, reason: err.message }
  }
}
