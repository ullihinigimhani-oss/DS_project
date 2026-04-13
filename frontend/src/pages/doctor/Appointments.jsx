import { useEffect, useState } from 'react'
import StatusPill from '../../components/StatusPill'
import { fetchPatientLatestSymptomAnalysis } from '../../utils/patientService'
import DoctorPortalPage from './DoctorPortalPage'
import {
  appointmentFilters,
  formatDate,
  formatTime,
  getAppointmentStatusTone,
  getInitials,
  useDoctorPortal,
} from './DoctorPortalContext'

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

function AppointmentsContent({ onNavigate }) {
  const {
    session,
    schedule,
    appointments,
    appointmentLoading,
    appointmentFilter,
    selectedAppointmentId,
    appointmentActionId,
    rejectReason,
    filteredAppointments,
    nextPendingAppointment,
    nextConfirmedAppointment,
    selectedAppointment,
    appointmentSummary,
    setAppointmentFilter,
    setSelectedAppointmentId,
    setRejectReason,
    handleApproveAppointment,
    handleRejectAppointment,
    preparePrescriptionDraft,
    prepareConsultationDraft,
  } = useDoctorPortal()
  const [latestPatientAnalysis, setLatestPatientAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  useEffect(() => {
    if (!session?.token || !selectedAppointment?.id || !selectedAppointment?.patient_id) {
      setLatestPatientAnalysis(null)
      return
    }

    let cancelled = false

    const loadLatestAnalysis = async () => {
      setAnalysisLoading(true)
      try {
        const response = await fetchPatientLatestSymptomAnalysis(session.token, selectedAppointment.patient_id)
        if (!cancelled) {
          setLatestPatientAnalysis(response.data || null)
        }
      } catch {
        if (!cancelled) {
          setLatestPatientAnalysis(null)
        }
      } finally {
        if (!cancelled) {
          setAnalysisLoading(false)
        }
      }
    }

    loadLatestAnalysis()

    return () => {
      cancelled = true
    }
  }, [selectedAppointment?.id, selectedAppointment?.patient_id, session?.token])

  const latestAiCondition = latestPatientAnalysis?.possibleConditions?.[0] || null
  const latestAiConfidence = latestPatientAnalysis?.confidence
    ? Math.round(latestPatientAnalysis.confidence * 100)
    : 0

  const appointmentHighlights = [
    {
      id: 'pending',
      label: 'Needs response',
      value: appointmentSummary.pending,
      detail: nextPendingAppointment
        ? `${nextPendingAppointment.patient_name || 'Patient'} on ${formatDate(
            nextPendingAppointment.appointment_date,
          )} at ${formatTime(nextPendingAppointment.start_time)}`
        : 'No pending booking requests right now.',
    },
    {
      id: 'today',
      label: 'Today',
      value: appointmentSummary.today,
      detail: appointmentSummary.today
        ? "Keep today's visits and follow-ups moving on time."
        : 'No visits are scheduled for today yet.',
    },
    {
      id: 'confirmed',
      label: 'Confirmed',
      value: appointmentSummary.confirmed,
      detail: nextConfirmedAppointment
        ? `Next confirmed visit: ${nextConfirmedAppointment.patient_name || 'Patient'}`
        : 'Confirmed bookings will appear here as soon as you approve them.',
    },
    {
      id: 'all',
      label: 'Capacity',
      value: schedule?.slots?.length || 0,
      detail: schedule?.slots?.length
        ? 'Schedule slots are configured and ready for more bookings.'
        : 'No schedule slots are configured yet. Add a few to support new bookings.',
    },
  ]

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Appointments</h3>
          <span className="doctor-mini-badge">{appointments.length} total</span>
        </div>
        <p>
          Review incoming requests, keep today&apos;s clinic list organized, and move confirmed
          patients into consultation or prescription work when needed.
        </p>
        <div className="doctor-appointment-highlight-grid">
          {appointmentHighlights.map((card) => (
            <button
              key={card.label}
              type="button"
              className={`doctor-appointment-highlight ${appointmentFilter === card.id ? 'active' : ''}`}
              onClick={() => {
                if (card.id === 'all' && !schedule?.slots?.length) {
                  onNavigate('/doctor/schedule')
                  return
                }

                setAppointmentFilter(card.id)
              }}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="doctor-appointments-layout">
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <div>
              <h3>Appointment feed</h3>
              <p className="doctor-section-support">
                Filter the queue, pick a patient, and review the next best action from one place.
              </p>
            </div>
            <span className="doctor-mini-badge">{filteredAppointments.length} in view</span>
          </div>

          <div className="doctor-filter-row">
            {appointmentFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`doctor-filter-button ${appointmentFilter === filter.id ? 'active' : ''}`}
                onClick={() => setAppointmentFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {appointmentLoading ? <p className="empty-state">Loading appointments...</p> : null}

          {!appointmentLoading && filteredAppointments.length === 0 ? (
            <div className="doctor-empty-panel">
              <strong>No appointments match this view yet.</strong>
              <p>
                Once patients start booking, their requests will appear here automatically. If your
                schedule is still empty, add a few slots first so the booking flow can open.
              </p>
              <div className="doctor-action-row">
                <button type="button" className="secondary-button" onClick={() => setAppointmentFilter('all')}>
                  Show all appointments
                </button>
                <button type="button" onClick={() => onNavigate('/doctor/schedule')}>
                  Open schedule
                </button>
              </div>
            </div>
          ) : null}

          <div className="doctor-appointment-list">
            {filteredAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                className={`doctor-appointment-card ${selectedAppointmentId === appointment.id ? 'active' : ''}`}
                onClick={() => setSelectedAppointmentId(appointment.id)}
              >
                <div className="doctor-appointment-card-top">
                  <div className="doctor-appointment-patient">
                    <div className="doctor-appointment-avatar">
                      {getInitials(appointment.patient_name || 'Patient')}
                    </div>
                    <div>
                      <strong>{appointment.patient_name || 'Patient'}</strong>
                      <p>
                        {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)} -{' '}
                        {formatTime(appointment.end_time)}
                      </p>
                    </div>
                  </div>
                  <StatusPill
                    status={getAppointmentStatusTone(appointment.status)}
                    label={appointment.status}
                  />
                </div>

                <div className="doctor-appointment-meta">
                  <span>{appointment.patient_email || appointment.patient_id}</span>
                  <span>{appointment.is_telemedicine ? 'Telemedicine visit' : 'Clinic visit'}</span>
                </div>

                {appointment.reason ? (
                  <p className="doctor-appointment-reason">{appointment.reason}</p>
                ) : (
                  <p className="doctor-appointment-reason muted">
                    Patient did not leave an additional booking note.
                  </p>
                )}

                <div className="doctor-appointment-footer">
                  <span className="doctor-chip">
                    {appointment.status === 'pending'
                      ? 'Needs response'
                      : appointment.status === 'confirmed'
                        ? 'Ready for care flow'
                        : 'Previously handled'}
                  </span>
                  <span className="doctor-appointment-id">#{appointment.id.slice(0, 8)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Appointment details</h3>
            {selectedAppointment ? (
              <StatusPill
                status={getAppointmentStatusTone(selectedAppointment.status)}
                label={selectedAppointment.status}
              />
            ) : null}
          </div>

          {!selectedAppointment ? (
            <div className="doctor-empty-panel">
              <strong>Select an appointment to review it.</strong>
              <p>
                The right panel becomes your working space for patient context, approval decisions,
                and the next doctor actions.
              </p>
            </div>
          ) : (
            <>
              <div className="doctor-appointment-summary-card">
                <div className="doctor-appointment-patient">
                  <div className="doctor-appointment-avatar large">
                    {getInitials(selectedAppointment.patient_name || 'Patient')}
                  </div>
                  <div className="doctor-appointment-summary">
                    <h4>{selectedAppointment.patient_name || 'Patient'}</h4>
                    <p>
                      {formatDate(selectedAppointment.appointment_date)} at{' '}
                      {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                    </p>
                  </div>
                </div>

                <div className="doctor-chip-row">
                  <span className="doctor-chip">
                    {selectedAppointment.is_telemedicine ? 'Telemedicine' : 'Clinic visit'}
                  </span>
                  <span className="doctor-chip">{selectedAppointment.patient_phone || 'Phone pending'}</span>
                </div>
              </div>

              <div className="doctor-detail-list">
                <div className="doctor-detail-row">
                  <span>Patient email</span>
                  <strong>{selectedAppointment.patient_email || 'Not available'}</strong>
                </div>
                <div className="doctor-detail-row">
                  <span>Patient phone</span>
                  <strong>{selectedAppointment.patient_phone || 'Not available'}</strong>
                </div>
                <div className="doctor-detail-row">
                  <span>Visit type</span>
                  <strong>{selectedAppointment.is_telemedicine ? 'Telemedicine' : 'Clinic visit'}</strong>
                </div>
                <div className="doctor-detail-row">
                  <span>Appointment ID</span>
                  <strong>{selectedAppointment.id}</strong>
                </div>
              </div>

              {selectedAppointment.reason ? (
                <div className="doctor-note-panel">
                  <strong>Visit reason</strong>
                  <p>{selectedAppointment.reason}</p>
                </div>
              ) : null}

              <div className="doctor-note-panel doctor-appointment-ai-panel">
                <strong>Latest AI symptom guidance</strong>
                {analysisLoading ? (
                  <p>Loading the patient&apos;s latest symptom summary...</p>
                ) : latestPatientAnalysis ? (
                  <>
                    <p>
                      <strong>{formatConditionHeading(latestAiCondition?.name)}</strong>
                      {' '}| {latestAiConfidence}% confidence |{' '}
                      {formatCarePriority(
                        latestPatientAnalysis.consultationAdvice?.level || latestPatientAnalysis.severity,
                      )}{' '}
                      priority
                    </p>
                    <p>
                      {formatAnalysisSource(latestPatientAnalysis.source)} suggested{' '}
                      {latestPatientAnalysis.recommendedSpecialist || 'General Physician'} as the next specialist.
                    </p>
                    {latestPatientAnalysis.consultationAdvice?.message ? (
                      <p>{latestPatientAnalysis.consultationAdvice.message}</p>
                    ) : null}
                  </>
                ) : (
                  <p>No saved AI symptom guidance is available for this patient yet.</p>
                )}
              </div>

              <div className="doctor-callout doctor-appointment-callout">
                <strong>Next best step</strong>
                <p>
                  {selectedAppointment.status === 'pending'
                    ? 'Approve this request if the time works, or leave a short decline note so the patient gets a clear response.'
                    : selectedAppointment.status === 'confirmed'
                      ? 'Move the patient into consultation or prepare a prescription before the visit.'
                      : 'This booking has already been handled, so use the remaining tools only if follow-up care is needed.'}
                </p>
                <div className="doctor-action-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      preparePrescriptionDraft(selectedAppointment)
                      onNavigate('/doctor/prescriptions')
                    }}
                  >
                    Prepare prescription
                  </button>
                  {selectedAppointment.is_telemedicine ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        prepareConsultationDraft(selectedAppointment)
                        onNavigate('/doctor/consultations')
                      }}
                    >
                      Open consultations
                    </button>
                  ) : null}
                  <button type="button" className="secondary-button" onClick={() => onNavigate('/doctor/schedule')}>
                    Review schedule
                  </button>
                </div>
              </div>

              {selectedAppointment.status === 'pending' ? (
                <div className="doctor-action-stack">
                  <label className="doctor-compact-field">
                    Rejection note (optional)
                    <textarea
                      rows="3"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Share a short note if this request needs to be declined."
                    />
                  </label>
                  <div className="doctor-toolbar">
                    <button
                      type="button"
                      disabled={appointmentActionId === selectedAppointment.id}
                      onClick={() => handleApproveAppointment(selectedAppointment.id)}
                    >
                      {appointmentActionId === selectedAppointment.id ? 'Saving...' : 'Approve appointment'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={appointmentActionId === selectedAppointment.id}
                      onClick={() => handleRejectAppointment(selectedAppointment.id)}
                    >
                      {appointmentActionId === selectedAppointment.id ? 'Saving...' : 'Reject appointment'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="empty-state">
                  {selectedAppointment.status === 'confirmed'
                    ? 'This appointment is already confirmed and ready for the care flow.'
                    : 'This appointment is no longer awaiting doctor action.'}
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function Appointments(props) {
  return (
    <DoctorPortalPage {...props}>
      <AppointmentsContent onNavigate={props.onNavigate} />
    </DoctorPortalPage>
  )
}
