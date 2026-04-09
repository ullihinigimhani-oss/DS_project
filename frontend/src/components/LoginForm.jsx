export default function LoginForm({
  values,
  onChange,
  onSubmit,
  loading,
  roleHint,
  hideRolePicker = false,
  roleLabel = 'Preview role',
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Email
        <input
          name="email"
          type="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={onChange}
          required
        />
      </label>

      <label>
        Password
        <input
          name="password"
          type="password"
          placeholder="Enter your password"
          value={values.password}
          onChange={onChange}
          required
        />
      </label>

      {!hideRolePicker ? (
        <div className="inline-select">
          <span>{roleLabel}</span>
          <div className="role-picker compact">
            {['patient', 'doctor', 'admin'].map((role) => (
              <button
                key={role}
                type="button"
                className={`role-chip ${roleHint === role ? 'active' : ''}`}
                onClick={() => onChange({ target: { name: 'role', value: role } })}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
