import { lookupBusinessPlace } from '../src/services/googlePlaces.js'
import { isGooglePlacesConfigured } from '../src/config.js'

console.log(`isGooglePlacesConfigured() = ${isGooglePlacesConfigured()}`)

const result = await lookupBusinessPlace({ companyName: 'Starbucks', website: 'starbucks.com' })
console.log('\nResult:', result)

if (!isGooglePlacesConfigured()) {
  console.log(result === null ? '\nPASS: not configured, returned null cleanly (expected until GOOGLE_PLACES_API_KEY is set).' : '\nFAIL: expected null when not configured.')
} else {
  console.log(result ? '\nPASS: got a result.' : '\nNote: configured but no result found (or API error) — returned null.')
}
