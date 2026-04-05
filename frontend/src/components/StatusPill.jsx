export default function StatusPill({ status, label }) {
  return <span className={`status-pill ${status}`}>{label}</span>
}
