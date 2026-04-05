export default function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      <div className="card-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
