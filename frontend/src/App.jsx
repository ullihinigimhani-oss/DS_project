import { useEffect, useMemo, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import SectionCard from './components/SectionCard'
import StatusPill from './components/StatusPill'
import DoctorDashboard from './components/dashboards/DoctorDashboard'
import PatientDashboard from './components/dashboards/PatientDashboard'
import { loginUser, registerUser } from './utils/authService'
import {
  analyzeSymptoms,
  apiBaseUrl,
  fetchAnalysisHistory,
  fetchGatewayHealth,
  fetchPublicDoctors,
  gatewayBaseUrl,
} from './utils/api'
import './App.css'

const defaultSymptoms = 'I have fever, cough, headache and runny nose'
const defaultUserId = 'patient-001'
const sessionStorageKey = 'healthcare-auth-shell-session'

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

const roleLinks = [
  { label: 'Home', path: '/' },
  { label: 'Login', path: '/login' },
  { label: 'Register', path: '/register' },
  { label: 'Patient', path: '/patient' },
  { label: 'Doctor', path: '/doctor' },
  { label: 'Doctors', path: '/doctors' },
  { label: 'AI Symptoms', path: '/ai-symptoms' },
]

const previewCards = [
  {
    title: 'Appointments',
    description: 'Booking and availability will plug into the patient journey once the appointment UX branch begins.',
    status: 'Queued',
  },
  {
    title: 'Medical records',
    description: 'Upload, document review, and patient record surfacing are staged for the next pass.',
    status: 'Upcoming',
  },
  {
    title: 'Payments',
    description: 'Billing, receipts, and checkout state will land after the care flow is settled.',
    status: 'Queued',
  },
]

const roadmapCards = [
  {
    title: 'Appointment booking',
    description: 'Connect patient dashboard actions to real booking routes and time-slot discovery.',
    label: 'Queued',
  },
  {
    title: 'Medical records',
    description: 'Bring upload and records browsing into the patient dashboard without breaking the current shell.',
    label: 'Upcoming',
  },
  {
    title: 'Payments and receipts',
    description: 'Finish the patient journey from symptom insight to booking and payment confirmation.',
    label: 'Planned',
  },
]

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
      return '/doctor'
    case 'admin':
      return '/admin'
    case 'patient':
    default:
      return '/patient'
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
  })

  const serviceHealthy = gatewayHealth?.status === 'running'
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
        setSession(JSON.parse(saved))
      }
    } catch {
      // Ignore bad local data and continue with a clean session.
    }
  }, [])

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
    } else {
      window.localStorage.removeItem(sessionStorageKey)
    }
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

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')

    try {
      const data = await loginUser(loginValues)

      if (data?.success && data?.data?.accessToken) {
        const user = data.data.user || {}
        setSession({
          userId: user.id || null,
          name: user.name || loginValues.email,
          email: user.email || loginValues.email,
          role: user.userType || loginValues.role,
          mode: 'connected',
          token: data.data.accessToken,
        })
        setAuthMessage('Signed in successfully.')
      } else {
        const preview = createPreviewSession(loginValues)
        setSession(preview)
        setAuthMessage(data.message || 'Auth backend is still pending, so preview mode was enabled.')
      }

      navigateTo(getRouteForRole(loginValues.role))
    } catch (error) {
      const preview = createPreviewSession(loginValues)
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

    try {
      const data = await registerUser(registerValues)

      if (data?.success && data?.data?.accessToken) {
        const user = data.data.user || {}
        const nextSession = {
          userId: user.id || null,
          name: user.name || registerValues.name,
          email: user.email || registerValues.email,
          role: user.userType || registerValues.userType,
          mode: 'connected',
          token: data.data.accessToken,
        }
        setSession(nextSession)
        setAuthMessage(data.message || 'Account created and signed in successfully.')
      } else {
        const preview = createPreviewSession(registerValues)
        setSession(preview)
        setAuthMessage(data.message || 'Registration shell saved in preview mode.')
      }

      navigateTo(getRouteForRole(registerValues.userType))
    } catch (error) {
      const preview = createPreviewSession(registerValues)
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
    setSession(null)
    setAuthMessage('You have left preview mode.')
    setAuthError('')
    navigateTo('/')
  }

  const renderHomePage = () => (
    <>
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Frontend Routing Shell</p>
          <h1>Separate frontend screens for patient care, auth, doctors, and AI triage.</h1>
          <p className="hero-text">
            The UI is now organized into proper routes instead of one long page. The connected
            modules already working today stay available through focused screens, while the
            remaining service journeys stay staged for later branches.
          </p>
          <div className="hero-actions">
            <StatusPill
              status={serviceHealthy ? 'ok' : 'warn'}
              label={serviceHealthy ? 'Gateway online' : 'Gateway needs attention'}
            />
            <StatusPill
              status={session ? 'ok' : 'warn'}
              label={session ? `${activeRole} shell active` : 'No active session'}
            />
            <span className="subtle-text">{apiBaseUrl}</span>
          </div>
          <div className="hero-note">
            <strong>Current focus:</strong> separate pages, cleaner navigation, and a patient-first
            route structure on top of the working backend integrations.
          </div>
        </div>

        <div className="stats-grid">
          {quickStats.map((item) => (
            <div key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <div className="route-grid">
        {roleLinks
          .filter((item) => item.path !== '/')
          .map((item) => (
            <button
              key={item.path}
              type="button"
              className="route-card"
              onClick={() => navigateTo(item.path)}
            >
              <strong>{item.label}</strong>
              <span>{item.path}</span>
            </button>
          ))}
      </div>

      <SectionCard
        title="Next Surface Areas"
        subtitle="These modules are staged cleanly now, so the next branches can deepen the experience without changing the routing shell."
      >
        <div className="preview-grid">
          {roadmapCards.map((card) => (
            <article key={card.title} className="preview-card">
              <div className="preview-card-top">
                <h3>{card.title}</h3>
                <StatusPill status="pending" label={card.label} />
              </div>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  )

  const renderLoginPage = () => (
    <SectionCard
      className="auth-page-card"
      title="Sign In"
      subtitle="Use preview auth to move into the patient route while backend auth keeps settling."
    >
      <LoginForm
        values={loginValues}
        onChange={handleLoginChange}
        onSubmit={handleLogin}
        loading={authBusy}
        roleHint={loginValues.role}
      />
      {authError ? <p className="error-text">{authError}</p> : null}
      {authMessage ? <p className="empty-state">{authMessage}</p> : null}
    </SectionCard>
  )

  const renderRegisterPage = () => (
    <SectionCard
      className="auth-page-card"
      title="Create Account"
      subtitle="Register into preview mode so the separate patient flow can already be explored."
    >
      <RegisterForm
        values={registerValues}
        onChange={handleRegisterChange}
        onSubmit={handleRegister}
        loading={authBusy}
      />
      {authError ? <p className="error-text">{authError}</p> : null}
      {authMessage ? <p className="empty-state">{authMessage}</p> : null}
    </SectionCard>
  )

  const renderPatientPage = () => (
    <div className="page-stack">
      <SectionCard
        title="Patient Dashboard"
        subtitle="A patient-centered route built on top of the services already live in your stack."
      >
        <PatientDashboard
          activeRole={activeRole}
          session={session}
          history={history}
          doctorDirectory={doctorDirectory}
          gatewayHealth={gatewayHealth}
          topCondition={topCondition}
        />
      </SectionCard>

      <SectionCard
        title="Role Readiness"
        subtitle="Patient is the primary focus here, while the remaining journeys are clearly staged."
      >
        <div className="preview-grid">
          {previewCards.map((card) => (
            <article key={card.title} className="preview-card">
              <div className="preview-card-top">
                <h3>{card.title}</h3>
                <StatusPill status="warn" label={card.status} />
              </div>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )

  const renderDoctorPage = () => (
    <div className="page-stack">
      <SectionCard
        title="Doctor Workspace"
        subtitle="A doctor-centered route for profile, schedule, verification, and prescription work."
      >
        <DoctorDashboard activeRole={activeRole} session={session} />
      </SectionCard>

      <SectionCard
        title="Doctor Readiness"
        subtitle="This branch focuses on the doctor side of the platform while keeping preview mode useful."
      >
        <div className="preview-grid">
          <article className="preview-card">
            <div className="preview-card-top">
              <h3>Profile and visibility</h3>
              <StatusPill status="ok" label="Connected" />
            </div>
            <p>Doctors can now shape their public profile and consultation setup from one route.</p>
          </article>
          <article className="preview-card">
            <div className="preview-card-top">
              <h3>Schedule and slots</h3>
              <StatusPill status="ok" label="Connected" />
            </div>
            <p>Recurring or reset schedules, slot creation, and availability toggles are wired in.</p>
          </article>
          <article className="preview-card">
            <div className="preview-card-top">
              <h3>Verification and prescriptions</h3>
              <StatusPill status="ok" label="Connected" />
            </div>
            <p>Doctors can track verification state and issue prescriptions from the same workspace.</p>
          </article>
        </div>
      </SectionCard>
    </div>
  )

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
              <StatusPill status="ok" label="Approved" />
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
      case '/patient':
        return renderPatientPage()
      case '/doctor':
        return renderDoctorPage()
      case '/doctors':
        return renderDoctorsPage()
      case '/ai-symptoms':
        return renderAiPage()
      case '/admin':
        return renderPlaceholderPage()
      case '/':
      default:
        return renderHomePage()
    }
  }

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <button type="button" className="brand-link" onClick={() => navigateTo('/')}>
          SmartCare Frontend
        </button>
        <div className="nav-links">
          {roleLinks.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`nav-link ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              {item.label}
            </button>
          ))}
          {session ? (
            <button type="button" className="nav-link" onClick={handleSignOut}>
              Sign out
            </button>
          ) : null}
        </div>
      </nav>

      {renderCurrentPage()}
    </div>
  )
}
