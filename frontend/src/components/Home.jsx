import './Home.css'
import SectionCard from './SectionCard'
import StatusPill from './StatusPill'

const homeNavigationCards = [
  {
    title: 'Patient Journey',
    path: '/patient',
    kicker: 'Care navigation',
    description: 'Move from symptom analysis to doctor discovery with a calmer, more guided patient flow.',
  },
  {
    title: 'Doctor Workspace',
    path: '/doctor/dashboard',
    kicker: 'Clinical operations',
    description: 'Open the doctor portal for schedule management, verification progress, and daily workbench views.',
  },
  {
    title: 'Doctor Directory',
    path: '/doctors',
    kicker: 'Trusted discovery',
    description: 'Browse approved doctor profiles that can feed directly into the booking and care journey.',
  },
  {
    title: 'Sign In',
    path: '/login',
    kicker: 'Connected access',
    description: 'Use the live auth shell to enter the right workspace with the role-aware session flow.',
  },
  {
    title: 'Create Account',
    path: '/register',
    kicker: 'New onboarding',
    description: 'Open the registration route and shape the first-time experience for new patients or staff.',
  },
  {
    title: 'AI Symptom Screen',
    path: '/ai-symptoms',
    kicker: 'Early insight',
    description: 'Run the current symptom analysis flow and review confidence, recommendations, and history.',
  },
]

const homeFeatureCards = [
  {
    title: 'Warm digital front door',
    eyebrow: 'Designed for reassurance',
    description: 'The landing experience now frames Arogya as a care product, not just a route shell, while still exposing the live systems underneath.',
  },
  {
    title: 'Real service connections',
    eyebrow: 'Built on what already works',
    description: 'Gateway health, doctor discovery, role-based auth, and symptom analysis stay visible so the design remains honest about the current stack.',
  },
  {
    title: 'Clear role-based movement',
    eyebrow: 'Built for expansion',
    description: 'Each role has a visible starting point, which makes it easier to deepen patient, doctor, and admin journeys in separate branches later.',
  },
]

const homeJourneyCards = [
  {
    step: '01',
    title: 'Start with symptoms',
    description: 'Patients can describe what they feel in plain language and receive structured guidance quickly.',
  },
  {
    step: '02',
    title: 'Find the right doctor',
    description: 'Approved doctor profiles stay close to the patient flow so discovery feels like the next obvious step.',
  },
  {
    step: '03',
    title: 'Coordinate the next visit',
    description: 'Scheduling, records, and payments are staged to turn this shell into a full care journey without redesigning it again.',
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

const badgeVariant = {
  Queued: 'badge-queued',
  Upcoming: 'badge-upcoming',
  Planned: 'badge-planned',
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
  return (
    <div className="home-page">
      <header className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker">Connected Care Experience</p>
          <h1 className="home-title">
            Make healthcare feel <em>calm,</em> guided, and trustworthy.
          </h1>
          <p className="home-body">
            Arogya connects patients, doctors, and operations teams with a clear path into the
            product while keeping live gateway integrations visible and honest.
          </p>
          <div className="home-hero-actions">
            <button
              type="button"
              className="home-btn-primary"
              onClick={() => navigateTo(session ? getRouteForRole(activeRole) : '/login')}
            >
              {session ? 'Open my workspace' : 'Explore the platform'}
            </button>
            <button
              type="button"
              className="home-btn-secondary"
              onClick={() => navigateTo('/doctors')}
            >
              Browse doctors
            </button>
          </div>
          <div className="home-status-row">
            <StatusPill
              status={serviceHealthy ? 'ok' : 'warn'}
              label={serviceHealthy ? 'Gateway online' : 'Gateway needs attention'}
            />
            <StatusPill
              status={session ? 'ok' : 'warn'}
              label={session ? `${activeRole} shell active` : 'No active session'}
            />
            <span className="home-api-url">{apiBaseUrl}</span>
          </div>
          <div className="home-trust-row">
            <div className="home-trust-card">
              <span>Live doctor directory</span>
              <strong>{doctorDirectory.length} approved profiles ready for discovery</strong>
            </div>
            <div className="home-trust-card">
              <span>Role-first navigation</span>
              <strong>Patient, doctor, auth, and AI surfaces are separated cleanly</strong>
            </div>
          </div>
        </div>

        <div className="home-hero-panel">
          <div className="home-snapshot-card">
            <div className="home-snapshot-header">
              <div>
                <p className="home-panel-label">Live platform snapshot</p>
                <h2 className="home-panel-title">What is already connected today</h2>
              </div>
              <StatusPill
                status={serviceHealthy ? 'ok' : 'warn'}
                label={gatewayHealth?.status || 'Unknown'}
              />
            </div>
            <div className="home-stats-grid">
              {quickStats.map((item) => (
                <div key={item.label} className="home-stat">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="home-orbit-card">
            <p className="home-panel-label">Current product direction</p>
            <h3 className="home-panel-title">One front door, multiple care journeys</h3>
            <p>
              The homepage now guides people toward the right workspace, while still surfacing the
              AI triage flow, doctor discovery, and the next staged service areas.
            </p>
            <div className="home-orbit-tags">
              <span>AI triage</span>
              <span>Doctor discovery</span>
              <span>Role auth</span>
              <span>Scheduling next</span>
            </div>
          </div>
        </div>
      </header>

      <SectionCard
        className="home-features-section"
        kicker="What's different"
        kickerClassName="home-section-kicker"
        titleClassName="home-section-title"
        subtitleClassName="home-section-sub"
        title="A better first impression"
        subtitle="The homepage now communicates product value, live capability, and the next user action without feeling like a developer-only dashboard."
      >
        <div className="home-feature-grid">
          {homeFeatureCards.map((card) => (
            <article key={card.title} className="home-feature-card">
              <span className="home-feature-eyebrow">{card.eyebrow}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        kicker="Navigation"
        kickerClassName="home-section-kicker"
        titleClassName="home-section-title"
        subtitleClassName="home-section-sub"
        title="Choose your starting point"
        subtitle="Each route is framed as a meaningful part of the care platform instead of just a technical page link."
      >
        <div className="home-route-grid">
          {homeNavigationCards.map((item) => (
            <button
              key={item.path}
              type="button"
              className="home-route-card"
              onClick={() => navigateTo(item.path)}
            >
              <span className="home-route-kicker">{item.kicker}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span className="home-route-path">{item.path}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        kicker="Patient experience"
        kickerClassName="home-section-kicker"
        titleClassName="home-section-title"
        subtitleClassName="home-section-sub"
        title="How the experience flows"
        subtitle="The page hints at the larger patient journey so later branches can add depth without changing the overall story."
      >
        <div className="home-journey-grid">
          {homeJourneyCards.map((card) => (
            <article key={card.step} className="home-journey-card">
              <div className="home-journey-num">{card.step}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        kicker="Roadmap"
        kickerClassName="home-section-kicker"
        titleClassName="home-section-title"
        subtitleClassName="home-section-sub"
        title="Next surface areas"
        subtitle="These modules are staged cleanly now, so the next branches can deepen the experience without changing the landing structure again."
      >
        <div className="home-roadmap-grid">
          {roadmapCards.map((card) => (
            <article key={card.title} className="home-roadmap-card">
              <div className="home-roadmap-top">
                <h3>{card.title}</h3>
                <span className={`home-badge ${badgeVariant[card.label]}`}>{card.label}</span>
              </div>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
