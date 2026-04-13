import { useCallback, useEffect, useState } from 'react'
import SectionCard from '../../components/SectionCard'
import {
  approveDoctorVerification,
  fetchAdminVerificationQueue,
  rejectDoctorVerification,
  resolveDoctorAssetUrl,
} from '../../utils/doctorService'

export default function AdminVerifications({ session, onRequireLogin, onNavigate }) {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  const isAdmin = session?.role === 'admin' && session?.mode === 'connected' && session?.token

  const loadQueue = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminVerificationQueue(session.token)
      setQueue(Array.isArray(data.data) ? data.data : [])
    } catch (loadError) {
      setError(loadError.message)
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin, session?.token])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const handleApprove = async (doctorId) => {
    if (!session?.token) return
    setBusyId(doctorId)
    setError('')
    setMessage('')
    try {
      await approveDoctorVerification(session.token, doctorId)
      setMessage(`Doctor ${doctorId} was approved.`)
      await loadQueue()
    } catch (approveError) {
      setError(approveError.message)
    } finally {
      setBusyId('')
    }
  }

  const handleReject = async (doctorId) => {
    if (!session?.token) return
    const reason = window.prompt('Rejection reason (optional):') || 'No reason provided'
    setBusyId(doctorId)
    setError('')
    setMessage('')
    try {
      await rejectDoctorVerification(session.token, doctorId, reason)
      setMessage(`Doctor ${doctorId} was rejected.`)
      await loadQueue()
    } catch (rejectError) {
      setError(rejectError.message)
    } finally {
      setBusyId('')
    }
  }

  if (!isAdmin) {
    return (
      <div className="page-stack">
        <SectionCard
          title="Admin access required"
          subtitle="Sign in with an administrator account to review doctor verification documents."
        >
          <div className="placeholder-page">
            <button type="button" onClick={() => onRequireLogin('/login')}>
              Go to login
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <SectionCard
        title="Doctor verification queue"
        subtitle="Open each PDF in a new tab, then approve or reject the submission. Doctors can sign in again only after approval (or when rejected, to upload new documents)."
      >
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="patient-success">{message}</p> : null}
        {loading ? <p className="empty-state">Loading submissions…</p> : null}

        {!loading && queue.length === 0 ? (
          <p className="empty-state">No verification records found.</p>
        ) : null}

        <div className="history-list">
          {queue.map((row) => (
            <article key={row.doctorId} className="history-card">
              <div className="history-header">
                <strong>{row.name || 'Doctor'}</strong>
                <span>{row.specialization || '—'}</span>
              </div>
              <p className="empty-state" style={{ textAlign: 'left', margin: '0.5rem 0' }}>
                Status: <strong>{row.status}</strong> · Doctor ID: {row.doctorId}
              </p>

              {Array.isArray(row.documents) && row.documents.length > 0 ? (
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem' }}>
                  {row.documents.map((doc) => (
                    <li key={doc.id} style={{ marginBottom: '0.35rem' }}>
                      <a
                        href={resolveDoctorAssetUrl(doc.documentUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {doc.documentType || 'document'} — {doc.fileName || 'file.pdf'}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No documents on file.</p>
              )}

              {row.status === 'submitted_for_review' ? (
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button
                    type="button"
                    disabled={busyId === row.doctorId}
                    onClick={() => handleApprove(row.doctorId)}
                  >
                    {busyId === row.doctorId ? 'Working…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busyId === row.doctorId}
                    onClick={() => handleReject(row.doctorId)}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="secondary-button" onClick={() => onNavigate('/')}>
            Back to home
          </button>
          <button type="button" className="secondary-button" onClick={() => void loadQueue()}>
            Refresh
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
