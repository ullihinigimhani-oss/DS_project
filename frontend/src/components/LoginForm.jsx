import './auth.css'

export default function LoginForm({
  values,
  onChange,
  onSubmit,
  loading,
  roleHint,
  hideRolePicker = false,
  roleLabel = 'Sign in as',
  navigateTo,
  bannerError = '',
  bannerMessage = '',
}) {
  return (
    <div className="auth-page auth-page--login">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-circle auth-bg-circle--1" />
        <div className="auth-bg-circle auth-bg-circle--2" />
        <div className="auth-bg-circle auth-bg-circle--3" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-panel auth-panel--form auth-panel--form-login">
        <div className="auth-form-wrap auth-form-wrap--login">
          <div className="auth-form-header auth-form-header--login">
            <div className="auth-brand-logo auth-brand-logo--login">
              <span className="auth-brand-pulse" aria-hidden="true" />
              <span className="auth-brand-name">Arogya</span>
            </div>

            <div className="auth-form-eyebrow">
              <span className="auth-form-eyebrow-dot" aria-hidden="true" />
              Welcome back
            </div>

            <h1 className="auth-form-title auth-form-title--login">
              Sign in to<br /><em>your account</em>
            </h1>

            <p className="auth-form-sub auth-form-sub--login">
              Access appointments, symptom guidance, medical records, and care coordination from one connected workspace.
            </p>
          </div>

          {bannerError ? (
            <p className="auth-banner auth-banner--error" role="alert">
              {bannerError}
            </p>
          ) : null}
          {bannerMessage ? <p className="auth-banner auth-banner--success">{bannerMessage}</p> : null}

          <form className="auth-form auth-form--login" onSubmit={onSubmit} noValidate>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1.5 5.5L8 9.5L14.5 5.5" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  className="auth-input"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={onChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="8" cy="10.5" r="1" fill="currentColor" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  className="auth-input"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={values.password}
                  onChange={onChange}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {!hideRolePicker && (
              <div className="auth-field-group auth-role-row">
                <span className="auth-label">{roleLabel}</span>
                <div className="auth-role-picker">
                  {['patient', 'doctor', 'admin'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`auth-role-chip ${roleHint === role ? 'auth-role-chip--active' : ''}`}
                      onClick={() => onChange({ target: { name: 'role', value: role } })}
                    >
                      <span className="auth-role-icon" aria-hidden="true">
                        {role === 'patient' && '◉'}
                        {role === 'doctor' && '⚕'}
                        {role === 'admin' && '⊕'}
                      </span>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="auth-submit-row">
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <span className="auth-submit-arrow" aria-hidden="true">↗</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="auth-form-footer auth-form-footer--login">
            Don't have an account?{' '}
            <button type="button" className="auth-link" onClick={() => navigateTo('/register')}>
              Create one — it's free
            </button>
          </p>

          <div className="auth-bottom-actions">
            <button type="button" className="auth-home-link auth-home-link--bottom" onClick={() => navigateTo('/')}>
              Back to home
            </button>
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel--brand auth-panel--brand-login">
        <div className="auth-brand-inner auth-brand-inner--login">
          <div className="auth-login-brand-topline">Connected care platform</div>

          <div className="auth-brand-logo auth-brand-logo--panel">
            <span className="auth-brand-pulse" aria-hidden="true" />
            <span className="auth-brand-name">Arogya</span>
          </div>

          <div className="auth-login-brand-copy">
            <h2 className="auth-login-brand-title">
              Smart care journeys for patients, doctors, and admins.
            </h2>
            <p className="auth-login-brand-sub">
              Move from symptom check to specialist booking, patient review, prescriptions, and verification with one polished healthcare platform.
            </p>
          </div>

          <div className="auth-brand-stats auth-brand-stats--login">
            {[
              { val: '140+', lbl: 'Verified doctors' },
              { val: '98%', lbl: 'Patient satisfaction' },
              { val: '<2 min', lbl: 'Average booking flow' },
            ].map((item) => (
              <div key={item.lbl} className="auth-brand-stat auth-brand-stat--login">
                <strong>{item.val}</strong>
                <span>{item.lbl}</span>
              </div>
            ))}
          </div>

          <div className="auth-login-brand-grid" aria-hidden="true">
            <div className="auth-login-brand-card auth-login-brand-card--feature">
              <span className="auth-login-brand-card-kicker">AI symptom guidance</span>
              <p className="auth-login-brand-card-title">Preliminary analysis that leads directly into the booking flow.</p>
            </div>
            <div className="auth-login-brand-card">
              <span className="auth-login-brand-card-kicker">Doctor workspace</span>
              <p className="auth-login-brand-card-title">Appointments, patients, prescriptions, schedules, and care notes.</p>
            </div>
            <div className="auth-login-brand-card">
              <span className="auth-login-brand-card-kicker">Admin control</span>
              <p className="auth-login-brand-card-title">Verification, users, monitoring, audit visibility, and operations.</p>
            </div>
          </div>

          <div className="auth-brand-card auth-brand-card--login" aria-hidden="true">
            <div className="auth-brand-card-avatar">DR</div>
            <div className="auth-brand-card-info">
              <p className="auth-brand-card-name">Dr. R. Perera</p>
              <p className="auth-brand-card-spec">Cardiologist · Colombo</p>
            </div>
            <span className="auth-brand-card-badge">Available</span>
          </div>
        </div>
      </div>
    </div>
  )
}
