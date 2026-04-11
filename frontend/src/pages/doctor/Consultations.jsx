import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function ConsultationsContent() {
  const { isConnectedDoctor, joinSessionId, setJoinSessionId, setActiveCallSessionId } = useDoctorPortal()

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
