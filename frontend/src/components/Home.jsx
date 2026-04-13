import './Home.css'
import StatusPill from './StatusPill'

const prioritySpecialties = [
  { name: 'General Practice', note: 'Primary care and follow-up visits', count: 42, icon: 'GP' },
  { name: 'Cardiology', note: 'Chest pain, heart checks, hypertension', count: 18, icon: 'CV' },
  { name: 'Dermatology', note: 'Skin, hair, and allergy concerns', count: 24, icon: 'DR' },
  { name: 'Pediatrics', note: 'Child health, fever, and development', count: 15, icon: 'PD' },
  { name: 'Neurology', note: 'Headaches, nerves, and dizziness', count: 11, icon: 'NR' },
  { name: 'Orthopedics', note: 'Bones, joints, back pain, injuries', count: 20, icon: 'OR' },
]

const journeySteps = [
  {
    id: '01',
    title: 'Start with symptom guidance',
    description:
      'Describe what you feel in plain language and get a structured summary with care priority and recommended specialist guidance.',
    action: 'Open AI Symptom Checker',
    route: '/patient/ai-symptoms',
    icon: 'AI',
  },
  {
    id: '02',
    title: 'Choose a verified doctor',
    description:
      'Browse specialists, compare availability, and review live profile details before you commit to a booking.',
    action: 'Browse Doctors',
    route: '/doctors',
    icon: 'MD',
  },
  {
    id: '03',
    title: 'Book and continue care',
    description:
      'Book visits, track appointments, and keep prescriptions and follow-up history in one coordinated workspace.',
    action: 'Go to Login',
    route: '/login',
    icon: 'BK',
  },
]

const capabilityCards = [
  {
    title: 'Verified clinician network',
    body: 'Doctors are reviewed before they appear in the platform, so discovery feels trustworthy from the first click.',
    accent: 'trust',
    icon: 'VD',
  },
  {
    title: 'AI-assisted intake',
    body: 'Symptom guidance, urgency cues, and specialist matching help patients arrive better prepared for the real consultation.',
    accent: 'intelligence',
    icon: 'AI',
  },
  {
    title: 'Live operational flow',
    body: 'Appointments, patient dashboards, doctor workspaces, and admin tools are connected as one coherent system.',
    accent: 'operations',
    icon: 'OP',
  },
  {
    title: 'Designed for continuity',
    body: 'The experience supports ongoing care, not just one booking, with patient history and doctor workflows living together.',
    accent: 'continuity',
    icon: 'CC',
  },
]

const floatingSignals = [
  { label: 'Patient care journeys', value: 'Unified', icon: 'PJ' },
  { label: 'AI symptom guidance', value: 'Live', icon: 'AI' },
  { label: 'Verified doctor workflow', value: 'Ready', icon: 'VD' },
]

const accentClassMap = {
  trust: 'hp-tag--trust',
  intelligence: 'hp-tag--intelligence',
  operations: 'hp-tag--operations',
  continuity: 'hp-tag--continuity',
}

