import StatusPill from '../../components/StatusPill'
import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function VerificationContent() {
  const { verification, documents } = useDoctorPortal()

  const doctorVerificationLabel =
    verification?.status === 'approved'
      ? 'Verified'
      : verification?.status === 'rejected'
        ? 'Unverified'
        : 'Pending'

  const doctorVerificationTone =
    verification?.status === 'approved'
      ? 'ok'
      : verification?.status === 'rejected'
        ? 'warn'
        : 'pending'

  return (
    <div className="doctor-content-grid">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Verification Status</h3>
          <StatusPill status={doctorVerificationTone} label={doctorVerificationLabel} />
        </div>
        <p>
          Verification documents are collected during doctor registration and then reviewed by the
          admin team. This page is status-only inside the doctor dashboard.
        </p>
        <div className="doctor-detail-list">
          <div className="doctor-detail-row">
            <span>Submitted documents</span>
            <strong>{verification?.documentsSubmitted || 0}</strong>
          </div>
          <div className="doctor-detail-row">
            <span>Required total</span>
            <strong>{verification?.totalRequired || 4}</strong>
          </div>
          <div className="doctor-detail-row">
            <span>Submitted at</span>
            <strong>
              {verification?.submittedAt ? new Date(verification.submittedAt).toLocaleString() : 'Not submitted yet'}
            </strong>
          </div>
          <div className="doctor-detail-row">
            <span>Admin decision</span>
            <strong>
              {verification?.approvedAt
                ? `Approved on ${new Date(verification.approvedAt).toLocaleDateString()}`
                : verification?.rejectedAt
                  ? `Rejected on ${new Date(verification.rejectedAt).toLocaleDateString()}`
                  : 'Awaiting admin review'}
            </strong>
          </div>
        </div>

        {verification?.rejectionReason ? (
          <div className="doctor-note-panel">
            <strong>Admin note</strong>
            <p>{verification.rejectionReason}</p>
          </div>
        ) : null}
      </section>

      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Registration Documents</h3>
          <span className="doctor-mini-badge">{documents.length} files</span>
        </div>
        <div className="doctor-list-stack">
          {documents.length ? (
            documents.map((document) => (
              <article key={document.id} className="doctor-list-card">
                <strong>{document.fileName || document.documentType}</strong>
                <p>
                  {document.documentType} | {document.status || 'submitted'}
                </p>
              </article>
            ))
          ) : (
            <p className="empty-state">No verification documents uploaded yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default function Verification(props) {
  return (
    <DoctorPortalPage {...props}>
      <VerificationContent />
    </DoctorPortalPage>
  )
}
