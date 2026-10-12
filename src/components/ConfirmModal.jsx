import Modal from './Modal.jsx'

function downloadPdf(pdfBase64) {
  const bytes = atob(pdfBase64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  const blob = new Blob([arr], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'AltiusNxt-AI-Readiness-Report.pdf'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ConfirmModal({ onClose, firstName, email, pdfBase64, emailStatus }) {
  return (
    <Modal title="Report ready" onClose={onClose}>
      <p className="modal-sub">
        Thanks{firstName ? `, ${firstName}` : ''} — {emailStatus === 'sent'
          ? <>we've emailed your AI Readiness Report to <strong>{email}</strong>.</>
          : <>your AI Readiness Report is ready to download below.</>} Our AltiusNxt team will be in touch
        with the full picture shortly. Look for the QR code inside the PDF — scanning it with your phone
        opens a deeper AI Discoverability Audit.
      </p>
      {pdfBase64 && (
        <button className="btn btn-primary" type="button" style={{ width: '100%' }} onClick={() => downloadPdf(pdfBase64)}>
          Download PDF
        </button>
      )}
      <button className="btn btn-outline" type="button" style={{ width: '100%', marginTop: 10 }} onClick={onClose}>
        Close
      </button>
    </Modal>
  )
}
