import { getInitials, patientSidebarItems, usePatientPortal } from './PatientPortalContext'
import NotificationBell from '../../components/NotificationBell'

export default function PatientPortalLayout({
  currentPath,
  onNavigate,
  onRequireLogin,
  onSignOut,
  children,
}) {
  const { session, topCondition, bookingError, bookingMessage, isConnectedPatient } = usePatientPortal()

  const activeNavItem =
    patientSidebarItems.find((item) => item.path === currentPath) ||
    patientSidebarItems.find((item) => item.path === '/patient')

  if (!isConnectedPatient) {
    return (
      <div className="patient-portal-guard">
        <div className="patient-portal-guard-card">
          <p className="patient-sidebar-kicker">Arogya Patient Portal</p>
          <h2>Patient login is required before the dashboard can open.</h2>
          <p>
            Sign in with a valid patient account from the login page. The system checks your email
            and password against the auth service before opening this workspace.
          </p>
          <div className="patient-toolbar">
            <button type="button" onClick={() => onRequireLogin('/login')}>
              Go to login
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onRequireLogin('/register')}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="patient-portal">
      <aside className="patient-portal-sidebar">
        <div className="patient-portal-brand">
          <div className="patient-brand-mark">AR</div>
          <div>
            <strong>Arogya</strong>
            <span>Patient Workspace</span>
          </div>
        </div>

        <nav className="patient-portal-nav">
          {patientSidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`patient-portal-link ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="patient-portal-footer">
          <div className="patient-portal-user">
            <div className="patient-avatar">{getInitials(session?.name)}</div>
            <div>
              <strong>{session?.name || 'Welcome'}</strong>
              <span>{session?.email || 'Update your profile'}</span>
            </div>
          </div>
          <button type="button" className="patient-signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="patient-portal-main">
        <header className="patient-portal-header">
          <div>
            <p className="patient-portal-section-label">{activeNavItem?.label || 'Overview'}</p>
            <h1>{activeNavItem?.label || 'Overview'}</h1>
          </div>
          <div className="portal-header-tools">
            <NotificationBell
              token={session?.token}
              scope="mine"
              pagePath="/patient/notifications"
              onNavigate={onNavigate}
            />
            <div className="patient-portal-header-user">
              <div className="patient-avatar small">{getInitials(session?.name)}</div>
              <div>
                <strong>{session?.name || 'Welcome'}</strong>
                <span>{topCondition?.name || 'Check your symptoms'}</span>
              </div>
            </div>
          </div>
        </header>

        {bookingError ? <p className="error-text">{bookingError}</p> : null}
        {bookingMessage ? <p className="patient-success">{bookingMessage}</p> : null}

        {children}
      </section>
    </div>
  )
}
