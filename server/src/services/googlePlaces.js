import { config, isGooglePlacesConfigured } from '../config.js'

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress'

function hostnameOf(website) {
  if (!website) return ''
  try {
    const withScheme = /^https?:\/\//i.test(website) ? website : `https://${website}`
    return new URL(withScheme).hostname.replace(/^www\./, '')
  } catch {
    // Not a parseable URL (e.g. already a bare hostname with no scheme and odd chars) —
    // fall back to using it as-is rather than dropping it.
    return website
  }
}

/**
 * Looks up a business on Google Places (searchText) to pull its rating/review
 * count/address for the sales report. Returns null if not configured, no result
 * found, or on any API error — never throws.
 */
export async function lookupBusinessPlace({ companyName, website }) {
  if (!isGooglePlacesConfigured()) return null
  if (!companyName) return null

  try {
    const host = hostnameOf(website)
    const textQuery = host ? `${companyName} ${host}` : companyName

    const res = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlaces.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.warn(`Google Places searchText failed (${res.status})`)
      return null
    }

    const data = await res.json()
    const place = data?.places?.[0]
    if (!place) return null

    return {
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? null,
      formattedAddress: place.formattedAddress ?? null,
    }
  } catch (err) {
    console.warn(`lookupBusinessPlace failed for "${companyName}": ${err.message}`)
    return null
  }
}
