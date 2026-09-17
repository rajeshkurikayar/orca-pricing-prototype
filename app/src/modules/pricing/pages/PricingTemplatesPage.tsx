import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Copy, Eye, Edit2, ChevronDown } from 'lucide-react'
import { usePricingStore } from '@/store/pricing'
import { DESK_LABEL } from '@/lib/pricingStatus'
import type { Desk, Technology } from '@/mock/pricing/types'

const DESK_COLORS: Record<Desk, { text: string; bg: string; border: string }> = {
  FAT:   { text: '#F97316', bg: 'rgba(249,115,22,.1)',  border: 'rgba(249,115,22,.3)'  },
  RAM:   { text: '#3FB950', bg: 'rgba(63,185,80,.1)',   border: 'rgba(63,185,80,.3)'   },
  GREEN: { text: '#34D399', bg: 'rgba(52,211,153,.1)',  border: 'rgba(52,211,153,.3)'  },
}
const STATUS_COLORS: Record<string, string> = {
  Approved: 'var(--color-success)', 'Pending Review': 'var(--color-warning)',
  Draft: 'var(--color-text-muted)', Rejected: 'var(--color-danger)',
}
const TECH_LABEL: Record<Technology, string> = { WIND_ONSHORE: 'Wind Onshore', WIND_OFFSHORE: 'Wind Offshore', SOLAR: 'Solar' }

type StatusFilter = 'All' | 'Approved' | 'Pending Review' | 'Draft'
const DESK_OPTS: ('All' | Desk)[] = ['All', 'FAT', 'RAM', 'GREEN']
const STATUS_OPTS: StatusFilter[] = ['All', 'Approved', 'Pending Review', 'Draft']

export function PricingTemplatesPage() {
  const templates = usePricingStore((s) => s.templates)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [deskFilter, setDeskFilter] = useState<'All' | Desk>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')

  const filtered = useMemo(() => templates.filter(t => {
    if (deskFilter !== 'All' && t.desk !== deskFilter) return false
    if (statusFilter !== 'All' && t.status !== statusFilter) return false
    if (query) {
      const q = query.toLowerCase()
      return t.name.toLowerCase().includes(q) || t.countryCode.toLowerCase().includes(q) || t.technology.toLowerCase().includes(q)
    }
    return true
  }), [templates, deskFilter, statusFilter, query])

  const selectStyle: React.CSSProperties = { height: 32, padding: '0 28px 0 10px', appearance: 'none', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', outline: 'none' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Pricing</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Templates</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>Assumption template library used by the desks in the Pricing Workspace.</p>
        </div>
        <button onClick={() => navigate('/templates/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer' }}>
          <Plus size={14} /> New Template
        </button>
      </div>

      <div style={{ padding: '16px 24px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 0 240px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates..." style={{ width: '100%', height: 32, paddingLeft: 30, paddingRight: 10, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-primary)', outline: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={deskFilter} onChange={e => setDeskFilter(e.target.value as 'All' | Desk)} style={selectStyle}>
              {DESK_OPTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Desks' : DESK_LABEL[d as Desk]}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} style={selectStyle}>
              {STATUS_OPTS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          </div>
          {(deskFilter !== 'All' || statusFilter !== 'All' || query) && (
            <button onClick={() => { setDeskFilter('All'); setStatusFilter('All'); setQuery('') }} style={{ height: 32, padding: '0 10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)' }}>Clear</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {filtered.map(t => {
            const dc = DESK_COLORS[t.desk]
            const sc = STATUS_COLORS[t.status] ?? 'var(--color-text-muted)'
            return (
              <div key={t.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderLeft: `3px solid ${dc.text}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 3 }}>{t.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dc.text, background: dc.bg, border: `1px solid ${dc.border}` }}>{DESK_LABEL[t.desk]}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t.countryCode} · {TECH_LABEL[t.technology]}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: sc, background: `color-mix(in srgb, ${sc} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${sc} 30%, transparent)` }}>{t.status}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>{t.factors.length} factors</span>
                  </div>
                </div>

                {/* Factors */}
                <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px' }}>
                  {t.factors.map(f => (
                    <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>{f.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{f.value}{f.unit === '%' ? '%' : ` ${f.unit}`}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, padding: '8px 14px', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <Eye size={12} /> View
                  </button>
                  <button onClick={() => navigate(`/templates/${t.id}/edit`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <Copy size={12} /> Clone
                  </button>
                  {t.status === 'Draft' && (
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, background: 'transparent', color: 'var(--color-accent)', border: `1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)`, cursor: 'pointer', marginLeft: 'auto' }}>
                      Submit for Review
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
