import { config, isHubspotConfigured } from '../config.js'

/**
 * Saves (creates or updates) one HubSpot contact for an AI Readiness Report request: name, email,
 * company and the four utm_* properties read from the page URL at submission time. Uses the
 * "upsert by email" endpoint, so a returning visitor's existing contact is updated, not duplicated.
 *
 * The four utm_* property names (utm_source, utm_medium, utm_campaign, utm_content) are the exact
 * internal names the HubSpot admin already created on the Contact object — nothing here creates or
 * renames properties; a typo'd name is simply rejected by HubSpot's API (see the thrown error).
 *
 * Does nothing (resolves immediately) when HUBSPOT_PRIVATE_APP_TOKEN is not set, so the site works
 * the same as before this integration existed until that token is configured.
 */
export async function upsertHubspotContact({ email, firstName, lastName, company, utmSource, utmMedium, utmCampaign, utmContent }) {
  if (!isHubspotConfigured()) return { skipped: true, reason: 'HUBSPOT_PRIVATE_APP_TOKEN is not set' }
  if (!email) return { skipped: true, reason: 'no email' }

  const properties = {
    email,
    firstname: firstName || '',
    lastname: lastName || '',
    company: company || '',
    utm_source: utmSource || '',
    utm_medium: utmMedium || '',
    utm_campaign: utmCampaign || '',
    utm_content: utmContent || '',
  }

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.hubspot.token}` },
    body: JSON.stringify({ inputs: [{ idProperty: 'email', id: email, properties }] }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HubSpot upsert failed (${res.status}): ${body.slice(0, 300)}`)
  }
  return { ok: true }
}
