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
      {/* Background */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-bg-circle auth-bg-circle--1" />
        <div className="auth-bg-circle auth-bg-circle--2" />
        <div className="auth-bg-circle auth-bg-circle--3" />
        <div className="auth-bg-grid" />
      </div>

      {/* Top nav bar */}
      <div className="auth-panel--brand">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <span className="auth-brand-pulse" aria-hidden="true" />
            <span className="auth-brand-name">Arogya</span>
          </div>

          <div className="auth-brand-stats">
            {[
              { val: '140+', lbl: 'Verified doctors' },
              { val: '98%',  lbl: 'Satisfaction' },
              { val: '<2 min', lbl: 'Avg. booking' },
            ].map(s => (
              <div key={s.lbl} className="auth-brand-stat">
                <strong>{s.val}</strong>
                <span>{s.lbl}</span>
              </div>
            ))}
          </div>

          <div className="auth-brand-card" aria-hidden="true">
            <div className="auth-brand-card-avatar">DR</div>
            <div className="auth-brand-card-info">
              <p className="auth-brand-card-name">Dr. R. Perera</p>
              <p className="auth-brand-card-spec">Cardiologist · Colombo</p>
            </div>
            <span className="auth-brand-card-badge">Available</span>
          </div>
        </div>
      </div>

      {/* Centered form */}
      <div className="auth-panel auth-panel--form">
        <div className="auth-form-wrap">

          <div className="auth-form-header">
            <div className="auth-form-eyebrow">
              <span className="auth-form-eyebrow-dot" aria-hidden="true" />
              Welcome back
            </div>
            <h1 className="auth-form-title">
              Sign in to<br /><em>your account</em>
            </h1>
            <p className="auth-form-sub">
              Access your appointments, health records, and upcoming visits.
            </p>
          </div>

          {bannerError ? (
            <p className="auth-banner auth-banner--error" role="alert">
              {bannerError}
            </p>
          ) : null}
          {bannerMessage ? <p className="auth-banner auth-banner--success">{bannerMessage}</p> : null}

          <form className="auth-form auth-form--login" onSubmit={onSubmit} noValidate>

            {/* Email */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M1.5 5.5L8 9.5L14.5 5.5" stroke="currentColor" strokeWidth="1.2"/>
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

            {/* Password */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="7" width="10" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <circle cx="8" cy="10.5" r="1" fill="currentColor"/>
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

            {/* Submit — full width */}
            <div className="auth-submit-row">
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Signing in…
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

          <p className="auth-form-footer">
            Don't have an account?{' '}
            <button type="button" className="auth-link" onClick={() => navigateTo('/register')}>
              Create one — it's free
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}