import NotificationCenter from '../../components/NotificationCenter'
import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function NotificationsContent() {
  const { session } = useDoctorPortal()

  return (
    <NotificationCenter
      token={session?.token}
      scope="mine"
      title="Doctor notifications"
      subtitle="Keep track of appointment requests, verification updates, and system messages that need your attention."
      emptyMessage="You do not have any doctor notifications yet."
    />
  )
}

export default function Notifications(props) {
  return (
    <DoctorPortalPage {...props}>
      <NotificationsContent />
    </DoctorPortalPage>
  )
}
