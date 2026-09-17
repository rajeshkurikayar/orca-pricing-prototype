import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DV_AUDIT,
  DV_CUSTOMERS,
  DV_DATASETS,
  DV_FINDINGS,
  DV_JOBS,
  DV_MAPPING_TEMPLATES,
  DV_TIMESERIES,
} from '@/mock/dataValidation/seed'
import type {
  DVAuditEvent,
  DVCustomer,
  DVJob,
  DatasetVersion,
  FileStatus,
  FindingStatus,
  MappingTemplate,
  TimeSeries,
  ValidationFinding,
} from '@/mock/dataValidation/types'

interface DataValidationState {
  jobs: DVJob[]
  findings: ValidationFinding[]
  timeseries: TimeSeries[]
  datasets: DatasetVersion[]
  customers: DVCustomer[]
  templates: MappingTemplate[]
  audit: DVAuditEvent[]

  logAudit: (entry: Omit<DVAuditEvent, 'id' | 'timestamp'>) => void
  setJobStatus: (jobId: string, status: FileStatus, actor: string) => void
  approveJob: (jobId: string, actor: string, comment?: string) => void
  rejectJob: (jobId: string, actor: string, comment?: string) => void
  reprocessJob: (jobId: string, actor: string) => void
  resolveFinding: (findingId: string, status: FindingStatus, actor: string, note?: string) => void
  publishDataset: (datasetId: string, actor: string) => void
  supersedeDataset: (datasetId: string, actor: string, reason: string) => void
  uploadFile: (file: { fileName: string; fileSizeKb: number; customerId: string; siteId: string; customerName: string; siteName: string; countryCode: string }, actor: string) => string
}

