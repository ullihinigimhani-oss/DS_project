import { useEffect, useMemo, useState } from 'react'
import StatusPill from '../../components/StatusPill'
import { fetchPatientLatestSymptomAnalysis } from '../../utils/patientService'
import {
  createTelemedicineSession,
  endTelemedicineSession,
  fetchTelemedicineSessions,
} from '../../utils/telemedicineService'
import DoctorPortalPage from './DoctorPortalPage'
import { formatDate, formatTime, getAppointmentStatusTone, useDoctorPortal } from './DoctorPortalContext'

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

function ConsultationsContent() {
  const {
    isConnectedDoctor,
    session,
    appointments,
    consultationDraft,
    setJoinSessionId,
    setConsultationDraft,
    setActiveCallSessionId,
    setMessage,
    setError,
  } = useDoctorPortal()
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionActionId, setSessionActionId] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(consultationDraft?.appointmentId || '')
  const [latestAiSummary, setLatestAiSummary] = useState(null)
  const [latestAiLoading, setLatestAiLoading] = useState(false)

  const telemedicineAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.is_telemedicine &&
          appointment.status === 'confirmed',
      ),
    [appointments],
  )

  useEffect(() => {
    if (!telemedicineAppointments.length) {
      setSelectedAppointmentId('')
      return
    }

    if (!telemedicineAppointments.some((appointment) => appointment.id === selectedAppointmentId)) {
      setSelectedAppointmentId(
        consultationDraft?.appointmentId && telemedicineAppointments.some((item) => item.id === consultationDraft.appointmentId)
          ? consultationDraft.appointmentId
          : telemedicineAppointments[0].id,
      )
    }
  }, [consultationDraft?.appointmentId, selectedAppointmentId, telemedicineAppointments])

  useEffect(() => {
    if (!isConnectedDoctor || !session?.token) {
      setSessions([])
      return
    }

    let cancelled = false

    const loadSessions = async () => {
      setSessionsLoading(true)
      try {
        const response = await fetchTelemedicineSessions(session.token)
        if (!cancelled) {
          setSessions(Array.isArray(response.data) ? response.data : [])
        }
      } catch {
        if (!cancelled) {
          setSessions([])
        }
      } finally {
        if (!cancelled) {
          setSessionsLoading(false)
        }
      }
    }

    loadSessions()

    return () => {
      cancelled = true
    }
  }, [isConnectedDoctor, session?.token])

  const selectedAppointment =
    telemedicineAppointments.find((appointment) => appointment.id === selectedAppointmentId) ||
    telemedicineAppointments[0] ||
    null

  const selectedSession =
    sessions.find((item) => item.appointment_id === selectedAppointment?.id) || null

  useEffect(() => {
    if (!selectedAppointment) {
      setLatestAiSummary(null)
      setJoinSessionId('')
      return
    }

    setJoinSessionId(selectedSession?.id || '')
    setConsultationDraft({
      sessionId: selectedSession?.id || '',
      appointmentId: selectedAppointment.id || '',
      patientId: selectedAppointment.patient_id || '',
      patientName: selectedAppointment.patient_name || '',
    })
  }, [selectedAppointment, selectedSession?.id, setConsultationDraft, setJoinSessionId])

  useEffect(() => {
    if (!session?.token || !selectedAppointment?.patient_id) {
      setLatestAiSummary(null)
      return
    }

    let cancelled = false

    const loadLatestAiSummary = async () => {
      setLatestAiLoading(true)
      try {
        const response = await fetchPatientLatestSymptomAnalysis(session.token, selectedAppointment.patient_id)
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
  }, [selectedAppointment?.patient_id, session?.token])

  const topCondition = latestAiSummary?.possibleConditions?.[0] || null

  const refreshSessions = async () => {
    if (!session?.token) return

    try {
      const response = await fetchTelemedicineSessions(session.token)
      setSessions(Array.isArray(response.data) ? response.data : [])
      setMessage('Consultation rooms refreshed.')
    } catch (error) {
      setError(error.message || 'Could not refresh telemedicine rooms.')
    }
  }

  const handleCreateSession = async () => {
    if (!selectedAppointment || !session?.token) return

    setSessionActionId(selectedAppointment.id)
    setError('')
    setMessage('')

    try {
      const response = await createTelemedicineSession(session.token, {
        appointmentId: selectedAppointment.id,
        patientId: selectedAppointment.patient_id,
        doctorId: selectedAppointment.doctor_id || session.userId,
      })
      const nextSession = response.data

      setSessions((current) => {
        const withoutCurrent = current.filter((item) => item.id !== nextSession.id)
        return [nextSession, ...withoutCurrent]
      })
      setJoinSessionId(nextSession.id)
      setConsultationDraft({
        sessionId: nextSession.id,
        appointmentId: selectedAppointment.id,
        patientId: selectedAppointment.patient_id,
        patientName: selectedAppointment.patient_name || '',
      })
      setMessage('Telemedicine room prepared successfully.')
    } catch (error) {
      setError(error.message || 'Could not prepare the telemedicine room.')
    } finally {
      setSessionActionId('')
    }
  }

  const handleEndSession = async () => {
    if (!selectedSession || !session?.token) return

    setSessionActionId(selectedSession.id)
    setError('')
    setMessage('')

    try {
      const response = await endTelemedicineSession(session.token, selectedSession.id)
      const endedSession = response.data
      setSessions((current) =>
        current.map((item) => (item.id === endedSession.id ? endedSession : item)),
      )
      setMessage('Telemedicine session ended.')
    } catch (error) {
      setError(error.message || 'Could not end the telemedicine session.')
    } finally {
      setSessionActionId('')
    }
  }

  const handleCopyLink = async () => {
    if (!selectedSession?.meeting_url) return

    try {
      await window.navigator.clipboard.writeText(selectedSession.meeting_url)
      setMessage('Consultation link copied to your clipboard.')
    } catch {
      setError('Could not copy the consultation link in this browser.')
    }
  }

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Consultations</h3>
          <span className="doctor-mini-badge">
            {sessionsLoading ? 'syncing...' : `${sessions.length} rooms`}
          </span>
        </div>
        <p>
          Prepare telemedicine rooms, review the patient context, and launch online consultations
          from one workflow built around confirmed virtual visits.
        </p>
      </section>

      <div className="doctor-appointments-layout">
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <div>
              <h3>Telemedicine queue</h3>
              <p className="doctor-section-support">
                Select one appointment to prepare or join its consultation room.
              </p>
            </div>
            <span className="doctor-mini-badge">{telemedicineAppointments.length} visits</span>
          </div>

          {!telemedicineAppointments.length ? (
            <div className="doctor-empty-panel">
              <strong>No telemedicine visits are ready yet.</strong>
              <p>
                Once a telemedicine booking is confirmed, it will appear here so you can prepare the
                room and start the consultation.
              </p>
            </div>
          ) : (
            <div className="doctor-appointment-list">
              {telemedicineAppointments.map((appointment) => {
                const appointmentSession = sessions.find((item) => item.appointment_id === appointment.id)

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    className={`doctor-appointment-card ${selectedAppointmentId === appointment.id ? 'active' : ''}`}
                    onClick={() => setSelectedAppointmentId(appointment.id)}
                  >
                    <div className="doctor-appointment-card-top">
                      <div className="doctor-appointment-patient">
                        <div className="doctor-appointment-avatar">
                          {(appointment.patient_name || 'Patient')
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong>{appointment.patient_name || 'Patient'}</strong>
                          <p>
                            {formatDate(appointment.appointment_date)} at {formatTime(appointment.start_time)}
                          </p>
                        </div>
                      </div>
                      <StatusPill
                        status={getAppointmentStatusTone(appointment.status)}
                        label={appointment.status}
                      />
                    </div>

                    <div className="doctor-appointment-meta">
                      <span>{appointmentSession ? 'Room prepared' : 'Room not prepared'}</span>
                      <span>{appointmentSession?.status || 'scheduled'}</span>
                    </div>

                    <p className="doctor-appointment-reason">
                      {appointment.reason || 'No additional visit note was left by the patient.'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Consultation details</h3>
            {selectedAppointment ? (
              <StatusPill
                status={getAppointmentStatusTone(selectedAppointment.status)}
                label={selectedAppointment.status}
              />
            ) : null}
          </div>

          {!selectedAppointment ? (
            <div className="doctor-empty-panel">
              <strong>Select a telemedicine visit.</strong>
              <p>The room details, AI summary, and launch actions will appear here.</p>
            </div>
          ) : (
            <>
              <div className="doctor-appointment-summary-card">
                <div className="doctor-appointment-patient">
                  <div className="doctor-appointment-avatar large">
                    {(selectedAppointment.patient_name || 'Patient')
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
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
                  <span className="doctor-chip">Telemedicine</span>
                  <span className="doctor-chip">{selectedAppointment.patient_email || 'Patient record'}</span>
                </div>
              </div>

              <div className="doctor-detail-list">
                <div className="doctor-detail-row">
                  <span>Appointment ID</span>
                  <strong>{selectedAppointment.id}</strong>
                </div>
                <div className="doctor-detail-row">
                  <span>Patient phone</span>
                  <strong>{selectedAppointment.patient_phone || 'Not available'}</strong>
                </div>
                <div className="doctor-detail-row">
                  <span>Room status</span>
                  <strong>{selectedSession?.status || 'Waiting to be prepared'}</strong>
                </div>
                <div className="doctor-detail-row">
                  <span>Session ID</span>
                  <strong>{selectedSession?.id || 'Not created yet'}</strong>
                </div>
              </div>

              {selectedSession ? (
                <div className="doctor-telemedicine-link-box">
                  <span>Meeting URL</span>
                  <strong>{selectedSession.meeting_url}</strong>
                </div>
              ) : null}

              <div className="doctor-note-panel doctor-ai-inline-panel">
                <strong>Latest AI symptom guidance</strong>
                {latestAiLoading ? (
                  <p>Loading the patient&apos;s latest AI symptom guidance...</p>
                ) : latestAiSummary ? (
                  <>
                    <p>
                      <strong>{formatConditionHeading(topCondition?.name)}</strong>
                      {' '}| {Math.round((latestAiSummary.confidence || 0) * 100)}% confidence
                    </p>
                    <p>
                      {latestAiSummary.recommendedSpecialist || 'General Physician'} recommended
                      {' '}| {formatCarePriority(latestAiSummary.consultationAdvice?.level || latestAiSummary.severity)} priority
                    </p>
                    <p>{latestAiSummary.consultationAdvice?.message || latestAiSummary.recommendation}</p>
                  </>
                ) : (
                  <p>No saved AI symptom guidance is available for this patient yet.</p>
                )}
              </div>

              <div className="doctor-action-row">
                {!selectedSession ? (
                  <button
                    type="button"
                    disabled={sessionActionId === selectedAppointment.id}
                    onClick={handleCreateSession}
                  >
                    {sessionActionId === selectedAppointment.id ? 'Preparing...' : 'Prepare consultation room'}
                  </button>
                ) : (
                  <>
                    {selectedSession.status !== 'ended' ? (
                      <>
                        <button type="button" onClick={() => setActiveCallSessionId(selectedSession.id)}>
                          Join consultation
                        </button>
                        <button type="button" className="secondary-button" onClick={handleCopyLink}>
                          Copy invite link
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => window.open(selectedSession.meeting_url, '_blank', 'noopener,noreferrer')}
                        >
                          Open in new tab
                        </button>
                      </>
                    ) : null}
                    {selectedSession.status !== 'ended' ? (
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={sessionActionId === selectedSession.id}
                        onClick={handleEndSession}
                    >
                      {sessionActionId === selectedSession.id ? 'Ending...' : 'End consultation'}
                    </button>
                    ) : (
                      <span className="doctor-chip">Session ended</span>
                    )}
                  </>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  disabled={sessionsLoading}
                  onClick={refreshSessions}
                >
                  Refresh rooms
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default function Consultations(props) {
  return (
    <DoctorPortalPage {...props}>
      <ConsultationsContent />
    </DoctorPortalPage>
  )
}
