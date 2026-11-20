
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  label?: string
  small?: boolean
}

export default function LoadingSpinner({
  label = 'Đang tải dữ liệu...',
  small = false,
}: LoadingSpinnerProps) {
  return (
    <span
      className={`ui-loading ${small ? 'ui-loading--small' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="ui-loading__spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
