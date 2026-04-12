import AiSymptomWorkspace from '../../components/AiSymptomWorkspace'
import PatientPortalPage from './PatientPortalPage'

export default function SymptomHistory(props) {
  const {
    session,
    history,
    topCondition,
    analysis,
    symptoms,
    analysisLoading,
    historyLoading,
    analysisError,
    onSymptomsChange,
    onAnalyze,
    onRefreshHistory,
    onNavigate,
  } = props

  return (
    <PatientPortalPage {...props}>
      <AiSymptomWorkspace
        session={session}
        history={history}
        analysis={analysis}
        topCondition={topCondition}
        symptoms={symptoms}
        analysisLoading={analysisLoading}
        historyLoading={historyLoading}
        analysisError={analysisError}
        onSymptomsChange={onSymptomsChange}
        onAnalyze={onAnalyze}
        onRefreshHistory={onRefreshHistory}
        onNavigate={onNavigate}
        contextLabel="AI Symptom Checker"
        contextSubtitle="Use your personal AI symptom workspace directly inside the patient dashboard before booking care."
      />
    </PatientPortalPage>
  )
}
