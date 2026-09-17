import React from 'react'

const STATUS_COLORS: Record<string, string> = {
  Draft: 'var(--color-status-draft)',
  Submitted: 'var(--color-status-submitted)',
  InPricing: 'var(--color-status-pricing)',
  PricingComplete: 'var(--color-status-pricing)',
  UnderReview: 'var(--color-status-review)',
  RevisionRequested: 'var(--color-status-review)',
  RevisionRequestedByDesk: 'var(--color-status-review)',
  RevisionRequestedByOriginator: 'var(--color-status-review)',
  Approved: 'var(--color-status-approved)',
  Accepted: 'var(--color-status-approved)',
  Finalised: 'var(--color-status-approved)',
  Rejected: 'var(--color-status-rejected)',
  Cancelled: 'var(--color-status-rejected)',
  OnHold: 'var(--color-status-draft)',
  Expired: 'var(--color-status-expired)',
  PendingReview: 'var(--color-warning)',
  Low: 'var(--color-text-muted)',
  Normal: 'var(--color-status-submitted)',
  Medium: 'var(--color-status-pricing)',
  High: 'var(--color-warning)',
  Critical: 'var(--color-danger)',
}

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  InPricing: 'In Pricing',
  PricingComplete: 'Pricing Complete',
  UnderReview: 'Under Review',
  RevisionRequested: 'Revision',
  RevisionRequestedByDesk: 'Revision (Desk)',
  RevisionRequestedByOriginator: 'Revision (Originator)',
  Approved: 'Approved',
  Accepted: 'Accepted',
  Finalised: 'Finalised',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
  OnHold: 'On Hold',
  Expired: 'Expired',
  PendingReview: 'Pending Review',
  Low: 'Low',
  Normal: 'Normal',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? 'var(--color-text-muted)'
  const label = STATUS_LABELS[status] ?? status

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: size === 'sm' ? '1px 6px' : '2px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
  }

  return <span style={badgeStyle}>{label}</span>
}
