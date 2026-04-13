import { useEffect, useState } from 'react'
import { fetchPatientLatestSymptomAnalysis } from '../../utils/patientService'
import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

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
    joinSessionId,
    setJoinSessionId,
    setActiveCallSessionId,
    consultationDraft,
  } = useDoctorPortal()
  const [latestAiSummary, setLatestAiSummary] = useState(null)
  const [latestAiLoading, setLatestAiLoading] = useState(false)

  useEffect(() => {
    if (!session?.token || !consultationDraft?.patientId) {
      setLatestAiSummary(null)
      return
    }

    let cancelled = false

    const loadLatestAiSummary = async () => {
      setLatestAiLoading(true)
      try {
        const response = await fetchPatientLatestSymptomAnalysis(session.token, consultationDraft.patientId)
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
  }, [consultationDraft?.patientId, session?.token])

  const topCondition = latestAiSummary?.possibleConditions?.[0] || null

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Consultations</h3>
          <span className="doctor-mini-badge">Telemedicine</span>
        </div>
        <p>
          Join an active telemedicine session using its session ID. This page is now separate from
          the rest of the dashboard, so live consultations can evolve independently.
        </p>

        {consultationDraft?.patientId ? (
          <div className="doctor-note-panel doctor-ai-inline-panel">
            <strong>Consultation context</strong>
            <p>
              Patient: <strong>{consultationDraft.patientName || consultationDraft.patientId}</strong>
            </p>
            <p>
              Appointment ID: <strong>{consultationDraft.appointmentId || 'Not linked'}</strong>
            </p>
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
        ) : null}

        <form
          className="analysis-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (joinSessionId) {
              setActiveCallSessionId(joinSessionId)
            }
          }}
        >
          <label>
            Session ID
            <input
              name="sessionId"
              value={joinSessionId}
              onChange={(event) => setJoinSessionId(event.target.value)}
              placeholder="e.g. session-786"
              required
            />
          </label>
          <div className="doctor-toolbar">
            <button type="submit" disabled={!isConnectedDoctor || !joinSessionId}>
              Join video call
            </button>
          </div>
        </form>
      </section>
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