export const useDataValidationStore = create<DataValidationState>()(
  persist(
    (set, get) => ({
      jobs: DV_JOBS,
      findings: DV_FINDINGS,
      timeseries: DV_TIMESERIES,
      datasets: DV_DATASETS,
      customers: DV_CUSTOMERS,
      templates: DV_MAPPING_TEMPLATES,
      audit: DV_AUDIT,

      logAudit: (entry) =>
        set((s) => ({
          audit: [
            { ...entry, id: `aud-${Date.now()}`, timestamp: new Date().toISOString() },
            ...s.audit,
          ],
        })),

      setJobStatus: (jobId, status, actor) => {
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)) }))
        const job = get().jobs.find((j) => j.id === jobId)
        get().logAudit({
          eventType: 'USER_ACTION',
          entityType: 'job',
          entityId: jobId,
          entityName: job?.fileName ?? jobId,
          actor,
          action: `Status changed to ${status}`,
        })
      },

      approveJob: (jobId, actor, comment) => {
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status: 'APPROVED' as FileStatus, comment } : j)),
        }))
        const job = get().jobs.find((j) => j.id === jobId)
        get().logAudit({
          eventType: 'APPROVED',
          entityType: 'job',
          entityId: jobId,
          entityName: job?.fileName ?? jobId,
          actor,
          action: comment ? `Approved with note: ${comment}` : 'Approved',
        })
      },

      rejectJob: (jobId, actor, comment) => {
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status: 'REJECTED' as FileStatus, comment } : j)),
        }))
        const job = get().jobs.find((j) => j.id === jobId)
        get().logAudit({
          eventType: 'USER_ACTION',
          entityType: 'job',
          entityId: jobId,
          entityName: job?.fileName ?? jobId,
          actor,
          action: comment ? `Rejected: ${comment}` : 'Rejected',
        })
      },

      reprocessJob: (jobId, actor) => {
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status: 'INSPECTING' as FileStatus } : j)),
        }))
        const job = get().jobs.find((j) => j.id === jobId)
        get().logAudit({
          eventType: 'JOB_STARTED',
          entityType: 'job',
          entityId: jobId,
          entityName: job?.fileName ?? jobId,
          actor,
          action: 'Reprocess triggered',
        })
        setTimeout(() => {
          set((s) => ({
            jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status: 'AWAITING_REVIEW' as FileStatus } : j)),
          }))
        }, 1200)
      },

      resolveFinding: (findingId, status, actor, note) => {
        set((s) => ({
          findings: s.findings.map((f) => (f.id === findingId ? { ...f, status, resolutionNote: note } : f)),
        }))
        const finding = get().findings.find((f) => f.id === findingId)
        get().logAudit({
          eventType: 'USER_ACTION',
          entityType: 'finding',
          entityId: findingId,
          entityName: finding?.message ?? findingId,
          actor,
          action: `Finding marked ${status}${note ? `: ${note}` : ''}`,
        })
      },

      publishDataset: (datasetId, actor) => {
        set((s) => ({
          datasets: s.datasets.map((d) =>
            d.id === datasetId ? { ...d, status: 'PUBLISHED' as const, publishedBy: actor, publishedAt: new Date().toISOString() } : d,
          ),
        }))
        const dataset = get().datasets.find((d) => d.id === datasetId)
        get().logAudit({
          eventType: 'PUBLISHED',
          entityType: 'dataset',
          entityId: datasetId,
          entityName: dataset ? `${dataset.assetName} — v${dataset.version}` : datasetId,
          actor,
          action: 'Dataset published',
        })
      },

      supersedeDataset: (datasetId, actor, reason) => {
        set((s) => ({
          datasets: s.datasets.map((d) => (d.id === datasetId ? { ...d, status: 'SUPERSEDED' as const } : d)),
        }))
        const dataset = get().datasets.find((d) => d.id === datasetId)
        get().logAudit({
          eventType: 'SUPERSEDED',
          entityType: 'dataset',
          entityId: datasetId,
          entityName: dataset ? `${dataset.assetName} — v${dataset.version}` : datasetId,
          actor,
          action: `Superseded: ${reason}`,
        })
      },

      uploadFile: (file, actor) => {
        const id = `job-${Date.now()}`
        const newJob: DVJob = {
          id,
          fileName: file.fileName,
          fileSizeKb: file.fileSizeKb,
          customerId: file.customerId,
          customerName: file.customerName,
          siteId: file.siteId,
          siteName: file.siteName,
          countryCode: file.countryCode,
          fileType: 'UNKNOWN',
          status: 'QUEUED',
          sourceChannel: 'MANUAL_UPLOAD',
          receivedAt: new Date().toISOString(),
          confidence: 0,
          agentRun: {
            classification: { fileType: 'UNKNOWN', confidence: 0, evidence: [] },
            assetResolution: { confidence: 0, evidence: [], alternatives: [], missingEvidence: [] },
            mappingDecisions: [],
            requiresHumanReview: false,
            reviewReasons: [],
            recommendations: [],
          },
        }
        set((s) => ({ jobs: [newJob, ...s.jobs] }))
        get().logAudit({
          eventType: 'FILE_UPLOADED',
          entityType: 'file',
          entityId: id,
          entityName: file.fileName,
          actor,
          action: 'File received via manual upload',
        })
        setTimeout(() => {
          set((s) => ({
            jobs: s.jobs.map((j) =>
              j.id === id
                ? {
                    ...j,
                    status: 'AWAITING_REVIEW',
                    confidence: 0.87,
                    fileType: 'PRODUCTION_ACTUAL',
                    agentRun: {
                      ...j.agentRun,
                      classification: { fileType: 'PRODUCTION_ACTUAL', confidence: 0.87, evidence: [{ kind: 'HEADER_MATCH', detail: 'timestamp + MW columns detected' }] },
                      requiresHumanReview: true,
                      reviewReasons: ['NEW_UPLOAD'],
                      recommendations: ['Newly uploaded file — review classification before publishing.'],
                    },
                  }
                : j,
            ),
          }))
          get().logAudit({
            eventType: 'JOB_COMPLETED',
            entityType: 'job',
            entityId: id,
            entityName: file.fileName,
            actor: 'system:agent',
            action: 'Classified as PRODUCTION_ACTUAL, 87% confidence',
          })
        }, 1500)
        return id
      },
    }),
    { name: 'orca.data-validation' },
  ),
)
