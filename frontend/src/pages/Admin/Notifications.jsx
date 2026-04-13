import NotificationCenter from '../../components/NotificationCenter'
import { useAdminPortal } from './AdminPortalContext'

function NotificationsContent() {
  const { session } = useAdminPortal()

  return (
    <NotificationCenter
      token={session?.token}
      scope="all"
      title="System notifications"
      subtitle="Monitor notifications across patients, doctors, and admin activity from one inbox."
      emptyMessage="No system notifications are available yet."
    />
  )
}

export default function Notifications() {
  return <NotificationsContent />
}
