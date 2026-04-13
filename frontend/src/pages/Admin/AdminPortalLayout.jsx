import { adminSidebarItems, getInitials, useAdminPortal } from './AdminPortalContext'

export default function AdminPortalLayout({
  currentPath,
  onNavigate,
  onRequireLogin,
  onSignOut,
  children,
}) {
  const { session, isConnectedAdmin, loading, error, message, overview } = useAdminPortal()

  const activeNavItem =
    adminSidebarItems.find((item) => item.path === currentPath) ||
    adminSidebarItems.find((item) => item.path === '/admin/dashboard')

  if (!isConnectedAdmin) {
    return (
      <div className="admin-portal-guard">
        <div className="admin-portal-guard-card">
          <p className="admin-sidebar-kicker">Arogya Admin Portal</p>
          <h2>Administrator login is required before the control panel can open.</h2>
          <p>
            Sign in with an administrator account to manage users, review doctor verification,
            and monitor appointments across the platform.
          </p>
          <div className="admin-toolbar">
            <button type="button" onClick={() => onRequireLogin('/login')}>
              Go to login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-portal">
      <aside className="admin-portal-sidebar">
        <div className="admin-portal-brand">
          <div className="admin-brand-mark">AR</div>
          <div>
            <strong>Arogya</strong>
            <span>Admin Control Panel</span>
          </div>
        </div>

        <nav className="admin-portal-nav">
          {adminSidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-portal-link ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => onNavigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-portal-footer">
          <div className="admin-portal-user">
            <div className="admin-avatar">{getInitials(session?.name)}</div>
            <div>
              <strong>{session?.name || 'Admin'}</strong>
              <span>{session?.email || 'admin@arogya.com'}</span>
            </div>
          </div>
          <div className="admin-portal-footnote">
            <span>{overview.pendingDoctors} pending verifications</span>
          </div>
          <button type="button" className="admin-signout-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="admin-portal-main">
        <header className="admin-portal-header">
          <div>
            <p className="admin-portal-section-label">{activeNavItem?.label || 'Overview'}</p>
            <h1>{activeNavItem?.label || 'Overview'}</h1>
          </div>
          <div className="admin-portal-header-user">
            <div className="admin-avatar small">{getInitials(session?.name)}</div>
            <div>
              <strong>{session?.name || 'Admin'}</strong>
              <span>System operations</span>
            </div>
          </div>
        </header>

        {loading ? <p className="empty-state">Loading admin dashboard...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="admin-success">{message}</p> : null}

        {children}
      </section>
    </div>
  )
}
