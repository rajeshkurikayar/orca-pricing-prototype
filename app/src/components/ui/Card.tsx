import React from 'react'

export interface CardProps {
  title?: string
  action?: React.ReactNode
  style?: React.CSSProperties
  bodyStyle?: React.CSSProperties
  noPadding?: boolean
  children: React.ReactNode
  className?: string  // legacy compat — ignored, inline styles only
}

// Legacy compat: CardHeader used by old module pages
export function CardHeader({ children, className: _className }: { children: React.ReactNode; className?: string }) {
  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {children}
    </div>
  )
}

export function Card({ title, action, style, bodyStyle, noPadding, children }: CardProps) {
  const outerStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    ...style,
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border-subtle)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  }

  const bodyBaseStyle: React.CSSProperties = {
    padding: noPadding ? 0 : '14px 16px',
    ...bodyStyle,
  }

  return (
    <div style={outerStyle}>
      {title !== undefined && (
        <div style={headerStyle}>
          <span style={titleStyle}>{title}</span>
          {action}
        </div>
      )}
      <div style={bodyBaseStyle}>{children}</div>
    </div>
  )
}
