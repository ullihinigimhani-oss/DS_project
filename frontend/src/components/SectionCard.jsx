export default function SectionCard({ title, subtitle, children }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
