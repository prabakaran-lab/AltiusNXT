// Runs one "new content" check by hand.
//   node scripts/announce-check.mjs --dry-run    shows what WOULD be sent (subject, items), sends nothing, changes nothing
//   node scripts/announce-check.mjs              checks and, if there is new content, sends the announcement
import 'dotenv/config'
import { checkForNewContent, announcementStatus } from '../src/services/announcements.js'

const dryRun = process.argv.includes('--dry-run')
const r = await checkForNewContent({ dryRun })
const { html, ...rest } = r
console.log(JSON.stringify(rest, null, 2))
if (dryRun && html) console.log(`\n(email body: ${html.length} characters of HTML; add --print-html to see it)`)
if (process.argv.includes('--print-html') && html) console.log('\n' + html)
console.log('\nstatus:', JSON.stringify(announcementStatus(), null, 2))
