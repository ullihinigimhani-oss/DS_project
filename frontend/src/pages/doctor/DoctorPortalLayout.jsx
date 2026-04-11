import VideoRoom from '../../components/VideoRoom'
import { getInitials, sidebarItems, useDoctorPortal } from './DoctorPortalContext'

export default function DoctorPortalLayout({
  currentPath,
  onNavigate,
  onRequireLogin,
  onSignOut,
  children,
}) {
  const {
    session,
    profile,
    isConnectedDoctor,
    loading,
    error,
    message,
    activeCallSessionId,
    setActiveCallSessionId,
  } = useDoctorPortal()

  const activeNavItem =
    sidebarItems.find((item) => item.path === currentPath) ||
    sidebarItems.find((item) => item.path === '/doctor/dashboard')

  if (activeCallSessionId) {
    return (
      <VideoRoom
        sessionId={activeCallSessionId}
        peerName="Active Patient Consultation"
        onEndRedirect={() => setActiveCallSessionId(null)}
      />
    )
  }

  if (!isConnectedDoctor) {
    return (
      <div className="doctor-portal-guard">
        <div className="doctor-portal-guard-card">
          <p className="doctor-sidebar-kicker">Arogya Doctor Portal</p>
          <h2>Doctor login is required before the dashboard can open.</h2>
          <p>
            Use the shared login or registration page, choose the doctor role, and the app will
            redirect you into this dashboard automatically.
          </p>
          <div className="doctor-toolbar">
            <button type="button" onClick={() => onRequireLogin('/login')}>
              Go to login
            </button>
            <button type="button" className="secondary-button" onClick={() => onRequireLogin('/register')}>
              Create account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="doctor-portal">
      <aside className="doctor-portal-sidebar">
        <div className="doctor-portal-brand">
          <div className="doctor-brand-mark">AR</div>
          <div>
            <strong>Arogya</strong>
            <span>Doctor Workspace</span>
          </div>
        </div>

        <nav className="doctor-portal-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`doctor-portal-link ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="doctor-portal-footer">
          <div className="doctor-portal-user">
            <div className="doctor-avatar">{getInitials(profile?.name || session?.name)}</div>
            <div>
              <strong>Dr. {profile?.name || session?.name || 'Doctor'}</strong>
              <span>{session?.email}</span>
            </div>
          </div>
          <button type="button" className="doctor-signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="doctor-portal-main">
        <header className="doctor-portal-header">
          <div>
            <p className="doctor-portal-section-label">{activeNavItem?.label || 'Overview'}</p>
            <h1>{activeNavItem?.label || 'Overview'}</h1>
          </div>
          <div className="doctor-portal-header-user">
            <div className="doctor-avatar small">{getInitials(profile?.name || session?.name)}</div>
            <div>
              <strong>Dr. {profile?.name || session?.name || 'Doctor'}</strong>
              <span>{profile?.specialization || 'Doctor account'}</span>
            </div>
          </div>
        </header>

        {loading ? <p className="empty-state">Loading doctor dashboard...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="doctor-success">{message}</p> : null}

        {children}
      </section>
    </div>
  )
}
