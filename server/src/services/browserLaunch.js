import { chromium } from 'playwright'
import { isBotChallengeText } from './scrapeDo.js'

// Some sites' bot protection lets a person's normal browser window through but stops a headless
// one ("Just a moment…", HTTP 403). For such a site the page is read with a real, visible Chrome
// window instead — no disguise, just an ordinary browser. The first visit to a site checks which
// kind it is; the answer is remembered for the rest of the run.
const modeByHost = new Map() // host -> 'headless' | 'real'

const hostOf = (url) => { try { return new URL(url).hostname } catch { return '' } }

async function refusesHeadless(browser, url) {
  const page = await browser.newPage()
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1500)
    const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
    return resp?.status() === 403 || isBotChallengeText(text)
  } catch {
    return false // a page that simply fails to load is not a bot block
  } finally {
    await page.close().catch(() => {})
  }
}

/** Launches the browser best suited to read this URL: headless normally, a real Chrome window when
 *  the site is known (or found) to refuse headless browsers and Chrome is installed. */
export async function launchBrowserFor(url) {
  const host = hostOf(url)
  const mode = modeByHost.get(host)
  const launchReal = () => chromium.launch({ headless: false, channel: 'chrome' })

  if (mode === 'real') {
    try { return await launchReal() } catch { /* Chrome unavailable: fall through to headless */ }
  }
  const headless = await chromium.launch({ headless: true })
  if (mode || !host) return headless

  if (!(await refusesHeadless(headless, url))) {
    modeByHost.set(host, 'headless')
    return headless
  }
  try {
    const real = await launchReal()
    await headless.close().catch(() => {})
    modeByHost.set(host, 'real')
    console.log(`[browser] ${host} refuses headless browsers; reading it with a real Chrome window`)
    return real
  } catch (err) {
    console.warn(`[browser] ${host} refuses headless browsers and a real Chrome window could not be opened (${err.message.split('\n')[0]})`)
    modeByHost.set(host, 'headless')
    return headless
  }
}
