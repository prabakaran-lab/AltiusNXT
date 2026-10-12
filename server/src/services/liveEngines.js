import { config } from '../config.js'

export async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned no content')
  return text.trim()
}

export async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.anthropic.model,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Anthropic returned no content')
  return text.trim()
}

/**
 * Real-web-search-grounded variant, used only where the answer depends on current facts a
 * trained model can't know reliably (e.g. "which real sellers stock this today"). Uses the
 * OpenAI Responses API with the built-in web_search_preview tool — same OPENAI_API_KEY, a
 * different endpoint/call shape than the plain chat-completions call above.
 */
export async function callOpenAIWithSearch(prompt) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      input: prompt,
      tools: [{ type: 'web_search_preview' }],
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI (web search) request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }
  // Fallback: walk the output array by hand if the convenience field isn't present.
  const message = (data?.output || []).find((item) => item.type === 'message')
  const text = (message?.content || []).find((c) => c.type === 'output_text')?.text
  if (!text) throw new Error('OpenAI (web search) returned no content')
  return text.trim()
}

/**
 * Real-web-search-grounded variant for Claude, via Anthropic's server-side web_search tool.
 * Same ANTHROPIC_API_KEY as callClaude — only the tool declaration differs.
 */
export async function callClaudeWithSearch(prompt) {
  const body = {
    model: config.anthropic.model,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
  }

  async function post(extraHeaders = {}) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      const err = new Error(`Anthropic (web search) request failed (${res.status}): ${errBody.slice(0, 300)}`)
      err.status = res.status
      throw err
    }
    return res.json()
  }

  let data
  try {
    data = await post()
  } catch (err) {
    // Older API versions gate the tool behind a beta header — retry once with it set.
    if (err.status === 400 || err.status === 404) {
      data = await post({ 'anthropic-beta': 'web-search-2025-03-05' })
    } else {
      throw err
    }
  }

  const text = (data?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join(' ')
    .trim()
  if (!text) throw new Error('Anthropic (web search) returned no content')
  return text
}
