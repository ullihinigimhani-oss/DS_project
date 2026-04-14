import './brandLogo.css'

const logo = '/ArogyaLogo.png'

export default function BrandLogo({
  subtitle = '',
  theme = 'dark',
  size = 'md',
  align = 'left',
  className = '',
}) {
  const classes = [
    'arogya-brand',
    `arogya-brand--${theme}`,
    `arogya-brand--${size}`,
    `arogya-brand--${align}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <img className="arogya-brand__image" src={logo} alt="Arogya" />
      {subtitle ? <span className="arogya-brand__subtitle">{subtitle}</span> : null}
    </div>
  )
}
