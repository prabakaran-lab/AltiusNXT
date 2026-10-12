import { callOpenAIWithSearch, callClaudeWithSearch } from '../src/services/liveEngines.js'
import { askGeminiTextWithSearch } from '../src/services/gemini.js'

const q = 'What are two real online stores currently selling Zebra ZD421 label printers, with approximate prices? Name real sellers.'

for (const [label, fn] of [
  ['openai', () => callOpenAIWithSearch(q)],
  ['claude', () => callClaudeWithSearch(q)],
  ['gemini', () => askGeminiTextWithSearch(q)],
]) {
  try {
    const t0 = Date.now()
    const result = await fn()
    console.log(`\n=== ${label} (${Date.now() - t0}ms) ===`)
    console.log(result.slice(0, 500))
  } catch (err) {
    console.log(`\n=== ${label} FAILED ===`)
    console.log(err.message)
  }
}
