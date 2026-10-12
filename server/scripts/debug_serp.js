import { config } from '../src/config.js'

const query = 'Cross Fine Black ballpoint pen refill buy price'
const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`
const res = await fetch('https://api.brightdata.com/serp/req', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${config.brightData.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ zone: config.brightData.serpZone, url: searchUrl, format: 'raw' }),
})
console.log('status:', res.status)
const body = await res.text()
console.log('body:', body)

let responseId
try { responseId = JSON.parse(body).response_id } catch {}

if (responseId) {
  console.log('\nPolling for result, response_id =', responseId)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const pollRes = await fetch(`https://api.brightdata.com/serp/get_result?response_id=${responseId}`, {
      headers: { Authorization: `Bearer ${config.brightData.apiKey}` },
    })
    console.log(`  poll ${i + 1}: status=${pollRes.status}`)
    if (pollRes.status === 200) {
      const html = await pollRes.text()
      console.log('  got result, length:', html.length)
      console.log('  first 500 chars:', html.slice(0, 500))
      console.log('  href count:', (html.match(/href="/g) || []).length)
      break
    } else {
      console.log('  not ready yet:', (await pollRes.text()).slice(0, 200))
    }
  }
}
