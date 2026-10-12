import { Router } from 'express'
import { getReport } from '../services/reportStore.js'

const router = Router()

router.get('/reports/:id', (req, res) => {
  const entry = getReport(req.params.id)
  if (!entry) {
    return res.status(404).send('This report link has expired or does not exist.')
  }
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${entry.filename}"`)
  res.send(entry.buffer)
})

export default router
