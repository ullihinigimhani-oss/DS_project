import { AdminPortalProvider } from './AdminPortalContext'
import AdminPortalLayout from './AdminPortalLayout'

export default function AdminPortalPage({
  session,
  currentPath,
  onNavigate,
  onRequireLogin,
  onSignOut,
  children,
}) {
  return (
    <AdminPortalProvider session={session}>
      <AdminPortalLayout
        currentPath={currentPath}
        onNavigate={onNavigate}
        onRequireLogin={onRequireLogin}
        onSignOut={onSignOut}
      >
        {children}
      </AdminPortalLayout>
    </AdminPortalProvider>
  )
}
