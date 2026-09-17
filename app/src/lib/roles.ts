export type RoleId =
  | 'contract-originator'
  | 'fat-analyst'
  | 'ram-analyst'
  | 'green-analyst'
  | 'desk-lead'
  | 'dv-reviewer'
  | 'admin'

export interface Capabilities {
  canCreateRequest: boolean
  canSubmitRequest: boolean
  canPriceResponse: boolean
  canPriceFat: boolean
  canPriceRam: boolean
  canPriceGreen: boolean
  canApproveTemplates: boolean
  canReviewDataValidation: boolean
  isAdmin: boolean
}

export interface Role {
  id: RoleId
  label: string
  group: 'Pricing' | 'Data Validation' | 'Admin'
  capabilities: Capabilities
}

const base: Capabilities = {
  canCreateRequest: false,
  canSubmitRequest: false,
  canPriceResponse: false,
  canPriceFat: false,
  canPriceRam: false,
  canPriceGreen: false,
  canApproveTemplates: false,
  canReviewDataValidation: false,
  isAdmin: false,
}

export const ROLES: Role[] = [
  {
    id: 'contract-originator',
    label: 'Contract Originator',
    group: 'Pricing',
    capabilities: { ...base, canCreateRequest: true, canSubmitRequest: true },
  },
  {
    id: 'fat-analyst',
    label: 'FAT Analyst',
    group: 'Pricing',
    capabilities: { ...base, canPriceResponse: true, canPriceFat: true },
  },
  {
    id: 'ram-analyst',
    label: 'RAM Analyst',
    group: 'Pricing',
    capabilities: { ...base, canPriceResponse: true, canPriceRam: true },
  },
  {
    id: 'green-analyst',
    label: 'Green Analyst',
    group: 'Pricing',
    capabilities: { ...base, canPriceResponse: true, canPriceGreen: true },
  },
  {
    id: 'desk-lead',
    label: 'Desk Lead',
    group: 'Pricing',
    capabilities: {
      ...base,
      canPriceResponse: true,
      canPriceFat: true,
      canPriceRam: true,
      canPriceGreen: true,
      canApproveTemplates: true,
    },
  },
  {
    id: 'dv-reviewer',
    label: 'Data Validation Reviewer',
    group: 'Data Validation',
    capabilities: { ...base, canReviewDataValidation: true },
  },
  {
    id: 'admin',
    label: 'Admin',
    group: 'Admin',
    capabilities: {
      canCreateRequest: true,
      canSubmitRequest: true,
      canPriceResponse: true,
      canPriceFat: true,
      canPriceRam: true,
      canPriceGreen: true,
      canApproveTemplates: true,
      canReviewDataValidation: true,
      isAdmin: true,
    },
  },
]

export function getRole(id: RoleId): Role {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]
}
