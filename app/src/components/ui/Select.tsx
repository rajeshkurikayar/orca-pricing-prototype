import React from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  required?: boolean
}

export function Select({ label, error, options, required, style, ...props }: SelectProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
  }

  const requiredStarStyle: React.CSSProperties = {
    color: 'var(--color-danger)',
    marginLeft: 2,
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: 28,
    padding: '0 28px 0 8px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
    ...style,
  }

  const chevronStyle: React.CSSProperties = {
    position: 'absolute',
    right: 7,
    bottom: 8,
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-danger)',
  }

  return (
    <div style={containerStyle}>
      {label !== undefined && (
        <label style={labelStyle}>
          {label}
          {required && <span style={requiredStarStyle}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select style={selectStyle} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={chevronStyle}>
          <ChevronDown size={12} />
        </span>
      </div>
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  )
}
