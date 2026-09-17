import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, RotateCcw, Send, UserCheck, Clock } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { STATUS_LABEL, DESK_LABEL } from '@/lib/pricingStatus'
import { formatDateTime } from '@/lib/format'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import type { Desk, QuoteStatus } from '@/mock/pricing/types'

// ─── Mini design tokens ───────────────────────────────────────────────────────

const DESK_COLORS: Record<Desk, { text: string; bg: string; border: string }> = {
  FAT:   { text: '#F97316', bg: 'rgba(249,115,22,.1)',  border: 'rgba(249,115,22,.35)' },
  RAM:   { text: '#3FB950', bg: 'rgba(63,185,80,.1)',   border: 'rgba(63,185,80,.35)'  },
  GREEN: { text: '#34D399', bg: 'rgba(52,211,153,.1)',  border: 'rgba(52,211,153,.35)' },
}

function statusColor(s: QuoteStatus) {
  const map: Record<string, string> = {
    Draft: 'var(--color-text-muted)', Submitted: 'var(--color-info)', InPricing: 'var(--color-info)',
    PricingComplete: 'var(--color-accent)', UnderReview: 'var(--color-accent)',
    RevisionRequested: 'var(--color-warning)', Finalised: 'var(--color-success)',
    Approved: 'var(--color-success)', Rejected: 'var(--color-danger)',
  }
  return map[s] ?? 'var(--color-text-muted)'
}

// ─── Local primitives (no Tailwind) ──────────────────────────────────────────

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
      {label}
    </span>
  )
}

function Btn({ children, variant = 'secondary', onClick, disabled, size = 'md' }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; onClick?: () => void; disabled?: boolean; size?: 'sm' | 'md'
}) {
  const h = size === 'sm' ? 26 : 30
  const px = size === 'sm' ? 8 : 12
  const fs = size === 'sm' ? 11 : 12
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, height: h, padding: `0 ${px}px`, borderRadius: 'var(--radius-md)', fontSize: fs, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, border: 'none', transition: 'all 120ms', whiteSpace: 'nowrap' as const }
  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--color-accent)',       color: 'var(--color-on-accent)' },
    secondary: { background: 'var(--color-bg-tertiary)',  color: 'var(--color-text-primary)',   border: '1px solid var(--color-border)' },
    danger:    { background: 'transparent',               color: 'var(--color-danger)',          border: '1px solid color-mix(in srgb, var(--color-danger) 40%, transparent)' },
    ghost:     { background: 'transparent',               color: 'var(--color-text-secondary)', border: '1px solid transparent' },
  }
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 12 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  )
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  )
}

