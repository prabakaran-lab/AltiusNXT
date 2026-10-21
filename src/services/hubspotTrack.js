/**
 * Logs a click on one of the mailto-only CTAs (the ones with no form, so no contact is created) as a
 * HubSpot custom behavioral event, tied to whatever LinkedIn/social session HubSpot already tracked
 * that visitor under — the piece that makes "how many LinkedIn clicks reached this button" a real,
 * reportable number. Safe to call even before the tracking script finishes loading, and never throws
 * or delays the mailto link it sits beside — a missing `_hsq` (blocked script, ad blocker, HubSpot
 * plan without custom events) just means the click isn't logged, not that anything breaks.
 */
export function trackMailtoClick(eventName) {
  try {
    window._hsq = window._hsq || []
    window._hsq.push(['trackEvent', { id: eventName }])
  } catch {
    /* tracking is best-effort only */
  }
}
