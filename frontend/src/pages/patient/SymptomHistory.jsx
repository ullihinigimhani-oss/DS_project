import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

function SymptomHistoryContent() {
  const { topCondition, history, recentHistory } = usePatientPortal()

  return (
    <div className="patient-content-grid">
      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Care guidance</h3>
          <StatusPill
            status={topCondition ? 'ok' : 'pending'}
            label={topCondition ? 'Latest analysis ready' : 'No recent triage'}
          />
        </div>
        <p className="patient-callout patient-callout-panel">
          {topCondition
            ? `Your latest symptom analysis suggests ${topCondition.name}. Booking with a doctor can help turn this guidance into a proper consult.`
            : 'No recent symptom analysis yet. Start with the AI symptoms route if you want a quick triage before booking.'}
        </p>
      </section>

      <section className="patient-surface-card">
        <div className="patient-card-topline">
          <h3>Symptom history</h3>
          <span className="patient-mini-badge">{history.length} saved</span>
        </div>
        {recentHistory.length ? (
          <div className="patient-history-stack">
            {recentHistory.map((item) => (
              <article key={item.id} className="patient-history-card">
                <strong>{new Date(item.analyzed_at).toLocaleDateString()}</strong>
                <p>{item.symptoms}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No symptom history yet. Run a symptom check to begin tracking.</p>
        )}
      </section>
    </div>
  )
}

export default function SymptomHistory(props) {
  return (
    <PatientPortalPage {...props}>
      <SymptomHistoryContent />
    </PatientPortalPage>
  )
}
