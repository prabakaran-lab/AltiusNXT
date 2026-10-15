import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import scanRouter from './routes/scan.js'
import leadsRouter from './routes/leads.js'
import reportsRouter from './routes/reports.js'
import outreachRouter from './routes/outreach.js'
import catalogwizDemoRouter from './routes/catalogwizDemo.js'
import subscribeRouter from './routes/subscribe.js'
import announceRouter from './routes/announce.js'
import contactRouter from './routes/contact.js'
import { startAnnouncementScheduler } from './services/announcements.js'

const app = express()

// The API sits behind the Vite dev proxy / a tunnel / a load balancer, which set X-Forwarded-For.
// Trusting that first hop lets the rate limiter key on the real visitor IP instead of the proxy's.
app.set('trust proxy', 1)

app.use(express.json({ limit: '1mb' }))
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
  })
)

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api', scanRouter)
app.use('/api', leadsRouter)
app.use('/api', reportsRouter)
app.use('/api', outreachRouter)
app.use('/api', catalogwizDemoRouter)
app.use('/api', subscribeRouter)
app.use('/api', announceRouter)
app.use('/api', contactRouter)

const server = app.listen(config.port, () => {
  console.log(`AltiusNxt AI Readiness API listening on http://localhost:${config.port}`)
})

// Behind the Vite dev proxy / a tunnel / a load balancer, Node's default 5s keep-alive lets the API
// close an idle connection at the moment the proxy reuses it, which surfaces as "read ECONNRESET".
// Keeping connections open longer than any proxy in front of it removes that race.
server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000

// Emails subscribers when the website publishes a new article or event (needs SITE_FEED_URL; otherwise it stays off).
startAnnouncementScheduler()

// One stray error in a background step must not take the whole API down — every scan and report
// in flight would be dropped with a connection reset. Log it and keep serving.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (API kept running):', reason)
})
