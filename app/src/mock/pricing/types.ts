export type QuoteStatus =
  | 'Draft'
  | 'Submitted'
  | 'InPricing'
  | 'RevisionRequested'
  | 'PricingComplete'
  | 'UnderReview'
  | 'Finalised'
  | 'Approved'
  | 'Rejected'

export type Desk = 'FAT' | 'RAM' | 'GREEN'

export type DeskRunStatus = 'NotRequired' | 'Pending' | 'Assigned' | 'InProgress' | 'Submitted'

export type Technology = 'WIND_ONSHORE' | 'WIND_OFFSHORE' | 'SOLAR'

export interface QuotePark {
  id: string
  name: string
  capacityMw: number
  technology: Technology
  countryCode: string
  existing: boolean // true = existing Puma-linked asset, false = new draft asset
  p50MwhPerYear: number
}

export type Tenor = '1Y' | '2Y' | '3Y'

export interface TenorRow {
  id: string
  parkId: string
  parkName: string
  tenor: Tenor
  startDate: string
  endDate: string
  mwhPerYear: number
  balancingRequired: boolean
  curtailmentPct: number
}

export type SpvState = 'PLACEHOLDER' | 'LINKED'
export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface SpvLink {
  parkId: string
  parkName: string
  state: SpvState
  spvName?: string
  spvId?: string
  opportunityId?: string
  frontSheetStatus?: ApprovalState
  kycStatus?: ApprovalState
  creditStatus?: ApprovalState
}

export interface PricingComponents {
  baseload: number
  seasonal: number
  cannibalisation: number
  volumeRisk: number
  margin: number
  balancingFee: number
  power: number
}

export interface PricingRowResult {
  tenorRowId: string
  parkName: string
  tenor: Tenor
  withCurtailment: PricingComponents
  withoutCurtailment: PricingComponents
}

export interface PricingRun {
  id: string
  desk: Desk
  version: number
  status: 'Draft' | 'Submitted'
  analyst?: string
  templateId?: string
  results: PricingRowResult[]
  avgPrice?: number
  submittedAt?: string
}

export interface ProjectInfo {
  companyName: string
  parentAccount?: string
  vatNumber?: string
  companyAddress?: string
  technicalContactName: string
  technicalContactTitle: string
  technicalContactPhone: string
  technicalContactEmail: string
  commercialContactName?: string
  commercialContactTitle?: string
  commercialContactPhone?: string
  commercialContactEmail?: string
  currentBrp?: string
  currentSupplier?: string
  cod: string
  expectedCommissioningDate?: string
  expectedFidDate?: string
  contractTenorYears: number
  buildingPermit: string
  environmentalPermit?: string
  financingType: string
  gridConnectionSecured?: string
  operations247?: string
}

export interface Quote {
  id: string
  reference: string
  status: QuoteStatus
  countryCode: string
  currency: string
  customerId?: string
  customerName: string
  isNewCustomer: boolean
  productionTypes: Technology[]
  direction: 'BUY' | 'SELL'
  contractType: string
  priority: 'Low' | 'Medium' | 'High'
  hedgingRequired: boolean
  deadline: string
  createdBy: string
  createdAt: string
  parks: QuotePark[]
  desksRequired: Desk[]
  deskStatus: Record<Desk, DeskRunStatus>
  deskAssignee: Partial<Record<Desk, string>>
  tenorRows: TenorRow[]
  spvLinks: SpvLink[]
  runs: PricingRun[]
  projectInfo: ProjectInfo
  productName: string
  datasetRef?: { datasetId: string; assetName: string }
  cePendingCustomerName?: string
}

export interface TemplateFactor {
  key: string
  label: string
  value: number
  unit: '%' | 'EUR/MWh' | 'years' | 'MWh'
}

export interface AssumptionTemplate {
  id: string
  desk: Desk
  name: string
  countryCode: string
  technology: Technology
  status: 'Draft' | 'Pending Review' | 'Approved' | 'Rejected'
  factors: TemplateFactor[]
}

export type PricingAuditEventType =
  | 'created'
  | 'submitted'
  | 'spv-placeholder'
  | 'desk-routed'
  | 'desk-pickup'
  | 'template-applied'
  | 'desk-priced'
  | 'status-transition'
  | 'spv-linked'
  | 'opp-created'
  | 'fs-triggered'
  | 'kyc-approved'
  | 'credit-approved'
  | 'fs-approved'
  | 'offer-generated'
  | 'contracts-created'
  | 'ce-linked'

export interface PricingAuditEvent {
  id: string
  quoteId: string
  timestamp: string
  eventType: PricingAuditEventType
  actor: string
  detail: string
}
