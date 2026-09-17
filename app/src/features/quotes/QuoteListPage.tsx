import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ChevronRight, Pencil, Trash2, Send, FileCheck, Calculator, RotateCcw, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import type { Quote, QuoteStatus, Desk } from '@/mock/pricing/types'

// ─── DeskBadge ────────────────────────────────────────────────────────────────

const DESK_COLORS = {
  FAT:   { text: 'var(--color-desk-fat)',   bg: 'var(--color-desk-fat-muted)',   border: 'var(--color-desk-fat-border)'   },
  RAM:   { text: 'var(--color-desk-ram)',   bg: 'var(--color-desk-ram-muted)',   border: 'var(--color-desk-ram-border)'   },
  GREEN: { text: 'var(--color-desk-green)', bg: 'var(--color-desk-green-muted)', border: 'var(--color-desk-green-border)' },
}

function DeskStatusIcon({ status }: { status: QuoteStatus }) {
  if (status === 'Submitted') return <Clock size={10} style={{ color: '#F59E0B' }} />
  if (status === 'InPricing') return <Loader2 size={10} style={{ color: '#3B82F6', animation: 'spin 1.5s linear infinite' }} />
  if (status === 'RevisionRequested') return <RotateCcw size={10} style={{ color: '#F97316' }} />
  if (status === 'PricingComplete' || status === 'Finalised') return <CheckCircle2 size={10} style={{ color: '#10B981' }} />
  return null
}

function DeskBadge({ desk, requestStatus }: { desk: Desk; requestStatus: QuoteStatus }) {
  const c = DESK_COLORS[desk] ?? DESK_COLORS.FAT
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, lineHeight: '18px', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      <DeskStatusIcon status={requestStatus} />
      {desk}
    </span>
  )
}

