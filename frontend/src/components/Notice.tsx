interface Props {
  tone: 'error' | 'info'
  children: React.ReactNode
  onDismiss?: () => void
}

export function Notice({ tone, children, onDismiss }: Props) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <p>{children}</p>
      {onDismiss && (
        <button type="button" className="notice-close" onClick={onDismiss} aria-label="Dismiss message">
          ×
        </button>
      )}
    </div>
  )
}
