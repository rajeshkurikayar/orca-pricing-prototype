import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PRICING_AUDIT, PRICING_QUOTES, PRICING_TEMPLATES } from '@/mock/pricing/seed'
import { computeFatRow, flatBalancingComponents } from '@/lib/pricingFormula'
import type {
  AssumptionTemplate,
  Desk,
  PricingAuditEvent,
  PricingAuditEventType,
  PricingRowResult,
  Quote,
  QuotePark,
  TenorRow,
} from '@/mock/pricing/types'

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

interface NewQuoteInput {
  countryCode: string
  currency: string
  customerName: string
  customerId?: string
  isNewCustomer: boolean
  productionTypes: Quote['productionTypes']
  direction: Quote['direction']
  contractType: string
  parks: QuotePark[]
  productName: string
  desksRequired: Desk[]
  projectInfo: Quote['projectInfo']
  datasetRef?: { datasetId: string; assetName: string }
  createdBy: string
}

interface PricingState {
  quotes: Quote[]
  templates: AssumptionTemplate[]
  audit: PricingAuditEvent[]

  logAudit: (quoteId: string, eventType: PricingAuditEventType, actor: string, detail: string) => void
  createDraftQuote: (input: NewQuoteInput) => string
  submitQuote: (quoteId: string) => void
  pickUpDesk: (quoteId: string, desk: Desk, actor: string) => void
  applyTemplate: (quoteId: string, desk: Desk, templateId: string, baseload: number) => void
  submitRun: (quoteId: string, desk: Desk, results?: PricingRowResult[], avgPrice?: number) => void
  requestRevision: (quoteId: string, desk: Desk, actor: string) => void
  linkSpv: (quoteId: string, parkId: string, spvName: string, spvId: string, actor: string) => void
  reuseOpportunity: (quoteId: string, parkId: string, spvName: string, spvId: string, opportunityId: string, actor: string) => void
  createOpportunity: (quoteId: string, parkId: string, actor: string) => void
  triggerFrontSheet: (quoteId: string, parkId: string, actor: string) => void
  linkCeCustomer: (quoteId: string, customerId: string) => void
  deleteQuote: (quoteId: string) => void
  finaliseQuote: (quoteId: string, actor: string) => void
  rejectQuote: (quoteId: string, actor: string) => void
}

function referenceFor(countryCode: string, seq: number) {
  return `PR-2026-${countryCode}-${String(seq).padStart(3, '0')}`
}

