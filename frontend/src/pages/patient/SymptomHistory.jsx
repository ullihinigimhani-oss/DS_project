import AiSymptomWorkspace from '../../components/AiSymptomWorkspace'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

function SymptomHistoryContent(props) {
  const { prepareBookingFromAnalysis } = usePatientPortal()
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
      onPrimaryAction={() => {
        prepareBookingFromAnalysis({ analysis, topCondition, symptoms })
        onNavigate('/patient/book-appointment')
      }}
      primaryActionLabel={
        analysis?.recommendedSpecialist
          ? `Book ${analysis.recommendedSpecialist} appointment`
          : 'Book appointment'
      }
      contextLabel="AI Symptom Checker"
      contextSubtitle="Use your personal AI symptom workspace directly inside the patient dashboard before booking care."
    />
  )
}

export default function SymptomHistory(props) {
  return (
    <PatientPortalPage {...props}>
      <SymptomHistoryContent {...props} />
    </PatientPortalPage>
  )
}
