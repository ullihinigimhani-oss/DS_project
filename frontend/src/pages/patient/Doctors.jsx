import { useMemo, useState } from 'react'
import ModernSelect from '../../components/ModernSelect'
import ModernSearchBar from '../../components/ModernSearchBar'
import StatusPill from '../../components/StatusPill'
import PatientPortalPage from './PatientPortalPage'
import { getInitials, usePatientPortal } from './PatientPortalContext'

function normalizeText(value) {
  return String(value || '').toLowerCase().trim()
}

function DoctorsContent({ onNavigate }) {
  const { doctorDirectory, handleDoctorSelect } = usePatientPortal()
  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')

  const specialtyOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        doctorDirectory
          .map((doctor) => doctor.specialization || 'General Practice')
          .filter(Boolean),
      ),
    )

    return ['all', ...values.sort((left, right) => left.localeCompare(right))]
  }, [doctorDirectory])

  const filteredDoctors = useMemo(() => {
    const query = normalizeText(search)

    return doctorDirectory.filter((doctor) => {
      const name = normalizeText(doctor.name)
      const specialization = normalizeText(doctor.specialization || 'General Practice')
      const matchesSearch =
        !query || name.includes(query) || specialization.includes(query)
      const matchesSpecialty =
        specialtyFilter === 'all' ||
        (doctor.specialization || 'General Practice') === specialtyFilter

      return matchesSearch && matchesSpecialty
    })
  }, [doctorDirectory, search, specialtyFilter])

  const verifiedCount = doctorDirectory.filter(
    (doctor) => doctor.verification_status === 'approved',
  ).length

  return (
    <div className="patient-page-stack">
      <section className="patient-surface-card patient-doctors-shell">
        <div className="patient-doctors-hero">
          <div>
            <div className="patient-card-topline">
              <h3>Find doctors</h3>
              <span className="patient-mini-badge">{filteredDoctors.length} shown</span>
            </div>
            <p className="patient-doctors-subtitle">
              Browse specialists, compare verified profiles, and move directly into booking with a
              cleaner discovery flow.
            </p>
          </div>

          <div className="patient-doctors-stats">
            <article className="patient-doctors-stat-card">
              <span>Listed doctors</span>
              <strong>{doctorDirectory.length}</strong>
            </article>
            <article className="patient-doctors-stat-card">
              <span>Verified doctors</span>
              <strong>{verifiedCount}</strong>
            </article>
          </div>
        </div>

        <div className="patient-doctors-toolbar">
          <div className="patient-doctors-search">
            <span>Search doctors</span>
            <ModernSearchBar
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onReset={() => setSearch('')}
              placeholder="Search by doctor name or specialization..."
            />
          </div>

          <div className="patient-doctors-filter">
            <span>Specialty</span>
            <ModernSelect
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              options={specialtyOptions.map((option) => ({
                value: option,
                label: option === 'all' ? 'All specialties' : option,
              }))}
            />
          </div>
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="patient-doctors-empty">
            <strong>No doctors match this search yet.</strong>
            <p>Try a broader name or remove the specialty filter to view more clinicians.</p>
          </div>
        ) : (
          <div className="patient-doctors-grid">
            {filteredDoctors.map((doctor) => {
              const isVerified = doctor.verification_status === 'approved'
              const specialization = doctor.specialization || 'General Practice'
              const consultationFee =
                doctor.consultation_fee !== null && doctor.consultation_fee !== undefined
                  ? doctor.consultation_fee
                  : 'N/A'

              return (
                <article key={doctor.doctor_id} className="patient-doctor-card-premium">
                  <div className="patient-doctor-card-head">
                    <div className="patient-doctor-avatar">
                      <span>{getInitials(doctor.name || 'Doctor')}</span>
                    </div>

                    <div className="patient-doctor-head-copy">
                      <strong>{doctor.name || 'Doctor'}</strong>
                      <span>{specialization}</span>
                    </div>
                  </div>

                  <div className="patient-doctor-card-badges">
                    <StatusPill
                      status={isVerified ? 'ok' : 'warn'}
                      label={isVerified ? 'Verified Doctor' : 'Unverified'}
                    />
                    <span className="patient-doctor-meta-chip">
                      Consultation fee: {consultationFee}
                    </span>
                  </div>

                  <p className="patient-doctor-card-copy">
                    {isVerified
                      ? 'This doctor is approved and available to continue into booking.'
                      : 'This doctor is still awaiting verification and cannot accept bookings yet.'}
                  </p>

                  <div className="patient-doctor-card-footer">
                    <button
                      type="button"
                      disabled={!isVerified}
                      onClick={() => {
                        handleDoctorSelect(doctor.doctor_id)
                        onNavigate('/patient/book-appointment')
                      }}
                    >
                      {isVerified ? 'Book appointment' : 'Awaiting verification'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default function Doctors(props) {
  return (
    <PatientPortalPage {...props}>
      <DoctorsContent onNavigate={props.onNavigate} />
    </PatientPortalPage>
  )
}
