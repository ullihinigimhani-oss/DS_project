import { DoctorPortalProvider } from './DoctorPortalContext'
import DoctorPortalLayout from './DoctorPortalLayout'

export default function DoctorPortalPage({
  session,
  currentPath,
  onNavigate,
  onRequireLogin,
  onSignOut,
  children,
}) {
  return (
    <DoctorPortalProvider session={session}>
      <DoctorPortalLayout
        currentPath={currentPath}
        onNavigate={onNavigate}
        onRequireLogin={onRequireLogin}
        onSignOut={onSignOut}
      >
        {children}
      </DoctorPortalLayout>
    </DoctorPortalProvider>
  )
}
