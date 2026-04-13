import { useEffect, useMemo, useState } from 'react'
import StatusPill from '../../components/StatusPill'
import { fetchDoctorPatientPrescriptions } from '../../utils/doctorService'
import {
  fetchPatientLatestSymptomAnalysis,
  fetchPatientMedicalRecords,
  fetchPatientProfileById,
} from '../../utils/patientService'
import DoctorPortalPage from './DoctorPortalPage'
import { formatTime, useDoctorPortal } from './DoctorPortalContext'

function getPatientAgeLabel() {
  return 'Not available'
}

function getPatientGenderLabel() {
  return 'Not available'
}

function formatSafeDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString()
}

function normalizeMedications(medications) {
  if (Array.isArray(medications)) {
    return medications
  }

  if (typeof medications === 'string') {
    try {
      const parsed = JSON.parse(medications)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return medications
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function formatAnalysisSource(source) {
  switch (source) {
    case 'custom-model':
      return 'Internal AI model'
    case 'gemini-fallback':
      return 'Gemini fallback'
    case 'fallback':
      return 'Safe fallback'
    default:
      return source || 'Unknown'
  }
}

function formatCarePriority(level) {
  switch (level) {
    case 'urgent':
      return 'Urgent'
    case 'soon':
      return 'Soon'
    case 'self_care':
      return 'Self care'
    default:
      return 'Routine'
  }
}

function formatConditionHeading(name) {
  const value = String(name || '').trim()

  if (!value) return 'Needs more clinical review'
  if (/^(possible|needs|unclear|suspected)/i.test(value)) {
    return value
  }

  return `Possible ${value}`
}

function PatientsContent() {
  const { patientCount, prescriptions, appointments, session } = useDoctorPortal()
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [patientProfile, setPatientProfile] = useState(null)
  const [patientMedicalRecords, setPatientMedicalRecords] = useState([])
  const [patientPrescriptionHistory, setPatientPrescriptionHistory] = useState([])
  const [patientLatestAnalysis, setPatientLatestAnalysis] = useState(null)
  const [patientDetailLoading, setPatientDetailLoading] = useState(false)
  const [patientDetailError, setPatientDetailError] = useState('')

  const patientRecords = useMemo(() => {
    const patientMap = new Map()

    appointments.forEach((appointment) => {
      const patientId = appointment.patient_id
      if (!patientId) return

      const current = patientMap.get(patientId) || {
        id: patientId,
        name: appointment.patient_name || patientId,
        email: appointment.patient_email || '',
        phone: appointment.patient_phone || '',
        lastVisitDate: null,
      }

      const visitDate = appointment.appointment_date || null
      const currentLastVisit = current.lastVisitDate || ''

      patientMap.set(patientId, {
        ...current,
        name: appointment.patient_name || current.name,
        email: appointment.patient_email || current.email,
        phone: appointment.patient_phone || current.phone,
        lastVisitDate:
          visitDate && (!currentLastVisit || visitDate > currentLastVisit) ? visitDate : current.lastVisitDate,
      })
    })

    prescriptions.forEach((prescription) => {
      const patientId = prescription.patient_id
      if (!patientId) return

      const current = patientMap.get(patientId) || {
        id: patientId,
        name: prescription.patient_name || patientId,
        email: '',
        phone: '',
        lastVisitDate: null,
      }

      const prescriptionDate = prescription.created_at
        ? new Date(prescription.created_at).toISOString().split('T')[0]
        : null
      const currentLastVisit = current.lastVisitDate || ''

      patientMap.set(patientId, {
        ...current,
        name: prescription.patient_name || current.name,
        lastVisitDate:
          prescriptionDate && (!currentLastVisit || prescriptionDate > currentLastVisit)
            ? prescriptionDate
            : current.lastVisitDate,
      })
    })

    return Array.from(patientMap.values()).sort((left, right) => {
      if (!left.lastVisitDate) return 1
      if (!right.lastVisitDate) return -1
      return right.lastVisitDate.localeCompare(left.lastVisitDate)
    })
  }, [appointments, prescriptions])

  useEffect(() => {
    if (selectedPatientId && !patientRecords.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId('')
    }
  }, [selectedPatientId, patientRecords])

  useEffect(() => {
    if (!selectedPatientId || !session?.token) {
      setPatientProfile(null)
      setPatientMedicalRecords([])
      setPatientPrescriptionHistory([])
      setPatientLatestAnalysis(null)
      return
    }

    let cancelled = false

    const loadPatientDetails = async () => {
      setPatientDetailLoading(true)
      setPatientDetailError('')

      try {
        const [profileResponse, medicalRecordsResponse, prescriptionsResponse, latestAnalysisResponse] = await Promise.all([
          fetchPatientProfileById(selectedPatientId).catch(() => ({ data: null })),
          fetchPatientMedicalRecords(session.token, selectedPatientId).catch(() => ({ data: [] })),
          fetchDoctorPatientPrescriptions(session.token, selectedPatientId).catch(() => ({ data: [] })),
          fetchPatientLatestSymptomAnalysis(session.token, selectedPatientId).catch(() => ({ data: null })),
        ])

        if (cancelled) return

        setPatientProfile(profileResponse.data || null)
        setPatientMedicalRecords(Array.isArray(medicalRecordsResponse.data) ? medicalRecordsResponse.data : [])
        setPatientPrescriptionHistory(
          Array.isArray(prescriptionsResponse.data) ? prescriptionsResponse.data : [],
        )
        setPatientLatestAnalysis(latestAnalysisResponse.data || null)
      } catch (error) {
        if (!cancelled) {
          setPatientDetailError(error.message)
        }
      } finally {
        if (!cancelled) {
          setPatientDetailLoading(false)
        }
      }
    }

    loadPatientDetails()

    return () => {
      cancelled = true
    }
  }, [selectedPatientId, session?.token])

  const selectedPatient = patientRecords.find((patient) => patient.id === selectedPatientId) || null
  const latestAiCondition = patientLatestAnalysis?.possibleConditions?.[0] || null
  const latestAiConfidence = patientLatestAnalysis?.confidence
    ? Math.round(patientLatestAnalysis.confidence * 100)
    : 0

  const patientAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.patient_id === selectedPatientId)
        .sort((left, right) => {
          const leftTime = `${left.appointment_date || ''}T${left.start_time || '00:00'}`
          const rightTime = `${right.appointment_date || ''}T${right.start_time || '00:00'}`
          return rightTime.localeCompare(leftTime)
        }),
    [appointments, selectedPatientId],
  )

  const consultationNotes = useMemo(() => {
    const notes = []

    if (patientProfile?.notes) {
      notes.push({
        id: `profile-${selectedPatientId}`,
        title: 'Patient profile note',
        date: patientProfile.updated_at || patientProfile.created_at || null,
        detail: patientProfile.notes,
      })
    }

    patientAppointments.forEach((appointment) => {
      if (appointment.reason) {
        notes.push({
          id: `appointment-${appointment.id}`,
          title: 'Visit reason',
          date: appointment.appointment_date || null,
          detail: appointment.reason,
        })
      }
    })

    patientPrescriptionHistory.forEach((prescription) => {
      if (prescription.notes) {
        notes.push({
          id: `prescription-${prescription.id}`,
          title: prescription.diagnosis ? `Prescription note - ${prescription.diagnosis}` : 'Prescription note',
          date: prescription.created_at || null,
          detail: prescription.notes,
        })
      }
    })

    return notes.sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
  }, [patientAppointments, patientPrescriptionHistory, patientProfile, selectedPatientId])

  const handlePatientToggle = (patientId) => {
    setSelectedPatientId((current) => (current === patientId ? '' : patientId))
  }

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Patients</h3>
          <span className="doctor-mini-badge">{patientCount} tracked</span>
        </div>
        <p>
          Review your patient list, open an individual record, and inspect appointment history,
          prescriptions, medical records, and consultation notes from one page.
        </p>
      </section>

      <div className="doctor-patient-layout">
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Patient list</h3>
            <span className="doctor-mini-badge">{patientRecords.length} total</span>
          </div>

          {patientRecords.length ? (
            <div className="doctor-patient-table">
              <div className="doctor-patient-table-header">
                <span>Name</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Age</span>
                <span>Last visit</span>
                <span>Expand</span>
              </div>

              {patientRecords.map((patient) => (
                <article
                  key={patient.id}
                  className={`doctor-patient-table-row${selectedPatientId === patient.id ? ' active' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={selectedPatientId === patient.id}
                  onClick={() => handlePatientToggle(patient.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handlePatientToggle(patient.id)
                    }
                  }}
                >
                  <strong data-label="Name">{patient.name || 'Patient'}</strong>
                  <span data-label="Email">{patient.email || 'Not available'}</span>
                  <span data-label="Phone">{patient.phone || 'Not available'}</span>
                  <span data-label="Age">{getPatientAgeLabel()}</span>
                  <span data-label="Last visit">
                    {patient.lastVisitDate ? formatSafeDate(patient.lastVisitDate) : 'No visits yet'}
                  </span>
                  <span className="doctor-patient-toggle-indicator" data-label="Expand">
                    <span>{selectedPatientId === patient.id ? 'Collapse' : 'Expand'}</span>
                    <span className="doctor-patient-toggle-arrow" aria-hidden="true">
                      {'>'}
                    </span>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">Patient records will appear here after bookings or prescriptions are created.</p>
          )}
        </section>

        {selectedPatient ? (
          <section className="doctor-surface-card">
            <div className="doctor-card-topline">
              <h3>Patient details</h3>
              <StatusPill
                status={patientAppointments.length ? 'ok' : 'pending'}
                label={patientAppointments.length ? 'History found' : 'Limited history'}
              />
            </div>

            <div className="doctor-page-stack">
              {patientDetailError ? <p className="error-text">{patientDetailError}</p> : null}
              {patientDetailLoading ? <p className="empty-state">Loading patient details...</p> : null}

              <section className="doctor-patient-summary-card">
                <div className="doctor-card-topline">
                  <h3>{selectedPatient.name || 'Patient'}</h3>
                  <span className="doctor-mini-badge">Patient record</span>
                </div>
                <div className="doctor-detail-list">
                  <div className="doctor-detail-row">
                    <span>Patient ID</span>
                    <strong>{selectedPatient.id}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Email</span>
                    <strong>{selectedPatient.email || 'Not available'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Phone</span>
                    <strong>{selectedPatient.phone || 'Not available'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Age</span>
                    <strong>{getPatientAgeLabel()}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Gender</span>
                    <strong>{getPatientGenderLabel()}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Blood type</span>
                    <strong>{patientProfile?.blood_type || 'Not available'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Allergies</span>
                    <strong>{patientProfile?.allergies || 'Not recorded'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Emergency contact</span>
                    <strong>{patientProfile?.emergency_contact || 'Not available'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Last visit date</span>
                    <strong>
                      {selectedPatient.lastVisitDate ? formatSafeDate(selectedPatient.lastVisitDate) : 'No visits yet'}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="doctor-surface-card doctor-ai-summary-card">
                <div className="doctor-card-topline">
                  <h3>Latest AI symptom guidance</h3>
                  <StatusPill
                    status={patientLatestAnalysis ? 'ok' : 'pending'}
                    label={patientLatestAnalysis ? 'Latest summary ready' : 'No AI history'}
                  />
                </div>

                {patientLatestAnalysis ? (
                  <div className="doctor-page-stack">
                    <div className="doctor-detail-list">
                      <div className="doctor-detail-row">
                        <span>Analysis source</span>
                        <strong>{formatAnalysisSource(patientLatestAnalysis.source)}</strong>
                      </div>
                      <div className="doctor-detail-row">
                        <span>Recorded at</span>
                        <strong>{formatDateTime(patientLatestAnalysis.analyzedAt)}</strong>
                      </div>
                      <div className="doctor-detail-row">
                        <span>Recommended specialist</span>
                        <strong>{patientLatestAnalysis.recommendedSpecialist || 'General Physician'}</strong>
                      </div>
                      <div className="doctor-detail-row">
                        <span>Care priority</span>
                        <strong>{formatCarePriority(patientLatestAnalysis.consultationAdvice?.level || patientLatestAnalysis.severity)}</strong>
                      </div>
                    </div>

                    <div className="doctor-callout doctor-ai-callout">
                      <strong>{formatConditionHeading(latestAiCondition?.name)}</strong>
                      <p>
                        {latestAiCondition?.reason ||
                          patientLatestAnalysis.recommendation ||
                          'The patient has a saved preliminary symptom guidance record to review.'}
                      </p>
                    </div>

                    <div className="doctor-chip-row">
                      <span className="doctor-chip">{latestAiConfidence}% confidence</span>
                      {(patientLatestAnalysis.detectedSymptoms || []).slice(0, 5).map((symptom) => (
                        <span key={symptom} className="doctor-chip">
                          {symptom}
                        </span>
                      ))}
                    </div>

                    {patientLatestAnalysis.consultationAdvice?.message ? (
                      <div className="doctor-note-panel">
                        <strong>Care guidance</strong>
                        <p>{patientLatestAnalysis.consultationAdvice.message}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="empty-state">
                    This patient has not saved a symptom-check result yet, so there is no AI summary to review.
                  </p>
                )}
              </section>

              <div className="doctor-content-grid">
                <section className="doctor-surface-card">
                  <div className="doctor-card-topline">
                    <h3>Appointment history</h3>
                    <span className="doctor-mini-badge">{patientAppointments.length} visits</span>
                  </div>
                  <div className="doctor-list-stack">
                    {patientAppointments.length ? (
                      patientAppointments.map((appointment) => (
                        <article key={appointment.id} className="doctor-list-card">
                          <strong>
                            {formatSafeDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
                          </strong>
                          <p>
                            {appointment.is_telemedicine ? 'Telemedicine' : 'Clinic visit'} |{' '}
                            {appointment.status}
                          </p>
                          <p>{appointment.reason || 'No consultation note was attached to this visit.'}</p>
                        </article>
                      ))
                    ) : (
                      <p className="empty-state">No appointment history is available for this patient yet.</p>
                    )}
                  </div>
                </section>

                <section className="doctor-surface-card">
                  <div className="doctor-card-topline">
                    <h3>Prescription history</h3>
                    <span className="doctor-mini-badge">
                      {patientPrescriptionHistory.length} issued
                    </span>
                  </div>
                  <div className="doctor-list-stack">
                    {patientPrescriptionHistory.length ? (
                      patientPrescriptionHistory.map((prescription) => {
                        const medications = normalizeMedications(
                          prescription.medications || prescription.drugs,
                        )

                        return (
                          <article key={prescription.id} className="doctor-list-card">
                            <strong>{formatDateTime(prescription.created_at)}</strong>
                            <p>{prescription.diagnosis || 'Prescription issued'}</p>
                            <p>
                              Medicines:{' '}
                              {medications.length
                                ? medications
                                    .map((item) =>
                                      typeof item === 'string'
                                        ? item
                                        : item.drug_name || item.drugName || item.name || 'Medicine',
                                    )
                                    .join(', ')
                                : 'No medicine list available'}
                            </p>
                            <p>{prescription.notes || 'No doctor note was saved with this prescription.'}</p>
                          </article>
                        )
                      })
                    ) : (
                      <p className="empty-state">No prescription history is available for this patient yet.</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="doctor-content-grid">
                <section className="doctor-surface-card">
                  <div className="doctor-card-topline">
                    <h3>Consultation notes</h3>
                    <span className="doctor-mini-badge">{consultationNotes.length} notes</span>
                  </div>
                  <div className="doctor-list-stack">
                    {consultationNotes.length ? (
                      consultationNotes.map((note) => (
                        <article key={note.id} className="doctor-list-card">
                          <strong>{note.title}</strong>
                          <p>{note.date ? formatDateTime(note.date) : 'Date not available'}</p>
                          <p>{note.detail}</p>
                        </article>
                      ))
                    ) : (
                      <p className="empty-state">No consultation notes are available for this patient yet.</p>
                    )}
                  </div>
                </section>

                <section className="doctor-surface-card">
                  <div className="doctor-card-topline">
                    <h3>Medical records</h3>
                    <span className="doctor-mini-badge">{patientMedicalRecords.length} files</span>
                  </div>
                  <div className="doctor-list-stack">
                    {patientMedicalRecords.length ? (
                      patientMedicalRecords.map((record) => (
                        <article key={record.id} className="doctor-list-card">
                          <strong>{record.title}</strong>
                          <p>
                            {record.category} | {formatDateTime(record.uploaded_at)}
                          </p>
                          <p>{record.description || 'No description provided.'}</p>
                        </article>
                      ))
                    ) : (
                      <p className="empty-state">No uploaded medical records are available for this patient yet.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export default function Patients(props) {
  return (
    <DoctorPortalPage {...props}>
      <PatientsContent />
    </DoctorPortalPage>
  )
}
