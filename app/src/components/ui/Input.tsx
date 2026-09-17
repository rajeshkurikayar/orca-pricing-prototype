import React, { useState } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export function Input({ label, error, hint, required, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false)

  const wrapperStyle: React.CSSProperties = {
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 28,
    padding: '0 8px',
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
    border: `1px solid ${error ? 'var(--color-danger)' : focused ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 120ms ease',
    boxSizing: 'border-box',
    boxShadow: focused && !error ? '0 0 0 3px var(--color-accent-muted)' : 'none',
    ...style,
  }

  const errorStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-danger)',
  }

  const hintStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-muted)',
  }

  return (
    <div style={wrapperStyle}>
      {label !== undefined && (
        <label style={labelStyle}>
          {label}
          {required && <span style={requiredStarStyle}>*</span>}
        </label>
      )}
      <input
        style={inputStyle}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />
      {error && <span style={errorStyle}>{error}</span>}
      {!error && hint && <span style={hintStyle}>{hint}</span>}
    </div>
  )
}