export const usePricingStore = create<PricingState>()(
  persist(
    (set, get) => ({
      quotes: PRICING_QUOTES,
      templates: PRICING_TEMPLATES,
      audit: PRICING_AUDIT,

      logAudit: (quoteId, eventType, actor, detail) =>
        set((s) => ({
          audit: [{ id: `paud-${Date.now()}`, quoteId, timestamp: new Date().toISOString(), eventType, actor, detail }, ...s.audit],
        })),

      createDraftQuote: (input) => {
        const id = `q-${Date.now()}`
        const seq = get().quotes.length + 1
        const reference = referenceFor(input.countryCode, seq)
        const deskStatus: Quote['deskStatus'] = { FAT: 'NotRequired', RAM: 'NotRequired', GREEN: 'NotRequired' }
        for (const d of input.desksRequired) deskStatus[d] = 'Pending'
        const tenorRows: TenorRow[] = input.parks.flatMap((park) =>
          (['1Y', '2Y', '3Y'] as const).map((tenor) => {
            const years = tenor === '1Y' ? 1 : tenor === '2Y' ? 2 : 3
            return {
              id: `${park.id}-${tenor}`,
              parkId: park.id,
              parkName: park.name,
              tenor,
              startDate: `${input.projectInfo.cod.slice(0, 4)}-06-01`,
              endDate: `${Number(input.projectInfo.cod.slice(0, 4)) + years}-06-01`,
              mwhPerYear: park.p50MwhPerYear,
              balancingRequired: true,
              curtailmentPct: park.technology === 'WIND_OFFSHORE' ? 6.5 : 3.8,
            }
          }),
        )
        const quote: Quote = {
          id,
          reference,
          status: 'Draft',
          countryCode: input.countryCode,
          currency: input.currency,
          customerId: input.customerId,
          customerName: input.customerName,
          isNewCustomer: input.isNewCustomer,
          cePendingCustomerName: input.isNewCustomer ? input.customerName : undefined,
          productionTypes: input.productionTypes,
          direction: input.direction,
          contractType: input.contractType,
          priority: 'Medium',
          hedgingRequired: true,
          deadline: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
          createdBy: input.createdBy,
          createdAt: new Date().toISOString(),
          parks: input.parks,
          desksRequired: input.desksRequired,
          deskStatus,
          deskAssignee: {},
          tenorRows,
          spvLinks: [],
          runs: [],
          projectInfo: input.projectInfo,
          productName: input.productName,
          datasetRef: input.datasetRef,
        }
        set((s) => ({ quotes: [quote, ...s.quotes] }))
        get().logAudit(id, 'created', input.createdBy, `${reference} created (Draft)`)
        return id
      },

      submitQuote: (quoteId) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!quote) return
        const spvLinks = quote.parks.map((p) => ({ parkId: p.id, parkName: p.name, state: 'PLACEHOLDER' as const }))
        set((s) => ({
          quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'Submitted' as const, spvLinks } : q)),
        }))
        get().logAudit(quoteId, 'submitted', quote.createdBy, 'Draft → Submitted')
        get().logAudit(
          quoteId,
          'spv-placeholder',
          'system',
          spvLinks.map((s) => `${quote.reference}-P-${slug(s.parkName)}`).join(' + '),
        )
        get().logAudit(quoteId, 'desk-routed', 'system', `${quote.desksRequired.join(' + ')} notified`)
      },

      pickUpDesk: (quoteId, desk, actor) => {
        set((s) => ({
          quotes: s.quotes.map((q) => {
            if (q.id !== quoteId) return q
            const status: Quote['status'] = q.status === 'Submitted' ? 'InPricing' : q.status
            return {
              ...q,
              status,
              deskStatus: { ...q.deskStatus, [desk]: 'Assigned' },
              deskAssignee: { ...q.deskAssignee, [desk]: actor },
              runs: [...q.runs, { id: `run-${quoteId}-${desk}-${Date.now()}`, desk, version: (q.runs.filter((r) => r.desk === desk).length || 0) + 1, status: 'Draft', analyst: actor, results: [] }],
            }
          }),
        }))
        get().logAudit(quoteId, 'desk-pickup', actor, `${desk} run created`)
      },

      applyTemplate: (quoteId, desk, templateId, baseload) => {
        const template = get().templates.find((t) => t.id === templateId)
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!template || !quote) return
        const factorMap = Object.fromEntries(template.factors.map((f) => [f.key, f.value]))
        const results = quote.tenorRows.map((row) => {
          if (desk === 'FAT') {
            const { withCurtailment, withoutCurtailment } = computeFatRow(
              baseload,
              {
                cannibalisationPct: (factorMap.cannibalisationPct ?? -18) / 100,
                volumeRiskPct: (factorMap.volumeRiskPct ?? -5) / 100,
                marginPct: (factorMap.marginPct ?? -4.5) / 100,
                marginOffset: factorMap.marginOffset ?? 0.15,
              },
              row.curtailmentPct / 100,
            )
            return { tenorRowId: row.id, parkName: row.parkName, tenor: row.tenor, withCurtailment, withoutCurtailment }
          }
          const fee = row.tenor === '1Y' ? factorMap.balancingFee1y : row.tenor === '2Y' ? factorMap.balancingFee2y : factorMap.balancingFee3y
          const c = flatBalancingComponents(fee ?? 2.4)
          return { tenorRowId: row.id, parkName: row.parkName, tenor: row.tenor, withCurtailment: c, withoutCurtailment: c }
        })
        const avgPrice = Math.round((results.reduce((sum, r) => sum + r.withCurtailment.power, 0) / results.length) * 100) / 100
        set((s) => ({
          quotes: s.quotes.map((q) => {
            if (q.id !== quoteId) return q
            const runs = [...q.runs]
            const idx = runs.map((r) => r.desk).lastIndexOf(desk)
            if (idx >= 0) runs[idx] = { ...runs[idx], templateId, results, avgPrice }
            return { ...q, deskStatus: { ...q.deskStatus, [desk]: 'InProgress' }, runs }
          }),
        }))
        get().logAudit(quoteId, 'template-applied', quote.deskAssignee[desk] ?? 'system', template.name)
      },

      submitRun: (quoteId, desk, incomingResults, incomingAvgPrice) => {
        const quote = get().quotes.find((q) => q.id === quoteId)
        if (!quote) return
        const actor = quote.deskAssignee[desk] ?? 'system'
        const run = [...quote.runs].reverse().find((r) => r.desk === desk)
        set((s) => ({
          quotes: s.quotes.map((q) => {
            if (q.id !== quoteId) return q
            const runs = q.runs.map((r) => {
              if (r.id !== run?.id) return r
              const results = incomingResults ?? r.results
              const avgPrice = incomingAvgPrice ?? r.avgPrice
              return { ...r, status: 'Submitted' as const, submittedAt: new Date().toISOString(), results, avgPrice }
            })
            const deskStatus = { ...q.deskStatus, [desk]: 'Submitted' as const }
            const allDone = q.desksRequired.every((d) => deskStatus[d] === 'Submitted')
            return { ...q, runs, deskStatus, status: allDone ? 'PricingComplete' : q.status }
          }),
        }))
        const savedRun = get().quotes.find(q => q.id === quoteId)?.runs.find(r => r.id === run?.id)
        get().logAudit(quoteId, 'desk-priced', actor, `${desk} v${run?.version ?? 1} · avg ${savedRun?.avgPrice?.toFixed(2) ?? '—'}`)
        const updated = get().quotes.find((q) => q.id === quoteId)
        if (updated && updated.status === 'PricingComplete') {
          get().logAudit(quoteId, 'status-transition', 'system', 'InPricing → PricingComplete')
        }
      },

      requestRevision: (quoteId, desk, actor) => {
        set((s) => ({
          quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'RevisionRequested', deskStatus: { ...q.deskStatus, [desk]: 'InProgress' } } : q)),
        }))
        get().logAudit(quoteId, 'status-transition', actor, `Revision requested on ${desk}`)
      },

      linkSpv: (quoteId, parkId, spvName, spvId, actor) => {
        set((s) => ({
          quotes: s.quotes.map((q) =>
            q.id !== quoteId
              ? q
              : { ...q, spvLinks: q.spvLinks.map((sp) => (sp.parkId === parkId ? { ...sp, state: 'LINKED', spvName, spvId } : sp)) },
          ),
        }))
        get().logAudit(quoteId, 'spv-linked', actor, `${parkId} → ${spvName}`)
      },

      reuseOpportunity: (quoteId, parkId, spvName, spvId, opportunityId, actor) => {
        set((s) => ({
          quotes: s.quotes.map((q) =>
            q.id !== quoteId
              ? q
              : { ...q, spvLinks: q.spvLinks.map((sp) => (sp.parkId === parkId ? { ...sp, state: 'LINKED', spvName, spvId, opportunityId } : sp)) },
          ),
        }))
        get().logAudit(quoteId, 'spv-linked', actor, `${parkId} → ${spvName}`)
        get().logAudit(quoteId, 'opp-created', actor, `CRM ${opportunityId} (reused from existing)`)
      },

      createOpportunity: (quoteId, parkId, actor) => {
        const oppId = `OPP-${Math.floor(10000 + Math.random() * 89999)}`
        set((s) => ({
          quotes: s.quotes.map((q) =>
            q.id !== quoteId ? q : { ...q, spvLinks: q.spvLinks.map((sp) => (sp.parkId === parkId ? { ...sp, opportunityId: oppId } : sp)) },
          ),
        }))
        get().logAudit(quoteId, 'opp-created', actor, `CRM ${oppId}`)
      },

      triggerFrontSheet: (quoteId, parkId, actor) => {
        set((s) => ({
          quotes: s.quotes.map((q) =>
            q.id !== quoteId
              ? q
              : { ...q, spvLinks: q.spvLinks.map((sp) => (sp.parkId === parkId ? { ...sp, frontSheetStatus: 'PENDING', kycStatus: 'PENDING', creditStatus: 'PENDING' } : sp)) },
          ),
        }))
        get().logAudit(quoteId, 'fs-triggered', actor, `Front-sheet workflow initiated for ${parkId}`)
        setTimeout(() => {
          set((s) => ({
            quotes: s.quotes.map((q) =>
              q.id !== quoteId
                ? q
                : { ...q, spvLinks: q.spvLinks.map((sp) => (sp.parkId === parkId ? { ...sp, frontSheetStatus: 'APPROVED', kycStatus: 'APPROVED', creditStatus: 'APPROVED' } : sp)) },
            ),
          }))
          get().logAudit(quoteId, 'fs-approved', 'CRM (webhook)', `Front sheet + KYC + credit approved for ${parkId}`)
        }, 2000)
      },

      linkCeCustomer: (quoteId, customerId) => {
        set((s) => ({
          quotes: s.quotes.map((q) => (q.id !== quoteId ? q : { ...q, customerId })),
        }))
        get().logAudit(quoteId, 'ce-linked', 'CE (webhook)', `Customer account linked: ${customerId}`)
      },

      deleteQuote: (quoteId) => {
        set((s) => ({ quotes: s.quotes.filter((q) => q.id !== quoteId) }))
      },

      finaliseQuote: (quoteId, actor) => {
        set((s) => ({ quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'Finalised' } : q)) }))
        get().logAudit(quoteId, 'contracts-created', actor, 'Quote finalised, draft contracts created')
      },

      rejectQuote: (quoteId, actor) => {
        set((s) => ({ quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'Rejected' } : q)) }))
        get().logAudit(quoteId, 'status-transition', actor, 'Rejected')
      },
    }),
    { name: 'orca.pricing' },
  ),
)
