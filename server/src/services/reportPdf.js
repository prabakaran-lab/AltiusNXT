import fs from 'node:fs'
import puppeteer from 'puppeteer-core'
import QRCode from 'qrcode'
import { buildReportHtml } from '../templates/reportTemplate.js'
import { buildAuditReportHtml } from '../templates/auditReportTemplate.js'
import { buildOutreachReportHtml } from '../templates/outreachReportTemplate.js'

const CANDIDATE_CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)

function findChromeExecutable() {
  for (const path of CANDIDATE_CHROME_PATHS) {
    if (fs.existsSync(path)) return path
  }
  throw new Error(
    'Could not find a local Chrome/Edge install for PDF rendering. Set CHROME_PATH in server/.env to the browser executable.'
  )
}

async function renderHtmlToPdf(html) {
  const browser = await puppeteer.launch({
    executablePath: findChromeExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

async function buildQrCode(targetUrl) {
  return QRCode.toDataURL(targetUrl, { margin: 1, width: 200, color: { dark: '#0b1f3a', light: '#ffffff' } })
}

function buildMailtoFallback(lead) {
  const subject = encodeURIComponent(`Walkthrough request — ${lead?.company || ''}`)
  const body = encodeURIComponent(
    `Hi Govind,\n\nI'd like to book the 20-minute walkthrough mentioned in my AI Readiness Report.\n\n— ${lead?.firstName || ''} ${lead?.lastName || ''}`
  )
  return `mailto:govind@altiusnxt.com?subject=${subject}&body=${body}`
}

export async function generateReportPdf({ lead, url, quickScan, deep, revenue, liveAudit, pageReaction, fullReportUrl }) {
  const qrTarget = fullReportUrl || buildMailtoFallback(lead)
  const qrDataUrl = await buildQrCode(qrTarget)
  const html = buildReportHtml({ lead, url, quickScan, deep, revenue, liveAudit, pageReaction, qrDataUrl, hasFullReport: Boolean(fullReportUrl) })
  return renderHtmlToPdf(html)
}

export async function generateAuditReportPdf({ lead, url, quickScan, deep, scores, engineData, jsonLd, narrative, refCode, auditDate }) {
  const html = buildAuditReportHtml({ lead, url, quickScan, deep, scores, engineData, jsonLd, narrative, refCode, auditDate })
  return renderHtmlToPdf(html)
}

export async function generateOutreachReportPdf(params) {
  const html = buildOutreachReportHtml(params)
  return renderHtmlToPdf(html)
}
