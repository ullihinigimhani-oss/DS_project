import { useEffect, useMemo, useState } from 'react'
import StatusPill from '../../components/StatusPill'
import { fetchPatientLatestSymptomAnalysis } from '../../utils/patientService'
import DoctorPortalPage from './DoctorPortalPage'
import { formatDate, formatTime, useDoctorPortal } from './DoctorPortalContext'

function formatDateTime(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString()
}

function formatCompactId(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'Not available'
  if (raw.length <= 12) return raw
  return `${raw.slice(0, 8)}...${raw.slice(-4)}`
}

function parseMedicationList(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        return item?.drug_name || item?.drugName || item?.name || ''
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parseMedicationList(parsed)
      }
    } catch {
      // Fall through to newline/comma parsing.
    }

    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
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

  if (!value) return 'Needs more review'
  if (/^(possible|needs|unclear|suspected)/i.test(value)) {
    return value
  }

  return `Possible ${value}`
}

function PrescriptionsContent() {
  const {
    session,
    prescriptions,
    appointments,
    prescriptionValues,
    setPrescriptionValues,
    handlePrescriptionChange,
    handleIssuePrescription,
    preparePrescriptionDraft,
  } = useDoctorPortal()
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('')
  const [historyFilter, setHistoryFilter] = useState('')
  const [latestAiSummary, setLatestAiSummary] = useState(null)
  const [latestAiLoading, setLatestAiLoading] = useState(false)

  const patientOptions = useMemo(() => {
    const patientMap = new Map()

    appointments.forEach((appointment) => {
      const patientId = appointment.patient_id
      if (!patientId) return

      const current = patientMap.get(patientId) || {
        id: patientId,
        name: appointment.patient_name || patientId,
        email: appointment.patient_email || '',
        phone: appointment.patient_phone || '',
      }

      patientMap.set(patientId, {
        ...current,
        name: appointment.patient_name || current.name,
        email: appointment.patient_email || current.email,
        phone: appointment.patient_phone || current.phone,
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
      }

      patientMap.set(patientId, {
        ...current,
        name: prescription.patient_name || current.name,
      })
    })

    return Array.from(patientMap.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [appointments, prescriptions])

  const selectedPatientAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.patient_id === prescriptionValues.patientId)
        .sort((left, right) => {
          const leftStamp = `${left.appointment_date || ''}T${left.start_time || '00:00'}`
          const rightStamp = `${right.appointment_date || ''}T${right.start_time || '00:00'}`
          return rightStamp.localeCompare(leftStamp)
        }),
    [appointments, prescriptionValues.patientId],
  )

  const recentAppointmentOptions = useMemo(
    () =>
      [...appointments]
        .sort((left, right) => {
          const leftStamp = `${left.appointment_date || ''}T${left.start_time || '00:00'}`
          const rightStamp = `${right.appointment_date || ''}T${right.start_time || '00:00'}`
          return rightStamp.localeCompare(leftStamp)
        })
        .slice(0, 4),
    [appointments],
  )

  const filteredPrescriptions = useMemo(() => {
    const query = historyFilter.trim().toLowerCase()
    if (!query) return prescriptions

    return prescriptions.filter((prescription) => {
      const medications = parseMedicationList(prescription.medications || prescription.drugs)
      return [
        prescription.patient_name,
        prescription.patient_id,
        prescription.appointment_id,
        prescription.notes,
        ...medications,
      ]
        .filter(Boolean)
        .some((item) => String(item).toLowerCase().includes(query))
    })
  }, [historyFilter, prescriptions])

  useEffect(() => {
    if (!filteredPrescriptions.length) {
      if (selectedPrescriptionId) {
        setSelectedPrescriptionId('')
      }
      return
    }

    if (!filteredPrescriptions.some((prescription) => prescription.id === selectedPrescriptionId)) {
      setSelectedPrescriptionId(filteredPrescriptions[0].id)
    }
  }, [filteredPrescriptions, selectedPrescriptionId])

  useEffect(() => {
    if (!session?.token || !prescriptionValues.patientId) {
      setLatestAiSummary(null)
      return
    }

    let cancelled = false

    const loadLatestAiSummary = async () => {
      setLatestAiLoading(true)
      try {
        const response = await fetchPatientLatestSymptomAnalysis(session.token, prescriptionValues.patientId)
        if (!cancelled) {
          setLatestAiSummary(response.data || null)
        }
      } catch {
        if (!cancelled) {
          setLatestAiSummary(null)
        }
      } finally {
        if (!cancelled) {
          setLatestAiLoading(false)
        }
      }
    }

    loadLatestAiSummary()

    return () => {
      cancelled = true
    }
  }, [prescriptionValues.patientId, session?.token])

  const selectedPrescription =
    filteredPrescriptions.find((prescription) => prescription.id === selectedPrescriptionId) ||
    prescriptions.find((prescription) => prescription.id === selectedPrescriptionId) ||
    null
  const selectedMedicationList = useMemo(
    () => parseMedicationList(selectedPrescription?.medications || selectedPrescription?.drugs),
    [selectedPrescription],
  )

  const draftMedicationList = parseMedicationList(prescriptionValues.medications)
  const aiTopCondition = latestAiSummary?.possibleConditions?.[0] || null
  const linkedPrescriptionCount = prescriptions.filter((prescription) => prescription.appointment_id).length
  const uniquePatientsWithPrescriptions = new Set(
    prescriptions.map((prescription) => prescription.patient_id || prescription.patient_name).filter(Boolean),
  ).size

  const handlePatientSelect = (event) => {
    const patientId = event.target.value
    const selectedPatient = patientOptions.find((patient) => patient.id === patientId)
    const nextAppointments = appointments.filter((appointment) => appointment.patient_id === patientId)

    setPrescriptionValues((current) => ({
      ...current,
      patientId,
      patientName: selectedPatient?.name || '',
      appointmentId: nextAppointments.some((appointment) => appointment.id === current.appointmentId)
        ? current.appointmentId
        : '',
    }))
  }

  const handleAppointmentSelect = (event) => {
    const appointmentId = event.target.value
    const selectedAppointment = selectedPatientAppointments.find((appointment) => appointment.id === appointmentId)

    setPrescriptionValues((current) => ({
      ...current,
      appointmentId,
      patientId: selectedAppointment?.patient_id || current.patientId,
      patientName: selectedAppointment?.patient_name || current.patientName,
    }))
  }

  const handleQuickFillAppointment = (appointment) => {
    preparePrescriptionDraft(appointment)
  }

  const handleClearDraft = () => {
    setPrescriptionValues({
      patientId: '',
      appointmentId: '',
      patientName: '',
      medications: '',
      notes: '',
    })
  }

  const appendAiSummaryToNotes = () => {
    if (!latestAiSummary) return

    const nextSummaryLines = [
      'AI symptom guidance',
      `Condition: ${formatConditionHeading(aiTopCondition?.name)}`,
      `Confidence: ${Math.round((latestAiSummary.confidence || 0) * 100)}%`,
      `Recommended specialist: ${latestAiSummary.recommendedSpecialist || 'General Physician'}`,
      `Care priority: ${formatCarePriority(latestAiSummary.consultationAdvice?.level || latestAiSummary.severity)}`,
    ]

    setPrescriptionValues((current) => ({
      ...current,
      notes: [current.notes?.trim(), nextSummaryLines.join('\n')]
        .filter(Boolean)
        .join('\n\n'),
    }))
  }

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Prescriptions</h3>
          <span className="doctor-mini-badge">{prescriptions.length} issued</span>
        </div>
        <p>
          Prepare prescriptions from appointment context, review medication lists before sending, and
          keep a searchable history of everything you have issued.
        </p>

        <div className="doctor-prescription-highlight-grid">
          <article className="doctor-prescription-highlight">
            <span>Total issued</span>
            <strong>{prescriptions.length}</strong>
            <p>All prescriptions issued from this doctor workspace.</p>
          </article>
          <article className="doctor-prescription-highlight">
            <span>Patients treated</span>
            <strong>{uniquePatientsWithPrescriptions}</strong>
            <p>Unique patients who already have a prescription record.</p>
          </article>
          <article className="doctor-prescription-highlight">
            <span>Appointment linked</span>
            <strong>{linkedPrescriptionCount}</strong>
            <p>Prescriptions connected directly to a visit.</p>
          </article>
          <article className="doctor-prescription-highlight">
            <span>Draft medicines</span>
            <strong>{draftMedicationList.length}</strong>
            <p>Medication lines currently prepared in the issue form.</p>
          </article>
        </div>
      </section>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Search Prescriptions</h3>
          <span className="doctor-mini-badge">{filteredPrescriptions.length} matching</span>
        </div>
        <p>Search by patient, medication, notes, or appointment ID to jump straight to a record.</p>
        <div className="doctor-toolbar">
          <label className="doctor-compact-field doctor-prescription-search doctor-prescription-search-top">
            Search history
            <input
              value={historyFilter}
              onChange={(event) => setHistoryFilter(event.target.value)}
              placeholder="Search by patient, medication, notes, or appointment ID"
            />
          </label>
        </div>
      </section>

      <div className="doctor-prescription-layout">
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Issue Prescription</h3>
            <StatusPill
              status={draftMedicationList.length ? 'ok' : 'pending'}
              label={draftMedicationList.length ? `${draftMedicationList.length} medicines ready` : 'Draft empty'}
            />
          </div>

          <div className="doctor-prescription-quick-grid">
            {recentAppointmentOptions.length ? (
              recentAppointmentOptions.map((appointment) => (
                <button
                  key={appointment.id}
                  type="button"
                  className="doctor-prescription-quick-card"
                  onClick={() => handleQuickFillAppointment(appointment)}
                >
                  <strong>{appointment.patient_name || 'Patient'}</strong>
                  <span>
                    {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
                  </span>
                  <p>{appointment.reason || 'Use this visit as the prescription context.'}</p>
                </button>
              ))
            ) : (
              <div className="doctor-empty-panel">
                <strong>No appointments yet</strong>
                <p>Recent appointments will appear here so we can prefill prescriptions in one click.</p>
              </div>
            )}
          </div>

          <form className="analysis-form" onSubmit={handleIssuePrescription}>
            <div className="doctor-prescription-form-grid">
              <label className="doctor-select-field">
                Patient
                <select value={prescriptionValues.patientId} onChange={handlePatientSelect}>
                  <option value="">Select patient</option>
                  {patientOptions.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} ({formatCompactId(patient.id)})
                    </option>
                  ))}
                </select>
                <small className="doctor-field-hint">
                  {prescriptionValues.patientId
                    ? `Patient ID: ${prescriptionValues.patientId}`
                    : 'Choose the patient who should receive this prescription.'}
                </small>
              </label>

              <label className="doctor-select-field">
                Appointment
                <select value={prescriptionValues.appointmentId} onChange={handleAppointmentSelect}>
                  <option value="">Standalone prescription</option>
                  {selectedPatientAppointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {formatDate(appointment.appointment_date)} | {formatTime(appointment.start_time)} |{' '}
                      {(appointment.status || 'pending').replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <small className="doctor-field-hint">
                  {prescriptionValues.appointmentId
                    ? 'This prescription will stay linked to the selected visit.'
                    : 'Keep this as a standalone prescription if no visit should be attached.'}
                </small>
              </label>
            </div>

            <label>
              Patient name
              <input
                name="patientName"
                placeholder="Patient display name"
                value={prescriptionValues.patientName}
                onChange={handlePrescriptionChange}
              />
            </label>

            <div className="doctor-note-panel doctor-ai-inline-panel">
              <strong>Latest AI symptom guidance</strong>
              {latestAiLoading ? (
                <p>Loading the patient&apos;s latest symptom summary...</p>
              ) : latestAiSummary ? (
                <>
                  <p>
                    <strong>{formatConditionHeading(aiTopCondition?.name)}</strong>
                    {' '}| {Math.round((latestAiSummary.confidence || 0) * 100)}% confidence
                  </p>
                  <p>
                    {latestAiSummary.recommendedSpecialist || 'General Physician'} recommended
                    {' '}| {formatCarePriority(latestAiSummary.consultationAdvice?.level || latestAiSummary.severity)} priority
                  </p>
                  <p>
                    {latestAiSummary.consultationAdvice?.message ||
                      latestAiSummary.recommendation}
                  </p>
                  <div className="doctor-toolbar">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={appendAiSummaryToNotes}
                    >
                      Add AI summary to notes
                    </button>
                  </div>
                </>
              ) : (
                <p>No saved AI symptom guidance is available for this patient yet.</p>
              )}
            </div>

            <label>
              Medications
              <textarea
                name="medications"
                rows="6"
                placeholder="One medication per line"
                value={prescriptionValues.medications}
                onChange={handlePrescriptionChange}
              />
            </label>

            <div className="doctor-prescription-pill-list">
              {draftMedicationList.length ? (
                draftMedicationList.map((medication) => (
                  <span key={medication} className="doctor-chip">
                    {medication}
                  </span>
                ))
              ) : (
                <span className="doctor-chip">Add one medication per line to preview them here</span>
              )}
            </div>

            <label>
              Notes
              <textarea
                name="notes"
                rows="4"
                placeholder="Dosage guidance, care instructions, or follow-up notes"
                value={prescriptionValues.notes}
                onChange={handlePrescriptionChange}
              />
            </label>

            <div className="doctor-toolbar">
              <button type="submit">Issue prescription</button>
              <button type="button" className="secondary-button" onClick={handleClearDraft}>
                Clear draft
              </button>
            </div>
          </form>
        </section>

        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Prescription Detail</h3>
            {selectedPrescription ? (
              <StatusPill
                status={selectedPrescription.appointment_id ? 'ok' : 'pending'}
                label={selectedPrescription.appointment_id ? 'Appointment linked' : 'Standalone'}
              />
            ) : null}
          </div>

          {selectedPrescription ? (
            <div className="doctor-page-stack">
              <section className="doctor-patient-summary-card">
                <div className="doctor-card-topline">
                  <h3>{selectedPrescription.patient_name || selectedPrescription.patient_id}</h3>
                  <span className="doctor-mini-badge">{formatDateTime(selectedPrescription.created_at)}</span>
                </div>
                <div className="doctor-detail-list">
                  <div className="doctor-detail-row">
                    <span>Patient ID</span>
                    <strong>{selectedPrescription.patient_id || 'Not available'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Appointment ID</span>
                    <strong>{selectedPrescription.appointment_id || 'Standalone prescription'}</strong>
                  </div>
                  <div className="doctor-detail-row">
                    <span>Created</span>
                    <strong>{formatDateTime(selectedPrescription.created_at)}</strong>
                  </div>
                </div>
              </section>

              <section className="doctor-surface-card">
                <div className="doctor-card-topline">
                  <h3>Medicines issued</h3>
                  <span className="doctor-mini-badge">{selectedMedicationList.length} items</span>
                </div>
                <div className="doctor-prescription-pill-list">
                  {selectedMedicationList.length ? (
                    selectedMedicationList.map((medication) => (
                      <span key={`${selectedPrescription.id}-${medication}`} className="doctor-chip">
                        {medication}
                      </span>
                    ))
                  ) : (
                    <p className="empty-state">No medicine list is stored for this prescription.</p>
                  )}
                </div>
                <div className="doctor-note-panel">
                  <strong>Doctor notes</strong>
                  <p>{selectedPrescription.notes || 'No additional doctor note was saved with this prescription.'}</p>
                </div>
              </section>
            </div>
          ) : (
            <div className="doctor-empty-panel">
              <strong>Select a prescription</strong>
              <p>Choose a record from the history list to inspect its medicines and notes in detail.</p>
            </div>
          )}
        </section>
      </div>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Issued Prescriptions</h3>
          <span className="doctor-mini-badge">{filteredPrescriptions.length} shown</span>
        </div>

        <div className="doctor-prescription-history-list">
          {filteredPrescriptions.length ? (
            filteredPrescriptions.map((prescription) => {
              const medicationList = parseMedicationList(prescription.medications || prescription.drugs)

              return (
                <button
                  key={prescription.id}
                  type="button"
                  className={`doctor-prescription-record-card${
                    selectedPrescriptionId === prescription.id ? ' active' : ''
                  }`}
                  onClick={() => setSelectedPrescriptionId(prescription.id)}
                >
                  <div className="doctor-card-topline">
                    <strong>{prescription.patient_name || prescription.patient_id}</strong>
                    <span className="doctor-mini-badge">
                      {prescription.appointment_id ? 'Visit linked' : 'Standalone'}
                    </span>
                  </div>
                  <p>{formatDateTime(prescription.created_at)}</p>
                  <p>
                    {medicationList.length
                      ? medicationList.join(', ')
                      : 'No medicine list was stored with this prescription.'}
                  </p>
                  <p>{prescription.notes || 'No notes added.'}</p>
                </button>
              )
            })
          ) : (
            <p className="empty-state">No prescriptions match this search yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Prescriptions(props) {
  return (
    <DoctorPortalPage {...props}>
      <PrescriptionsContent />
    </DoctorPortalPage>
  )
}
