import { useEffect, useMemo, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import SectionCard from './components/SectionCard'
import StatusPill from './components/StatusPill'
import Home from './components/Home'
import AiSymptomWorkspace from './components/AiSymptomWorkspace'
import DoctorDashboard from './components/dashboards/DoctorDashboard'
import PatientDashboard from './components/dashboards/PatientDashboard'
import AdminDashboard from './components/dashboards/AdminDashboard'
import DoctorAppointmentsPage from './pages/doctor/Appointments'
import DoctorSchedulePage from './pages/doctor/Schedule'
import DoctorPatientsPage from './pages/doctor/Patients'
import DoctorConsultationsPage from './pages/doctor/Consultations'
import DoctorPrescriptionsPage from './pages/doctor/Prescriptions'
import DoctorVerificationPage from './pages/doctor/Verification'
import DoctorProfilePage from './pages/doctor/Profile'
import PatientBookAppointmentPage from './pages/patient/BookAppointment'
import PatientMyBookingsPage from './pages/patient/MyBookings'
import PatientDoctorsPage from './pages/patient/Doctors'
import PatientPaymentPage from './pages/patient/Payment'
import PatientSymptomHistoryPage from './pages/patient/SymptomHistory'
import PatientProfilePage from './pages/patient/Profile'
import AdminPortalPage from './pages/Admin/AdminPortalPage'
import AdminUsersPage from './pages/Admin/Users'
import AdminDoctorsPage from './pages/Admin/Doctors'
import AdminAppointmentsPage from './pages/Admin/Appointments'
import AdminSettingsPage from './pages/Admin/Settings'
import { checkEmailAvailability, loginUser, registerUser, verifyUser } from './utils/authService'
import {
  submitDoctorVerification,
  updateDoctorProfile,
  uploadDoctorDocument,
} from './utils/doctorService'
import {
  analyzeSymptoms,
  apiBaseUrl,
  fetchAnalysisHistory,
  fetchGatewayHealth,
  fetchPublicDoctors,
  gatewayBaseUrl,
} from './utils/api'
import './App.css'
import './styles/post-login-creative.css'

const defaultSymptoms = 'I have fever, cough, headache and runny nose'
const sessionStorageKey = 'healthcare-auth-shell-session'
const authTokenStorageKey = 'token'

function getInitialPath() {
  const path = window.location.pathname || '/'
  return path === '' ? '/' : path
}

function getRouteForRole(role) {
  switch (role) {
    case 'doctor':
      return '/doctor/dashboard'
    case 'admin':
      return '/admin/dashboard'
    case 'patient':
    default:
      return '/patient'
  }
}

function clearPersistedAuth() {
  window.localStorage.removeItem(sessionStorageKey)
  window.localStorage.removeItem(authTokenStorageKey)
}

function persistSession(nextSession) {
  if (!nextSession) {
    clearPersistedAuth()
    return
  }

  window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession))

  if (nextSession.token) {
    window.localStorage.setItem(authTokenStorageKey, nextSession.token)
  } else {
    window.localStorage.removeItem(authTokenStorageKey)
  }
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(getInitialPath)
  const [gatewayHealth, setGatewayHealth] = useState(null)
  const [doctorDirectory, setDoctorDirectory] = useState([])
  const [directoryState, setDirectoryState] = useState('idle')
  const [symptoms, setSymptoms] = useState(defaultSymptoms)
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])
  const [analysisError, setAnalysisError] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('all')
  const [session, setSession] = useState(null)
  const [loginValues, setLoginValues] = useState({
    email: '',
    password: '',
    role: 'patient',
  })
  const [registerValues, setRegisterValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    userType: 'patient',
    licenseDocument: null,
    governmentIdDocument: null,
    credentialsDocument: null,
    insuranceDocument: null,
  })
  const [registerEmailHint, setRegisterEmailHint] = useState('')
  const [registerEmailChecking, setRegisterEmailChecking] = useState(false)

  const serviceHealthy = gatewayHealth?.status === 'running'
  const isDoctorPortalRoute = currentPath.startsWith('/doctor/')
  const isPatientPortalRoute = currentPath.startsWith('/patient')
  const isAdminPortalRoute = currentPath === '/admin' || currentPath.startsWith('/admin/')
  const isPublicDoctorsRoute = currentPath === '/doctors'
  const isAuthRoute = currentPath === '/login' || currentPath === '/register'
  const isHomeRoute = currentPath === '/' || currentPath === '/Home'
  const activeRole = session?.role || loginValues.role
  const topCondition = analysis?.possibleConditions?.[0] || null

  const quickStats = useMemo(() => {
    return [
      {
        label: 'Gateway base',
        value: gatewayBaseUrl.replace('http://', ''),
      },
      {
        label: 'Auth mode',
        value: session?.mode === 'connected' ? 'Connected' : session ? 'Session' : 'Signed out',
      },
      {
        label: 'Role focus',
        value: activeRole,
      },
      {
        label: 'Doctors loaded',
        value: String(doctorDirectory.length),
      },
    ]
  }, [activeRole, doctorDirectory.length, session])

  const doctorSpecialtyOptions = useMemo(() => {
    const specialties = Array.from(
      new Set(
        doctorDirectory
          .map((doctor) => doctor.specialization || 'General Practice')
          .filter(Boolean),
      ),
    )

    return ['all', ...specialties.sort((left, right) => left.localeCompare(right))]
  }, [doctorDirectory])

  const filteredPublicDoctors = useMemo(() => {
    const query = String(doctorSearch || '').toLowerCase().trim()

    return doctorDirectory.filter((doctor) => {
      const name = String(doctor.name || '').toLowerCase()
      const specialization = String(doctor.specialization || 'General Practice').toLowerCase()
      const matchesSearch =
        !query || name.includes(query) || specialization.includes(query)
      const matchesSpecialty =
        doctorSpecialtyFilter === 'all' ||
        (doctor.specialization || 'General Practice') === doctorSpecialtyFilter

      return matchesSearch && matchesSpecialty
    })
  }, [doctorDirectory, doctorSearch, doctorSpecialtyFilter])

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const saved = window.localStorage.getItem(sessionStorageKey)
        if (!saved) return

        const parsed = JSON.parse(saved)

        // Reject persisted sessions that have no token (old preview-mode data)
        if (!parsed?.token) {
          clearPersistedAuth()
          setSession(null)
          return
        }

        // Re-verify the stored token against the auth service
        try {
          await verifyUser(parsed.token)
          // Token is still valid — restore the session
          window.localStorage.setItem(authTokenStorageKey, parsed.token)
          setSession(parsed)
        } catch {
          // Token is expired or invalid — force a clean sign-in
          clearPersistedAuth()
          setSession(null)
        }
      } catch {
        // Ignore bad local data and continue with a clean session.
        clearPersistedAuth()
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    persistSession(session)
  }, [session])

  useEffect(() => {
    const raw = registerValues.email?.trim() || ''
    const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)

    if (!raw || !looksValid) {
      setRegisterEmailHint('')
      setRegisterEmailChecking(false)
      return undefined
    }

    setRegisterEmailChecking(true)
    const timerId = window.setTimeout(async () => {
      try {
        const res = await checkEmailAvailability(raw)
        setRegisterEmailChecking(false)
        if (!res.success || !res.data) {
          setRegisterEmailHint('')
          return
        }
        if (!res.data.available) {
          const ut = res.data.existingUserType || 'user'
          setRegisterEmailHint(
            `This email is already registered as a ${ut}. Sign in with that account or choose a different email.`,
          )
        } else {
          setRegisterEmailHint('')
        }
      } catch {
        setRegisterEmailChecking(false)
        setRegisterEmailHint('')
      }
    }, 450)

    return () => window.clearTimeout(timerId)
  }, [registerValues.email])

  useEffect(() => {
    const loadGatewayHealth = async () => {
      try {
        const data = await fetchGatewayHealth()
        setGatewayHealth(data)
      } catch (error) {
        setGatewayHealth({
          service: 'api-gateway',
          status: 'unreachable',
          error: error.message,
        })
      }
    }

    const loadDoctorDirectory = async () => {
      setDirectoryState('loading')
      try {
        const data = await fetchPublicDoctors()
        setDoctorDirectory(Array.isArray(data.data) ? data.data : [])
        setDirectoryState('success')
      } catch (_error) {
        setDirectoryState('error')
      }
    }

    loadGatewayHealth()
    loadDoctorDirectory()
  }, [])

  const loadHistory = async () => {
    if (!session?.userId) {
      setHistory([])
      return
    }

    setHistoryLoading(true)
    try {
      const data = await fetchAnalysisHistory()
      setHistory(Array.isArray(data.data) ? data.data : [])
    } catch (_error) {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (session?.userId) {
      loadHistory()
      return
    }

    setHistory([])
  }, [session])

  const navigateTo = (path) => {
    if (path === currentPath) return
    window.history.pushState({}, '', path)
    setCurrentPath(path)
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginValues((current) => ({ ...current, [name]: value }))
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterValues((current) => ({ ...current, [name]: value }))
  }

  const handleRegisterFileChange = (event) => {
    const { name, files } = event.target
    setRegisterValues((current) => ({ ...current, [name]: files?.[0] || null }))
  }

  const createConnectedSession = (authData, fallback) => {
    const user = authData?.data?.user || {}

    return {
      userId: user.id || null,
      name: user.name || fallback.name || fallback.email,
      email: user.email || fallback.email,
      phone: user.phone || fallback.phone || '',
      role: user.userType || fallback.role || fallback.userType || 'patient',
      mode: 'connected',
      token: authData.data.accessToken,
    }
  }

  const getDoctorRegistrationDocuments = () => [
    { type: 'license', file: registerValues.licenseDocument },
    { type: 'government_id', file: registerValues.governmentIdDocument },
    { type: 'credentials', file: registerValues.credentialsDocument },
    { type: 'insurance', file: registerValues.insuranceDocument },
  ]

  const completeDoctorRegistration = async (token) => {
    await updateDoctorProfile(token, {
      name: registerValues.name,
      specialization: '',
      consultationFee: '',
      bio: '',
    })

    for (const document of getDoctorRegistrationDocuments()) {
      await uploadDoctorDocument(token, document.file, document.type)
    }

    await submitDoctorVerification(token)
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    clearPersistedAuth()

    try {
      const data = await loginUser(loginValues)

      if (!data?.success || !data?.data?.accessToken) {
        setAuthError(data?.message || 'Login failed. Please check your credentials and try again.')
        return
      }

      const nextSession = createConnectedSession(data, loginValues)
      persistSession(nextSession)
      setSession(nextSession)
      setAuthMessage('Signed in successfully.')
      navigateTo(getRouteForRole(loginValues.role))
    } catch (error) {
      setAuthError(error.message || 'Login failed. Please check your credentials and try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    clearPersistedAuth()

    const regEmail = registerValues.email?.trim() || ''
    if (!regEmail) {
      setAuthBusy(false)
      setAuthError('Please enter your email address.')
      return
    }

    if (registerEmailHint) {
      setAuthBusy(false)
      setAuthError(registerEmailHint)
      return
    }

    if (registerValues.userType === 'doctor') {
      const missingDocuments = getDoctorRegistrationDocuments().filter((document) => !document.file)

      if (missingDocuments.length > 0) {
        setAuthBusy(false)
        setAuthError('Doctor registration requires all four verification documents before account creation.')
        return
      }
    }

    try {
      const availability = await checkEmailAvailability(regEmail)
      if (availability.success && availability.data && !availability.data.available) {
        const ut = availability.data.existingUserType || 'user'
        setAuthBusy(false)
        setAuthError(
          `This email is already registered as a ${ut}. Sign in with that account or use a different email.`,
        )
        return
      }

      const data = await registerUser(registerValues)

      if (!data?.success || !data?.data?.accessToken) {
        setAuthError(data?.message || 'Registration failed. Please try again.')
        return
      }

      const nextSession = createConnectedSession(data, registerValues)

      if (nextSession.role === 'doctor') {
        try {
          await completeDoctorRegistration(nextSession.token)
          setAuthMessage('Doctor account created and verification documents were sent to admin review.')
        } catch (doctorSetupError) {
          setAuthError(
            `Doctor account was created, but the verification package could not be submitted: ${doctorSetupError.message}`,
          )
        }
      } else {
        setAuthMessage(data.message || 'Account created and signed in successfully.')
      }

      persistSession(nextSession)
      setSession(nextSession)
      navigateTo(getRouteForRole(registerValues.userType))
    } catch (error) {
      setAuthError(error.message || 'Registration failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleAnalyze = async (event) => {
    event.preventDefault()
    setAnalysisLoading(true)
    setAnalysisError('')

    try {
      const data = await analyzeSymptoms({
        symptoms,
        sessionSymptoms: [],
      })

      setAnalysis(data.data)
      await loadHistory()
    } catch (error) {
      setAnalysisError(error.message)
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleSignOut = () => {
    const wasDoctor = session?.role === 'doctor'
    clearPersistedAuth()
    setSession(null)
    setAuthMessage('You have been signed out.')
    setAuthError('')
    navigateTo(wasDoctor ? '/login' : '/')
  }

  const renderLoginPage = () => (
    <LoginForm
      values={loginValues}
      onChange={handleLoginChange}
      onSubmit={handleLogin}
      loading={authBusy}
      roleHint={loginValues.role}
      roleLabel="Sign in as"
      navigateTo={navigateTo}
      bannerError={authError}
      bannerMessage={authMessage}
    />
  )

  const renderRegisterPage = () => (
    <RegisterForm
      values={registerValues}
      onChange={handleRegisterChange}
      onFileChange={handleRegisterFileChange}
      onSubmit={handleRegister}
      loading={authBusy}
      navigateTo={navigateTo}
      bannerError={authError}
      bannerMessage={authMessage}
      emailAvailabilityMessage={registerEmailHint}
      emailChecking={registerEmailChecking}
    />
  )

  const renderPatientPage = () => (
    <PatientDashboard
      currentPath={currentPath}
      activeRole={activeRole}
      session={session}
      history={history}
      doctorDirectory={doctorDirectory}
      gatewayHealth={gatewayHealth}
      topCondition={topCondition}
      onSignOut={handleSignOut}
      onRequireLogin={navigateTo}
      onNavigate={navigateTo}
    />
  )

  const renderDoctorDashboardPage = () => (
    <DoctorDashboard
      currentPath={currentPath}
      session={session}
      onSignOut={handleSignOut}
      onRequireLogin={navigateTo}
      onNavigate={navigateTo}
    />
  )

  const renderDoctorRoutePage = (RoutePage) => {
    const Component = RoutePage

    return (
      <Component
        currentPath={currentPath}
        session={session}
        onSignOut={handleSignOut}
        onRequireLogin={navigateTo}
        onNavigate={navigateTo}
      />
    )
  }

  const renderAdminRoutePage = (RoutePage) => {
  const Component = RoutePage

  return (
    <AdminPortalPage
      session={session}
      currentPath={currentPath === '/admin' ? '/admin/dashboard' : currentPath}
      onNavigate={navigateTo}
      onRequireLogin={navigateTo}
      onSignOut={handleSignOut}
    >
      <Component
        session={session}
        currentPath={currentPath}
        onNavigate={navigateTo}
        onRequireLogin={navigateTo}
        onSignOut={handleSignOut}
      />
    </AdminPortalPage>
  )
}

  const renderPatientRoutePage = (RoutePage, extraProps = {}) => {
    const Component = RoutePage

    return (
      <Component
        currentPath={currentPath}
        activeRole={activeRole}
        session={session}
        history={history}
        doctorDirectory={doctorDirectory}
        gatewayHealth={gatewayHealth}
        topCondition={topCondition}
        onSignOut={handleSignOut}
        onRequireLogin={navigateTo}
        onNavigate={navigateTo}
        analysis={analysis}
        symptoms={symptoms}
        analysisLoading={analysisLoading}
        historyLoading={historyLoading}
        analysisError={analysisError}
        onSymptomsChange={setSymptoms}
        onAnalyze={handleAnalyze}
        onRefreshHistory={loadHistory}
        {...extraProps}
      />
    )
  }

  const renderDoctorsPage = () => (
    <section className="public-doctors-page">
      <div className="public-doctors-shell">
        <section className="public-doctors-hero">
          <div className="public-doctors-hero-copy">
            <p className="public-doctors-kicker">Doctor directory</p>
            <h1>Find verified specialists with a cleaner, faster booking path.</h1>
            <p>
              Explore approved doctors across the platform, search by name or specialty, and move
              into booking from a discovery surface that matches the rest of Arogya.
            </p>
          </div>

          <div className="public-doctors-hero-stats">
            <article className="public-doctors-stat-card">
              <span>Listed doctors</span>
              <strong>{doctorDirectory.length}</strong>
            </article>
            <article className="public-doctors-stat-card">
              <span>Visible now</span>
              <strong>{filteredPublicDoctors.length}</strong>
            </article>
            <article className="public-doctors-stat-card">
              <span>Verified</span>
              <strong>
                {
                  doctorDirectory.filter(
                    (doctor) => doctor.verification_status === 'approved',
                  ).length
                }
              </strong>
            </article>
          </div>
        </section>

        <section className="public-doctors-toolbar">
          <label className="public-doctors-search">
            <span>Search doctors</span>
            <input
              type="text"
              value={doctorSearch}
              onChange={(event) => setDoctorSearch(event.target.value)}
              placeholder="Search by doctor name or specialization..."
            />
          </label>

          <label className="public-doctors-filter">
            <span>Specialty</span>
            <select
              value={doctorSpecialtyFilter}
              onChange={(event) => setDoctorSpecialtyFilter(event.target.value)}
            >
              {doctorSpecialtyOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All specialties' : option}
                </option>
              ))}
            </select>
          </label>
        </section>

        {directoryState === 'loading' ? (
          <section className="public-doctors-empty">
            <strong>Loading doctors...</strong>
            <p>The live directory is being prepared now.</p>
          </section>
        ) : null}

        {directoryState === 'error' ? (
          <section className="public-doctors-empty">
            <strong>Doctor directory is not available yet.</strong>
            <p>Please try again in a moment while the service reconnects.</p>
          </section>
        ) : null}

        {directoryState === 'success' && doctorDirectory.length === 0 ? (
          <section className="public-doctors-empty">
            <strong>No approved doctors are available yet.</strong>
            <p>Once doctors complete verification, they will appear here automatically.</p>
          </section>
        ) : null}

        {directoryState === 'success' && doctorDirectory.length > 0 && filteredPublicDoctors.length === 0 ? (
          <section className="public-doctors-empty">
            <strong>No doctors match this search.</strong>
            <p>Try a broader search or switch the specialty filter back to all.</p>
          </section>
        ) : null}

        {directoryState === 'success' && filteredPublicDoctors.length > 0 ? (
          <section className="public-doctors-results">
            <div className="public-doctors-results-topline">
              <div>
                <p className="public-doctors-kicker">Available doctors</p>
                <h2>Browse approved doctors and move into booking.</h2>
              </div>
              <span className="public-doctors-results-count">{filteredPublicDoctors.length} results</span>
            </div>

            <div className="public-doctors-grid">
              {filteredPublicDoctors.map((doctor) => (
                <article key={doctor.doctor_id} className="public-doctor-card">
                  <div className="public-doctor-card-head">
                    <div className="public-doctor-avatar">
                      <span>
                        {String(doctor.name || 'Doctor')
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>

                    <div className="public-doctor-head-copy">
                      <strong>{doctor.name || 'Doctor'}</strong>
                      <span>{doctor.specialization || 'General Practice'}</span>
                    </div>
                  </div>

                  <div className="public-doctor-card-topline">
                    <StatusPill
                      status={doctor.verification_status === 'approved' ? 'ok' : 'warn'}
                      label={doctor.verification_status === 'approved' ? 'Verified Doctor' : 'Unverified'}
                    />
                    <span className="public-doctor-id">ID {doctor.doctor_id}</span>
                  </div>

                  <p className="public-doctor-card-copy">
                    Approved doctors can be selected immediately in the patient booking flow.
                  </p>

                  <div className="public-doctor-meta-grid">
                    <article className="public-doctor-meta-card">
                      <span>Consultation fee</span>
                      <strong>{doctor.consultation_fee ?? 'N/A'}</strong>
                    </article>
                    <article className="public-doctor-meta-card">
                      <span>Specialty</span>
                      <strong>{doctor.specialization || 'General Practice'}</strong>
                    </article>
                  </div>

                  <div className="public-doctor-card-footer">
                    <button
                      type="button"
                      className="public-doctor-button"
                      onClick={() => navigateTo('/login')}
                    >
                      Book appointment
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  )

  const renderAiPage = () => (
    <AiSymptomWorkspace
      session={session}
      history={history}
      analysis={analysis}
      topCondition={topCondition}
      symptoms={symptoms}
      analysisLoading={analysisLoading}
      historyLoading={historyLoading}
      analysisError={analysisError}
      onSymptomsChange={setSymptoms}
      onAnalyze={handleAnalyze}
      onRefreshHistory={loadHistory}
      onNavigate={navigateTo}
    />
  )

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/login':
        return renderLoginPage()
      case '/register':
        return renderRegisterPage()
      case '/doctor/dashboard':
        return renderDoctorDashboardPage()
      case '/doctor/appointments':
        return renderDoctorRoutePage(DoctorAppointmentsPage)
      case '/doctor/schedule':
        return renderDoctorRoutePage(DoctorSchedulePage)
      case '/doctor/patients':
        return renderDoctorRoutePage(DoctorPatientsPage)
      case '/doctor/consultations':
        return renderDoctorRoutePage(DoctorConsultationsPage)
      case '/doctor/prescriptions':
        return renderDoctorRoutePage(DoctorPrescriptionsPage)
      case '/doctor/verification':
        return renderDoctorRoutePage(DoctorVerificationPage)
      case '/doctor/profile':
        return renderDoctorRoutePage(DoctorProfilePage)
      case '/admin':
      case '/admin/dashboard':
        return renderAdminRoutePage(AdminDashboard)
      case '/admin/users':
        return renderAdminRoutePage(AdminUsersPage)
      case '/admin/doctors':
        return renderAdminRoutePage(AdminDoctorsPage)
      case '/admin/appointments':
        return renderAdminRoutePage(AdminAppointmentsPage)
      case '/admin/settings':
        return renderAdminRoutePage(AdminSettingsPage)
      case '/patient':
        return renderPatientPage()
      case '/patient/book-appointment':
        return renderPatientRoutePage(PatientBookAppointmentPage)
      case '/patient/my-bookings':
        return renderPatientRoutePage(PatientMyBookingsPage)
      case '/patient/payment':
        return renderPatientRoutePage(PatientPaymentPage)
      case '/patient/doctors':
        return renderPatientRoutePage(PatientDoctorsPage)
      case '/patient/ai-symptoms':
      case '/patient/symptom-history':
        return renderPatientRoutePage(PatientSymptomHistoryPage)
      case '/patient/profile':
        return renderPatientRoutePage(PatientProfilePage)
      case '/doctor':
        return session?.role === 'doctor' ? renderDoctorDashboardPage() : renderLoginPage()
      case '/doctors':
        return renderDoctorsPage()
      case '/ai-symptoms':
        return renderAiPage()
      case '/Home':
      case '/':
      default:
        return (
          <Home
            session={session}
            activeRole={activeRole}
            apiBaseUrl={apiBaseUrl}
            gatewayHealth={gatewayHealth}
            serviceHealthy={serviceHealthy}
            quickStats={quickStats}
            doctorDirectory={doctorDirectory}
            navigateTo={navigateTo}
            getRouteForRole={getRouteForRole}
          />
        )
    }
  }

  return (
    <div
      className={`app-shell ${isDoctorPortalRoute ? 'doctor-route-shell' : ''} ${
        isPatientPortalRoute ? 'patient-route-shell' : ''
      } ${isAdminPortalRoute ? 'admin-route-shell' : ''} ${
        isPublicDoctorsRoute ? 'public-directory-shell' : ''
      } ${
        isAuthRoute ? 'app-shell--auth' : ''
      } ${isHomeRoute ? 'home-route-shell' : ''
      }`.trim()}
    >
      {renderCurrentPage()}
    </div>
  )
}
