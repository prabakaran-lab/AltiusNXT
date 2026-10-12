import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import scanRouter from './routes/scan.js'
import leadsRouter from './routes/leads.js'
import reportsRouter from './routes/reports.js'
import outreachRouter from './routes/outreach.js'
import contactRouter from './routes/contact.js'

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
app.use('/api', contactRouter)

app.listen(config.port, () => {
  console.log(`AltiusNxt AI Readiness API listening on http://localhost:${config.port}`)
})
