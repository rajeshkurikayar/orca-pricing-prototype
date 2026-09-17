import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, BarChart2, GitBranch, Layers, AlertTriangle, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/format'
import { STATUS_LABEL, statusVariant } from '@/lib/dvStatus'
import { useDataValidationStore } from '@/store/dataValidation'
import { useSessionStore } from '@/store/session'

// Mock raw preview rows — representative of a wind-production Excel export
const MOCK_PREVIEW_COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const MOCK_PREVIEW_ROWS: { kind: 'preamble' | 'header' | 'data'; cells: string[] }[] = [
  { kind: 'preamble', cells: ['', '', 'S-W I 207755 WEA3', 'S-W I 207756 WEA7', 'S-W II 207754', 'S-W I 207757', 'S-W II 207758'] },
  { kind: 'header',   cells: ['DateValueCET', 'TimeValueCET', 'Volume_KWh', 'Volume_KWh', 'Volume_KWh', 'Volume_KWh', 'Volume_KWh'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '00:00:00', '0', '0', '0', '0', '0'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '00:15:00', '2.38', '4.375', '2.94', '3.185', '1.92'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '00:30:00', '0.197', '0.424', '0.276', '0.493', '0.31'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '00:45:00', '6.717', '6.488', '6.586', '6.291', '5.84'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '01:00:00', '1.845', '2.291', '3.302', '2.856', '2.11'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '01:15:00', '0', '0', '0', '0', '0'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '01:30:00', '0', '2.873', '4.111', '2.44', '1.95'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '01:45:00', '4.593', '10.298', '12.18', '9.47', '8.63'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '02:00:00', '21.964', '28.798', '33.064', '29.74', '27.21'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '02:15:00', '23.908', '35.94', '37.194', '35.11', '33.87'] },
  { kind: 'data',     cells: ['2020-01-01T00:00:00', '02:30:00', '37.375', '48.808', '38.794', '54.84', '49.22'] },
]

const ROW_BG: Record<string, string> = {
  preamble: '#fffbeb',
  header:   '#f0fdf4',
  data:     'transparent',
}
const ROW_COLOR: Record<string, string> = {
  preamble: '#92400e',
  header:   '#166534',
  data:     'var(--color-text-primary)',
}

const STATUS_DOT: Record<string, string> = {
  QUEUED:          '#6366f1',
  INSPECTING:      '#3b82f6',
  AWAITING_REVIEW: '#f59e0b',
  VALIDATING:      '#3b82f6',
  EXCEPTION:       '#ef4444',
  APPROVED:        '#22c55e',
  PUBLISHED:       '#22c55e',
  REJECTED:        '#ef4444',
}

const PARK_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  linked: { label: 'already linked',  bg: '#dbeafe', color: '#1d4ed8' },
  draft:  { label: 'new draft',       bg: '#ccfbf1', color: '#0f766e' },
  extra:  { label: 'extra — skip?',   bg: '#ffedd5', color: '#c2410c' },
}

