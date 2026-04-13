import NotificationCenter from '../../components/NotificationCenter'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

function NotificationsContent() {
  const { session } = usePatientPortal()

  return (
    <NotificationCenter
      token={session?.token}
      scope="mine"
      title="My notifications"
      subtitle="Review appointment updates, AI reminders, prescriptions, and account messages in one place."
      emptyMessage="You do not have any notifications yet."
    />
  )
}

export default function Notifications(props) {
  return (
    <PatientPortalPage {...props}>
      <NotificationsContent />
    </PatientPortalPage>
  )
}
