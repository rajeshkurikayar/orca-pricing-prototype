import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { usePricingStore } from '@/store/pricing'
import type { PricingAuditEventType } from '@/mock/pricing/types'

const EVENT_COLOR: Partial<Record<PricingAuditEventType, string>> = {
  created: 'var(--color-text-muted)',
  submitted: 'var(--color-info)',
  'status-transition': 'var(--color-accent)',
  'desk-routed': 'var(--color-info)',
  'desk-pickup': 'var(--color-info)',
  'template-applied': 'var(--color-text-secondary)',
  'desk-priced': 'var(--color-success)',
  'spv-placeholder': 'var(--color-warning)',
  'spv-linked': 'var(--color-info)',
  'opp-created': 'var(--color-success)',
  'fs-triggered': 'var(--color-accent)',
  'kyc-approved': 'var(--color-success)',
  'credit-approved': 'var(--color-success)',
  'fs-approved': 'var(--color-success)',
  'offer-generated': 'var(--color-accent)',
  'contracts-created': 'var(--color-success)',
  'ce-linked': 'var(--color-info)',
}

function transitionFrom(eventType: PricingAuditEventType, detail: string): string {
  if (eventType === 'submitted') return 'Draft → Submitted'
  if (eventType === 'status-transition') return detail
  if (eventType === 'desk-priced') return 'InPricing → PricingComplete'
  return '—'
}

export function PricingAuditPage() {
  const audit = usePricingStore((s) => s.audit)
  const quotes = usePricingStore((s) => s.quotes)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return audit
    const q = query.toLowerCase()
    return audit.filter((a) => a.detail.toLowerCase().includes(q) || a.actor.toLowerCase().includes(q) || a.eventType.includes(q))
  }, [audit, query])

  function exportCSV() {
    const header = 'Timestamp,Quote,Event,Transition,Actor,Detail'
    const rows = filtered.map(a => {
      const quote = quotes.find(q => q.id === a.quoteId)
      const ref = quote?.reference ?? a.quoteId
      const transition = transitionFrom(a.eventType, a.detail)
      return [formatDateTime(a.timestamp), ref, a.eventType, transition, a.actor, `"${a.detail.replace(/"/g, '""')}"`].join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Pricing</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Audit Trail</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>Complete event log for the pricing request lifecycle.</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* Search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actor, event, detail..."
          style={{ width: 320, height: 32, padding: '0 12px', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none', marginBottom: 14 }}
        />

        {/* Table */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                {['Timestamp', 'Quote', 'Event', 'Transition', 'Actor', 'Detail'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No events match your search.</td></tr>
              )}
              {filtered.map(a => {
                const quote = quotes.find(q => q.id === a.quoteId)
                const c = EVENT_COLOR[a.eventType] ?? 'var(--color-text-secondary)'
                const transition = transitionFrom(a.eventType, a.detail)
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        <Clock size={11} style={{ flexShrink: 0 }} /> {formatDateTime(a.timestamp)}
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      {quote && (
                        <button onClick={() => navigate(`/quotes/${quote.id}`)} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {quote.reference}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)` }}>
                        {a.eventType.replace(/-/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: transition === '—' ? 'var(--color-text-muted)' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{transition}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{a.actor}</td>
                    <td style={{ padding: '9px 14px', fontSize: 12, color: 'var(--color-text-primary)' }}>{a.detail}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
