import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function PageHeader({
  module,
  title,
  description,
  actions,
  backTo,
  backLabel,
}: {
  module: string
  title: string
  description?: string
  actions?: ReactNode
  backTo?: string
  backLabel?: string
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', padding: '16px 24px 20px' }}>
      {backTo && (
        <Link
          to={backTo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            marginBottom: 8,
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        >
          <ChevronLeft size={13} />
          {backLabel ?? 'Back'}
        </Link>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ marginBottom: 4, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)' }}>{module}</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h1>
          {description && <p style={{ marginTop: 4, maxWidth: 672, fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>{description}</p>}
        </div>
        {actions && <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', gap: 8 }}>{actions}</div>}
      </div>
    </div>
  )
}
