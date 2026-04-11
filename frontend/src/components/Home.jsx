import './Home.css'
import StatusPill from './StatusPill'

// ── Specialties for quick-access grid
const specialties = [
  { name: 'General Physician', icon: '⚕', count: 42 },
  { name: 'Cardiologist', icon: '♥', count: 18 },
  { name: 'Dermatologist', icon: '◎', count: 24 },
  { name: 'Paediatrician', icon: '◉', count: 15 },
  { name: 'Neurologist', icon: '⟡', count: 11 },
  { name: 'Orthopaedic', icon: '✦', count: 20 },
  { name: 'Gynaecologist', icon: '◈', count: 17 },
  { name: 'ENT Specialist', icon: '⊕', count: 13 },
]

// ── How it works
const howSteps = [
  {
    step: '01',
    title: 'Describe your symptoms',
    desc: 'Tell our AI what you\'re experiencing. Get an instant structured summary to share with your doctor.',
    cta: 'Try AI screen',
    route: '/symptom-checker',
  },
  {
    step: '02',
    title: 'Find the right doctor',
    desc: 'Browse verified specialists by speciality, availability, and rating. Real profiles, real credentials.',
    cta: 'Browse doctors',
    route: '/doctors',
  },
  {
    step: '03',
    title: 'Book your appointment',
    desc: 'Choose a slot that works for you — in-person or video. Confirmation lands in your inbox instantly.',
    cta: 'Get started',
    route: '/login',
  },
]

// ── Trust signals
const trustStats = [
  { value: '2,400+', label: 'Appointments booked' },
  { value: '140+', label: 'Verified doctors' },
  { value: '98%', label: 'Patient satisfaction' },
  { value: '< 2 min', label: 'Avg. booking time' },
]

// ── Why Arogya
const whyCards = [
  {
    title: 'Verified & credentialed',
    desc: 'Every doctor goes through a rigorous background check, licence verification, and profile review before going live.',
    tag: 'Trust',
  },
  {
    title: 'AI-powered triage',
    desc: 'Describe symptoms in plain language. Our AI structures your input, suggests the right speciality, and prepares your visit notes.',
    tag: 'Technology',
  },
  {
    title: 'Seamless scheduling',
    desc: 'Real-time availability, instant confirmation, automatic reminders. No phone calls, no waiting on hold.',
    tag: 'Convenience',
  },
  {
    title: 'Your records, one place',
    desc: 'Past visits, prescriptions, and lab results — all stored securely in your patient profile and shareable with a tap.',
    tag: 'Continuity',
  },
]

