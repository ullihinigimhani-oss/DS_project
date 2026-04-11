export default function SectionCard({
  kicker,
  title,
  subtitle,
  children,
  className = '',
  headerClassName = '',
  kickerClassName = '',
  titleClassName = '',
  subtitleClassName = '',
}) {
  return (
    <section className={`card ${className}`.trim()}>
      <div className={`card-header ${headerClassName}`.trim()}>
        {kicker ? <p className={kickerClassName}>{kicker}</p> : null}
        <h2 className={titleClassName}>{title}</h2>
        {subtitle ? <p className={subtitleClassName}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}
