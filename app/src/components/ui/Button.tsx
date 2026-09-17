import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-on-accent)',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--color-danger)',
    color: 'var(--color-on-danger)',
    border: '1px solid transparent',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-accent)',
    border: '1px solid var(--color-accent-border)',
  },
}

const SIZE_STYLES: Record<Size, React.CSSProperties> = {
  sm:   { height: 26, padding: '0 8px',  fontSize: 11, gap: 4 },
  md:   { height: 28, padding: '0 10px', fontSize: 12, gap: 6 },
  lg:   { height: 34, padding: '0 16px', fontSize: 13, gap: 6 },
  icon: { height: 28, width: 28, padding: 0, justifyContent: 'center' },
}

const spinnerStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  border: '2px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.6s linear infinite',
  display: 'inline-block',
  flexShrink: 0,
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  as?: 'a'
  href?: string
  target?: string
  rel?: string
}

export function Button({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  children,
  style,
  as: Tag,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'all 120ms ease',
    textDecoration: 'none',
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    boxSizing: 'border-box',
    ...VARIANT_STYLES[variant],
    ...SIZE_STYLES[size],
    ...style,
  }

  const content = (
    <>
      {isLoading ? <span style={spinnerStyle} /> : leftIcon}
      {children !== undefined && <span>{children}</span>}
      {!isLoading && rightIcon}
    </>
  )

  if (Tag === 'a') {
    return (
      <a style={baseStyle} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      style={baseStyle}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  )
}