const badgeColor = {
  Trust: 'tag-trust',
  Technology: 'tag-tech',
  Convenience: 'tag-conv',
  Continuity: 'tag-cont',
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
    <div className="hp">

      {/* ══ NAV BAR ═══════════════════════════════════════════ */}
      <nav className="hp-nav">
        <div className="hp-nav-brand">
          <span className="hp-nav-pulse" aria-hidden="true" />
          <span className="hp-nav-logo">Arogya</span>
          <span className="hp-nav-tagline">eChanneling</span>
        </div>
        <div className="hp-nav-links">
          <button type="button" className="hp-nav-link" onClick={() => navigateTo('/doctors')}>Find Doctors</button>
          <button type="button" className="hp-nav-link" onClick={() => navigateTo('/symptom-checker')}>AI Triage</button>
          <button type="button" className="hp-nav-link" onClick={() => navigateTo('/login')}>Sign In</button>
          <button
            type="button"
            className="hp-nav-cta"
            onClick={() => navigateTo(session ? getRouteForRole(activeRole) : '/login')}
          >
            {session ? 'My workspace' : 'Book now'}
          </button>
        </div>
        <div className="hp-nav-status">
          <StatusPill
            status={serviceHealthy ? 'ok' : 'warn'}
            label={serviceHealthy ? 'Live' : 'Offline'}
          />
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="hp-hero">
        {/* Background decorative elements */}
        <div className="hp-hero-bg" aria-hidden="true">
          <div className="hp-hero-circle hp-hero-circle--1" />
          <div className="hp-hero-circle hp-hero-circle--2" />
          <div className="hp-hero-grid" />
        </div>

        <div className="hp-hero-content">
          <div className="hp-hero-badge">
            <span className="hp-hero-badge-dot" aria-hidden="true" />
            Trusted by patients across Sri Lanka
          </div>

          <h1 className="hp-hero-title">
            See the right doctor,<br />
            <em>right when you need.</em>
          </h1>

          <p className="hp-hero-sub">
            Book verified specialists in minutes. Use AI to understand your symptoms first.
            Your health, on your schedule.
          </p>

          {/* Search bar — decorative / functional scaffold */}
          <div className="hp-search-bar">
            <div className="hp-search-field">
              <span className="hp-search-icon" aria-hidden="true">⊕</span>
              <span className="hp-search-placeholder">Search by speciality or doctor name…</span>
            </div>
            <button
              type="button"
              className="hp-search-btn"
              onClick={() => navigateTo('/doctors')}
            >
              Search doctors
            </button>
          </div>

          {/* Quick speciality chips */}
          <div className="hp-quick-chips">
            <span className="hp-chip-label">Quick:</span>
            {['General Physician', 'Cardiologist', 'Dermatologist', 'Paediatrician'].map(s => (
              <button key={s} type="button" className="hp-chip" onClick={() => navigateTo('/doctors')}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Hero right — floating card stack */}
        <div className="hp-hero-cards" aria-hidden="true">
          <div className="hp-float-card hp-float-card--main">
            <div className="hp-float-card-header">
              <div className="hp-float-avatar">DR</div>
              <div>
                <p className="hp-float-name">Dr. R. Perera</p>
                <p className="hp-float-spec">Cardiologist · Colombo</p>
              </div>
              <span className="hp-float-badge">Available today</span>
            </div>
            <div className="hp-float-slots">
              {['9:00 AM', '10:30 AM', '2:00 PM', '4:30 PM'].map(t => (
                <span key={t} className="hp-float-slot">{t}</span>
              ))}
            </div>
          </div>
          <div className="hp-float-card hp-float-card--mini hp-float-card--left">
            <span className="hp-float-mini-icon">◉</span>
            <div>
              <p className="hp-float-mini-val">{doctorDirectory.length}</p>
              <p className="hp-float-mini-lbl">Doctors online</p>
            </div>
          </div>
          <div className="hp-float-card hp-float-card--mini hp-float-card--right">
            <span className="hp-float-mini-icon hp-float-mini-icon--green">✓</span>
            <div>
              <p className="hp-float-mini-val">AI Ready</p>
              <p className="hp-float-mini-lbl">Symptom screen</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TRUST STATS BAR ═══════════════════════════════════ */}
      <div className="hp-stats-bar">
        {trustStats.map((s, i) => (
          <div key={s.label} className="hp-stats-item">
            <strong>{s.value}</strong>
            <span>{s.label}</span>
            {i < trustStats.length - 1 && <div className="hp-stats-divider" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {/* ══ SPECIALITIES GRID ═════════════════════════════════ */}
      <section className="hp-section hp-spec-section">
        <div className="hp-section-head hp-section-head--center">
          <p className="hp-overline">Browse by speciality</p>
          <h2 className="hp-section-title">Find the right<br /><em>expert for you</em></h2>
        </div>
        <div className="hp-spec-grid">
          {specialties.map(sp => (
            <button
              key={sp.name}
              type="button"
              className="hp-spec-card"
              onClick={() => navigateTo('/doctors')}
            >
              <span className="hp-spec-icon">{sp.icon}</span>
              <span className="hp-spec-name">{sp.name}</span>
              <span className="hp-spec-count">{sp.count} doctors</span>
            </button>
          ))}
        </div>
        <div className="hp-spec-cta-row">
          <button type="button" className="hp-btn-outline" onClick={() => navigateTo('/doctors')}>
            View all specialities →
          </button>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════ */}
      <section className="hp-section hp-how-section">
        <div className="hp-how-inner">
          <div className="hp-section-head">
            <p className="hp-overline">How it works</p>
            <h2 className="hp-section-title">From symptoms<br /><em>to consultation</em></h2>
            <p className="hp-section-sub">Three steps is all it takes. No paperwork, no friction.</p>
          </div>
          <div className="hp-how-steps">
            {howSteps.map((step, i) => (
              <div key={step.step} className="hp-how-step">
                <div className="hp-how-step-top">
                  <div className="hp-how-num">{step.step}</div>
                  {i < howSteps.length - 1 && <div className="hp-how-line" aria-hidden="true" />}
                </div>
                <h3 className="hp-how-title">{step.title}</h3>
                <p className="hp-how-desc">{step.desc}</p>
                <button
                  type="button"
                  className="hp-how-link"
                  onClick={() => navigateTo(step.route)}
                >
                  {step.cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY AROGYA ════════════════════════════════════════ */}
      <section className="hp-section hp-why-section">
        <div className="hp-section-head hp-section-head--split">
          <div>
            <p className="hp-overline">Why Arogya</p>
            <h2 className="hp-section-title">Healthcare that<br /><em>actually works</em></h2>
          </div>
          <p className="hp-section-sub hp-why-sub">
            We built Arogya because booking a doctor shouldn't require three phone calls and half a day.
            Everything here is designed around your time and your trust.
          </p>
        </div>
        <div className="hp-why-grid">
          {whyCards.map(card => (
            <article key={card.title} className="hp-why-card">
              <span className={`hp-why-tag ${badgeColor[card.tag]}`}>{card.tag}</span>
              <h3 className="hp-why-title">{card.title}</h3>
              <p className="hp-why-desc">{card.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ══ CTA BANNER ════════════════════════════════════════ */}
      <section className="hp-cta-banner">
        <div className="hp-cta-bg" aria-hidden="true">
          <div className="hp-cta-ring hp-cta-ring--1" />
          <div className="hp-cta-ring hp-cta-ring--2" />
        </div>
        <div className="hp-cta-content">
          <p className="hp-cta-overline">Ready to begin?</p>
          <h2 className="hp-cta-title">Your next appointment<br />is minutes away.</h2>
          <div className="hp-cta-actions">
            <button
              type="button"
              className="hp-cta-primary"
              onClick={() => navigateTo(session ? getRouteForRole(activeRole) : '/login')}
            >
              <span>{session ? 'Open my workspace' : 'Explore the platform'}</span>
              <span className="hp-cta-arrow">↗</span>
            </button>
            <button
              type="button"
              className="hp-cta-ghost"
              onClick={() => navigateTo('/doctors')}
            >
              Browse doctors
            </button>
          </div>
          <div className="hp-cta-pills">
            <StatusPill
              status={serviceHealthy ? 'ok' : 'warn'}
              label={serviceHealthy ? 'Gateway online' : 'Gateway needs attention'}
            />
            <StatusPill
              status={session ? 'ok' : 'warn'}
              label={session ? `${activeRole} session active` : 'No active session'}
            />
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <footer className="hp-footer">
        <div className="hp-footer-brand">
          <span className="hp-footer-logo">Arogya</span>
          <span className="hp-footer-slogan">eChanneling · Connected Care</span>
        </div>
        <div className="hp-footer-links">
          <button type="button" className="hp-footer-link" onClick={() => navigateTo('/doctors')}>Doctors</button>
          <button type="button" className="hp-footer-link" onClick={() => navigateTo('/login')}>Sign In</button>
          <button type="button" className="hp-footer-link" onClick={() => navigateTo('/register')}>Register</button>
        </div>
        <div className="hp-footer-meta">
          <span className="hp-footer-api">{apiBaseUrl}</span>
          <span>© {new Date().getFullYear()} Arogya</span>
        </div>
      </footer>

    </div>
  )
}