// ─── QuoteDetailPage ──────────────────────────────────────────────────────────

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const quotes = usePricingStore(s => s.quotes)
  const quote = quotes.find(q => q.id === id)
  const { submitQuote, finaliseQuote, rejectQuote } = usePricingStore()
  const roleData = useSessionStore(s => s.role())
  const user = useSessionStore(s => s.user())
  const [tab, setTab] = useState(() => {
    const t = parseInt(searchParams.get('tab') ?? '0', 10)
    return isNaN(t) || t < 0 ? 0 : t
  })

  const caps = roleData.capabilities
  const isAnalyst = !!(caps.canPriceResponse || caps.canPriceFat || caps.canPriceRam || caps.canPriceGreen)
  const canOriginate = !!(caps.canCreateRequest || caps.isAdmin)
  const canSubmit = !!(caps.canSubmitRequest || caps.isAdmin)
  const canPrice = !!(caps.canPriceResponse || caps.isAdmin)

  // Tabs differ by role
  const TABS = isAnalyst
    ? ['Overview', 'Submission Details', 'Pricing Workspace', 'Audit Trail'] as const
    : ['Overview', 'Submission Details', 'Desk Responses', 'Approval & Offer', 'Audit Trail'] as const

  if (!quote) {
    return <div style={{ padding: 24 }}><EmptyState title="Quote not found" /></div>
  }

  const sc = statusColor(quote.status)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <button onClick={() => navigate('/quotes')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}>
            <ArrowLeft size={12} /> Quotes
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{quote.reference}</h1>
            <Pill label={STATUS_LABEL[quote.status] ?? quote.status} color={sc} />
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {quote.customerName} · {quote.countryCode} · {quote.parks.length} park{quote.parks.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {quote.status === 'Draft' && canSubmit && (
            <>
              <Btn variant="secondary" onClick={() => navigate(`/quotes/${quote.id}/edit`)}>Edit</Btn>
              <Btn variant="primary" onClick={() => submitQuote(quote.id)}>
                <Send size={13} /> Submit
              </Btn>
            </>
          )}
          {(quote.status === 'PricingComplete' || quote.status === 'UnderReview') && canOriginate && (
            <>
              <Btn variant="danger" onClick={() => rejectQuote(quote.id, user.email)}>Reject</Btn>
              <Btn variant="primary" onClick={() => finaliseQuote(quote.id, user.email)}>Finalise</Btn>
            </>
          )}
          {(['Submitted', 'InPricing'] as QuoteStatus[]).includes(quote.status) && canPrice && (
            <Btn variant="primary" onClick={() => navigate(`/quotes/${quote.id}/pricing`)}>
              <ExternalLink size={13} /> Open Workspace
            </Btn>
          )}
          {quote.status === 'RevisionRequested' && canPrice && (
            <Btn variant="secondary" onClick={() => navigate(`/quotes/${quote.id}/pricing`)}>
              <RotateCcw size={13} /> Reprice
            </Btn>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: i === tab ? '2px solid var(--color-accent)' : '2px solid transparent', color: i === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)', transition: 'all 120ms' }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '20px' }}>
        {tab === 0 && <OverviewTab quoteId={quote.id} />}
        {tab === 1 && <SubmissionTab quoteId={quote.id} />}
        {tab === 2 && (isAnalyst
          ? <PricingWorkspaceTab quoteId={quote.id} />
          : <DeskResponsesTab quoteId={quote.id} />
        )}
        {!isAnalyst && tab === 3 && <ApprovalOfferTab quoteId={quote.id} />}
        {(isAnalyst ? tab === 3 : tab === 4) && <AuditTab quoteId={quote.id} />}
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const PIPELINE: QuoteStatus[] = ['Draft', 'Submitted', 'InPricing', 'PricingComplete', 'UnderReview', 'Finalised']

function OverviewTab({ quoteId }: { quoteId: string }) {
  const quote = usePricingStore(s => s.quotes.find(q => q.id === quoteId))!
  const navigate = useNavigate()
  const idx = PIPELINE.indexOf(quote.status)
  const latestSubmittedRun = [...quote.runs].reverse().find(r => r.status === 'Submitted')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Pipeline */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 10 }}>Status pipeline</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {PIPELINE.map((s, i) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: i <= idx && idx >= 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {i <= idx && idx >= 0 ? '✓' : '○'} {STATUS_LABEL[s]}
              {i < PIPELINE.length - 1 && <span style={{ color: 'var(--color-border-strong)', marginLeft: 6 }}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {latestSubmittedRun && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-accent)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Latest Strike Price · {latestSubmittedRun.desk} v{latestSubmittedRun.version}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1 }}>{latestSubmittedRun.avgPrice?.toFixed(2) ?? '—'}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{quote.currency}/MWh</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--color-text-muted)' }}>
            <div>by {latestSubmittedRun.analyst ?? '—'}</div>
            {latestSubmittedRun.submittedAt && <div style={{ marginTop: 2 }}>{new Date(latestSubmittedRun.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Section title="Deal summary">
          <KV label="Production type" value={quote.productionTypes.join(', ')} />
          <KV label="Direction" value={quote.direction} />
          <KV label="Contract type" value={quote.contractType} />
          <KV label="Product" value={quote.productName || '—'} />
          <KV label="Priority" value={quote.priority} />
          <KV label="Deadline" value={quote.deadline || '—'} />
          <KV label="Created by" value={quote.createdBy} />
          <KV label="Assigned PM" value={quote.createdBy.split('@')[0].replace('.', ' ')} />
        </Section>
        <Section
          title={`Parks (${quote.parks.length})`}
          action={
            <button
              onClick={() => navigate(`/quotes/${quote.id}/assets`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ExternalLink size={11} /> Assets &amp; Files
            </button>
          }
        >
          {quote.parks.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500 }}>{p.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{p.capacityMw} MW</span>
                <Pill label={p.existing ? 'Existing' : 'New'} color={p.existing ? 'var(--color-info)' : 'var(--color-text-muted)'} />
                <button
                  onClick={() => navigate(`/quotes/${quote.id}/assets/chart?parkId=${p.id}`)}
                  style={{ fontSize: 11, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  Time-series ↗
                </button>
              </div>
            </div>
          ))}
        </Section>
      </div>
      <SpvPanel quoteId={quoteId} />
    </div>
  )
}

// ─── Submission Details Tab ───────────────────────────────────────────────────

function SubmissionTab({ quoteId }: { quoteId: string }) {
  const quote = usePricingStore(s => s.quotes.find(q => q.id === quoteId))!
  const info = quote.projectInfo

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Section title="Company information">
          <KV label="Company name" value={info.companyName} />
          <KV label="VAT number" value={info.vatNumber ?? '—'} />
          <KV label="COD" value={info.cod} />
          <KV label="Contract tenor" value={`${info.contractTenorYears} years`} />
          <KV label="Building permit" value={info.buildingPermit} />
          <KV label="Financing" value={info.financingType} />
        </Section>
        <Section title="Technical contact">
          <KV label="Name" value={info.technicalContactName} />
          <KV label="Title" value={info.technicalContactTitle} />
          <KV label="Phone" value={info.technicalContactPhone} />
          <KV label="Email" value={info.technicalContactEmail} />
        </Section>
      </div>

      <Section title={`Tenor rows (${quote.tenorRows.length})`}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-tertiary)' }}>
              {['Park', 'Tenor', 'Start → End', 'MWh/yr', 'Curtailment'].map(h => (
                <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quote.tenorRows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: '7px 10px', fontSize: 12, color: 'var(--color-text-primary)' }}>{r.parkName}</td>
                <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.tenor}</td>
                <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.startDate} → {r.endDate}</td>
                <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.mwhPerYear.toLocaleString()}</td>
                <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.curtailmentPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}