export default function Home({
  session,
  activeRole,
  apiBaseUrl,
  gatewayHealth,
  serviceHealthy,
  quickStats,
  doctorDirectory,
  navigateTo,
  getRouteForRole,
}) {
  const heroDoctorCount = doctorDirectory.length
  const workspaceRoute = session ? getRouteForRole(activeRole) : '/register'
  const gatewayStatusLabel = serviceHealthy ? 'Platform live' : 'Gateway needs review'

  return (
    <div className="hp">
      <div className="hp-atmosphere" aria-hidden="true">
        <div className="hp-orb hp-orb--left" />
        <div className="hp-orb hp-orb--right" />
        <div className="hp-grid" />
      </div>

      <nav className="hp-nav">
        <button type="button" className="hp-brand" onClick={() => navigateTo('/')}>
          <span className="hp-brand-mark">AR</span>
          <span className="hp-brand-copy">
            <strong>Arogya</strong>
            <span>Connected care platform</span>
          </span>
        </button>

        <div className="hp-nav-links">
          <button type="button" className="hp-nav-link" onClick={() => navigateTo('/')}>
            Home
          </button>
          <button type="button" className="hp-nav-link" onClick={() => navigateTo('/doctors')}>
            Doctors
          </button>
          <button type="button" className="hp-nav-link" onClick={() => navigateTo('/login')}>
            Sign in
          </button>
          <button type="button" className="hp-nav-cta" onClick={() => navigateTo(workspaceRoute)}>
            {session ? 'Open workspace' : 'Get started'}
          </button>
        </div>
      </nav>

      <main className="hp-main">
        <section className="hp-hero">
          <div className="hp-hero-copy">
            <div className="hp-kicker-row">
              <span className="hp-kicker">A modern digital care front door</span>
              <StatusPill status={serviceHealthy ? 'ok' : 'warn'} label={gatewayStatusLabel} />
            </div>

            <h1 className="hp-title">
              Coordinated healthcare
              <span>from symptom check to appointment.</span>
            </h1>

            <p className="hp-subtitle">
              Arogya brings together AI guidance, verified doctors, structured booking, and
              dedicated workspaces for patients, doctors, and admins in one polished system.
            </p>

            <div className="hp-hero-actions">
              <button type="button" className="hp-primary" onClick={() => navigateTo(workspaceRoute)}>
                {session ? 'Continue to my dashboard' : 'Start with your account'}
              </button>
              <button
                type="button"
                className="hp-secondary"
                onClick={() => navigateTo('/patient/ai-symptoms')}
              >
                Try AI symptom guidance
              </button>
            </div>

            <div className="hp-quick-metrics">
              {quickStats.map((item) => (
                <article key={item.label} className="hp-quick-metric">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="hp-hero-stage">
            <section className="hp-stage-panel hp-stage-panel--primary">
              <div className="hp-stage-topline">
                <span className="hp-stage-chip">Live platform snapshot</span>
                <span className="hp-stage-muted">{heroDoctorCount} approved doctors</span>
              </div>

              <div className="hp-stage-grid">
                <article className="hp-stage-card hp-stage-card--wide">
                  <div className="hp-card-head">
                    <span className="hp-card-icon">PT</span>
                    <p className="hp-stage-label">Patient journey</p>
                  </div>
                  <h2>AI guidance to booking</h2>
                  <p>
                    Symptom analysis can hand off directly into appointment booking with specialist
                    suggestions and preserved visit context.
                  </p>
                </article>

                <article className="hp-stage-card">
                  <div className="hp-card-head">
                    <span className="hp-card-icon">DR</span>
                    <p className="hp-stage-label">Doctor workspace</p>
                  </div>
                  <strong>Patients, appointments, prescriptions, schedule</strong>
                </article>

                <article className="hp-stage-card">
                  <div className="hp-card-head">
                    <span className="hp-card-icon">AD</span>
                    <p className="hp-stage-label">Admin control</p>
                  </div>
                  <strong>Verification, users, monitoring, operations</strong>
                </article>
              </div>

              <div className="hp-stage-footer">
                <span>API base</span>
                <code>{apiBaseUrl}</code>
              </div>
            </section>

            <div className="hp-floating-rail">
              {floatingSignals.map((signal) => (
                <article key={signal.label} className="hp-floating-card">
                  <div className="hp-card-head">
                    <span className="hp-card-icon">{signal.icon}</span>
                    <span>{signal.label}</span>
                  </div>
                  <strong>{signal.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="hp-band">
          <article className="hp-band-card">
            <span>Total doctors</span>
            <strong>{heroDoctorCount}</strong>
          </article>
          <article className="hp-band-card">
            <span>Gateway status</span>
            <strong>{gatewayHealth?.status || 'unknown'}</strong>
          </article>
          <article className="hp-band-card">
            <span>Current focus</span>
            <strong>{activeRole}</strong>
          </article>
          <article className="hp-band-card">
            <span>Active session</span>
            <strong>{session ? session.name : 'Guest mode'}</strong>
          </article>
        </section>

        <section className="hp-section hp-section--specialties">
          <div className="hp-section-heading">
            <div>
              <p className="hp-section-kicker">Discovery</p>
              <h2>Explore care by specialty</h2>
            </div>
            <p>
              Start with a specialty view, then move into doctor discovery, booking, and follow-up
              workflows without leaving the system.
            </p>
          </div>

          <div className="hp-specialty-grid">
            {prioritySpecialties.map((specialty) => (
              <button
                key={specialty.name}
                type="button"
                className="hp-specialty-card"
                onClick={() => navigateTo('/doctors')}
              >
                <div className="hp-card-head">
                  <span className="hp-card-icon">{specialty.icon}</span>
                  <span className="hp-card-micro">Specialty</span>
                </div>
                <div className="hp-specialty-topline">
                  <span>{specialty.name}</span>
                  <strong>{specialty.count}</strong>
                </div>
                <p>{specialty.note}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="hp-section hp-section--journey">
          <div className="hp-section-heading hp-section-heading--stack">
            <p className="hp-section-kicker">Core flow</p>
            <h2>How the platform moves people through care</h2>
          </div>

          <div className="hp-journey-grid">
            {journeySteps.map((step) => (
              <article key={step.id} className="hp-journey-card">
                <div className="hp-card-head">
                  <span className="hp-card-icon">{step.icon}</span>
                  <div className="hp-journey-step">{step.id}</div>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <button type="button" className="hp-inline-link" onClick={() => navigateTo(step.route)}>
                  {step.action}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="hp-section hp-section--capabilities">
          <div className="hp-section-heading">
            <div>
              <p className="hp-section-kicker">Why this system feels complete</p>
              <h2>Professional, structured, and ready for real workflows</h2>
            </div>
            <p>
              The landing page should reflect the same maturity as the dashboards behind it:
              layered, responsive, data-aware, and visually consistent across the whole product.
            </p>
          </div>

          <div className="hp-capability-grid">
            {capabilityCards.map((card) => (
              <article key={card.title} className="hp-capability-card">
                <div className="hp-card-head">
                  <span className="hp-card-icon">{card.icon}</span>
                  <span className={`hp-tag ${accentClassMap[card.accent]}`}>{card.accent}</span>
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="hp-cta">
          <div className="hp-cta-copy">
            <p className="hp-section-kicker">Ready to explore Arogya?</p>
            <h2>Enter the same platform from the role that matches your work.</h2>
            <p>
              Patients, doctors, and admins each get their own tailored workspace while sharing one
              consistent system language and experience.
            </p>
          </div>

          <div className="hp-cta-actions">
            <button type="button" className="hp-primary" onClick={() => navigateTo('/register')}>
              Create an account
            </button>
            <button type="button" className="hp-secondary" onClick={() => navigateTo('/login')}>
              Sign in now
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
