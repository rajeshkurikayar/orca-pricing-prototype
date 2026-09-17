export type FileStatus =
  | 'RECEIVED'
  | 'QUEUED'
  | 'INSPECTING'
  | 'MAPPING_PROPOSED'
  | 'AWAITING_REVIEW'
  | 'STANDARDISING'
  | 'VALIDATING'
  | 'EXCEPTION'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'REJECTED'

export type FileType =
  | 'PRODUCTION_ACTUAL'
  | 'PRODUCTION_FORECAST'
  | 'PRODUCTION_SCHEDULE'
  | 'REDISPATCH_INSTRUCTION'
  | 'REDISPATCH_ACTUAL'
  | 'REDISPATCH_CANDIDATE'
  | 'CURTAILMENT'
  | 'ASSET_MASTER'
  | 'MIXED_WORKBOOK'
  | 'TECHNICAL_OUTAGE'
  | 'PLANNED_MAINTENANCE'
  | 'METER_DATA'
  | 'UNKNOWN'

export type SourceChannel = 'EMAIL' | 'SFTP' | 'API' | 'TEAMS' | 'MANUAL_UPLOAD'

export type Severity = 'INFORMATION' | 'WARNING' | 'ERROR' | 'BLOCKING'

export type FindingStatus = 'OPEN' | 'RESOLVED' | 'OVERRIDDEN' | 'IGNORED'

export type EvidenceKind = 'HEADER_MATCH' | 'PATTERN_MATCH' | 'CUSTOMER_DB_LOOKUP' | 'TEMPLATE_MATCH' | 'HEURISTIC'

export interface AgentEvidence {
  kind: EvidenceKind
  detail: string
}

export interface MappingDecision {
  sourceColumn: string
  proposedField: string
  transformation: string
  confidence: number
  accepted: boolean
}

export interface AgentRunOutput {
  classification: {
    fileType: FileType
    confidence: number
    evidence: AgentEvidence[]
  }
  assetResolution: {
    customerName?: string
    siteName?: string
    confidence: number
    evidence: AgentEvidence[]
    alternatives: { customerName: string; siteName: string; confidence: number }[]
    missingEvidence: string[]
  }
  mappingDecisions: MappingDecision[]
  requiresHumanReview: boolean
  reviewReasons: string[]
  recommendations: string[]
}

export interface DVJob {
  id: string
  fileName: string
  fileSizeKb: number
  customerId: string
  customerName: string
  siteId: string
  siteName: string
  countryCode: string
  fileType: FileType
  status: FileStatus
  sourceChannel: SourceChannel
  receivedAt: string
  confidence: number
  agentRun: AgentRunOutput
  comment?: string
}

export interface ValidationFinding {
  id: string
  jobId: string
  ruleId: string
  severity: Severity
  message: string
  explanation: string
  affectedRecords: number
  affectedRows: number[]
  recommendation: string
  status: FindingStatus
  resolutionNote?: string
}

export type QualityFlag = 'GOOD' | 'ESTIMATED' | 'MISSING' | 'INVALID'

export interface TimeSeriesPoint {
  timestampUtc: string
  value: number
  qualityFlag: QualityFlag
}

export type SeriesType = 'PRODUCTION_ACTUAL' | 'REDISPATCH' | 'FORECAST' | 'CAPACITY' | 'AVAILABILITY'

export interface TimeSeries {
  id: string
  jobId: string
  assetId: string
  assetName: string
  seriesType: SeriesType
  intervalMinutes: number
  timezone: string
  unit: string
  coverageStart: string
  coverageEnd: string
  pointCount: number
  missingCount: number
  points: TimeSeriesPoint[]
}

export type DatasetStatus = 'DRAFT' | 'PRICING_READY' | 'PUBLISHED' | 'SUPERSEDED'
export type GateStatus = 'PASS' | 'WARN' | 'FAIL'

export interface DatasetVersion {
  id: string
  assetId: string
  assetName: string
  seriesType: SeriesType
  version: number
  status: DatasetStatus
  coverageStart: string
  coverageEnd: string
  publishedBy: string
  publishedAt: string
  pointCount: number
  sourceJobIds: string[]
  gates: { name: string; status: GateStatus }[]
}

export type Technology = 'WIND' | 'SOLAR' | 'HYDRO' | 'OTHER'

export interface Site {
  id: string
  customerId: string
  name: string
  countryCode: string
  technology: Technology
  capacityMw: number
  timezone: string
  lat: number
  lon: number
}

export interface DVCustomer {
  id: string
  name: string
  countryCode: string
  sites: Site[]
}

export interface MappingRule {
  field: string
  sourceColumn: string
  transformation: string
  required: boolean
}

export interface MappingTemplate {
  id: string
  name: string
  description: string
  customerId?: string
  fileType: FileType
  usageCount: number
  rules: MappingRule[]
}

export type DVAuditEventType =
  | 'FILE_UPLOADED'
  | 'JOB_STARTED'
  | 'JOB_COMPLETED'
  | 'EXCEPTION_RAISED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'SUPERSEDED'
  | 'USER_ACTION'
  | 'MAPPING_APPLIED'

export interface DVAuditEvent {
  id: string
  timestamp: string
  eventType: DVAuditEventType
  entityType: 'file' | 'job' | 'dataset' | 'finding'
  entityId: string
  entityName: string
  actor: string
  action: string
}
