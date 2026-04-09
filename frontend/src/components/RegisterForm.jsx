export default function RegisterForm({
  values,
  onChange,
  onSubmit,
  loading,
  hideRoleSelect = false,
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        Full name
        <input
          name="name"
          type="text"
          placeholder="Your full name"
          value={values.name}
          onChange={onChange}
          required
        />
      </label>

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
        Phone
        <input
          name="phone"
          type="text"
          placeholder="+94 77 123 4567"
          value={values.phone}
          onChange={onChange}
        />
      </label>

      <label>
        Password
        <input
          name="password"
          type="password"
          placeholder="Create a password"
          value={values.password}
          onChange={onChange}
          required
        />
      </label>

      {!hideRoleSelect ? (
        <label>
          Role
          <select name="userType" value={values.userType} onChange={onChange}>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
