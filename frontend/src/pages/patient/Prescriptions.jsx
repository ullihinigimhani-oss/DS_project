import { useEffect, useMemo, useState } from 'react'
import PatientPortalPage from './PatientPortalPage'
import { formatDate, formatTime, usePatientPortal } from './PatientPortalContext'
import { fetchMyPrescriptions } from '../../utils/prescriptionService'

function parseMedicationList(value, drugs = []) {
  if (Array.isArray(drugs) && drugs.length) {
    return drugs
      .map((item) => {
        const name = item?.drug_name || item?.drugName || item?.name || ''
        const detail = [item?.strength, item?.frequency, item?.duration].filter(Boolean).join(' | ')
        return {
          title: name || 'Medication',
          detail: detail || item?.instructions || 'Issued by the doctor',
        }
      })
      .filter((item) => item.title)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return {
            title: item.trim(),
            detail: 'Medication note',
          }
        }

        const name = item?.drug_name || item?.drugName || item?.name || ''
        return {
          title: name,
          detail: [item?.strength, item?.frequency, item?.duration].filter(Boolean).join(' | ') || 'Medication note',
        }
      })
      .filter((item) => item.title)
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parseMedicationList(parsed)
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({
          title: item,
          detail: 'Medication note',
        }))
    }
  }

  return []
}

