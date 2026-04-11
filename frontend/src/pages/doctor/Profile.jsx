import StatusPill from '../../components/StatusPill'
import DoctorPortalPage from './DoctorPortalPage'
import { useDoctorPortal } from './DoctorPortalContext'

function ProfileContent() {
  const { profile, profileValues, handleProfileChange, handleProfileSubmit } = useDoctorPortal()

  return (
    <div className="doctor-page-stack">
      <section className="doctor-surface-card">
        <div className="doctor-card-topline">
          <h3>Profile</h3>
          <StatusPill status={profile ? 'ok' : 'pending'} label={profile ? 'Loaded' : 'New profile'} />
        </div>
        <form className="analysis-form" onSubmit={handleProfileSubmit}>
          <label>
            Name
            <input name="name" value={profileValues.name} onChange={handleProfileChange} />
          </label>
          <label>
            Specialization
            <input name="specialization" value={profileValues.specialization} onChange={handleProfileChange} />
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
            />
          </label>
          <label>
            Bio
            <textarea name="bio" rows="4" value={profileValues.bio} onChange={handleProfileChange} />
          </label>
          <div className="doctor-toolbar">
            <button type="submit">Save profile</button>
          </div>
        </form>
      </section>
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
