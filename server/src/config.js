import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT || 8787),
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
  },
  scrapeDo: {
    token: process.env.SCRAPE_DO_TOKEN || '',
  },
  brightData: {
    apiKey: process.env.BRIGHTDATA_API_KEY || '',
    serpZone: process.env.BRIGHTDATA_SERP_ZONE || '',
  },
  mail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
    leadNotifyEmail: process.env.LEAD_NOTIFY_EMAIL || 'govind@altiusnxt.com',
    // Extra inboxes that get every team email leadNotifyEmail gets (demo and report alerts, contact form,
    // new subscribers, outreach bcc). Comma or semicolon separated.
    leadCopyEmails: [...new Set((process.env.LEAD_COPY_EMAILS || '').split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean))]
      .filter((e) => e !== (process.env.LEAD_NOTIFY_EMAIL || 'govind@altiusnxt.com').trim().toLowerCase()),
  },
  outreach: {
    apiToken: process.env.OUTREACH_API_TOKEN || '',
    // Who the report is "prepared by" (cover, next-steps page, request-a-copy address)
    senderName: process.env.OUTREACH_SENDER_NAME || 'Govindaraj L',
    senderTitle: process.env.OUTREACH_SENDER_TITLE || 'Business Unit Head',
    senderEmail: process.env.OUTREACH_SENDER_EMAIL || process.env.LEAD_NOTIFY_EMAIL || 'govind@altiusnxt.com',
  },
  googlePlaces: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
  },
  // CRM: saves name/email/company and the utm_* fields from the AI Readiness form as a HubSpot contact.
  // A Private App token (Settings > Integrations > Private Apps) with the "crm.objects.contacts.write" scope.
  hubspot: {
    token: process.env.HUBSPOT_PRIVATE_APP_TOKEN || '',
  },
  // Cloudflare Turnstile (captcha): the contact form, the AI Readiness scan trigger, and the CatalogWiz
  // live-demo request are bot-gated with it. Site key is public (ships in the frontend build); only the
  // secret key lives here, used to verify a widget token against Cloudflare's siteverify API.
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY || '',
  },
}

export const isGeminiConfigured = () => Boolean(config.gemini.apiKey)
export const isOpenAIConfigured = () => Boolean(config.openai.apiKey)
export const isAnthropicConfigured = () => Boolean(config.anthropic.apiKey)
export const isScrapeDoConfigured = () => Boolean(config.scrapeDo.token)
export const isBrightDataConfigured = () => Boolean(config.brightData.apiKey && config.brightData.serpZone)
export const isMailConfigured = () => Boolean(config.mail.user && config.mail.appPassword)
export const isGooglePlacesConfigured = () => Boolean(config.googlePlaces.apiKey)
export const isMistralConfigured = () => Boolean(config.mistral.apiKey)
export const isHubspotConfigured = () => Boolean(config.hubspot.token)
export const isTurnstileConfigured = () => Boolean(config.turnstile.secretKey)
