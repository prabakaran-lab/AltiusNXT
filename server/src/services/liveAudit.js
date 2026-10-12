import { callOpenAI, callClaude } from './liveEngines.js'
import { askGeminiText } from './gemini.js'
import { isOpenAIConfigured, isAnthropicConfigured, isGeminiConfigured } from '../config.js'

function mentionsCompany(text, { companyName, domain }) {
  const t = (text || '').toLowerCase()
  const needles = [companyName, domain].filter(Boolean).map((s) => String(s).toLowerCase())
  return needles.some((n) => n && t.includes(n))
}

const recommendPrompt = (question) =>
  `A customer asks: "${question}" Answer naturally and concisely (2-4 sentences), the way you would in a normal chat. Recommend specific brands or products where relevant. Plain text only — no markdown formatting (no #, **, or bullet lists).`

async function callEngine(engine, prompt) {
  if (engine === 'chatgpt') return callOpenAI(prompt)
  if (engine === 'claude') return callClaude(prompt)
  if (engine === 'gemini') return askGeminiText(prompt)
  throw new Error(`Unknown engine: ${engine}`)
}

/**
 * For each technician question, queries every configured engine live and checks whether
 * the target company/domain is mentioned anywhere in the response. This is real data —
 * not modeled — for whichever engines have API keys configured.
 */
export async function runRecommendationAudit({ questions, companyName, domain }) {
  const engines = []
  if (isOpenAIConfigured()) engines.push('chatgpt')
  if (isAnthropicConfigured()) engines.push('claude')
  if (isGeminiConfigured()) engines.push('gemini')

  const results = await Promise.all(
    questions.map(async (question) => {
      const prompt = recommendPrompt(question)
      const perEngine = await Promise.all(
        engines.map(async (engine) => {
          try {
            const text = await callEngine(engine, prompt)
            return { engine, text, mentioned: mentionsCompany(text, { companyName, domain }) }
          } catch (err) {
            return { engine, text: '', error: err.message, mentioned: false }
          }
        })
      )
      return { question, perEngine, mentioned: perEngine.some((e) => e.mentioned) }
    })
  )

  return { engines, results }
}

const reactionPrompt = (pageText, productName, competitorContext) => `Here is the visible text of a product page for "${productName}":
"""
${(pageText || '').slice(0, 4000)}
"""
${competitorContext ? `\nFor comparison, here is what a couple of OTHER real sellers of this same product show on their pages:\n"""\n${competitorContext}\n"""\n` : ''}
In one or two sentences, as a blunt technical reviewer, say what's missing from this page that would stop you from confidently recommending this exact product to a buyer${competitorContext ? ' — compare directly against what the other sellers above show, if relevant' : ''}. Be direct and specific — no hedging, no disclaimers about being an AI, plain text only with no markdown formatting.`

/** Asks ChatGPT and Claude to react directly to the scraped page text, for real (not paraphrased)
 *  quotes — the report only ever displays these two page-review quotes (Gemini is used for the
 *  search-query audit, not page review), so it's never called here; that's one fewer live call on
 *  every report, which also helps keep total pipeline latency down. Passing `competitorContext`
 *  (a couple of real competitor page summaries) grounds the critique against actual alternatives
 *  instead of a generic "needs more detail." */
export async function runPageReactionAudit({ pageText, productName, competitorContext }) {
  const prompt = reactionPrompt(pageText, productName, competitorContext)
  const [chatgpt, claude] = await Promise.all([
    isOpenAIConfigured() ? callOpenAI(prompt).catch((err) => ({ error: err.message })) : Promise.resolve(null),
    isAnthropicConfigured() ? callClaude(prompt).catch((err) => ({ error: err.message })) : Promise.resolve(null),
  ])
  return {
    chatgpt: typeof chatgpt === 'string' ? chatgpt : null,
    claude: typeof claude === 'string' ? claude : null,
  }
}
