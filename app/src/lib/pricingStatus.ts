import type { BadgeVariant } from '@/components/ui/Badge'
import type { Desk, DeskRunStatus, QuoteStatus } from '@/mock/pricing/types'

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  InPricing: 'In Pricing',
  RevisionRequested: 'Revision Requested',
  PricingComplete: 'Pricing Complete',
  UnderReview: 'Under Review',
  Finalised: 'Finalised',
  Approved: 'Approved',
  Rejected: 'Rejected',
}

export function statusVariant(status: QuoteStatus): BadgeVariant {
  switch (status) {
    case 'Finalised':
    case 'Approved':
      return 'success'
    case 'PricingComplete':
    case 'UnderReview':
      return 'accent'
    case 'Submitted':
    case 'InPricing':
      return 'info'
    case 'RevisionRequested':
      return 'warning'
    case 'Rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export const DESK_LABEL: Record<Desk, string> = { FAT: 'FAT', RAM: 'RAM', GREEN: 'Green' }

export const DESK_RUN_LABEL: Record<DeskRunStatus, string> = {
  NotRequired: 'Not Required',
  Pending: 'Pending',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  Submitted: 'Submitted',
}

export function deskRunVariant(status: DeskRunStatus): BadgeVariant {
  switch (status) {
    case 'Submitted':
      return 'success'
    case 'InProgress':
    case 'Assigned':
      return 'warning'
    case 'Pending':
      return 'neutral'
    default:
      return 'neutral'
  }
}
