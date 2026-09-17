import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/format'
import { STATUS_LABEL, statusVariant } from '@/lib/dvStatus'
import { useDataValidationStore } from '@/store/dataValidation'
import type { FileStatus } from '@/mock/dataValidation/types'
import { useSessionStore } from '@/store/session'

const COUNTRY_FLAGS: Record<string, string> = { DE: '🇩🇪', SE: '🇸🇪', DK: '🇩🇰', GB: '🇬🇧', NL: '🇳🇱', NO: '🇳🇴' }

const FILE_TYPE_LABEL: Record<string, string> = {
  PRODUCTION_ACTUAL: 'Production',
  PRODUCTION_FORECAST: 'Forecast',
  PRODUCTION_SCHEDULE: 'Schedule',
  REDISPATCH_INSTRUCTION: 'Redispatch',
  REDISPATCH_ACTUAL: 'Redispatch',
  ASSET_MASTER: 'Asset Master',
  METER_DATA: 'Meter Data',
  MIXED_WORKBOOK: 'Mixed',
  CURTAILMENT: 'Curtailment',
  UNKNOWN: '',
}

const SELECT_STYLE: React.CSSProperties = {
  height: 32,
  padding: '0 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  outline: 'none',
}

export function WorkQueuePage() {
  const jobs = useDataValidationStore((s) => s.jobs)
  const navigate = useNavigate()
  const { reprocessJob } = useDataValidationStore()
  const { user } = useSessionStore()
  const [statusFilter, setStatusFilter] = useState<FileStatus | 'ALL'>('ALL')
  const [countryFilter, setCountryFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const countries = useMemo(() => ['ALL', ...Array.from(new Set(jobs.map((j) => j.countryCode).filter(Boolean)))], [jobs])
  const channels = useMemo(() => ['ALL', ...Array.from(new Set(jobs.map((j) => j.sourceChannel)))], [jobs])

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== 'ALL' && j.status !== statusFilter) return false
      if (countryFilter !== 'ALL' && j.countryCode !== countryFilter) return false
      if (channelFilter !== 'ALL' && j.sourceChannel !== channelFilter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!j.fileName.toLowerCase().includes(q) && !j.customerName.toLowerCase().includes(q) && !j.siteName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [jobs, statusFilter, countryFilter, channelFilter, query])

  const allSelected = filtered.length > 0 && filtered.every((j) => selected.has(j.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => { const next = new Set(s); filtered.forEach((j) => next.delete(j.id)); return next })
    } else {
      setSelected((s) => { const next = new Set(s); filtered.forEach((j) => next.add(j.id)); return next })
    }
  }
  const toggleOne = (id: string) => {
    setSelected((s) => { const next = new Set(s); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Work Queue</h1>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{filtered.length} jobs total</div>
        </div>
        <Button variant="secondary" style={{ fontSize: 13 }}>
          Bulk Actions ({selected.size})
        </Button>
      </div>

      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FileStatus | 'ALL')} style={SELECT_STYLE}>
          <option value="ALL">All Statuses</option>
          {(['QUEUED','INSPECTING','AWAITING_REVIEW','VALIDATING','EXCEPTION','APPROVED','PUBLISHED','REJECTED'] as FileStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={SELECT_STYLE}>
          {countries.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'All Countries' : c}</option>)}
        </select>
        <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={SELECT_STYLE}>
          {channels.map((c) => <option key={c} value={c}>{c === 'ALL' ? 'All Channels' : c}</option>)}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search file, customer, site..."
          style={{ ...SELECT_STYLE, width: 220, padding: '0 10px' }}
        />
        <input type="date" style={SELECT_STYLE} />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>to</span>
        <input type="date" style={SELECT_STYLE} />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
        <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <tr>
                <th style={{ padding: '10px 12px', width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {['File', 'Customer', 'Site', 'Country', 'Type', 'Source', 'Received', 'Stage', 'Confidence', 'Errors', 'Warnings', 'Assigned', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((job, i) => {
                const typeLabel = FILE_TYPE_LABEL[job.fileType]
                return (
                  <tr
                    key={job.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : undefined }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <input type="checkbox" checked={selected.has(job.id)} onChange={() => toggleOne(job.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => navigate(`/data/jobs/${job.id}`)}>
                        {job.fileName}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: job.customerName ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {job.customerName || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: job.siteName ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {job.siteName || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {job.countryCode ? (
                        <span>{COUNTRY_FLAGS[job.countryCode] ?? ''} {job.countryCode}</span>
                      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {typeLabel ? <Badge variant="neutral">{typeLabel}</Badge> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                      <Upload size={14} color="var(--color-text-muted)" />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{timeAgo(job.receivedAt)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge variant={statusVariant(job.status)}>{STATUS_LABEL[job.status]}</Badge>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {job.confidence > 0 ? <ConfidenceBar value={job.confidence} /> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>—</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>—</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 12, fontStyle: 'italic' }}>Unassigned</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="secondary" onClick={() => navigate(`/data/jobs/${job.id}`)} style={{ padding: '4px 12px', fontSize: 12 }}>View</Button>
                        <Button variant="secondary" onClick={() => reprocessJob(job.id, user().email)} style={{ padding: '4px 12px', fontSize: 12 }}>Reprocess</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState title="No jobs match this filter" description="Try clearing the search or picking a different status." />
          )}
        </div>
      </div>
    </div>
  )
}
