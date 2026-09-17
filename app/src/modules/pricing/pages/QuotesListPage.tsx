import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Pencil, Trash2, Send, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/format'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import type { Quote, QuoteStatus, Technology } from '@/mock/pricing/types'

const STATUS_FILTERS: { value: QuoteStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'InPricing', label: 'In Pricing' },
  { value: 'RevisionRequested', label: 'Revision Requested' },
  { value: 'PricingComplete', label: 'Pricing Complete' },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Finalised', label: 'Finalised' },
  { value: 'Rejected', label: 'Rejected' },
]

const TECH_LABEL: Record<Technology, string> = {
  WIND_ONSHORE: 'Wind Onshore',
  WIND_OFFSHORE: 'Wind Offshore',
  SOLAR: 'Solar',
}

const STATUS_RAW: Record<QuoteStatus, string> = {
  Draft: 'DRAFT',
  Submitted: 'SUBMITTED',
  InPricing: 'INPRICING',
  RevisionRequested: 'REVISIONREQUESTEDBYORIGINATOR',
  PricingComplete: 'PRICINGCOMPLETE',
  UnderReview: 'UNDERREVIEW',
  Finalised: 'FINALISED',
  Approved: 'APPROVED',
  Rejected: 'REJECTED',
}

const STATUS_COLORS: Record<QuoteStatus, React.CSSProperties> = {
  Draft:             { color: 'var(--color-text-primary)', fontWeight: 600 },
  Submitted:         { color: 'var(--color-accent)', fontWeight: 600 },
  InPricing:         { color: 'var(--color-text-muted)' },
  RevisionRequested: { color: 'var(--color-warning)' },
  PricingComplete:   { color: 'var(--color-text-muted)' },
  UnderReview:       { color: 'var(--color-status-review)' },
  Finalised:         { color: 'var(--color-text-muted)' },
  Approved:          { color: 'var(--color-success)', fontWeight: 600 },
  Rejected:          { color: 'var(--color-danger)', fontWeight: 600 },
}

function StatusText({ status }: { status: QuoteStatus }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', ...STATUS_COLORS[status] }}>
      {STATUS_RAW[status]}
    </span>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 10.5,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
  background: 'var(--color-bg-tertiary)',
  borderBottom: '1px solid var(--color-border)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '9px 14px',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border-subtle)',
  verticalAlign: 'middle',
}

export function QuotesListPage() {
  const quotes = usePricingStore((s) => s.quotes)
  const { submitQuote, finaliseQuote, deleteQuote } = usePricingStore()
  const role = useSessionStore((s) => s.role())
  const user = useSessionStore((s) => s.user)
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL')
  const [query, setQuery] = useState('')

  const activeCount = useMemo(
    () => quotes.filter((q) => !['Finalised', 'Approved', 'Rejected'].includes(q.status)).length,
    [quotes],
  )

  const filtered = useMemo(
    () =>
      quotes.filter((q) => {
        if (statusFilter !== 'ALL' && q.status !== statusFilter) return false
        if (query) {
          const s = query.toLowerCase()
          if (
            !q.reference.toLowerCase().includes(s) &&
            !q.customerName.toLowerCase().includes(s) &&
            !q.countryCode.toLowerCase().includes(s)
          )
            return false
        }
        return true
      }),
    [quotes, statusFilter, query],
  )

  const canOriginate = role.capabilities.canCreateRequest || role.capabilities.isAdmin
  const canSubmit = role.capabilities.canSubmitRequest || role.capabilities.isAdmin

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '16px 24px 20px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Pricing Requests</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {quotes.length} total ·{' '}
            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{activeCount} active</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={13} />
            Refresh
          </Button>
          {canOriginate && (
            <Button variant="primary" onClick={() => navigate('/pricing/quotes/new')}>
              + New Request
            </Button>
          )}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Filters */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', padding: '5px 10px' }}>
            <Search size={14} color="var(--color-text-muted)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by reference, customer or country..."
              style={{ width: 280, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--color-text-primary)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'ALL')}
            style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', padding: '5px 10px', fontSize: 13, color: 'var(--color-text-secondary)', outline: 'none' }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr>
                {['Reference', 'Customer / Country', 'Technology', 'Products', 'Parks', 'Priority', 'Desks', 'Status', 'Deadline', 'Created', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <QuoteRow
                  key={q.id}
                  q={q}
                  canSubmit={canSubmit}
                  canOriginate={canOriginate}
                  userEmail={user().email}
                  onSubmit={() => submitQuote(q.id)}
                  onFinalise={() => finaliseQuote(q.id, user().email)}
                  onDelete={() => deleteQuote(q.id)}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ ...tdStyle, textAlign: 'center', padding: '32px 14px', color: 'var(--color-text-muted)' }}>
                    No quotes match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function QuoteRow({
  q,
  canSubmit,
  canOriginate,
  onSubmit,
  onFinalise,
  onDelete,
}: {
  q: Quote
  canSubmit: boolean
  canOriginate: boolean
  userEmail: string
  onSubmit: () => void
  onFinalise: () => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const canFinalize = (q.status === 'PricingComplete' || q.status === 'UnderReview') && canOriginate

  return (
    <tr
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <td style={tdStyle}>
        <Link
          to={`/pricing/quotes/${q.id}`}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', textDecoration: 'none', fontWeight: 600 }}
        >
          {q.reference}
        </Link>
      </td>
      <td style={tdStyle}>
        <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{q.customerName}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{q.countryCode}</div>
      </td>
      <td style={tdStyle}>
        {q.productionTypes.map((t) => TECH_LABEL[t] ?? t).join(' · ')}
      </td>
      <td style={tdStyle}>{q.desksRequired.length}</td>
      <td style={tdStyle}>{q.parks.length}</td>
      <td style={tdStyle}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: q.priority === 'High' ? 600 : 400, color: q.priority === 'High' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
          {q.priority.toUpperCase()}
        </span>
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 4 }}>
          {q.desksRequired.map((d) => (
            <Badge key={d} variant={d === 'FAT' ? 'warning' : d === 'RAM' ? 'success' : 'accent'}>
              {d}
            </Badge>
          ))}
          {q.desksRequired.length === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>}
        </div>
      </td>
      <td style={tdStyle}>
        <StatusText status={q.status} />
      </td>
      <td style={tdStyle}>{q.deadline ? formatDate(q.deadline) : '—'}</td>
      <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{formatDate(q.createdAt)}</td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            to={`/pricing/quotes/${q.id}`}
            style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)' }}
          >
            View &gt;
          </Link>
          {q.status === 'Draft' && canSubmit && (
            <>
              <button
                onClick={() => navigate(`/pricing/quotes/${q.id}`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={onDelete}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Trash2 size={12} /> Delete
              </button>
              <Button size="sm" variant="primary" onClick={onSubmit}>
                <Send size={11} /> Submit
              </Button>
            </>
          )}
          {canFinalize && (
            <Button size="sm" variant="primary" onClick={onFinalise}>
              <FileText size={11} /> Finalise
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
