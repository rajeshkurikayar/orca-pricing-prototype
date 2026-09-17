import type { BadgeVariant } from '@/components/ui/Badge'
import type { FileStatus, Severity } from '@/mock/dataValidation/types'

export const STATUS_LABEL: Record<FileStatus, string> = {
  RECEIVED: 'Received',
  QUEUED: 'Queued',
  INSPECTING: 'Inspecting',
  MAPPING_PROPOSED: 'Mapping Proposed',
  AWAITING_REVIEW: 'Awaiting Review',
  STANDARDISING: 'Standardising',
  VALIDATING: 'Validating',
  EXCEPTION: 'Exception',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  SUPERSEDED: 'Superseded',
  REJECTED: 'Rejected',
}

export function statusVariant(status: FileStatus): BadgeVariant {
  switch (status) {
    case 'PUBLISHED':
    case 'APPROVED':
      return 'success'
    case 'AWAITING_REVIEW':
    case 'MAPPING_PROPOSED':
      return 'warning'
    case 'EXCEPTION':
    case 'REJECTED':
      return 'danger'
    case 'STANDARDISING':
    case 'VALIDATING':
    case 'INSPECTING':
      return 'info'
    default:
      return 'neutral'
  }
}

export function severityVariant(severity: Severity): BadgeVariant {
  switch (severity) {
    case 'BLOCKING':
      return 'danger'
    case 'ERROR':
      return 'warning'
    case 'WARNING':
      return 'accent'
    default:
      return 'neutral'
  }
}
