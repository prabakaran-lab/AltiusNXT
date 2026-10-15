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
    // Same browser identity as the first bot check: many sites refuse a request with no User-Agent.
    const res = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': BOTS[0].ua }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { found: false, text: '', namesAiCrawlers: false }
    const text = await res.text()
    const aiCrawlerNames = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Google-Extended', 'PerplexityBot']
    const namesAiCrawlers = aiCrawlerNames.some((name) => new RegExp(`user-agent:\\s*${name}`, 'i').test(text))
    return { found: true, text, namesAiCrawlers }
  } catch {
    return { found: false, text: '', namesAiCrawlers: false }
  }
}

// robots.txt groups: each "User-agent" line (or run of them) followed by Allow / Disallow rules.
function parseRobotsGroups(text) {
  const groups = []
  let current = null
  let lastWasAgent = false
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    if (!line) continue
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const field = m[1].toLowerCase()
    const value = m[2].trim()
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current) }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else if ((field === 'allow' || field === 'disallow') && current) {
      current.rules.push({ type: field, path: value })
      lastWasAgent = false
    } else {
      lastWasAgent = false
    }
  }
  return groups
}

function robotsPathMatches(rulePath, target) {
  if (!rulePath) return false // an empty Disallow allows everything
  const pattern = '^' + rulePath.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  try { return new RegExp(pattern).test(target) } catch { return false }
}

/** For one crawler, does robots.txt allow it to fetch this page? Uses the crawler's own group when
 *  robots.txt names it, otherwise the "*" group; the longest matching rule wins (Allow on a tie).
 *  Returns the rule that decided it, verbatim, so the report can quote it. */
function robotsVerdictFor(groups, agentName, pathname) {
  const name = agentName.toLowerCase()
  const own = groups.filter((g) => g.agents.includes(name))
  const matched = own.length ? own : groups.filter((g) => g.agents.includes('*'))
  if (!matched.length) return { allowed: true, rule: '', group: '' }
  let best = null
  for (const g of matched) {
    for (const r of g.rules) {
      if (!robotsPathMatches(r.path, pathname)) continue
      if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.type === 'allow')) best = r
    }
  }
  const group = own.length ? agentName : '*'
  if (!best) return { allowed: true, rule: '', group }
  return { allowed: best.type === 'allow', rule: `${best.type === 'allow' ? 'Allow' : 'Disallow'}: ${best.path}`, group }
}

/** Runs the 10-bot crawler-access test against one URL plus a robots.txt check against its
 *  origin. Never throws — a failed individual bot check just records ok:false for that bot. */
export async function testCrawlerAccess(url) {
  const parsed = new URL(url)
  const [results, robots] = await Promise.all([
    Promise.all(BOTS.map((bot) => checkOne(url, bot))),
    fetchRobotsTxt(parsed.origin),
  ])
  const accessibleCount = results.filter((r) => r.ok).length
  // What robots.txt itself says for this page, bot by bot — ground truth separate from whether the
  // server happened to answer. Only meaningful when a robots.txt was actually found.
  const groups = robots.found ? parseRobotsGroups(robots.text) : []
  const robotsVerdicts = robots.found
    ? BOTS.map((bot) => ({ agent: bot.label, ...robotsVerdictFor(groups, bot.label === 'Standard Browser' ? '*' : bot.label, parsed.pathname + parsed.search) }))
    : []
  // The AI assistants this report covers (Perplexity is not part of it). Blocked here means the
  // site's own robots.txt tells that crawler not to fetch this page, whatever the server answers.
  const REPORTED_AI_AGENTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Google-Extended']
  const robotsBlockedAiAgents = robotsVerdicts
    .filter((v) => !v.allowed && REPORTED_AI_AGENTS.includes(v.agent))
    .map((v) => ({ agent: v.agent, rule: v.rule }))
  return {
    results,
    accessibleCount,
    totalBots: BOTS.length,
    // The "Standard Browser" request is the control: when even that is refused, the site's bot
    // protection is turning away our test client, so the per-crawler results say nothing about what
    // the real crawlers can fetch. The report must not call those "blocked".
    inconclusive: !results[0]?.ok,
    fullyAccessible: accessibleCount === BOTS.length,
    robotsTxtFound: robots.found,
    robotsTxtNamesAiCrawlers: robots.namesAiCrawlers,
    robotsTxt: robots.text.slice(0, 4000),
    robotsVerdicts,
    robotsBlockedAiAgents,
  }
}