// ─── StatusBadge inline (avoiding import cycle risk) ─────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Draft: 'var(--color-status-draft)', Submitted: 'var(--color-status-submitted)',
  InPricing: 'var(--color-status-pricing)', PricingComplete: 'var(--color-status-pricing)',
  UnderReview: 'var(--color-status-review)', RevisionRequested: 'var(--color-status-review)',
  Approved: 'var(--color-status-approved)', Finalised: 'var(--color-status-approved)',
  Rejected: 'var(--color-status-rejected)', Cancelled: 'var(--color-status-rejected)',
  Expired: 'var(--color-status-expired)',
  Low: 'var(--color-text-muted)', Medium: 'var(--color-status-pricing)', High: 'var(--color-warning)', Critical: 'var(--color-danger)',
}
const STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft', Submitted: 'Submitted', InPricing: 'In Pricing', PricingComplete: 'Pricing Complete',
  UnderReview: 'Under Review', RevisionRequested: 'Revision', Approved: 'Approved',
  Finalised: 'Finalised', Rejected: 'Rejected', Cancelled: 'Cancelled', Expired: 'Expired',
  Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Critical',
}

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const color = STATUS_COLORS[status] ?? 'var(--color-text-muted)'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '1px 6px' : '2px 8px',
      borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      color, background: `color-mix(in srgb, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      {label}
    </span>
  )
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ reference, onConfirm, onCancel }: { reference: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onCancel}>
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Trash2 size={20} color="#EF4444" />
        </div>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Delete draft request?</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 24 }}>
          This will permanently delete <strong>{reference}</strong>. This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── QuoteListPage ────────────────────────────────────────────────────────────

export function QuoteListPage() {
  const quotes = usePricingStore((s) => s.quotes)
  const { submitQuote, finaliseQuote, deleteQuote } = usePricingStore()
  const role = useSessionStore((s) => s.role)
  const user = useSessionStore((s) => s.user)
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [finalising, setFinalising] = useState<string | null>(null)

  const caps = role().capabilities
  const canCreate = caps.canCreateRequest || caps.isAdmin
  const canSubmit = caps.canSubmitRequest || caps.isAdmin
  const canPrice = caps.canPriceResponse || caps.isAdmin

  const activeCount = useMemo(
    () => quotes.filter((q) => !['Finalised', 'Approved', 'Rejected'].includes(q.status)).length,
    [quotes],
  )

  const filtered = useMemo(
    () => quotes.filter((q) => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false
      if (query) {
        const s = query.toLowerCase()
        return q.reference.toLowerCase().includes(s) || q.customerName.toLowerCase().includes(s) || q.countryCode.toLowerCase().includes(s)
      }
      return true
    }),
    [quotes, statusFilter, query],
  )

  function handleSubmit(q: Quote) {
    setSubmitting(q.id)
    submitQuote(q.id)
    setTimeout(() => setSubmitting(null), 600)
  }

  function handleFinalise(q: Quote) {
    setFinalising(q.id)
    finaliseQuote(q.id, user().email)
    setTimeout(() => setFinalising(null), 600)
  }

  const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 120ms ease', border: 'none', cursor: 'pointer', fontSize: 11, height: 26, padding: '0 8px' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3, letterSpacing: '-0.01em' }}>Pricing Requests</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {quotes.length} total · <strong style={{ color: 'var(--color-text-primary)' }}>{activeCount} active</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...btnBase, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          {canCreate && (
            <button style={{ ...btnBase, background: 'var(--color-accent)', color: 'var(--color-on-accent)', height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => navigate('/quotes/new')}>
              <Plus size={16} /> New Request
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ minWidth: 280, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by reference, customer or country..."
            style={{ height: 32, width: '100%', paddingLeft: 32, paddingRight: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-primary)', outline: 'none' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'ALL')}
            style={{ height: 32, padding: '0 28px 0 10px', appearance: 'none', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="ALL">All Statuses</option>
            {(['Draft','Submitted','InPricing','PricingComplete','UnderReview','RevisionRequested','Finalised','Approved','Rejected'] as QuoteStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
          <ChevronRight size={12} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
        </div>
        {(statusFilter !== 'ALL' || query) && (
          <button style={{ ...btnBase, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid transparent' }} onClick={() => { setStatusFilter('ALL'); setQuery('') }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
              {['Reference', 'Customer / Country', 'Technology', 'Products', 'Parks', 'Priority', 'Desks', 'Status', 'SPV', 'Deadline', 'Created', ''].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No pricing requests match your filters.</td></tr>
            ) : (
              filtered.map((q) => (
                <QuoteRow
                  key={q.id} q={q}
                  canCreate={canCreate} canSubmit={canSubmit} canPrice={canPrice}
                  isSubmitting={submitting === q.id} isFinalising={finalising === q.id}
                  onView={() => navigate(`/quotes/${q.id}`)}
                  onEdit={() => navigate(`/quotes/${q.id}/edit`)}
                  onDelete={() => setDeleteTarget(q)}
                  onSubmit={() => handleSubmit(q)}
                  onFinalise={() => handleFinalise(q)}
                  onPrice={() => navigate(`/quotes/${q.id}/pricing`)}
                  spvDummy={q.spvLinks.filter(s => s.state === 'PLACEHOLDER').length}
                  spvLinked={q.spvLinks.filter(s => s.state === 'LINKED').length}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <DeleteModal
          reference={deleteTarget.reference}
          onConfirm={() => { deleteQuote(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── QuoteRow ─────────────────────────────────────────────────────────────────

const TECH_LABEL: Record<string, string> = { WIND_ONSHORE: 'Wind Onshore', WIND_OFFSHORE: 'Wind Offshore', SOLAR: 'Solar' }
const COUNTRY_LABEL: Record<string, string> = { DE: 'Germany', SE: 'Sweden', DK: 'Denmark', GB: 'United Kingdom', NL: 'Netherlands', FR: 'France', ES: 'Spain' }

function formatDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

function QuoteRow({ q, canCreate, canSubmit, canPrice, isSubmitting, isFinalising, onView, onEdit, onDelete, onSubmit, onFinalise, onPrice, spvDummy, spvLinked }: {
  q: Quote; canCreate: boolean; canSubmit: boolean; canPrice: boolean
  isSubmitting: boolean; isFinalising: boolean
  onView: () => void; onEdit: () => void; onDelete: () => void
  onSubmit: () => void; onFinalise: () => void; onPrice: () => void
  spvDummy: number; spvLinked: number
}) {
  const [hovered, setHovered] = useState(false)
  const canFinalize = ['PricingComplete', 'UnderReview'].includes(q.status) && canSubmit
  const isDraft = q.status === 'Draft'
  const isPriceable = ['Submitted', 'InPricing'].includes(q.status)
  const isRevision = q.status === 'RevisionRequested'

  const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 120ms ease', cursor: 'pointer', border: 'none', fontSize: 11, height: 26, padding: '0 8px' }

  return (
    <tr
      style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer', background: hovered ? 'var(--color-bg-tertiary)' : 'transparent', transition: 'background 120ms ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onView}
    >
      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)' }}>{q.reference}</td>
      <td style={{ padding: '8px 12px' }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{q.customerName || '—'}</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>{COUNTRY_LABEL[q.countryCode] ?? q.countryCode}</p>
      </td>
      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{q.productionTypes.map((t) => TECH_LABEL[t] ?? t).join(', ')}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.desksRequired.length}</td>
      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.parks.length}</td>
      <td style={{ padding: '8px 12px' }}><StatusBadge status={q.priority} size="sm" /></td>
      <td style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {q.desksRequired.map((d) => <DeskBadge key={d} desk={d} requestStatus={q.status} />)}
          {q.desksRequired.length === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>—</span>}
        </div>
      </td>
      <td style={{ padding: '8px 12px' }}><StatusBadge status={q.status} size="sm" /></td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        {q.spvLinks.length === 0 ? <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</span> : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: spvDummy > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {spvDummy > 0 ? `${spvDummy} dummy` : ''}{spvDummy > 0 && spvLinked > 0 ? ' / ' : ''}{spvLinked > 0 ? `${spvLinked} linked` : ''}
          </span>
        )}
      </td>
      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(q.deadline)}</td>
      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(q.createdAt)}</td>
      <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', alignItems: 'center' }}>
          <button style={{ ...btnBase, background: 'transparent', color: 'var(--color-text-secondary)' }} onClick={onView}>
            View <ChevronRight size={14} />
          </button>
          {isDraft && canCreate && (
            <button style={{ ...btnBase, background: 'transparent', color: 'var(--color-text-secondary)' }} onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
          )}
          {isDraft && canCreate && (
            <button style={{ ...btnBase, background: 'transparent', color: 'var(--color-danger)' }} onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          {isDraft && canSubmit && (
            <button style={{ ...btnBase, background: 'var(--color-accent)', color: 'var(--color-on-accent)', fontWeight: 700, opacity: isSubmitting ? 0.7 : 1 }} onClick={onSubmit} disabled={isSubmitting}>
              <Send size={14} /> Submit
            </button>
          )}
          {isPriceable && canPrice && (
            <button style={{ ...btnBase, background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)' }} onClick={onPrice}>
              <Calculator size={14} /> Price
            </button>
          )}
          {isRevision && canPrice && (
            <button style={{ ...btnBase, background: 'transparent', color: '#F97316', border: '1px solid rgba(249,115,22,0.4)' }} onClick={onPrice}>
              <RotateCcw size={14} /> Reprice
            </button>
          )}
          {canFinalize && (
            <button style={{ ...btnBase, background: 'transparent', color: 'var(--color-finalise)', border: '1px solid var(--color-finalise-border)', opacity: isFinalising ? 0.7 : 1 }} onClick={onFinalise} disabled={isFinalising}>
              <FileCheck size={14} /> Finalise
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
