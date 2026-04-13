import { PatientPortalProvider } from './PatientPortalContext'
import PatientPortalLayout from './PatientPortalLayout'

export default function PatientPortalPage({
  activeRole,
  session,
  history,
  doctorDirectory,
  gatewayHealth,
  topCondition,
  currentPath,
  onNavigate,
  onRequireLogin,
  onSignOut,
  updateSession,
  children,
}) {
  return (
    <PatientPortalProvider
      activeRole={activeRole}
      session={session}
      history={history}
      doctorDirectory={doctorDirectory}
      gatewayHealth={gatewayHealth}
      topCondition={topCondition}
      updateSession={updateSession}
    >
      <PatientPortalLayout
        currentPath={currentPath}
        onNavigate={onNavigate}
        onRequireLogin={onRequireLogin}
        onSignOut={onSignOut}
      >
        {children}
      </PatientPortalLayout>
    </PatientPortalProvider>
  )
}
