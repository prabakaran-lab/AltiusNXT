// Tests whether a product page is actually reachable by the bots that matter for AI discovery —
// standard browsers, traditional search crawlers, and the newer AI-specific crawlers (GPTBot,
// ClaudeBot, PerplexityBot, etc.). A page that returns 200 for a browser but 403/blocked for
// GPTBot is invisible to ChatGPT's search entirely, regardless of how good its content is — this
// is the "can AI even find you" layer the content-level gap checks can't see.
const BOTS = [
  { label: 'Standard Browser', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  { label: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { label: 'Google-Extended', ua: 'Mozilla/5.0 (compatible; Google-Extended)' },
  { label: 'GPTBot', ua: 'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)' },
  { label: 'OAI-SearchBot', ua: 'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)' },
  { label: 'ChatGPT-User', ua: 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' },
  { label: 'ClaudeBot', ua: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)' },
  { label: 'Claude-User', ua: 'Mozilla/5.0 (compatible; Claude-User/1.0; +https://www.anthropic.com)' },
  { label: 'PerplexityBot', ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)' },
  { label: 'Bingbot', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
]

async function checkOne(url, bot) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': bot.ua },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    })
    return { label: bot.label, status: res.status, ok: res.status >= 200 && res.status < 400 }
  } catch (err) {
    return { label: bot.label, status: null, ok: false, error: err.message }
  }
}

/** Fetches robots.txt and checks whether it explicitly names any AI-specific crawler — most
 *  sites only have a generic `User-agent: *` block, never having thought about AI bots at all;
 *  a site that explicitly allows or disallows GPTBot/ClaudeBot/etc. is a real differentiator. */
async function fetchRobotsTxt(origin) {
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { found: false, text: '', namesAiCrawlers: false }
    const text = await res.text()
    const aiCrawlerNames = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Google-Extended', 'PerplexityBot']
    const namesAiCrawlers = aiCrawlerNames.some((name) => new RegExp(`user-agent:\\s*${name}`, 'i').test(text))
    return { found: true, text, namesAiCrawlers }
  } catch {
    return { found: false, text: '', namesAiCrawlers: false }
  }
}

/** Runs the 10-bot crawler-access test against one URL plus a robots.txt check against its
 *  origin. Never throws — a failed individual bot check just records ok:false for that bot. */
export async function testCrawlerAccess(url) {
  const origin = new URL(url).origin
  const [results, robots] = await Promise.all([
    Promise.all(BOTS.map((bot) => checkOne(url, bot))),
    fetchRobotsTxt(origin),
  ])
  const accessibleCount = results.filter((r) => r.ok).length
  return {
    results,
    accessibleCount,
    totalBots: BOTS.length,
    fullyAccessible: accessibleCount === BOTS.length,
    robotsTxtFound: robots.found,
    robotsTxtNamesAiCrawlers: robots.namesAiCrawlers,
  }
}
