import AdminPortalPage from './AdminPortalPage'
import { useAdminPortal, getInitials } from './AdminPortalContext'

const TEXT_DARK = '#1a2332'
const TEXT_MID = 'rgba(26,35,50,0.6)'
const TEXT_MUTED = 'rgba(26,35,50,0.38)'
const ACCENT_BLUE = '#4f46e5'

const sectionStyle = {
  borderRadius: '24px',
  border: '1px solid rgba(46, 70, 98, 0.06)',
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 16px 40px rgba(31,53,80,0.07)',
  padding: '2rem',
  marginBottom: '1.5rem',
}

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 0',
  borderBottom: '1px solid rgba(26,35,50,0.07)',
  gap: '1rem',
}

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: TEXT_MID,
}

const valueStyle = {
  fontWeight: 600,
  fontSize: '1rem',
  color: TEXT_DARK,
}

function ProfileRow({ label, value }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value || '—'}</span>
    </div>
  )
}

function ProfileContent() {
  const { session } = useAdminPortal()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #4f46e5, #312e81)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: '1.8rem',
          margin: '0 auto 1rem',
          boxShadow: '0 8px 16px rgba(79,70,229,0.2)',
        }}>
          {getInitials(session?.name)}
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: TEXT_DARK, margin: '0 0 0.25rem' }}>
          {session?.name || 'Administrator'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: TEXT_MID, margin: 0 }}>System Operations & Governance</p>
      </header>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: TEXT_DARK }}>Account Details</h3>
        </div>
        <ProfileRow label="Administrative ID" value={`ADM-${session?.userId?.slice(-6).toUpperCase() || 'UNKNOWN'}`} />
        <ProfileRow label="Full Name" value={session?.name} />
        <ProfileRow label="Email Address" value={session?.email} />
        <ProfileRow label="Portal Access" value="Full System Administrative Capability" />
        <ProfileRow label="Account Status" value="Active / Verified" />
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔐</span>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: TEXT_DARK }}>Security</h3>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div>
            <span style={labelStyle}>Two-Factor Authentication</span>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: TEXT_MID }}>Required for administrative access</p>
          </div>
          <span style={{ ...valueStyle, color: '#10b981' }}>Enabled</span>
        </div>
      </div>
    </div>
  )
}

export default function AdminProfile(props) {
  return (
    <AdminPortalPage {...props}>
      <ProfileContent />
    </AdminPortalPage>
  )
}
