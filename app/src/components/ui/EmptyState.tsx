import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: 12,
  }

  const iconContainerStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  }

  const descriptionStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-secondary)',
    maxWidth: 360,
  }

  return (
    <div style={containerStyle}>
      {Icon && (
        <div style={iconContainerStyle}>
          <Icon size={22} color="var(--color-text-muted)" />
        </div>
      )}
      <div style={titleStyle}>{title}</div>
      {description && <div style={descriptionStyle}>{description}</div>}
      {action}
    </div>
  )
}
