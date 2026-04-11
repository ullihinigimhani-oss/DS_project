import { useEffect, useMemo, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import SectionCard from './components/SectionCard'
import StatusPill from './components/StatusPill'
import Home from './components/Home'
import DoctorDashboard from './components/dashboards/DoctorDashboard'
import PatientDashboard from './components/dashboards/PatientDashboard'
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
import PatientSymptomHistoryPage from './pages/patient/SymptomHistory'
import PatientProfilePage from './pages/patient/Profile'
import { loginUser, registerUser } from './utils/authService'
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
const defaultUserId = 'patient-001'
const sessionStorageKey = 'healthcare-auth-shell-session'
const authTokenStorageKey = 'token'

const roleSummaries = {
  patient: {
    title: 'Patient workspace',
    subtitle: 'Symptom checks, care guidance, and doctor discovery are centered here now.',
  },
  doctor: {
    title: 'Doctor workspace',
    subtitle: 'Schedule, verification, prescriptions, and profile editing will sit here next.',
  },
  admin: {
    title: 'Admin workspace',
    subtitle: 'Audit views, user management, and platform operations will plug in here later.',
  },
}



function createPreviewSession(base) {
  return {
    userId: base.id || base.userId || base.user?.id || base.email?.split('@')[0] || null,
    name: base.name || base.email?.split('@')[0] || 'Preview user',
    email: base.email || 'preview@health.local',
    role: base.userType || base.role || 'patient',
    mode: 'preview',
    token: null,
  }
}

function getInitialPath() {
  const path = window.location.pathname || '/'
  return path === '' ? '/' : path
}

function getRouteForRole(role) {
  switch (role) {
    case 'doctor':
      return '/doctor/dashboard'
    case 'admin':
      return '/admin'
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
  const [userId, setUserId] = useState(defaultUserId)
  const [symptoms, setSymptoms] = useState(defaultSymptoms)
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState([])
  const [analysisError, setAnalysisError] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [session, setSession] = useState(null)
  const [loginValues, setLoginValues] = useState({
    email: 'patient@example.com',
    password: 'password123',
    role: 'patient',
  })
  const [registerValues, setRegisterValues] = useState({
    name: 'New User',
    email: 'newuser@example.com',
    phone: '',
    password: 'password123',
    userType: 'patient',
    licenseDocument: null,
    governmentIdDocument: null,
    credentialsDocument: null,
    insuranceDocument: null,
  })

  const serviceHealthy = gatewayHealth?.status === 'running'
  const isDoctorPortalRoute = currentPath.startsWith('/doctor/')
  const isPatientPortalRoute = currentPath.startsWith('/patient')
  const isAuthRoute = currentPath === '/login' || currentPath === '/register'
  const activeRole = session?.role || loginValues.role
  const roleSummary = roleSummaries[activeRole] || roleSummaries.patient
  const topCondition = analysis?.possibleConditions?.[0] || null

  const quickStats = useMemo(() => {
    return [
      {
        label: 'Gateway base',
        value: gatewayBaseUrl.replace('http://', ''),
      },
      {
        label: 'Auth mode',
        value: session?.mode === 'preview' ? 'Preview shell' : session ? 'Connected' : 'Signed out',
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

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(sessionStorageKey)
      if (saved) {
        const parsed = JSON.parse(saved)

        if (parsed?.mode === 'connected' && !parsed?.token) {
          clearPersistedAuth()
          setSession(null)
          return
        }

        if (parsed?.token) {
          window.localStorage.setItem(authTokenStorageKey, parsed.token)
        } else {
          window.localStorage.removeItem(authTokenStorageKey)
        }

        setSession(parsed)
      }
    } catch {
      // Ignore bad local data and continue with a clean session.
      clearPersistedAuth()
    }
  }, [])

  useEffect(() => {
    persistSession(session)
  }, [session])

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

  const loadHistory = async (nextUserId = userId) => {
    setHistoryLoading(true)
    try {
      const data = await fetchAnalysisHistory(nextUserId)
      setHistory(Array.isArray(data.data) ? data.data : [])
    } catch (_error) {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(defaultUserId)
  }, [])

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

      if (data?.success && data?.data?.accessToken) {
        const nextSession = createConnectedSession(data, loginValues)
        persistSession(nextSession)
        setSession(nextSession)
        setAuthMessage('Signed in successfully.')
      } else {
        const preview = createPreviewSession(loginValues)
        persistSession(preview)
        setSession(preview)
        setAuthMessage(data.message || 'Auth backend is still pending, so preview mode was enabled.')
      }

      navigateTo(getRouteForRole(loginValues.role))
    } catch (error) {
      const preview = createPreviewSession(loginValues)
      persistSession(preview)
      setSession(preview)
      setAuthError('Auth API is not fully ready yet. Preview mode was enabled instead.')
      setAuthMessage(error.message)
      navigateTo(getRouteForRole(loginValues.role))
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

    if (registerValues.userType === 'doctor') {
      const missingDocuments = getDoctorRegistrationDocuments().filter((document) => !document.file)

      if (missingDocuments.length > 0) {
        setAuthBusy(false)
        setAuthError('Doctor registration requires all four verification documents before account creation.')
        return
      }
    }

    try {
      const data = await registerUser(registerValues)

      if (data?.success && data?.data?.accessToken) {
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
      } else {
        const preview = createPreviewSession(registerValues)
        persistSession(preview)
        setSession(preview)
        setAuthMessage(data.message || 'Registration shell saved in preview mode.')
      }

      navigateTo(getRouteForRole(registerValues.userType))
    } catch (error) {
      const preview = createPreviewSession(registerValues)
      persistSession(preview)
      setSession(preview)
      setAuthError('Registration backend is not ready yet. Preview mode was enabled instead.')
      setAuthMessage(error.message)
      navigateTo(getRouteForRole(registerValues.userType))
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
        userId,
        symptoms,
        sessionSymptoms: [],
      })

      setAnalysis(data.data)
      await loadHistory(userId)
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
    setAuthMessage(wasDoctor ? 'Doctor session signed out.' : 'You have left preview mode.')
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

  const renderPatientRoutePage = (RoutePage) => {
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
      />
    )
  }

  const renderDoctorsPage = () => (
    <SectionCard
      title="Doctor Directory"
      subtitle="Approved doctor profiles from doctor-service, presented as the live discovery surface for the patient journey."
    >
      {directoryState === 'loading' ? <p className="empty-state">Loading doctors...</p> : null}
      {directoryState === 'error' ? (
        <p className="empty-state">Doctor directory is not available yet.</p>
      ) : null}
      {directoryState === 'success' && doctorDirectory.length === 0 ? (
        <p className="empty-state">No approved doctors are available yet.</p>
      ) : null}

      <div className="doctor-list">
        {doctorDirectory.map((doctor) => (
          <article key={doctor.doctor_id} className="doctor-card">
            <div className="doctor-topline">
              <StatusPill
                status={doctor.verification_status === 'approved' ? 'ok' : 'warn'}
                label={doctor.verification_status === 'approved' ? 'Verified Doctor' : 'Unverified'}
              />
              <span className="doctor-id">{doctor.doctor_id}</span>
            </div>
            <div>
              <h3>{doctor.name || 'Doctor'}</h3>
              <p>{doctor.specialization || 'General Practice'}</p>
            </div>
            <div className="doctor-meta">
              <span>Consultation fee</span>
              <strong>{doctor.consultation_fee ?? 'N/A'}</strong>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  )

  const renderAiPage = () => (
    <div className="page-stack">
      <SectionCard
        title="AI Symptom Analyzer"
        subtitle="A live symptom triage screen that feeds directly into the patient journey."
      >
        <form className="analysis-form" onSubmit={handleAnalyze}>
          <label>
            User ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
          <label>
            Symptoms
            <textarea
              rows="5"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={analysisLoading}>
              {analysisLoading ? 'Analyzing...' : 'Analyze symptoms'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => loadHistory(userId)}
              disabled={historyLoading}
            >
              {historyLoading ? 'Refreshing...' : 'Refresh history'}
            </button>
          </div>
        </form>

        {analysisError ? <p className="error-text">{analysisError}</p> : null}

        {analysis ? (
          <div className="analysis-result">
            <div className="result-banner">
              <strong>{topCondition?.name || 'No diagnosis'}</strong>
              <span>
                Confidence: {analysis.confidence ? `${Math.round(analysis.confidence * 100)}%` : '0%'}
              </span>
            </div>
            <p>{analysis.recommendation}</p>

            <div className="chip-group">
              {(analysis.detectedSymptoms || []).map((symptom) => (
                <span key={symptom} className="chip">
                  {symptom}
                </span>
              ))}
            </div>

            {(analysis.possibleConditions || []).length ? (
              <div className="conditions-list">
                {analysis.possibleConditions.map((condition) => (
                  <div key={condition.name} className="condition-row">
                    <span>{condition.name}</span>
                    <strong>{condition.confidencePercent}%</strong>
                  </div>
                ))}
              </div>
            ) : null}

            {analysis.consultationAdvice ? (
              <div className="consult-box">
                <strong>{analysis.consultationAdvice.message}</strong>
                <span>Risk score: {analysis.consultationAdvice.risk}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Analysis History"
        subtitle="Recent AI analyses stay visible so this route can evolve into a fuller care timeline."
      >
        {historyLoading ? <p className="empty-state">Loading history...</p> : null}
        {!historyLoading && history.length === 0 ? (
          <p className="empty-state">No history for this user yet.</p>
        ) : null}

        <div className="history-list">
          {history.map((item) => (
            <article key={item.id} className="history-card">
              <div className="history-header">
                <strong>{item.user_id}</strong>
                <span>{new Date(item.analyzed_at).toLocaleString()}</span>
              </div>
              <p>{item.symptoms}</p>
              <div className="chip-group compact">
                {(item.detected_symptoms || []).map((symptom) => (
                  <span key={symptom} className="chip">
                    {symptom}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )

  const renderPlaceholderPage = () => (
    <SectionCard
      title={`${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Route Preview`}
      subtitle="This route is reserved so the next role-based frontend branches can land cleanly."
    >
      <div className="placeholder-page">
        <strong>{roleSummary.title}</strong>
        <p>{roleSummary.subtitle}</p>
      </div>
    </SectionCard>
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
      case '/patient':
        return renderPatientPage()
      case '/patient/book-appointment':
        return renderPatientRoutePage(PatientBookAppointmentPage)
      case '/patient/my-bookings':
        return renderPatientRoutePage(PatientMyBookingsPage)
      case '/patient/doctors':
        return renderPatientRoutePage(PatientDoctorsPage)
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
      case '/admin':
        return renderPlaceholderPage()
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
      } ${isAuthRoute ? 'app-shell--auth' : ''}`.trim()}
    >
      {renderCurrentPage()}
    </div>
  )
}
