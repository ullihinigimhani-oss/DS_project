import { useState } from 'react'
import PatientPortalPage from './PatientPortalPage'
import { usePatientPortal } from './PatientPortalContext'
import { apiBaseUrl } from '../../utils/api'

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  border: '1px solid rgba(26,35,50,0.15)',
  background: '#ffffff',
  fontSize: '0.925rem',
  color: '#1a2332',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'rgba(26,35,50,0.55)',
  marginBottom: '0.4rem',
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function ProfileCompletionContent() {
  const { session } = usePatientPortal()
  const isEdit = Boolean(session?.birthdate)

  const [form, setForm] = useState({
    birthdate: session?.birthdate ? session.birthdate.split('T')[0] : '',
    gender: session?.gender || '',
    blood_type: session?.blood_type || '',
    allergies: session?.allergies || '',
    emergency_contact_name: session?.emergency_contact_name || '',
    emergency_contact_number: session?.emergency_contact_number || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${apiBaseUrl}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save profile. Try again.')
      }

      setSuccess('Profile saved successfully! Redirecting…')
      setTimeout(() => {
        window.location.href = '/patient/profile'
      }, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 8px' }}>
      <section className="patient-surface-card" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c17a5c', margin: '0 0 0.4rem' }}>
            {isEdit ? 'Manage your details' : 'Welcome to Arogya'}
          </p>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.6rem', fontWeight: 700, color: '#1a2332', letterSpacing: '-0.02em' }}>
            {isEdit ? 'Edit Your Profile' : 'Complete Your Profile'}
          </h2>
          <p style={{ margin: 0, color: 'rgba(26,35,50,0.5)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {isEdit
              ? 'Update your health information and emergency contact details below.'
              : 'Fill in a few details so we can personalise your care experience.'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid rgba(200,50,50,0.2)', color: '#b91c1c', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid rgba(29,158,117,0.25)', color: '#166534', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Row: Birthdate + Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Date of Birth">
              <input
                type="date"
                name="birthdate"
                value={form.birthdate}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </Field>
            <Field label="Gender">
              <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
                <option value="">Select gender…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / Prefer not to say</option>
              </select>
            </Field>
          </div>

          {/* Blood Type */}
          <Field label="Blood Type">
            <select name="blood_type" value={form.blood_type} onChange={handleChange} style={inputStyle}>
              <option value="">Unknown / Not sure</option>
              <option value="A+">A+</option>
              <option value="A-">A−</option>
              <option value="B+">B+</option>
              <option value="B-">B−</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB−</option>
              <option value="O+">O+</option>
              <option value="O-">O−</option>
            </select>
          </Field>

          {/* Allergies */}
          <Field label="Known Allergies">
            <textarea
              name="allergies"
              value={form.allergies}
              onChange={handleChange}
              placeholder="e.g. Penicillin, Peanuts, Latex — leave blank if none"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: 1.5 }}
            />
          </Field>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(46,70,98,0.08)', margin: '0.25rem 0' }} />
          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(26,35,50,0.45)' }}>
            Emergency Contact
          </p>

          {/* Row: Emergency name + number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Contact Name">
              <input
                type="text"
                name="emergency_contact_name"
                value={form.emergency_contact_name}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                required
                style={inputStyle}
              />
            </Field>
            <Field label="Contact Number">
              <input
                type="tel"
                name="emergency_contact_number"
                value={form.emergency_contact_number}
                onChange={handleChange}
                placeholder="e.g. +94 77 123 4567"
                required
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.875rem',
                borderRadius: '12px',
                border: 'none',
                background: loading ? 'rgba(29,158,117,0.5)' : 'linear-gradient(135deg, #1d9e75, #16866a)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em',
                transition: 'opacity 0.2s, transform 0.15s',
                boxShadow: '0 4px 16px rgba(29,158,117,0.25)',
              }}
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Complete Profile'}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => { window.location.href = '/patient/profile' }}
                style={{
                  padding: '0.875rem 1.25rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(46,70,98,0.15)',
                  background: 'rgba(255,255,255,0.7)',
                  color: 'rgba(46,70,98,0.7)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}

export default function ProfileCompletion(props) {
  return (
    <PatientPortalPage {...props}>
      <ProfileCompletionContent />
    </PatientPortalPage>
  )
}
