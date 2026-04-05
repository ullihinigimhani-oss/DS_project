import { useEffect, useMemo, useState } from 'react'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import SectionCard from './components/SectionCard'
import StatusPill from './components/StatusPill'
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
    subtitle: 'Symptom checks, booking, prescriptions, and records will center here.',
  },
  doctor: {
    title: 'Doctor workspace',
    subtitle: 'Schedule, verification, prescriptions, and profile editing will sit here.',
  },
  admin: {
    title: 'Admin workspace',
    subtitle: 'Audit views, user management, and platform operations will plug in here.',
  },
}

const previewCards = [
  {
    title: 'Appointments',
    description: 'Will connect to booking and availability once the auth-protected patient flow is ready.',
    status: 'Queued',
  },
  {
    title: 'Medical records',
    description: 'Prepared for upload, listing, and document review after patient-service screens land.',
    status: 'Upcoming',
  },
  {
    title: 'Payments',
    description: 'Checkout, receipts, and billing state will follow once the payment UX branch starts.',
    status: 'Queued',
  },
]

function createPreviewSession(base) {
  return {
    name: base.name || base.email?.split('@')[0] || 'Preview user',
    email: base.email || 'preview@health.local',
    role: base.userType || base.role || 'patient',
    mode: 'preview',
    token: null,
  }
}

const roadmapCards = [
  {
    title: 'Auth journeys',
    description: 'Login, registration, and role-aware navigation will plug in next.',
    label: 'Queued',
  },
  {
    title: 'Appointments',
    description: 'Booking and availability flows will sit on top of doctor schedules.',
    label: 'Queued',
  },
  {
    title: 'Telemedicine',
    description: 'Video sessions and live consult handoff will arrive after auth routes settle.',
    label: 'Upcoming',
  },
  {
    title: 'Payments',
    description: 'Checkout, billing state, and receipts are waiting for final payment wiring.',
    label: 'Upcoming',
  },
  {
    title: 'Notifications',
    description: 'Bell states, reminders, and patient nudges will connect once events stabilize.',
    label: 'Queued',
  },
  {
    title: 'Medical records',
    description: 'Patient-owned records and uploads will land in the next frontend pass.',
    label: 'Planned',
  },
]