// ─── Pricing Workspace Tab (analyst view, §23) ────────────────────────────────

function PricingWorkspaceTab({ quoteId }: { quoteId: string }) {
  const quote = usePricingStore(s => s.quotes.find(q => q.id === quoteId))!
  const { pickUpDesk } = usePricingStore()
  const roleData = useSessionStore(s => s.role())
  const user = useSessionStore(s => s.user())
  const navigate = useNavigate()

  const caps = roleData.capabilities
  function canPickDesk(desk: Desk) {
    if (caps.isAdmin) return true
    if (desk === 'FAT') return !!(caps.canPriceFat || caps.canPriceResponse)
    if (desk === 'RAM') return !!(caps.canPriceRam || caps.canPriceResponse)
    return !!(caps.canPriceGreen || caps.canPriceResponse)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {quote.desksRequired.map(desk => {
        const dc = DESK_COLORS[desk]
        const status = quote.deskStatus[desk]
        const assignee = quote.deskAssignee[desk]
        const submittedRun = [...quote.runs].reverse().find(r => r.desk === desk && r.status === 'Submitted')

        return (
          <div key={desk} style={{ background: 'var(--color-bg-secondary)', border: `1px solid var(--color-border)`, borderLeft: `3px solid ${dc.text}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {/* Desk header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dc.text }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{DESK_LABEL[desk]} Desk</span>
                <span style={{ padding: '1px 7px', borderRadius: 'var(--radius-sm)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}>
                  {status === 'NotRequired' ? 'Not Required' : status === 'Pending' ? 'Pending' : status === 'Assigned' ? 'Assigned' : status === 'InProgress' ? 'In Pricing' : 'Submitted'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!assignee && canPickDesk(desk) && (
                  <Btn size="sm" variant="primary" onClick={() => pickUpDesk(quote.id, desk, user.email)}>
                    <UserCheck size={12} /> Pick Up
                  </Btn>
                )}
                {assignee && (
                  <Btn size="sm" variant="secondary" onClick={() => navigate(`/quotes/${quote.id}/pricing?desk=${desk.toLowerCase()}`)}>
                    <ExternalLink size={12} /> Open Workspace
                  </Btn>
                )}
              </div>
            </div>

            <div style={{ padding: '14px 16px' }}>
              {assignee && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Assigned to <strong style={{ color: 'var(--color-text-primary)' }}>{assignee}</strong>
                </div>
              )}

              {submittedRun ? (
                <div>
                  {/* Hero power price */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      {desk}-Adjusted Strike Price
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1 }}>
                        {submittedRun.avgPrice?.toFixed(2) ?? '—'}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{quote.currency}/MWh</span>
                    </div>
                  </div>

                  {/* Components breakdown */}
                  {submittedRun.results.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Park · Tenor', 'With Curtailment', 'Without Curtailment'].map(h => (
                            <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Park · Tenor' ? 'left' : 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {submittedRun.results.map(r => (
                          <tr key={r.tenorRowId} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                            <td style={{ padding: '6px 8px', color: 'var(--color-text-primary)' }}>{r.parkName} · {r.tenor}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-warning)' }}>{r.withCurtailment.power.toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-info)' }}>{r.withoutCurtailment.power.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  {!assignee ? 'Not yet picked up.' : 'Pricing in progress — no submitted run yet.'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Desk Responses Tab (originator view) ────────────────────────────────────

interface SpvCandidate {
  name: string; id: string
  existingOpportunityId?: string
  existingOppOwner?: string
  existingOppSourceRef?: string
  existingOppProduct?: string
  existingOppCreatedAt?: string
}

function DeskResponsesTab({ quoteId }: { quoteId: string }) {
  const quote = usePricingStore(s => s.quotes.find(q => q.id === quoteId))!
  const { pickUpDesk } = usePricingStore()
  const caps = useSessionStore(s => s.role().capabilities)
  const user = useSessionStore(s => s.user())
  const navigate = useNavigate()

  function canPickDesk(desk: Desk) {
    if (caps.isAdmin) return true
    if (desk === 'FAT') return !!(caps.canPriceFat || caps.canPriceResponse)
    if (desk === 'RAM') return !!(caps.canPriceRam || caps.canPriceResponse)
    return !!(caps.canPriceGreen || caps.canPriceResponse)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {quote.desksRequired.map(desk => {
          const dc = DESK_COLORS[desk]
          const status = quote.deskStatus[desk]
          const assignee = quote.deskAssignee[desk]
          const runs = quote.runs.filter(r => r.desk === desk)
          const latestRun = runs[runs.length - 1]

          return (
            <div key={desk} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${dc.text}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dc.text }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>{DESK_LABEL[desk]} Desk</span>
                </div>
                <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}>
                  {status === 'NotRequired' ? 'Not Required' : status === 'Pending' ? 'Pending' : status === 'Assigned' ? 'Assigned' : status === 'InProgress' ? 'In Pricing' : 'Submitted'}
                </span>
              </div>
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {assignee && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Assigned: <strong style={{ color: 'var(--color-text-primary)' }}>{assignee}</strong></div>}
                {!assignee && status === 'Pending' && canPickDesk(desk) && (
                  <Btn size="sm" variant="primary" onClick={() => pickUpDesk(quote.id, desk, user.email)}>
                    <UserCheck size={12} /> Pick Up
                  </Btn>
                )}
                {assignee && (
                  <Btn size="sm" variant="secondary" onClick={() => navigate(`/quotes/${quote.id}/pricing`)}>
                    <ExternalLink size={12} /> Open Workspace
                  </Btn>
                )}
                {latestRun?.status === 'Submitted' && (
                  <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', fontSize: 12, color: '#3FB950' }}>
                    v{latestRun.version} submitted · avg {latestRun.avgPrice} EUR/MWh
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SPV Panel ────────────────────────────────────────────────────────────────

function SpvPanel({ quoteId }: { quoteId: string }) {
  const quote = usePricingStore(s => s.quotes.find(q => q.id === quoteId))!
  const { linkSpv, reuseOpportunity, createOpportunity, triggerFrontSheet, linkCeCustomer } = usePricingStore()
  const user = useSessionStore(s => s.user())
  const [searchingFor, setSearchingFor] = useState<string | null>(null)
  const [conflict, setConflict] = useState<{ parkId: string; candidate: SpvCandidate } | null>(null)
  const [ceCountdown, setCeCountdown] = useState<number | null>(null)
  const [justLinked, setJustLinked] = useState<string | null>(null) // parkId just linked — show Create Opp banner

  useEffect(() => {
    if (ceCountdown === null) return
    if (ceCountdown <= 0) { linkCeCustomer(quoteId, `ce-cust-${Date.now()}`); setCeCountdown(null); return }
    const t = setTimeout(() => setCeCountdown(n => n !== null ? n - 1 : null), 1000)
    return () => clearTimeout(t)
  }, [ceCountdown, quoteId, linkCeCustomer])

  function candidateSpvs(parkId: string): SpvCandidate[] {
    const park = quote.parks.find(p => p.id === parkId)
    const parkWord = park?.name?.split(' ')[0] ?? 'Wind'
    const customer = quote.customerName.split(' ')[0]
    const idBase = 80000 + (parkId.charCodeAt(0) * 317) % 9999
    const hasConflict = park?.existing
    const oppId = hasConflict ? `OPP-${(idBase % 90000) + 10000}` : undefined
    // Real-name-style candidates — edit SPV_MOCK_CANDIDATES in QuoteDetailPage.tsx to customise
    return [
      {
        name: `${quote.customerName} ${parkWord} GmbH & Co. KG`,
        id: `SPV-${idBase}`,
        existingOpportunityId: oppId,
        existingOppOwner: hasConflict ? 'Priya Shah' : undefined,
        existingOppSourceRef: hasConflict ? `PR-2025-DE-${String((idBase % 50) + 10).padStart(3, '0')}` : undefined,
        existingOppProduct: hasConflict ? 'Fixed Price PPA — Wind Onshore' : undefined,
        existingOppCreatedAt: hasConflict ? '2025-11-14' : undefined,
      },
      {
        name: `${customer} Renewables ${parkWord} SPV GmbH`,
        id: `SPV-${idBase + 1}`,
      },
      {
        name: `${customer} Energy Assets ${parkWord} GmbH`,
        id: `SPV-${idBase + 2}`,
      },
      {
        name: `${parkWord} Windpark Verwaltungs GmbH`,
        id: `SPV-${idBase + 3}`,
      },
    ]
  }

  function handleCandidateClick(parkId: string, candidate: SpvCandidate) {
    if (candidate.existingOpportunityId) {
      setConflict({ parkId, candidate })
    } else {
      linkSpv(quote.id, parkId, candidate.name, candidate.id, user.email)
      setSearchingFor(null)
      setJustLinked(parkId)
    }
  }

  if (quote.spvLinks.length === 0) return null

  const cePending = quote.isNewCustomer && quote.customerId === undefined
  const pillStyle = (color: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 600, color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` })

  return (
    <Section title="SPV & Approvals">
      {cePending && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-info-muted, rgba(88,166,255,.1))', border: '1px solid rgba(88,166,255,.3)', fontSize: 12, color: 'var(--color-info)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span>CE customer not yet linked — <strong>{quote.cePendingCustomerName}</strong> onboarding in progress. SPV search disabled.</span>
          {ceCountdown === null
            ? <Btn size="sm" variant="secondary" onClick={() => setCeCountdown(3)}>Simulate: CE registered</Btn>
            : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0 }}>Linking in {ceCountdown}s…</span>
          }
        </div>
      )}

      {justLinked && (() => {
        const sp = quote.spvLinks.find(s => s.parkId === justLinked)
        if (!sp || sp.opportunityId) { return null }
        return (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-info) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-info) 30%, transparent)', borderLeft: '3px solid var(--color-info)', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-primary)' }}>
              <strong style={{ color: 'var(--color-info)' }}>{sp.spvName}</strong> linked — create an opportunity now?
            </span>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { createOpportunity(quote.id, justLinked, user.email); setJustLinked(null) }} style={{ height: 28, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-info)', color: '#fff', border: 'none', cursor: 'pointer' }}>Create Opportunity</button>
              <button onClick={() => setJustLinked(null)} style={{ height: 28, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 12, background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }}>Dismiss</button>
            </div>
          </div>
        )
      })()}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Park', 'SPV', 'Opportunity', 'Front Sheet', 'KYC', 'Credit', 'Contract', 'Actions'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quote.spvLinks.map(sp => (
            <tr key={sp.parkId} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--color-text-primary)' }}>{sp.parkName}</td>
              <td style={{ padding: '8px 10px' }}>
                <span style={pillStyle(sp.state === 'LINKED' ? 'var(--color-info)' : 'var(--color-warning)')}>
                  {sp.state === 'LINKED' ? sp.spvName : 'Placeholder'}
                </span>
              </td>
              <td style={{ padding: '8px 10px' }}>
                <span style={pillStyle(sp.opportunityId ? 'var(--color-success)' : 'var(--color-text-muted)')}>
                  {sp.opportunityId ?? '—'}
                </span>
              </td>
              <td style={{ padding: '8px 10px' }}><ApprovalPill v={sp.frontSheetStatus} /></td>
              <td style={{ padding: '8px 10px' }}><ApprovalPill v={sp.kycStatus} /></td>
              <td style={{ padding: '8px 10px' }}><ApprovalPill v={sp.creditStatus} /></td>
              <td style={{ padding: '8px 10px' }}>
                {quote.status === 'Finalised' && sp.opportunityId
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 600, color: 'var(--color-success)', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', fontFamily: 'var(--font-mono)' }}>
                      C-{new Date().getFullYear()}-{quote.countryCode}-{sp.opportunityId.split('-').pop()}
                    </span>
                  : <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>
                }
              </td>
              <td style={{ padding: '8px 10px' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {sp.state === 'PLACEHOLDER' && (
                    <Btn size="sm" variant="secondary" disabled={cePending} onClick={() => setSearchingFor(sp.parkId)}>Search & Replace</Btn>
                  )}
                  {sp.state === 'LINKED' && !sp.opportunityId && (
                    <Btn size="sm" variant="primary" onClick={() => createOpportunity(quote.id, sp.parkId, user.email)}>Create Opportunity</Btn>
                  )}
                  {sp.opportunityId && !sp.frontSheetStatus && (
                    <Btn size="sm" variant="primary" onClick={() => triggerFrontSheet(quote.id, sp.parkId, user.email)}>Trigger Front Sheet</Btn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {searchingFor && (
        <Modal title="Link Real SPV" onClose={() => setSearchingFor(null)}>
          <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Search CRM for the correct SPV entity — scoped to <strong>{quote.customerName}</strong>.
          </p>
          {candidateSpvs(searchingFor).map(c => (
            <button key={c.id} onClick={() => handleCandidateClick(searchingFor, c)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500 }}>{c.name}</div>
                {c.existingOpportunityId && <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 2 }}>Open opportunity: {c.existingOpportunityId}</div>}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 12 }}>{c.id}</span>
            </button>
          ))}
        </Modal>
      )}

      {conflict && (
        <Modal title="Existing Opportunity Detected" onClose={() => setConflict(null)}>
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(210,153,34,.08)', border: '1px solid rgba(210,153,34,.3)', fontSize: 12 }}>
            <div style={{ color: 'var(--color-warning)', fontWeight: 600, marginBottom: 8 }}>
              <strong>{conflict.candidate.name}</strong> already has an open opportunity in CRM
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11 }}>
              {[
                ['Opportunity ID', conflict.candidate.existingOpportunityId ?? '—'],
                ['Owner', conflict.candidate.existingOppOwner ?? '—'],
                ['Source request', conflict.candidate.existingOppSourceRef ?? '—'],
                ['Product', conflict.candidate.existingOppProduct ?? '—'],
                ['Created', conflict.candidate.existingOppCreatedAt ?? '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {[
            { label: 'Reuse existing opportunity', desc: `Link this SPV and attach to ${conflict.candidate.existingOpportunityId}.`, action: () => { reuseOpportunity(quote.id, conflict.parkId, conflict.candidate.name, conflict.candidate.id, conflict.candidate.existingOpportunityId!, user.email); setSearchingFor(null); setConflict(null) } },
            { label: 'Create parallel opportunity', desc: 'Link this SPV and open a new CRM opportunity alongside.', action: () => { linkSpv(quote.id, conflict.parkId, conflict.candidate.name, conflict.candidate.id, user.email); createOpportunity(quote.id, conflict.parkId, user.email); setSearchingFor(null); setConflict(null) } },
            { label: 'Cancel — choose a different SPV', desc: '', action: () => setConflict(null) },
          ].map(opt => (
            <button key={opt.label} onClick={opt.action} style={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{opt.label}</span>
              {opt.desc && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>{opt.desc}</span>}
            </button>
          ))}
        </Modal>
      )}
    </Section>
  )
}

