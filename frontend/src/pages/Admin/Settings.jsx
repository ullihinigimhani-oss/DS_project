import { gatewayBaseUrl } from '../../utils/api'
import { useAdminPortal } from './AdminPortalContext'

export default function AdminSettingsPage() {
  const { auditPreview, auditLoading, loadAuditLogs } = useAdminPortal()

  return (
    <div className="admin-page-stack">
      <section className="admin-content-grid">
        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <h3>System settings</h3>
            <span className="dashboard-badge">Read only</span>
          </div>
          <div className="admin-metadata-grid">
            <div>
              <span>Gateway base</span>
              <strong>{gatewayBaseUrl}</strong>
            </div>
            <div>
              <span>Access policy</span>
              <strong>Administrator-only routes</strong>
            </div>
            <div>
              <span>Control model</span>
              <strong>Users, doctors, appointments</strong>
            </div>
          </div>
          <p className="doctor-help">
            This page is designed as the operational settings and activity area for admins. The core
            controls are currently focused on platform governance instead of low-level configuration.
          </p>
        </article>

        <article className="admin-surface-card">
          <div className="admin-card-topline">
            <h3>Audit activity</h3>
            <span className="dashboard-badge">{auditPreview.length} shown</span>
          </div>
          <div className="admin-toolbar">
            <button type="button" className="secondary-button" onClick={() => void loadAuditLogs()}>
              Refresh audit logs
            </button>
          </div>

          {auditLoading ? <p className="empty-state">Loading audit logs...</p> : null}

          {!auditLoading && auditPreview.length === 0 ? (
            <p className="empty-state">No audit entries are available yet.</p>
          ) : (
            <div className="admin-list">
              {auditPreview.map((entry) => (
                <div key={entry.id} className="admin-list-item">
                  <div>
                    <strong>{entry.action}</strong>
                    <p>{entry.actor}</p>
                  </div>
                  <span>{entry.recordedAt}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
