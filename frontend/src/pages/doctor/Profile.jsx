import StatusPill from '../../components/StatusPill'
import { resolveDoctorAssetUrl } from '../../utils/doctorService'
import DoctorPortalPage from './DoctorPortalPage'
import { getInitials, useDoctorPortal } from './DoctorPortalContext'

function ProfileContent() {
  const {
    doctorId,
    profile,
    session,
    profileEditing,
    profileImagePreview,
    profileValues,
    setProfileEditing,
    handleProfileChange,
    handleProfileImageChange,
    handleProfileSubmit,
    clearProfileImageSelection,
    resetProfileForm,
  } = useDoctorPortal()

  const doctorName = profile?.name || session?.name || 'Doctor'
  const profileImageUrl = profileImagePreview || resolveDoctorAssetUrl(profile?.profile_image_url)
  const detailItems = [
    { label: 'Doctor ID', value: doctorId || 'Not available' },
    { label: 'Email', value: session?.email || 'Not available' },
    { label: 'Phone', value: session?.phone || 'Not available' },
    { label: 'Specialization', value: profile?.specialization || 'Not added yet' },
    {
      label: 'Consultation fee',
      value:
        profile?.consultation_fee != null && profile?.consultation_fee !== ''
          ? `LKR ${profile.consultation_fee}`
          : 'Not set yet',
    },
    { label: 'Bio', value: profile?.bio || 'No doctor bio has been added yet.' },
  ]

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card doctor-profile-hero">
        <div className="doctor-card-topline">
          <h3>Profile</h3>
          <StatusPill
            status={profile ? 'ok' : 'pending'}
            label={profile ? 'Profile ready' : 'Setup profile'}
          />
        </div>

        <div className="doctor-profile-hero-grid">
          <div className="doctor-profile-identity">
            <div className="doctor-profile-photo">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={`Dr. ${doctorName}`} />
              ) : (
                <span>{getInitials(doctorName)}</span>
              )}
            </div>
            <div className="doctor-profile-heading">
              <p className="doctor-sidebar-kicker">Doctor profile</p>
              <h2>Dr. {doctorName}</h2>
              <p>
                {profile?.specialization ||
                  'Add your specialization, consultation fee, and short bio so patients see a fuller doctor profile.'}
              </p>
              <div className="doctor-chip-row">
                <span className="doctor-mini-badge">
                  {profile?.profile_image_url ? 'Photo uploaded' : 'Photo optional'}
                </span>
                <span className="doctor-mini-badge">
                  {profile?.consultation_fee != null ? 'Fee set' : 'Fee pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="doctor-toolbar">
            {profileEditing ? (
              <>
                <button type="button" className="secondary-button" onClick={resetProfileForm}>
                  Cancel
                </button>
                <button type="submit" form="doctor-profile-form">
                  Save changes
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setProfileEditing(true)}>
                Edit profile
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="doctor-content-grid doctor-profile-summary-grid">
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Doctor details</h3>
            <span className="doctor-mini-badge">Live profile</span>
          </div>
          <div className="doctor-detail-list">
            {detailItems.map((item) => (
              <div key={item.label} className="doctor-detail-row doctor-detail-row-start">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Profile guidance</h3>
            <span className="doctor-mini-badge">Recommended</span>
          </div>
          <p>
            Keep your public-facing information current so patients can quickly understand your
            care focus before they book.
          </p>
          <div className="doctor-detail-list">
            <div className="doctor-detail-row">
              <span>Public name</span>
              <strong>{profile?.name || session?.name || 'Not added yet'}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Booking visibility</span>
              <strong>{profile?.specialization ? 'Professional profile shown' : 'Basic profile only'}</strong>
            </div>
            <div className="doctor-detail-row">
              <span>Profile image</span>
              <strong>{profile?.profile_image_url ? 'Active' : 'Optional'}</strong>
            </div>
          </div>
        </section>
      </div>

      {profileEditing ? (
        <section className="doctor-surface-card">
          <div className="doctor-card-topline">
            <h3>Edit doctor profile</h3>
            <span className="doctor-mini-badge">Update info</span>
          </div>
          <form id="doctor-profile-form" className="analysis-form doctor-profile-form" onSubmit={handleProfileSubmit}>
            <div className="doctor-inline-grid">
              <label>
                Full name
                <input name="name" value={profileValues.name} onChange={handleProfileChange} />
              </label>
              <label>
                Specialization
                <input
                  name="specialization"
                  value={profileValues.specialization}
                  onChange={handleProfileChange}
                  placeholder="Cardiology, Pediatrics, General Practice..."
                />
              </label>
              <label>
                Consultation fee
                <input
                  name="consultationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={profileValues.consultationFee}
                  onChange={handleProfileChange}
                  placeholder="3500"
                />
              </label>
            </div>

            <label>
              Short bio
              <textarea
                name="bio"
                rows="5"
                value={profileValues.bio}
                onChange={handleProfileChange}
                placeholder="Share your care focus, experience, and what patients can expect."
              />
            </label>

            <section className="doctor-profile-upload-card">
              <div className="doctor-card-topline">
                <h3>Profile image</h3>
                <span className="doctor-mini-badge">Optional</span>
              </div>
              <p>Upload a clear headshot if you want a more personal doctor profile.</p>
              <div className="doctor-profile-upload-grid">
                <div className="doctor-profile-photo doctor-profile-photo-preview">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt={`Dr. ${doctorName}`} />
                  ) : (
                    <span>{getInitials(doctorName)}</span>
                  )}
                </div>
                <div className="doctor-profile-upload-actions">
                  <label className="doctor-file-input">
                    <span>Choose image</span>
                    <input type="file" accept="image/*" onChange={handleProfileImageChange} />
                  </label>
                  <button type="button" className="secondary-button" onClick={clearProfileImageSelection}>
                    Clear selection
                  </button>
                  <p>Account email and phone stay read-only here because they come from the auth account.</p>
                </div>
              </div>
            </section>
          </form>
        </section>
      ) : null}
    </div>
  )
}

export default function Profile(props) {
  return (
    <DoctorPortalPage {...props}>
      <ProfileContent />
    </DoctorPortalPage>
  )
}
