import './auth.css'

const roleIcons = { patient: '◉', doctor: '⚕', admin: '⊕' }

const docFields = [
  { name: 'licenseDocument',      label: 'Medical licence',   hint: 'SLMC registration certificate' },
  { name: 'governmentIdDocument', label: 'Government ID',     hint: 'NIC / Passport scan' },
  { name: 'credentialsDocument',  label: 'Credentials',       hint: 'Degree / specialist certificates' },
  { name: 'insuranceDocument',    label: 'Professional insurance', hint: 'Valid indemnity cover' },
]

export default function RegisterForm({
  values,
  onChange,
  onFileChange,
  onSubmit,
  loading,
  hideRoleSelect = false,
  navigateTo,
  bannerError = '',
  bannerMessage = '',
}) {
  const isDoctorRegistration = values.userType === 'doctor'

  return (
    <div className="auth-page auth-page--register">
      {/* Background decorative elements */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-circle auth-bg-circle--1" />
        <div className="auth-bg-circle auth-bg-circle--2" />
        <div className="auth-bg-circle auth-bg-circle--3" />
        <div className="auth-bg-grid" />
      </div>

      {/* Left panel — brand */}
      <div className="auth-panel auth-panel--brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <span className="auth-brand-pulse" aria-hidden="true" />
            <span className="auth-brand-name">Arogya</span>
          </div>
          <div className="auth-brand-body">
            <h2 className="auth-brand-headline">
              Join Sri Lanka's<br /><em>connected care</em><br />platform.
            </h2>
            <p className="auth-brand-sub">
              Patients find verified specialists. Doctors reach more patients. Everyone saves time.
            </p>
          </div>

          {/* Why join cards */}
          <div className="auth-brand-why">
            {[
              { icon: '◎', title: 'Verified profiles', desc: 'Every practitioner is credential-checked before going live.' },
              { icon: '⟡', title: 'AI-assisted triage', desc: 'Describe symptoms in plain language. Our AI routes you right.' },
              { icon: '✦', title: 'Instant booking', desc: 'Real-time slots, confirmation in your inbox — no phone calls.' },
            ].map(w => (
              <div key={w.title} className="auth-brand-why-item">
                <span className="auth-brand-why-icon" aria-hidden="true">{w.icon}</span>
                <div>
                  <p className="auth-brand-why-title">{w.title}</p>
                  <p className="auth-brand-why-desc">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-panel auth-panel--form">
        <div className="auth-form-wrap auth-form-wrap--scroll">
          {/* Header */}
          <div className="auth-form-header">
            <div className="auth-form-eyebrow">
              <span className="auth-form-eyebrow-dot" aria-hidden="true" />
              New account
            </div>
            <h1 className="auth-form-title">Create your<br /><em>profile</em></h1>
            <p className="auth-form-sub">Start your health journey in under two minutes.</p>
          </div>

          {bannerError ? (
            <p className="auth-banner auth-banner--error" role="alert">
              {bannerError}
            </p>
          ) : null}
          {bannerMessage ? <p className="auth-banner auth-banner--success">{bannerMessage}</p> : null}

          {/* Form */}
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            {/* Basic fields */}
            <div className="auth-field-row">
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="reg-name">Full name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M2.5 13.5c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    id="reg-name"
                    className="auth-input"
                    name="name"
                    type="text"
                    placeholder="Dr. / Full name"
                    value={values.name}
                    onChange={onChange}
                    required
                  />
                </div>
              </div>
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="reg-phone">Phone</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="4.5" y="1.5" width="7" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="8" cy="12" r="0.75" fill="currentColor"/>
                    </svg>
                  </span>
                  <input
                    id="reg-phone"
                    className="auth-input"
                    name="phone"
                    type="text"
                    placeholder="+94 77 123 4567"
                    value={values.phone}
                    onChange={onChange}
                  />
                </div>
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M1.5 5.5L8 9.5L14.5 5.5" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </span>
                <input
                  id="reg-email"
                  className="auth-input"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={onChange}
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
                  </svg>
                </span>
                <input
                  id="reg-password"
                  className="auth-input"
                  name="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={values.password}
                  onChange={onChange}
                  required
                />
              </div>
            </div>

            {/* Role picker */}
            {!hideRoleSelect && (
              <div className="auth-field-group">
                <span className="auth-label">I am joining as</span>
                <div className="auth-role-picker auth-role-picker--register">
                  {['patient', 'doctor'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`auth-role-chip auth-role-chip--lg ${values.userType === role ? 'auth-role-chip--active' : ''}`}
                      onClick={() => onChange({ target: { name: 'userType', value: role } })}
                    >
                      <span className="auth-role-icon auth-role-icon--lg" aria-hidden="true">{roleIcons[role]}</span>
                      <span className="auth-role-chip-label">{role}</span>
                      {values.userType === role && (
                        <span className="auth-role-chip-check" aria-hidden="true">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor verification docs */}
            {isDoctorRegistration && (
              <div className="auth-doctor-section">
                <div className="auth-doctor-header">
                  <span className="auth-doctor-icon" aria-hidden="true">⚕</span>
                  <div>
                    <p className="auth-doctor-title">Verification documents required</p>
                    <p className="auth-doctor-hint">
                      Reviewed by the Arogya admin team. Your profile goes live once approved — usually within 24 hours.
                    </p>
                  </div>
                </div>
                <div className="auth-doc-grid">
                  {docFields.map((field) => (
                    <div key={field.name} className="auth-doc-field">
                      <label className="auth-label" htmlFor={`reg-${field.name}`}>
                        {field.label}
                        <span className="auth-doc-hint">{field.hint}</span>
                      </label>
                      <label className="auth-file-label" htmlFor={`reg-${field.name}`}>
                        <span className="auth-file-icon" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M10 2H4.5A1.5 1.5 0 003 3.5v11A1.5 1.5 0 004.5 16h9a1.5 1.5 0 001.5-1.5V6.5L10 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                            <path d="M10 2v4.5H14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span className="auth-file-text">Upload PDF</span>
                        <input
                          id={`reg-${field.name}`}
                          className="auth-file-input"
                          name={field.name}
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={onFileChange}
                          required
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <span className="auth-submit-arrow" aria-hidden="true">↗</span>
                </>
              )}
            </button>
          </form>

          <p className="auth-form-footer">
            Already have an account?{' '}
            <button type="button" className="auth-link" onClick={() => navigateTo('/login')}>
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}