function ApprovalPill({ v }: { v?: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
  const [label, color] = !v ? ['—', 'var(--color-text-muted)'] : v === 'APPROVED' ? ['Approved', 'var(--color-success)'] : v === 'REJECTED' ? ['Rejected', 'var(--color-danger)'] : ['Pending', 'var(--color-warning)']
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 600, color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>{label}</span>
}

// ─── Approval & Offer Tab (originator only) ───────────────────────────────────

function ApprovalOfferTab({ quoteId }: { quoteId: string }) {
  const quote = usePricingStore(s => s.quotes.find(q => q.id === quoteId))!
  const fatRun = quote.runs.filter(r => r.desk === 'FAT' && r.status === 'Submitted').pop()
  const ramRun = quote.runs.filter(r => r.desk === 'RAM' && r.status === 'Submitted').pop()
  const [rangeCopied, setRangeCopied] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)

  if (!fatRun) return <EmptyState title="Not ready yet" description="Indicative Offer available once FAT pricing is submitted." />

  function ramFeeFor(tenorRowId: string, tenor: string): number {
    if (!ramRun) return 0
    const m = ramRun.results.find(r => r.tenorRowId === tenorRowId) ?? ramRun.results.find(r => r.tenor === tenor)
    return m?.withCurtailment.power ?? ramRun.avgPrice ?? 0
  }

  const rows = fatRun.results.map(r => {
    const fee = ramFeeFor(r.tenorRowId, r.tenor)
    return {
      ...r,
      fee,
      strike:   +(r.withCurtailment.power - fee).toFixed(2),
      strikeHi: +(r.withoutCurtailment.power - fee).toFixed(2),
      bl:   +r.withCurtailment.baseload.toFixed(2),
      cann: +r.withCurtailment.cannibalisation.toFixed(2),
      mg:   +r.withCurtailment.margin.toFixed(2),
    }
  })

  // Group rows by park name
  const parkNames = [...new Set(rows.map(r => r.parkName))]

  const emailSubject = `Indicative pricing · ${quote.customerName} · Centrica`
  const emailBody = [
    `Hi,`,
    ``,
    `Please find below the indicative pricing for ${parkNames.join(' and ')} — ${quote.contractType ?? 'Fixed Price PPA'} · Baseload.`,
    ``,
    ...rows.map(r => `${r.parkName} ${r.tenor}   ${r.strike.toFixed(1)} – ${r.strikeHi.toFixed(1)} EUR/MWh`),
    ``,
    `Firm price valid 5–15 minutes on refresh — happy to lock in a specific tenor once you confirm the deal shape.`,
    ``,
    `Best regards,`,
    quote.createdBy.split('@')[0],
  ]

  function copyRange() {
    const text = rows.map(r => `${r.parkName} ${r.tenor}: ${r.strike.toFixed(1)}–${r.strikeHi.toFixed(1)} EUR/MWh`).join('\n')
    navigator.clipboard.writeText(text).then(() => { setRangeCopied(true); setTimeout(() => setRangeCopied(false), 2000) })
  }
  function copyEmailBody() {
    navigator.clipboard.writeText(emailBody.join('\n')).then(() => { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000) })
  }
  function openOutlook() {
    window.location.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody.join('\n'))}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Left: internal breakdown */}
        <Section title="◆ Internal — not shared with customer">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                {['Row', 'BL', 'Cann', 'Bal', 'Mg', 'Strike'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Row' ? 'left' : 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: h === 'Strike' ? 'var(--color-warning)' : 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parkNames.map(park => (
                <>
                  <tr key={`${park}-hdr`} style={{ background: 'color-mix(in srgb, var(--color-bg-tertiary) 70%, transparent)' }}>
                    <td colSpan={6} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      📍 {park}
                    </td>
                  </tr>
                  {rows.filter(r => r.parkName === park).map(r => (
                    <tr key={r.tenorRowId} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '5px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.tenor}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{r.bl.toFixed(2)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{r.cann.toFixed(2)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{r.fee > 0 ? `−${r.fee.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{r.mg.toFixed(2)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)' }}>{r.strike.toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Right: customer-shareable range */}
        <Section title="▲ Customer-shareable — range only">
          <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Indicative pricing · {quote.customerName} · {quote.parks.length} park{quote.parks.length !== 1 ? 's' : ''} · DE PPA
          </div>
          {rows.map(r => (
            <div key={r.tenorRowId} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 12 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{r.parkName} {r.tenor}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                {r.strike.toFixed(1)} – {r.strikeHi.toFixed(1)} EUR/MWh
              </span>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 10, fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            Indicative range · firm price 5–15 min on refresh.
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={copyRange} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-bg-tertiary)', color: rangeCopied ? 'var(--color-success)' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
              {rangeCopied ? '✓ Copied' : '📋 Copy range'}
            </button>
            <button onClick={() => setShowEmail(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: showEmail ? 'var(--color-accent)' : 'transparent', color: showEmail ? 'var(--color-on-accent)' : 'var(--color-accent)', border: `1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)`, cursor: 'pointer' }}>
              ✉ {showEmail ? 'Hide email' : 'Generate email'}
            </button>
          </div>
        </Section>
      </div>

      {/* Inline email preview */}
      {showEmail && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-secondary)' }}>Email Draft — auto-generated · not auto-sent</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyEmailBody} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, background: 'var(--color-bg-primary)', color: emailCopied ? 'var(--color-success)' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                {emailCopied ? '✓ Copied' : '📋 Copy body'}
              </button>
              <button onClick={openOutlook} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer' }}>
                Open in Outlook
              </button>
            </div>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {[
              ['To', `anna@${quote.customerName.split(' ')[0].toLowerCase()}.de`],
              ['Subject', emailSubject],
              ['CC', 'contracting@centrica.com'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 16, padding: '4px 0', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 12 }}>
                <span style={{ width: 56, flexShrink: 0, color: 'var(--color-text-muted)', fontWeight: 600 }}>{k}</span>
                <span style={{ color: 'var(--color-text-primary)' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: 12.5, lineHeight: 1.8, color: 'var(--color-text-primary)' }}>
              {emailBody.map((line, i) => {
                const isPrice = /EUR\/MWh/.test(line)
                return (
                  <div key={i} style={{ fontFamily: isPrice ? 'var(--font-mono)' : undefined, color: isPrice ? 'var(--color-accent)' : undefined, fontWeight: isPrice ? 600 : undefined, minHeight: line ? undefined : '0.8em' }}>
                    {line || <>&nbsp;</>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Audit Trail Tab ──────────────────────────────────────────────────────────

function AuditTab({ quoteId }: { quoteId: string }) {
  const allAudit = usePricingStore(s => s.audit)
  const audit = useMemo(() => allAudit.filter(a => a.quoteId === quoteId), [allAudit, quoteId])

  if (audit.length === 0) return <EmptyState title="No audit events yet" />

  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--color-bg-tertiary)' }}>
            {['Timestamp', 'Event', 'Actor', 'Detail'].map(h => (
              <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {audit.map(a => (
            <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} />{formatDateTime(a.timestamp)}</div>
              </td>
              <td style={{ padding: '8px 12px' }}>
                <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }}>
                  {a.eventType.replace(/-/g, ' ')}
                </span>
              </td>
              <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{a.actor}</td>
              <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-primary)' }}>{a.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
