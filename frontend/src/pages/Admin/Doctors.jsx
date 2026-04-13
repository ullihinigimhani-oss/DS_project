import { resolveDoctorAssetUrl } from '../../utils/doctorService'
import { useAdminPortal } from './AdminPortalContext'

export default function AdminDoctorsPage() {
  const {
    verificationQueue,
    verificationsLoading,
    verificationActionId,
    loadVerificationQueue,
    handleApproveDoctor,
    handleRejectDoctor,
  } = useAdminPortal()

  const pendingQueue = verificationQueue.filter((item) => item.status === 'submitted_for_review')

  return (
    <div className="admin-page-stack">
      <section className="admin-surface-card">
        <div className="admin-card-topline">
          <div>
            <h3>Doctor verification</h3>
            <p>Review uploaded credentials, then approve or reject doctors for public visibility.</p>
          </div>
          <span className="dashboard-badge muted">{pendingQueue.length} pending</span>
        </div>

        <div className="admin-toolbar">
          <button type="button" className="secondary-button" onClick={() => void loadVerificationQueue()}>
            Refresh queue
          </button>
        </div>

        {verificationsLoading ? <p className="empty-state">Loading verification queue...</p> : null}

        {!verificationsLoading && verificationQueue.length === 0 ? (
          <p className="empty-state">No doctor verification records found.</p>
        ) : null}

        <div className="admin-verification-list">
          {verificationQueue.map((row) => (
            <article key={row.doctorId} className="admin-verification-card">
              <div className="admin-card-topline">
                <div>
                  <h3>{row.name || 'Doctor'}</h3>
                  <p>{row.specialization || 'General practice'} · Doctor ID {row.doctorId}</p>
                </div>
                <span
                  className={`status-pill ${
                    row.status === 'approved'
                      ? 'ok'
                      : row.status === 'submitted_for_review'
                        ? 'pending'
                        : 'warn'
                  }`}
                >
                  {row.status}
                </span>
              </div>

              {Array.isArray(row.documents) && row.documents.length > 0 ? (
                <div className="admin-doc-list">
                  {row.documents.map((doc) => (
                    <a
                      key={doc.id}
                      className="admin-doc-link"
                      href={resolveDoctorAssetUrl(doc.documentUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <strong>{doc.documentType || 'document'}</strong>
                      <span>{doc.fileName || 'file.pdf'}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No uploaded documents are available for this doctor yet.</p>
              )}

              {row.status === 'submitted_for_review' ? (
                <div className="admin-toolbar">
                  <button
                    type="button"
                    disabled={verificationActionId === row.doctorId}
                    onClick={() => handleApproveDoctor(row.doctorId)}
                  >
                    {verificationActionId === row.doctorId ? 'Working...' : 'Approve doctor'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={verificationActionId === row.doctorId}
                    onClick={() => handleRejectDoctor(row.doctorId)}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
