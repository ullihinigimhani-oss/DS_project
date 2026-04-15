import { useEffect } from 'react'
import ModernSelect from '../../components/ModernSelect'
import ModernSearchBar from '../../components/ModernSearchBar'
import { useAdminPortal } from './AdminPortalContext'

export default function AdminUsersPage() {
  const {
    session,
    users,
    usersLoading,
    usersPagination,
    userSearch,
    userRoleFilter,
    userStatusFilter,
    userActionId,
    setUserSearch,
    setUserRoleFilter,
    setUserStatusFilter,
    setUsersPagination,
    loadUsers,
    handleToggleUserStatus,
  } = useAdminPortal()

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  return (
    <div className="admin-page-stack">
      <section className="admin-surface-card">
        <div className="admin-card-topline">
          <div>
            <h3>Manage users</h3>
            <p>Review all accounts, filter by role, and block or reactivate access when needed.</p>
          </div>
          <span className="dashboard-badge">{usersPagination.total} total</span>
        </div>

        <div className="admin-filter-grid">
          <div className="doctor-compact-field">
            <span>Search</span>
            <ModernSearchBar
              value={userSearch}
              onChange={(event) => {
                setUserSearch(event.target.value)
                setUsersPagination((current) => ({ ...current, page: 1 }))
              }}
              onReset={() => {
                setUserSearch('')
                setUsersPagination((current) => ({ ...current, page: 1 }))
              }}
              placeholder="Search by name, email, or phone"
            />
          </div>

          <div className="doctor-compact-field">
            <span>Role</span>
            <ModernSelect
              value={userRoleFilter}
              onChange={(event) => {
                setUserRoleFilter(event.target.value)
                setUsersPagination((current) => ({ ...current, page: 1 }))
              }}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'doctor', label: 'Doctor' },
                { value: 'patient', label: 'Patient' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
          </div>

          <div className="doctor-compact-field">
            <span>Status</span>
            <ModernSelect
              value={userStatusFilter}
              onChange={(event) => {
                setUserStatusFilter(event.target.value)
                setUsersPagination((current) => ({ ...current, page: 1 }))
              }}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'blocked', label: 'Blocked' },
              ]}
            />
          </div>
        </div>

        <div className="admin-toolbar">
          <button type="button" className="secondary-button" onClick={() => void loadUsers()}>
            Refresh users
          </button>
        </div>

        {usersLoading ? <p className="empty-state">Loading users...</p> : null}

        {!usersLoading && users.length === 0 ? (
          <p className="empty-state">No users match the current filter yet.</p>
        ) : null}

        <div className="admin-user-table">
          <div className="admin-user-table-header">
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Role</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {users.map((user) => {
            const nextActive = !user.is_active
            const isCurrentAdmin = user.id === session?.userId

            return (
              <article key={user.id} className="admin-user-row">
                <div data-label="Name">
                  <strong>{user.name || 'User'}</strong>
                </div>
                <div data-label="Email">{user.email || 'Not available'}</div>
                <div data-label="Phone">{user.phone || 'Not available'}</div>
                <div data-label="Role">
                  <span className="dashboard-badge">{user.user_type}</span>
                </div>
                <div data-label="Status">
                  <span className={`status-pill ${user.is_active ? 'ok' : 'warn'}`}>
                    {user.is_active ? 'Active' : 'Blocked'}
                  </span>
                </div>
                <div data-label="Action">
                  <button
                    type="button"
                    className={user.is_active ? 'secondary-button' : ''}
                    disabled={userActionId === user.id || isCurrentAdmin}
                    onClick={() => handleToggleUserStatus(user.id, nextActive)}
                  >
                    {isCurrentAdmin
                      ? 'Current admin'
                      : userActionId === user.id
                      ? 'Working...'
                      : user.is_active
                        ? 'Block user'
                        : 'Activate'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