export default function App() {
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
  const [authTab, setAuthTab] = useState('login')
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

  const topCondition = analysis?.possibleConditions?.[0] || null
  const serviceHealthy = gatewayHealth?.status === 'running'
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
      {
        label: 'Analysis records',
        value: String(history.length),
      },
      {
        label: 'Foundation mode',
        value: 'Live integrations only',
      },
    ]
  }, [doctorDirectory.length, history.length])

  const liveModules = [
    {
      title: 'Gateway',
      value: gatewayHealth?.status || 'checking',
      detail: gatewayHealth?.timestamp || 'Waiting for gateway response',
      status: serviceHealthy ? 'ok' : 'warn',
    },
    {
      title: 'Doctor directory',
      value: `${doctorDirectory.length} listed`,
      detail: 'Public doctor profiles from doctor-service',
      status: directoryState === 'success' ? 'ok' : directoryState === 'error' ? 'warn' : 'pending',
    },
    {
      title: 'AI triage',
      value: topCondition?.name || 'Ready',
      detail: topCondition
        ? `${topCondition.confidencePercent}% confidence from ai-symptom-service`
        : 'Submit symptoms to generate a triage result',
      status: analysis ? 'ok' : 'pending',
    },
    {
      title: 'History sync',
      value: `${history.length} saved`,
      detail: 'Persisted symptom analyses from PostgreSQL',
      status: history.length > 0 ? 'ok' : historyLoading ? 'pending' : 'warn',
    },
  ]

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
      } catch (error) {
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
    } catch (error) {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(defaultUserId)
  }, [])

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

      if (data?.success && data?.data?.token) {
        setSession({
          name: data.data.name || loginValues.email,
          email: data.data.email || loginValues.email,
          role: data.data.userType || loginValues.role,
          mode: 'connected',
          token: data.data.token,
        })
        setAuthMessage('Signed in successfully.')
      } else {
        const preview = createPreviewSession(loginValues)
        setSession(preview)
        setAuthMessage(data.message || 'Auth backend is still pending, so preview mode was enabled.')
      }
    } catch (error) {
      const preview = createPreviewSession(loginValues)
      setSession(preview)
      setAuthError('Auth API is not fully ready yet. Preview mode was enabled instead.')
      setAuthMessage(error.message)
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

      if (data?.success && data?.data) {
        const nextSession = createPreviewSession(registerValues)
        setSession(nextSession)
        setAuthMessage(data.message || 'Account shell created. Preview mode enabled.')
      } else {
        const preview = createPreviewSession(registerValues)
        setSession(preview)
        setAuthMessage(data.message || 'Registration shell saved in preview mode.')
      }
    } catch (error) {
      const preview = createPreviewSession(registerValues)
      setSession(preview)
      setAuthError('Registration backend is not ready yet. Preview mode was enabled instead.')
      setAuthMessage(error.message)
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
  }

  return (
    <div className="app-shell">
      <header className="hero auth-hero">
        <div className="hero-copy">
          <p className="eyebrow">Frontend Auth Shell</p>
          <h1>Role-aware entry flow for the platform while full authentication is still being wired.</h1>
          <p className="hero-text">
            This branch adds login and registration shells, stores preview auth state locally,
            and gives patient, doctor, and admin users a cleaner landing experience without
            blocking the already live doctor and AI modules.
          </p>
          <div className="hero-actions">
            <StatusPill
              status={serviceHealthy ? 'ok' : 'warn'}
              label={serviceHealthy ? 'Gateway online' : 'Gateway needs attention'}
            />
            <StatusPill status="pending" label="Frontend foundation branch" />
            <span className="subtle-text">{apiBaseUrl}</span>
          </div>
          <div className="hero-note">
            <strong>Current focus:</strong> polished shell, live doctor browsing, AI triage,
            and clean placeholders for the next service waves.
          </div>
        </div>
        <div className="stats-grid">
          {quickStats.map((item) => (
            <div key={item.label} className="stat-card panel">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <main className="content-grid auth-layout">
        <SectionCard
          title="Access Portal"
          subtitle="Connected to the gateway auth routes now, with preview mode standing in until full auth is ready."
        >
          <div className="auth-tabs">
            <button
              type="button"
              className={`tab-button ${authTab === 'login' ? 'active' : ''}`}
              onClick={() => setAuthTab('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`tab-button ${authTab === 'register' ? 'active' : ''}`}
              onClick={() => setAuthTab('register')}
            >
              Create account
            </button>
          </div>

          {authTab === 'login' ? (
            <LoginForm
              values={loginValues}
              onChange={handleLoginChange}
              onSubmit={handleLogin}
              loading={authBusy}
              roleHint={loginValues.role}
            />
          ) : (
            <RegisterForm
              values={registerValues}
              onChange={handleRegisterChange}
              onSubmit={handleRegister}
              loading={authBusy}
            />
          )}

          {authError ? <p className="error-text">{authError}</p> : null}
          {authMessage ? <p className="empty-state">{authMessage}</p> : null}
        </SectionCard>

        <SectionCard
          title="Session Shell"
          subtitle="A persisted frontend session so you can design role-specific spaces before the final backend auth flow arrives."
        >
          {session ? (
            <div className="session-shell">
              <div className="session-header">
                <div>
                  <h3>{session.name}</h3>
                  <p>{session.email}</p>
                </div>
                <StatusPill
                  status={session.mode === 'connected' ? 'ok' : 'warn'}
                  label={session.mode === 'connected' ? 'Connected session' : 'Preview session'}
                />
              </div>

              <div className="role-summary">
                <strong>{roleSummary.title}</strong>
                <p>{roleSummary.subtitle}</p>
              </div>

              <div className="role-chip-row">
                {Object.keys(roleSummaries).map((role) => (
                  <span
                    key={role}
                    className={`inline-role ${role === activeRole ? 'active' : ''}`}
                  >
                    {role}
                  </span>
                ))}
              </div>

              <button type="button" className="secondary-button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="session-shell empty-shell">
              <strong>No active session yet</strong>
              <p>
                Sign in or register to start a role preview. The UI will keep working even if the
                auth service only returns placeholder responses for now.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Role Readiness"
          subtitle="This branch focuses on the auth entry shell and the role-specific frontend landing idea."
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

        <SectionCard
          title="Doctor Directory"
          subtitle="Approved doctor profiles from doctor-service, presented as the first live discovery surface."
          subtitle="Still live and available from the foundation branch, now sitting below the auth shell."
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

        <SectionCard
          title="AI Triage Workspace"
          subtitle="A clean foundation for symptom-driven triage while richer patient workflows are still on the way."
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

              {analysis.consultationAdvice ? (
                <div className="consult-box">
                  <strong>{analysis.consultationAdvice.message}</strong>
                  <span>Risk score: {analysis.consultationAdvice.risk}</span>
                </div>
              ) : null}

              {analysis.matchedDiseaseSymptoms?.length ? (
                <div className="matched-symptoms">
                  <span className="list-label">Matched disease symptom set</span>
                  <div className="chip-group compact">
                    {analysis.matchedDiseaseSymptoms.map((symptom) => (
                      <span key={symptom} className="chip chip-muted">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="conditions-list">
                {(analysis.possibleConditions || []).map((condition) => (
                  <div key={condition.name} className="condition-row">
                    <span>{condition.name}</span>
                    <strong>{condition.confidencePercent}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Analysis Timeline"
          subtitle="Recent symptom analyses already saved by the AI service, ready to evolve into a patient journey view."
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
      </main>

      <section className="roadmap-section">
        <div className="roadmap-heading">
          <p className="eyebrow">Next Surface Areas</p>
          <h2>Planned frontend modules while the remaining services settle.</h2>
          <p>
            These cards keep the structure intentional now, so the next branches can slot in
            without redesigning the whole app shell again.
          </p>
        </div>
        <div className="roadmap-grid">
          {roadmapCards.map((card) => (
            <article key={card.title} className="roadmap-card panel">
              <div className="roadmap-topline">
                <h3>{card.title}</h3>
                <StatusPill status="pending" label={card.label} />
              </div>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
