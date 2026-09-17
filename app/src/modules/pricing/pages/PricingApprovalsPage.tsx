import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { DESK_LABEL } from '@/lib/pricingStatus'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import type { QuoteStatus } from '@/mock/pricing/types'

const DESK_COLORS = {
  FAT:   { text: '#F97316', bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.3)' },
  RAM:   { text: '#3FB950', bg: 'rgba(63,185,80,.1)',  border: 'rgba(63,185,80,.3)'  },
  GREEN: { text: '#34D399', bg: 'rgba(52,211,153,.1)', border: 'rgba(52,211,153,.3)' },
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'var(--color-text-muted)', Submitted: 'var(--color-info)', InPricing: 'var(--color-info)',
  PricingComplete: 'var(--color-accent)', UnderReview: 'var(--color-accent)',
  RevisionRequested: 'var(--color-warning)', Finalised: 'var(--color-success)',
  Approved: 'var(--color-success)', Rejected: 'var(--color-danger)',
}
const STATUS_LABELS: Record<string, string> = {
  PricingComplete: 'Pricing Complete', UnderReview: 'Under Review',
}

type FilterTab = 'All' | 'Pending' | 'Completed'

export function PricingApprovalsPage() {
  const allQuotes = usePricingStore((s) => s.quotes)
  const { finaliseQuote, rejectQuote } = usePricingStore()
  const user = useSessionStore((s) => s.user())
  const navigate = useNavigate()
  const [tab, setTab] = useState<FilterTab>('All')

  const actionable: QuoteStatus[] = ['PricingComplete', 'UnderReview']
  const completed: QuoteStatus[] = ['Finalised', 'Approved', 'Rejected']

  const quotes = useMemo(() => {
    const all = allQuotes.filter(q => actionable.includes(q.status) || completed.includes(q.status))
    if (tab === 'Pending') return all.filter(q => actionable.includes(q.status))
    if (tab === 'Completed') return all.filter(q => completed.includes(q.status))
    return all
  }, [allQuotes, tab])

  const pendingCount = allQuotes.filter(q => actionable.includes(q.status)).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Pricing</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Approvals</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>Originator inbox — pricing requests returned by the desks.</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>
            {pendingCount} pending review
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--color-border)' }}>
        {(['All', 'Pending', 'Completed'] as FilterTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: t === tab ? '2px solid var(--color-accent)' : '2px solid transparent', color: t === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)', transition: 'all 120ms' }}>
            {t}
            {t === 'Pending' && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--color-accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 9999, fontFamily: 'var(--font-mono)' }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {quotes.length === 0 && <EmptyState title="Nothing here" description={tab === 'Pending' ? 'No pricing requests pending your review.' : 'No completed approvals yet.'} />}
        {quotes.map(q => {
          const isPending = actionable.includes(q.status)
          const sc = STATUS_COLORS[q.status] ?? 'var(--color-text-muted)'
          const dummySPVs = q.spvLinks.filter(s => s.state === 'PLACEHOLDER').length
          const fatRun = q.runs.filter(r => r.desk === 'FAT' && r.status === 'Submitted').pop()
          const ramRun = q.runs.filter(r => r.desk === 'RAM' && r.status === 'Submitted').pop()
          const offerReady = !!fatRun
          const ramBalRange = ramRun?.results?.length
            ? `${Math.min(...ramRun.results.map(r => r.withCurtailment.power)).toFixed(2)}–${Math.max(...ramRun.results.map(r => r.withCurtailment.power)).toFixed(2)}`
            : ramRun?.avgPrice != null ? `${ramRun.avgPrice.toFixed(2)}` : null

          return (
            <div key={q.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => navigate(`/quotes/${q.id}`)} style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {q.reference}
                    </button>
                    <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: sc, background: `color-mix(in srgb, ${sc} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${sc} 30%, transparent)` }}>
                      {STATUS_LABELS[q.status] ?? q.status}
                    </span>
                    {dummySPVs > 0 && (
                      <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-warning)', background: 'rgba(210,153,34,.1)', border: '1px solid rgba(210,153,34,.3)' }}>
                        {dummySPVs} SPV dummy
                      </span>
                    )}
                    {offerReady && isPending && (
                      <button onClick={() => navigate(`/quotes/${q.id}?tab=3`)} style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', border: `1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)`, cursor: 'pointer' }}>
                        Indicative Offer ready ↗
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {q.customerName} · {q.countryCode} · {q.productionTypes.join(', ')} · {q.parks.length} park{q.parks.length !== 1 ? 's' : ''} · by {q.createdBy.split('@')[0]}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                  Deadline: <strong style={{ color: 'var(--color-text-primary)' }}>{q.deadline || '—'}</strong>
                </div>
              </div>

              {/* Desk run badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {q.desksRequired.map(desk => {
                  const dc = DESK_COLORS[desk]
                  const submitted = q.runs.filter(r => r.desk === desk && r.status === 'Submitted').pop()
                  const label = desk === 'FAT' && submitted
                    ? `✓ FAT · avg ${submitted.avgPrice?.toFixed(2) ?? '—'}`
                    : desk === 'RAM' && submitted && ramBalRange
                    ? `✓ RAM · Bal ${ramBalRange}`
                    : submitted ? `✓ ${DESK_LABEL[desk]}` : `${DESK_LABEL[desk]} · queued`
                  return (
                    <span key={desk} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, background: submitted ? dc.bg : 'var(--color-bg-tertiary)', color: submitted ? dc.text : 'var(--color-text-muted)', border: `1px solid ${submitted ? dc.border : 'var(--color-border)'}` }}>
                      {label}
                    </span>
                  )
                })}
              </div>

              {/* Actions */}
              {isPending && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/quotes/${q.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer' }}>
                    Review &amp; Finalise <ArrowRight size={13} />
                  </button>
                  <button onClick={() => finaliseQuote(q.id, user.email)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-bg-tertiary)', color: 'var(--color-success)', border: '1px solid rgba(63,185,80,.4)', cursor: 'pointer' }}>
                    <CheckCircle2 size={13} /> Finalise
                  </button>
                  <button onClick={() => rejectQuote(q.id, user.email)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--color-danger)', border: '1px solid rgba(248,81,73,.4)', cursor: 'pointer' }}>
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
              {!isPending && (
                <button onClick={() => navigate(`/quotes/${q.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                  View quote <ArrowRight size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