function buildPrescriptionHtml(prescription, medications) {
  const title = prescription.patient_name || 'Patient'
  const doctor = prescription.doctor_name || 'Doctor'
  const issuedDate = formatDate(prescription.created_at)
  const visitWindow =
    prescription.appointment_date && prescription.start_time
      ? `${formatDate(prescription.appointment_date)} | ${formatTime(prescription.start_time)} - ${formatTime(
          prescription.end_time,
        )}`
      : 'Standalone prescription'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Prescription - ${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 32px; color: #1f2937; background: #f8fafc; }
      .sheet { max-width: 780px; margin: 0 auto; background: white; border-radius: 20px; padding: 32px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; color: #6366f1; font-weight: 700; margin: 0 0 12px; }
      h1 { margin: 0 0 8px; font-size: 32px; color: #1e3a5f; }
      p { line-height: 1.6; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 24px 0; }
      .meta-card { padding: 16px; border-radius: 16px; background: #f8fbff; border: 1px solid #d9e7fb; }
      .meta-card span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 8px; }
      .meta-card strong { color: #1f3a5a; }
      .section { margin-top: 28px; }
      .section h2 { margin: 0 0 14px; font-size: 20px; color: #1f3a5a; }
      .med-list { display: grid; gap: 12px; padding: 0; list-style: none; }
      .med-item { padding: 14px 16px; border-radius: 14px; background: #f8fbff; border: 1px solid #d9e7fb; }
      .med-item strong { display: block; margin-bottom: 4px; }
      .footnote { margin-top: 28px; font-size: 14px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <p class="eyebrow">Arogya Prescription</p>
      <h1>${title}</h1>
      <p>This prescription was issued by ${doctor} and downloaded from the patient workspace.</p>

      <div class="meta">
        <div class="meta-card">
          <span>Issued by</span>
          <strong>${doctor}</strong>
        </div>
        <div class="meta-card">
          <span>Issued on</span>
          <strong>${issuedDate}</strong>
        </div>
        <div class="meta-card">
          <span>Visit</span>
          <strong>${visitWindow}</strong>
        </div>
        <div class="meta-card">
          <span>Prescription ID</span>
          <strong>${prescription.id}</strong>
        </div>
      </div>

      <div class="section">
        <h2>Medications</h2>
        <ul class="med-list">
          ${medications
            .map(
              (medication) => `<li class="med-item"><strong>${medication.title}</strong><span>${medication.detail}</span></li>`,
            )
            .join('')}
        </ul>
      </div>

      <div class="section">
        <h2>Doctor notes</h2>
        <p>${prescription.notes || 'No additional notes were attached to this prescription.'}</p>
      </div>

      <p class="footnote">Please follow your doctor’s guidance and contact the clinic if anything in this prescription is unclear.</p>
    </div>
  </body>
</html>`
}

function normalizePdfText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapePdfText(value) {
  return normalizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapPdfLine(value, maxLength = 82) {
  const text = normalizePdfText(value)
  if (!text) return ['']

  const words = text.split(' ')
  const lines = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxLength) {
      current = next
      return
    }

    if (current) {
      lines.push(current)
    }

    if (word.length <= maxLength) {
      current = word
      return
    }

    let remaining = word
    while (remaining.length > maxLength) {
      lines.push(remaining.slice(0, maxLength))
      remaining = remaining.slice(maxLength)
    }
    current = remaining
  })

  if (current) {
    lines.push(current)
  }

  return lines
}

function chunkPdfLines(lines, pageSize = 42) {
  const pages = []
  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize))
  }
  return pages.length ? pages : [[]]
}

function createPdfDocument(pageLines) {
  const totalPages = pageLines.length
  const fontObjectId = 3
  const contentObjectIds = pageLines.map((_, index) => 4 + index)
  const pageObjectIds = pageLines.map((_, index) => 4 + totalPages + index)

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  pageLines.forEach((lines) => {
    const streamLines = ['BT', '/F1 12 Tf', '50 792 Td', '16 TL']
    lines.forEach((line) => {
      streamLines.push(`(${escapePdfText(line)}) Tj`)
      streamLines.push('T*')
    })
    streamLines.push('ET')

    const stream = streamLines.join('\n')
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })

  contentObjectIds.forEach((contentId) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    )
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return pdf
}

function buildPrescriptionPdf(prescription, medications) {
  const visitWindow =
    prescription.appointment_date && prescription.start_time
      ? `${formatDate(prescription.appointment_date)} | ${formatTime(prescription.start_time)} - ${formatTime(
          prescription.end_time,
        )}`
      : 'Standalone prescription'

  const lines = [
    'Arogya Prescription',
    '',
    ...wrapPdfLine(`Patient: ${prescription.patient_name || 'Patient'}`),
    ...wrapPdfLine(`Issued by: ${prescription.doctor_name || 'Doctor'}`),
    ...wrapPdfLine(`Issued on: ${formatDate(prescription.created_at)}`),
    ...wrapPdfLine(`Visit: ${visitWindow}`),
    ...wrapPdfLine(`Prescription ID: ${prescription.id}`),
    '',
    'Medications',
    ...(medications.length
      ? medications.flatMap((medication, index) => [
          ...wrapPdfLine(`${index + 1}. ${medication.title}`),
          ...wrapPdfLine(`   ${medication.detail}`),
        ])
      : ['No medication lines were saved with this prescription.']),
    '',
    'Doctor notes',
    ...wrapPdfLine(prescription.notes || 'No additional notes were added to this prescription.'),
    '',
    ...wrapPdfLine('Please follow your doctor guidance and contact the clinic if anything in this prescription is unclear.'),
  ]

  return createPdfDocument(chunkPdfLines(lines))
}

function downloadPrescriptionDocument(prescription, medications) {
  const blob = new Blob([buildPrescriptionPdf(prescription, medications)], {
    type: 'application/pdf',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `prescription-${String(prescription.id || 'download').slice(0, 8)}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function PrescriptionsContent() {
  const { session } = usePatientPortal()
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!session?.token) {
      setPrescriptions([])
      return
    }

    let cancelled = false

    const loadPrescriptions = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchMyPrescriptions(session.token)
        if (!cancelled) {
          setPrescriptions(Array.isArray(response.data) ? response.data : [])
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || 'Unable to load prescriptions right now.')
          setPrescriptions([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPrescriptions()

    return () => {
      cancelled = true
    }
  }, [session?.token])

  const filteredPrescriptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return prescriptions

    return prescriptions.filter((prescription) => {
      const medications = parseMedicationList(prescription.medications, prescription.drugs)

      return [
        prescription.doctor_name,
        prescription.patient_name,
        prescription.notes,
        prescription.diagnosis,
        prescription.id,
        ...medications.flatMap((medication) => [medication.title, medication.detail]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [prescriptions, search])

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>My prescriptions</h3>
          <span className="patient-mini-badge">{filteredPrescriptions.length} available</span>
        </div>
        <p>
          Review the prescriptions your doctors have issued, check medication guidance, and download a
          copy whenever you need it.
        </p>

        <div className="patient-prescription-summary-grid">
          <span className="patient-chip">{prescriptions.length} total issued</span>
          <span className="patient-chip">
            {prescriptions.filter((prescription) => prescription.appointment_id).length} visit linked
          </span>
          <span className="patient-chip">
            {prescriptions.filter((prescription) => prescription.source === 'standalone').length} standalone
          </span>
        </div>

        <div className="patient-prescription-toolbar">
          <label className="patient-prescription-search-field">
            <span>Search prescriptions</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by doctor, medication, notes, or prescription ID"
            />
          </label>
        </div>
      </section>

      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Prescription history</h3>
          <span className="patient-mini-badge">Patient access only</span>
        </div>

        {loading ? <p className="empty-state">Loading your prescriptions...</p> : null}
        {!loading && error ? <p className="error-text">{error}</p> : null}
        {!loading && !error && filteredPrescriptions.length === 0 ? (
          <p className="empty-state">No prescriptions are available yet.</p>
        ) : null}

        <div className="patient-prescription-grid">
          {filteredPrescriptions.map((prescription) => {
            const medications = parseMedicationList(prescription.medications, prescription.drugs)

            return (
              <article key={prescription.id} className="patient-prescription-card">
                <div className="patient-card-topline">
                  <div>
                    <strong>{prescription.doctor_name || 'Doctor'}</strong>
                    <p>
                      {prescription.appointment_date
                        ? `${formatDate(prescription.appointment_date)} | ${formatTime(
                            prescription.start_time,
                          )} - ${formatTime(prescription.end_time)}`
                        : `Issued ${formatDate(prescription.created_at)}`}
                    </p>
                  </div>
                  <span className="patient-mini-badge">
                    {prescription.appointment_id ? 'Visit linked' : 'Standalone'}
                  </span>
                </div>

                <div className="patient-prescription-meta">
                  <span>Prescription ID: {prescription.id}</span>
                  <span>Issued on {formatDate(prescription.created_at)}</span>
                </div>

                {prescription.diagnosis ? (
                  <div className="patient-prescription-callout">
                    <span>Diagnosis</span>
                    <strong>{prescription.diagnosis}</strong>
                  </div>
                ) : null}

                <div className="patient-prescription-section">
                  <h4>Medications</h4>
                  <div className="patient-prescription-list">
                    {medications.length ? (
                      medications.map((medication) => (
                        <article
                          key={`${prescription.id}-${medication.title}-${medication.detail}`}
                          className="patient-prescription-medication"
                        >
                          <strong>{medication.title}</strong>
                          <span>{medication.detail}</span>
                        </article>
                      ))
                    ) : (
                      <p className="empty-state">No medication lines were saved with this prescription.</p>
                    )}
                  </div>
                </div>

                <div className="patient-prescription-section">
                  <h4>Doctor notes</h4>
                  <p>{prescription.notes || 'No additional notes were added to this prescription.'}</p>
                </div>

                <div className="patient-booking-actions">
                  <button
                    type="button"
                    onClick={() => downloadPrescriptionDocument(prescription, medications)}
                  >
                    Download prescription
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function Prescriptions(props) {
  return (
    <PatientPortalPage {...props}>
      <PrescriptionsContent />
    </PatientPortalPage>
  )
}
