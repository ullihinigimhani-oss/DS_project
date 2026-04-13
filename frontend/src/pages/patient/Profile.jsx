import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'

const TEXT_DARK = '#1a2332'
const TEXT_MID = 'rgba(26,35,50,0.6)'
const TEXT_MUTED = 'rgba(26,35,50,0.38)'
const ACCENT_GREEN = '#1d9e75'
const ACCENT_WARM = '#c17a5c'

function calcAge(birthdate) {
  if (!birthdate) return null
  const ms = Date.now() - new Date(birthdate).getTime()
  return Math.floor(ms / 31557600000)
}

function formatDate(val) {
  if (!val) return null
  const d = new Date(val.includes('T') ? val : `${val}T00:00:00`)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const sectionStyle = {
  borderRadius: '24px',
  border: '1px solid rgba(46, 70, 98, 0.06)',
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 16px 40px rgba(31,53,80,0.07)',
  padding: '1.75rem',
}

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '0.65rem 0',
  borderBottom: '1px solid rgba(26,35,50,0.07)',
  gap: '1rem',
}

const labelStyle = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: TEXT_MID,
  flexShrink: 0,
  minWidth: '160px',
}

const valueStyle = {
  fontWeight: 600,
  fontSize: '0.925rem',
  color: TEXT_DARK,
  textAlign: 'right',
}

function Row({ label, value, placeholder = '—' }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={{ ...valueStyle, color: value ? TEXT_DARK : TEXT_MUTED }}>
        {value || placeholder}
      </span>
    </div>
  )
}

function SectionHeading({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <h3 style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT_MID }}>
        {title}
      </h3>
    </div>
  )
}

function ProfileContent() {
  const {
    isConnectedPatient,
    session,
    bookingSummary,
    doctorDirectory,
    history,
    gatewayHealth,
  } = usePatientPortal()

  const age = calcAge(session?.birthdate)
  const navigateToEdit = () => {
    window.history.pushState({}, '', '/patient/complete-profile')
    window.dispatchEvent(new Event('popstate'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '700px' }}>

      {/* ── Identity card ── */}
      <div style={sectionStyle}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1d9e75, #16866a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '-0.01em',
              boxShadow: '0 6px 18px rgba(29,158,117,0.28)',
              flexShrink: 0,
            }}>
              {(session?.name || 'P').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: ACCENT_WARM }}>Patient</p>
              <h2 style={{ margin: '0.1rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: TEXT_DARK, letterSpacing: '-0.01em' }}>
                {session?.name || 'Patient'}
              </h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <StatusPill status={isConnectedPatient ? 'ok' : 'warn'} label={isConnectedPatient ? 'Connected' : 'Preview'} />
            <button
              onClick={navigateToEdit}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '10px',
                border: '1px solid rgba(29,158,117,0.3)',
                background: 'rgba(29,158,117,0.08)',
                color: ACCENT_GREEN,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'background 0.2s',
              }}
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Personal Info */}
        <SectionHeading icon="👤" title="Personal Information" />
        <Row label="Email" value={session?.email} />
        <Row label="Phone" value={session?.phone} />
        <Row label="Date of Birth" value={formatDate(session?.birthdate)} />
        <Row label="Age" value={age !== null ? `${age} years old` : null} />
        <Row label="Gender" value={session?.gender} />
        <div style={{ ...rowStyle, borderBottom: 'none' }} />
      </div>

      {/* ── Health card ── */}
      <div style={sectionStyle}>
        <SectionHeading icon="🩺" title="Health Information" />
        <Row label="Blood Type" value={session?.blood_type} placeholder="Not specified" />
        <Row label="Known Allergies" value={session?.allergies} placeholder="None on record" />
        <Row label="Last Visit" value={formatDate(session?.last_visit_date)} placeholder="No visits recorded" />
      </div>

      {/* ── Emergency contact ── */}
      <div style={sectionStyle}>
        <SectionHeading icon="🚨" title="Emergency Contact" />
        <Row label="Contact Name" value={session?.emergency_contact_name} placeholder="Not provided" />
        <Row
          label="Contact Number"
          value={session?.emergency_contact_number}
          placeholder="Not provided"
        />
      </div>

      {/* ── Care snapshot ── */}
      <div style={sectionStyle}>
        <SectionHeading icon="📊" title="Care Snapshot" />
        <Row label="Confirmed bookings" value={String(bookingSummary.confirmed)} />
        <Row label="Doctors available" value={String(doctorDirectory.length)} />
        <Row label="Symptom check-ins" value={String(history.length)} />
        <Row label="Gateway status" value={gatewayHealth?.status || 'Checking…'} />
      </div>
    </div>
  )
}

export default function Profile(props) {
  return (
    <PatientPortalPage {...props}>
      <ProfileContent />
    </PatientPortalPage>
  )
}
