import React from 'react'
import { X } from 'lucide-react'

type ModalSize = 'sm' | 'md' | 'lg'

const SIZES: Record<ModalSize, number> = {
  sm: 480,
  md: 640,
  lg: 800,
}

interface ModalProps {
  open?: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  size?: ModalSize
  width?: string  // legacy compat — overrides maxWidth when provided
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Modal({ open, onClose, title, subtitle, size = 'md', width, children, footer }: ModalProps) {
  if (open === false) return null

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }

  const dialogStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: width ?? SIZES[size],
    background: 'var(--color-bg-elevated)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--color-border)',
    animation: 'modalIn 200ms ease',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--color-border-subtle)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--text-lg)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
  }

  const subtitleStyle: React.CSSProperties = {
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
    marginTop: 4,
  }

  const closeButtonStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    padding: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  const bodyStyle: React.CSSProperties = {
    padding: 24,
    maxHeight: '60vh',
    overflowY: 'auto',
  }

  const footerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: '1px solid var(--color-border-subtle)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  }

  return (
    <div
      style={backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={dialogStyle}>
        {title !== undefined && (
          <div style={headerStyle}>
            <div>
              <div style={titleStyle}>{title}</div>
              {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
            </div>
            <button style={closeButtonStyle} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  )
}
