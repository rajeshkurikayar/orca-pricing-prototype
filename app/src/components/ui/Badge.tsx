import type { ReactNode, CSSProperties } from 'react'

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

const VARIANT_STYLES: Record<BadgeVariant, CSSProperties> = {
  neutral: { background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' },
  info:    { background: 'var(--color-info-muted)',    color: 'var(--color-info)',    border: '1px solid var(--color-border)' },
  success: { background: 'var(--color-success-muted)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)' },
  warning: { background: 'var(--color-warning-muted)', color: 'var(--color-warning)', border: '1px solid var(--color-warning-border)' },
  danger:  { background: 'var(--color-danger-muted)',  color: 'var(--color-danger)',  border: '1px solid var(--color-danger-border)' },
  accent:  { background: 'var(--color-accent-muted)',  color: 'var(--color-accent)',  border: '1px solid var(--color-accent-border)' },
}

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  borderRadius: 'var(--radius-full)',
  padding: '2px 8px',
  fontFamily: 'var(--font-mono)',
  fontSize: '10.5px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}

export function Badge({
  children,
  variant = 'neutral',
}: {
  children: ReactNode
  variant?: BadgeVariant
  className?: string  // accepted for API compat, ignored
}) {
  return (
    <span style={{ ...baseStyle, ...VARIANT_STYLES[variant] }}>
      {children}
    </span>
  )
}