export function FileWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const jobs = useDataValidationStore((s) => s.jobs)
  const allFindings = useDataValidationStore((s) => s.findings)
  const allTimeseries = useDataValidationStore((s) => s.timeseries)
  const customers = useDataValidationStore((s) => s.customers)
  const job = useMemo(() => jobs.find((j) => j.id === id), [jobs, id])
  const findings = useMemo(() => allFindings.filter((f) => f.jobId === id), [allFindings, id])
  const jobSeries = useMemo(() => allTimeseries.filter((s) => s.jobId === id), [allTimeseries, id])

  const detectedParks = useMemo(() => {
    if (!job || job.agentRun.classification.confidence === 0) return []
    const customer = customers.find((c) => c.id === job.customerId)
    if (!customer) return []
    const parks = customer.sites.map((site, i) => ({
      id: site.id,
      name: site.name,
      capacityMw: site.capacityMw,
      note: site.id === job.siteId
        ? `MaStR ${site.id.slice(-6).toUpperCase()}… (matched to Puma)`
        : `MaStR ${site.id.slice(-6).toUpperCase()}… · ${job.fileType === 'PRODUCTION_ACTUAL' ? '2 MaLos will be summed to park' : 'included in file'}`,
      badge: (i === 0 ? 'linked' : i === 1 ? 'linked' : 'draft') as 'linked' | 'draft' | 'extra',
    }))
    // For ASSET_MASTER files, surface an "extra" unlinked park to demonstrate the skip flow
    if (job.fileType === 'ASSET_MASTER' && parks.length >= 2) {
      parks.push({
        id: 'extra-unlinked',
        name: `${customer.name.split(' ')[0]} Solar Extra`,
        capacityMw: 18,
        note: 'not requested in this pricing — ignore',
        badge: 'extra',
      })
    }
    return parks
  }, [job, customers])
  const [activeTab, setActiveTab] = useState('graph')
  const [inspectorGapId, setInspectorGapId] = useState<string | null>(null)
  const [gapDecisions, setGapDecisions] = useState<Record<string, 'legitimate' | 'error'>>({})

  const isRostockFile = job?.fileName.toLowerCase().includes('malo') ?? false
  const GAP_START_MS = 1718323200000 // 2024-06-14 00:00 UTC
  const GAP_END_MS   = 1719014400000 // 2024-06-22 00:00 UTC
  const MOCK_GAPS = isRostockFile && job ? [{
    id: 'G1',
    file: job.fileName.replace('.csv', ''),
    lineStart: 3412,
    lineEnd: 3589,
    rangeLabel: '2024-06-14 → 06-21',
    diagnosis: 'Missing 177 rows',
  }] : []
  const [activeSeries, setActiveSeries] = useState(() => jobSeries[0]?.id ?? '')
  const { approveJob, rejectJob, reprocessJob } = useDataValidationStore()
  const { user, role } = useSessionStore()
  const canReview = role().capabilities.canReviewDataValidation || role().capabilities.isAdmin

  const currentSeries = jobSeries.find((s) => s.id === activeSeries) ?? jobSeries[0]

  const syntheticChartData = useMemo(() => {
    if (!job) return []
    const isRostock = job.fileName.toLowerCase().includes('malo')
    if (isRostock) {
      // Year-long 4-hour-sampled series with a 1-week gap in mid-June 2024
      const start = 1704067200000  // 2024-01-01 UTC
      const end   = 1735689600000  // 2025-01-01 UTC
      const step  = 4 * 60 * 60 * 1000
      const totalSpan = end - start
      const points: { t: number; production: number | null }[] = []
      for (let t = start; t <= end; t += step) {
        if (t >= GAP_START_MS && t < GAP_END_MS) { points.push({ t, production: null }); continue }
        const yr = (t - start) / totalSpan
        const day = (t % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
        const seasonal = Math.sin(yr * Math.PI * 2 - Math.PI * 0.5) * 0.25 + 0.65
        const daily = Math.max(0, Math.sin(day * Math.PI * 2 - Math.PI * 0.5)) * 0.4 + 0.1
        const noise = (Math.sin(t * 0.0000003 + 1.7) + Math.sin(t * 0.0000007)) * 0.08
        points.push({ t, production: Math.round(Math.max(0, (seasonal * daily + noise) * 32) * 10) / 10 })
      }
      return points
    }
    // Default: 24 h synthetic preview
    const origin = new Date(job.receivedAt)
    origin.setHours(0, 0, 0, 0)
    const base = origin.getTime()
    const seed = base % 1000
    const points: { t: number; production: number | null }[] = []
    for (let i = 0; i < 96; i++) {
      const dailyCycle = Math.sin((i / 96) * Math.PI * 2 - Math.PI / 2) * 0.25 + 0.55
      const noise = Math.sin(i * 1.7 + seed) * 0.15 + Math.sin(i * 0.31 + seed) * 0.1
      const factor = Math.max(0.02, Math.min(1, dailyCycle + noise))
      points.push({ t: base + i * 15 * 60000, production: Math.round(factor * 75 * 100) / 100 })
    }
    return points
  }, [job, GAP_START_MS, GAP_END_MS])

  const chartData = useMemo(() => {
    if (!currentSeries) return syntheticChartData
    const step = Math.max(1, Math.floor(currentSeries.points.length / 288))
    return currentSeries.points.filter((_, i) => i % step === 0).map((p) => ({
      t: new Date(p.timestampUtc).getTime(),
      production: p.value,
    }))
  }, [currentSeries, syntheticChartData])

  if (!job) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState title="Job not found" description="It may have been removed." />
      </div>
    )
  }

  const sheets = job.fileName.endsWith('.xlsx') || job.fileName.endsWith('.xls')
    ? ['2020', '2021']
    : null

  const tabs = [
    { id: 'graph', label: 'Graph & Validation', icon: <BarChart2 size={14} /> },
    { id: 'lineage', label: 'Lineage', icon: <GitBranch size={14} /> },
    { id: 'versions', label: 'Version Compare', icon: <Layers size={14} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Top 3-panel section */}
      <div style={{ display: 'flex', flex: '0 0 auto', borderBottom: '1px solid var(--color-border)', minHeight: 0 }}>

        {/* Left sidebar */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--color-border)', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          <Link to="/data-validation" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
            <ChevronLeft size={13} /> Work Queue
          </Link>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-all', lineHeight: 1.4 }}>{job.fileName}</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[job.status] ?? '#94a3b8', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{STATUS_LABEL[job.status]}</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>{timeAgo(job.receivedAt)}</div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Files</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)' }}>
              <CheckCircle2 size={13} color="var(--color-accent)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.fileName}</span>
            </div>
          </div>

          {sheets && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Sheets</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sheets.map((s) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)' }}>
                    <CheckCircle2 size={13} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canReview && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Button variant="primary" onClick={() => approveJob(job.id, user().email)} style={{ width: '100%', fontSize: 12 }}>Approve</Button>
              <Button variant="danger" onClick={() => rejectJob(job.id, user().email)} style={{ width: '100%', fontSize: 12 }}>Reject</Button>
              <Button variant="secondary" onClick={() => reprocessJob(job.id, user().email)} style={{ width: '100%', fontSize: 12 }}>Reprocess</Button>
            </div>
          )}
        </div>

        {/* Center: Raw Preview */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Raw Preview</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{MOCK_PREVIEW_ROWS.length} rows × {MOCK_PREVIEW_COLS.length} cols</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                  <th style={{ padding: '6px 10px', border: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)', minWidth: 36 }}></th>
                  {MOCK_PREVIEW_COLS.map((c) => (
                    <th key={c} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center', minWidth: 110 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_PREVIEW_ROWS.map((row, ri) => (
                  <tr key={ri} style={{ background: ROW_BG[row.kind] }}>
                    <td style={{ padding: '5px 10px', border: '1px solid var(--color-border)', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 11, userSelect: 'none' }}>{ri + 1}</td>
                    {row.cells.map((cell, ci) => {
                      const isDatetime = row.kind === 'data' && ci < 2
                      return (
                        <td
                          key={ci}
                          style={{
                            padding: '5px 12px',
                            border: '1px solid var(--color-border)',
                            color: isDatetime ? '#b45309' : ROW_COLOR[row.kind],
                            background: isDatetime ? '#fffbeb' : ROW_BG[row.kind],
                            fontFamily: row.kind === 'data' ? 'var(--font-mono)' : undefined,
                            whiteSpace: 'nowrap',
                          }}
                        >{cell}</td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 11 }}>
            {[
              { color: '#f0fdf4', border: '#86efac', label: 'Header row' },
              { color: '#fffbeb', border: '#fcd34d', label: 'Date/Time' },
              { color: '#f8fafc', border: '#e2e8f0', label: 'Values' },
              { color: '#fffbeb', border: '#fcd34d', label: 'Preamble' },
              { color: '#fff7ed', border: '#fdba74', label: 'Formula' },
            ].map(({ color, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, border: `1px solid ${border}`, background: color, borderRadius: 2 }} />
                <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Agent Analysis */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Agent Analysis</span>
          </div>
          {job.agentRun.classification.confidence === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              Agent analysis not available.
            </div>
          ) : (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div>
                <div style={{ marginBottom: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Classification</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>File type</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{job.agentRun.classification.fileType}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Confidence</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{Math.round(job.agentRun.classification.confidence * 100)}%</span>
                </div>
              </div>
              {job.agentRun.classification.evidence.length > 0 && (
                <div>
                  <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Evidence</div>
                  {job.agentRun.classification.evidence.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)' }}>{e.kind}</span> — {e.detail}
                    </div>
                  ))}
                </div>
              )}
              {job.agentRun.recommendations.length > 0 && (
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent)', marginBottom: 6 }}>Recommendations</div>
                  {job.agentRun.recommendations.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 4 }}>{r}</div>
                  ))}
                </div>
              )}
              {findings.length > 0 && (
                <div>
                  <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Findings ({findings.length})</div>
                  {findings.slice(0, 3).map((f) => (
                    <div key={f.id} style={{ marginBottom: 6, padding: '6px 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-primary)' }}>{f.message}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{f.severity}</div>
                    </div>
                  ))}
                </div>
              )}

              {detectedParks.length > 0 && (
                <div>
                  <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>
                    Detected Parks
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detectedParks.map((park) => {
                      const b = PARK_BADGE[park.badge]
                      return (
                        <div key={park.id} style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{park.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: b.bg, color: b.color, whiteSpace: 'nowrap' }}>{b.label}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{park.capacityMw} MW · {park.note}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Tabs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {activeTab === 'graph' && (
            <div>
              {/* Summary bar for Rostock MaLo files */}
              {isRostockFile && (
                <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Rostock production</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>15 min</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>234,528 rows</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                  <span style={{ color: '#d97706', fontWeight: 600 }}>178 gaps detected</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>Production Time Series</div>
                {jobSeries.length > 1 && (
                  <select
                    value={currentSeries?.id ?? ''}
                    onChange={(e) => setActiveSeries(e.target.value)}
                    style={{ height: 28, padding: '0 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 12, outline: 'none' }}
                  >
                    {jobSeries.map((s) => <option key={s.id} value={s.id}>{s.assetName} — {s.seriesType}</option>)}
                  </select>
                )}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(t) => isRostockFile
                      ? new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      : new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    tick={{ fontSize: 11, fill: '#667085' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#667085' }} unit={` ${currentSeries?.unit ?? 'MW'}`} />
                  <Tooltip
                    labelFormatter={(t) => new Date(Number(t)).toLocaleString('en-GB')}
                    formatter={(v, name) => [`${v} ${currentSeries?.unit ?? 'MW'}`, name === 'production' ? 'Production' : 'Redispatch']}
                  />
                  <Legend formatter={(v) => v === 'production' ? 'Production' : 'Redispatch'} />
                  {isRostockFile && (
                    <ReferenceArea
                      x1={GAP_START_MS} x2={GAP_END_MS}
                      fill="#f59e0b" fillOpacity={0.15}
                      stroke="#f59e0b" strokeOpacity={0.7}
                      label={{ value: 'GAP', position: 'insideTop', fontSize: 10, fill: '#d97706', fontWeight: 700 }}
                    />
                  )}
                  <Line type="monotone" dataKey="production" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>

              {/* Gap table — HITL Review */}
              {MOCK_GAPS.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Data Gaps</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#fef3c7', color: '#92400e' }}>HITL Review</span>
                  </div>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                        <tr>
                          {['#', 'FILE · LINES', 'RANGE', 'DIAGNOSIS', 'DECISION'].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_GAPS.map((gap) => (
                          <tr key={gap.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{gap.id}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <button
                                onClick={() => setInspectorGapId(gap.id)}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)', textDecoration: 'underline' }}
                              >
                                {gap.file} · {gap.lineStart.toLocaleString()}–{gap.lineEnd.toLocaleString()}
                              </button>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{gap.rangeLabel}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <AlertTriangle size={12} color="#d97706" style={{ flexShrink: 0 }} />
                                <span style={{ color: '#92400e', fontSize: 12 }}>{gap.diagnosis}</span>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {gapDecisions[gap.id] ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                                  ✓ {gapDecisions[gap.id] === 'legitimate' ? 'Legitimate' : 'Error'}
                                </span>
                              ) : (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => setGapDecisions((prev) => ({ ...prev, [gap.id]: 'legitimate' }))}
                                    style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, border: '1px solid #16a34a', borderRadius: 'var(--radius-md)', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer' }}
                                  >✓ Legitimate</button>
                                  <button
                                    onClick={() => setGapDecisions((prev) => ({ ...prev, [gap.id]: 'error' }))}
                                    style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                                  >✗ Error</button>
                                  <button
                                    onClick={() => setInspectorGapId(gap.id)}
                                    style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                                  >View</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cleansed series + Audit event after HITL decision */}
              {Object.keys(gapDecisions).length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#f0fdf4', border: '1px solid #86efac' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a', marginBottom: 4 }}>Cleansed Series Generated</div>
                    <div style={{ fontSize: 12, color: '#166534' }}>178 gaps filled from prior-year shape. Load factor: 27.3%. P50: 76,564 MWh/yr. All values tagged "auto-filled" in the series.</div>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Audit Event</div>
                    {Object.entries(gapDecisions).map(([gapId, decision]) => (
                      <div key={gapId} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        hitl-gap-decision · {gapId} · {decision} · file {job.fileName.replace('.csv', '')} · lines 3412-3589 · by {user().email}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lineage' && (
            <EmptyState title="Lineage" description="Data lineage graph will appear here once the file has been processed." />
          )}

          {activeTab === 'versions' && (
            <EmptyState title="Version Compare" description="Compare this file against previous versions once published." />
          )}
        </div>

        {/* File Inspector Drawer */}
        {inspectorGapId && (
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 440, background: 'var(--color-bg-primary)', borderLeft: '2px solid var(--color-border)', zIndex: 10, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 16px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>File Inspector</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {job.fileName.replace('.csv', '')} · lines 3,408–3,592
                </div>
              </div>
              <button onClick={() => setInspectorGapId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    {['#', 'Timestamp (CET)', 'MaLo', 'kWh'].map((h) => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([
                    { row: 3408, ts: '2024-06-13 22:15', kwh: '18.5' },
                    { row: 3409, ts: '2024-06-13 22:30', kwh: '16.2' },
                    { row: 3410, ts: '2024-06-13 22:45', kwh: '11.8' },
                    { row: 3411, ts: '2024-06-13 23:00', kwh: '9.4'  },
                    { row: 3412, ts: '2024-06-13 23:15', kwh: '7.1'  },
                  ] as { row: number; ts: string; kwh: string }[]).map((r) => (
                    <tr key={r.row} style={{ borderBottom: '1px solid var(--color-border)', background: r.row === 3412 ? '#fef9c3' : 'transparent' }}>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-muted)' }}>{r.row.toLocaleString()}</td>
                      <td style={{ padding: '5px 10px', color: '#b45309' }}>{r.ts}</td>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-secondary)' }}>50123456</td>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-primary)' }}>{r.kwh}</td>
                    </tr>
                  ))}

                  <tr>
                    <td colSpan={4} style={{ padding: '10px 12px', background: '#fff7ed', borderTop: '2px dashed #f59e0b', borderBottom: '2px dashed #f59e0b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={12} color="#d97706" />
                        <span style={{ color: '#92400e', fontWeight: 600 }}>3,413 – 3,588 · 177 rows missing</span>
                        <span style={{ color: '#d97706' }}>· 2024-06-14 → 06-21</span>
                      </div>
                    </td>
                  </tr>

                  {([
                    { row: 3589, ts: '2024-06-22 00:00', kwh: '22.3' },
                    { row: 3590, ts: '2024-06-22 00:15', kwh: '25.8' },
                    { row: 3591, ts: '2024-06-22 00:30', kwh: '24.1' },
                    { row: 3592, ts: '2024-06-22 00:45', kwh: '19.6' },
                  ] as { row: number; ts: string; kwh: string }[]).map((r) => (
                    <tr key={r.row} style={{ borderBottom: '1px solid var(--color-border)', background: r.row === 3589 ? '#fef9c3' : 'transparent' }}>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-muted)' }}>{r.row.toLocaleString()}</td>
                      <td style={{ padding: '5px 10px', color: '#b45309' }}>{r.ts}</td>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-secondary)' }}>50123456</td>
                      <td style={{ padding: '5px 10px', color: 'var(--color-text-primary)' }}>{r.kwh}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Classify this gap:</div>
              <button
                onClick={() => { setGapDecisions((prev) => ({ ...prev, [inspectorGapId]: 'legitimate' })); setInspectorGapId(null) }}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #16a34a', borderRadius: 'var(--radius-md)', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
              >
                ✓ Legitimate outage · auto-fill from 2023 same week
              </button>
              <button
                onClick={() => { setGapDecisions((prev) => ({ ...prev, [inspectorGapId]: 'error' })); setInspectorGapId(null) }}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
              >
                ✗ Data error · flag for re-delivery
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
