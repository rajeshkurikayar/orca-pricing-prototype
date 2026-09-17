import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  CheckCircle2, Plus, ClipboardList, Clock, BarChart3, TrendingUp, ArrowRight,
  TrendingDown, AlertCircle, UserCheck, ExternalLink, Zap, Activity, Database, FileCheck2, AlertTriangle,
} from 'lucide-react'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import { useDataValidationStore } from '@/store/dataValidation'
import type { Desk } from '@/mock/pricing/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TECH_LABEL: Record<string, string> = { WIND_ONSHORE: 'Wind Onshore', WIND_OFFSHORE: 'Wind Offshore', SOLAR: 'Solar' }
const COUNTRY_LABEL: Record<string, string> = { DE: 'Germany', SE: 'Sweden', DK: 'Denmark', GB: 'United Kingdom', NL: 'Netherlands', FR: 'France', ES: 'Spain' }
const AVATAR_COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#E57373', '#BA68C8', '#4DB6AC']

const STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft', Submitted: 'Submitted', InPricing: 'In Pricing', PricingComplete: 'Pricing Complete',
  UnderReview: 'Under Review', RevisionRequested: 'Revision', Approved: 'Approved',
  Finalised: 'Finalised', Rejected: 'Rejected',
}
const STATUS_COLORS: Record<string, string> = {
  Draft: 'var(--color-status-draft)', Submitted: 'var(--color-status-submitted)',
  InPricing: 'var(--color-status-pricing)', PricingComplete: 'var(--color-status-pricing)',
  UnderReview: 'var(--color-status-review)', RevisionRequested: 'var(--color-status-review)',
  Approved: 'var(--color-status-approved)', Finalised: 'var(--color-status-approved)',
  Rejected: 'var(--color-status-rejected)',
  Low: 'var(--color-text-muted)', Medium: 'var(--color-status-pricing)', High: 'var(--color-warning)', Critical: 'var(--color-danger)',
}

const DESK_COLORS: Record<Desk, { text: string; bg: string; border: string }> = {
  FAT:   { text: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.35)' },
  RAM:   { text: '#3FB950', bg: 'rgba(63,185,80,.12)',   border: 'rgba(63,185,80,.35)'  },
  GREEN: { text: '#34D399', bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.35)' },
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'var(--color-text-muted)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function KpiCard({ label, value, unit, icon: Icon, accentColor, trend, trendLabel, onClick }: {
  label: string; value: number | string; unit?: string; icon: React.ElementType
  accentColor: string; trend?: 'up' | 'down'; trendLabel?: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 12, cursor: onClick ? 'pointer' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accentColor} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 500, color: 'var(--color-text-primary)' }}>{value}</span>
        {unit && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{unit}</span>}
      </div>
      {trendLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {trend === 'up'
            ? <TrendingUp size={13} color="var(--color-success)" />
            : <TrendingDown size={13} color="var(--color-danger)" />}
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: trend === 'up' ? 'var(--color-success)' : 'var(--color-danger)' }}>{trendLabel}</span>
        </div>
      )}
    </div>
  )
}

function SubProcessesCard({ dummySPVs, oppsToCreate, fssPending }: { dummySPVs: number; oppsToCreate: number; fssPending: number }) {
  const total = dummySPVs + oppsToCreate + fssPending
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>Sub-Processes</span>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(248,81,73,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={18} color="var(--color-danger)" />
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xl)', fontWeight: 500, color: total > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{total}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { label: 'SPV placeholders', count: dummySPVs, color: 'var(--color-warning)' },
          { label: 'Opps to create', count: oppsToCreate, color: 'var(--color-info)' },
          { label: 'Front sheets pending', count: fssPending, color: 'var(--color-text-muted)' },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: row.count > 0 ? row.color : 'var(--color-text-muted)' }}>{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
      {action && (
        <button onClick={action} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          {actionLabel ?? 'View all'} <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

const btnBase: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontWeight: 500, cursor: 'pointer', border: 'none', fontSize: 12, height: 28, padding: '0 10px', transition: 'all 120ms ease' }

// ─── DV Widget ────────────────────────────────────────────────────────────────

function DVWidget() {
  const jobs = useDataValidationStore(s => s.jobs)
  const navigate = useNavigate()

  const approved  = jobs.filter(j => j.status === 'APPROVED' || j.status === 'PUBLISHED')
  const awaiting  = jobs.filter(j => j.status === 'AWAITING_REVIEW')
  const exception = jobs.filter(j => j.status === 'EXCEPTION')

  const actionable = jobs
    .filter(j => ['APPROVED', 'PUBLISHED', 'AWAITING_REVIEW', 'EXCEPTION'].includes(j.status))
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5)

  const buckets = [
    { label: 'Approved', count: approved.length,  color: 'var(--color-success)',  bg: 'rgba(63,185,80,.1)',  border: 'rgba(63,185,80,.3)',  icon: FileCheck2 },
    { label: 'Awaiting review', count: awaiting.length,  color: 'var(--color-warning)',  bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.3)',  icon: Clock },
    { label: 'Exception', count: exception.length, color: 'var(--color-danger)',   bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.3)',   icon: AlertTriangle },
  ]

  function statusDot(status: string) {
    if (status === 'APPROVED' || status === 'PUBLISHED') return { color: 'var(--color-success)', label: 'Approved' }
    if (status === 'AWAITING_REVIEW') return { color: 'var(--color-warning)', label: 'Awaiting review' }
    if (status === 'EXCEPTION') return { color: 'var(--color-danger)', label: 'Exception' }
    return { color: 'var(--color-text-muted)', label: status }
  }

  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={14} color="var(--color-accent)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Data Validation</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{jobs.length} files total</span>
        </div>
        <button
          onClick={() => navigate('/data')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600, background: 'transparent', color: 'var(--color-accent)', border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)', cursor: 'pointer' }}
        >
          Open module <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Bucket pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {buckets.map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-md)', background: b.bg, border: `1px solid ${b.border}` }}>
              <b.icon size={12} color={b.color} />
              <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: b.color, lineHeight: 1 }}>{b.count}</span>
              <span style={{ fontSize: 11, color: b.color, opacity: 0.85 }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Job rows */}
        {actionable.length > 0 ? (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {actionable.map((job, i) => {
              const dot = statusDot(job.status)
              const isActionable = job.status === 'AWAITING_REVIEW' || job.status === 'EXCEPTION'
              return (
                <div
                  key={job.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none', background: job.status === 'EXCEPTION' ? 'rgba(239,68,68,.04)' : job.status === 'AWAITING_REVIEW' ? 'rgba(245,158,11,.03)' : 'transparent', cursor: 'pointer' }}
                  onClick={() => navigate(`/data/jobs/${job.id}`)}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.fileName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{job.customerName}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{relativeTime(job.receivedAt)}</span>
                  {isActionable && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: dot.color, whiteSpace: 'nowrap' }}>
                      {job.status === 'EXCEPTION' ? 'View →' : 'Review →'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>No actionable files</div>
        )}
      </div>
    </div>
  )
}

// ─── Originator / Admin dashboard ────────────────────────────────────────────

function OriginatorDashboard() {
  const quotes = usePricingStore(s => s.quotes)
  const user = useSessionStore(s => s.user())
  const caps = useSessionStore(s => s.role().capabilities)
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const active = quotes.filter(q => !['Finalised', 'Approved', 'Rejected'].includes(q.status)).length
    const draft = quotes.filter(q => q.status === 'Draft').length
    const pending = quotes.filter(q => ['PricingComplete', 'UnderReview'].includes(q.status)).length
    const now = new Date()
    const thisMonth = quotes.filter(q => {
      const d = new Date(q.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && ['Finalised', 'Approved'].includes(q.status)
    }).length
    const allSpvLinks = quotes.flatMap(q => q.spvLinks)
    const dummySPVs = allSpvLinks.filter(s => s.state === 'PLACEHOLDER').length
    const oppsToCreate = allSpvLinks.filter(s => s.state === 'LINKED' && !s.opportunityId).length
    const fssPending = allSpvLinks.filter(s => s.opportunityId && !s.frontSheetStatus).length
    return { active, draft, pending, thisMonth, dummySPVs, oppsToCreate, fssPending }
  }, [quotes])

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit' })
    })
    return days.map((day, i) => ({ day, quotes: Math.max(0, Math.round(quotes.length * 0.15 + Math.sin(i) * 2 + Math.random() * 1.5)) }))
  }, [quotes.length])

  const recentQuotes = useMemo(() => [...quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8), [quotes])
  const recentActivity = useMemo(() => [...quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [quotes])

  // Pricing-complete quotes need the originator's attention
  const needsAction = quotes.filter(q => ['PricingComplete', 'UnderReview'].includes(q.status))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3, letterSpacing: '-0.01em' }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Welcome back, <strong>{user.name.split(' ')[0]}</strong> · Centrica Energy Trading
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {stats.pending > 0 && (
            <button style={{ ...btnBase, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} onClick={() => navigate('/approvals')}>
              <CheckCircle2 size={16} /> Approvals ({stats.pending})
            </button>
          )}
          {(caps.canCreateRequest || caps.isAdmin) && (
            <button style={{ ...btnBase, background: 'var(--color-accent)', color: 'var(--color-on-accent)' }} onClick={() => navigate('/quotes/new')}>
              <Plus size={16} /> New Quote
            </button>
          )}
        </div>
      </div>

      {/* Action banner when pricing complete */}
      {needsAction.length > 0 && (
        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={14} color="var(--color-accent)" />
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
              <strong>{needsAction.length} request{needsAction.length !== 1 ? 's' : ''}</strong> returned from pricing — ready for your review
            </span>
          </div>
          <button style={{ ...btnBase, background: 'var(--color-accent)', color: 'var(--color-on-accent)' }} onClick={() => navigate('/approvals')}>
            Review now <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <KpiCard label="Active Requests" value={stats.active} icon={ClipboardList} accentColor="var(--color-accent)" trend="up" trendLabel="+2 this week" onClick={() => navigate('/quotes')} />
        <KpiCard label="Draft Requests" value={stats.draft} icon={Clock} accentColor="var(--color-warning)" onClick={() => navigate('/quotes')} />
        <KpiCard label="Pending Approvals" value={stats.pending} icon={CheckCircle2} accentColor="var(--color-info)" onClick={() => navigate('/approvals')} />
        <KpiCard label="Completed This Month" value={stats.thisMonth} icon={BarChart3} accentColor="var(--color-success)" trend="up" trendLabel="+1 vs last month" />
        <SubProcessesCard dummySPVs={stats.dummySPVs} oppsToCreate={stats.oppsToCreate} fssPending={stats.fssPending} />
      </div>

      {/* DV Widget */}
      <DVWidget />

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <SectionHeader title="Quote Volume – Last 7 Days" />
          <div style={{ padding: '14px 16px', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12 }} />
                <Area type="monotone" dataKey="quotes" stroke="var(--color-accent)" strokeWidth={2} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <SectionHeader title="Recent Activity" action={() => navigate('/audit')} />
          <div style={{ padding: '0 16px' }}>
            {recentActivity.map(q => {
              const color = AVATAR_COLORS[q.createdBy.charCodeAt(0) % 6]
              const initials = q.createdBy.split(/[@. ]/).filter(Boolean).map(s => s[0]?.toUpperCase()).slice(0, 2).join('')
              return (
                <div key={q.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}30`, border: `1px solid ${color}50`, fontSize: 'var(--text-xs)', fontWeight: 600, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials || 'U'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--text-xs)' }}>
                      <span style={{ fontWeight: 500 }}>{q.createdBy.split('@')[0]}</span>{' created '}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{q.reference}</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{q.customerName} · {relativeTime(q.createdAt)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Requests table */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <SectionHeader title="Recent Pricing Requests" action={() => navigate('/quotes')} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                {['Reference', 'Customer · Country', 'Technology', 'Priority', 'Status', 'Desks'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentQuotes.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{q.reference}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{q.customerName}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>{COUNTRY_LABEL[q.countryCode] ?? q.countryCode}</p>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{q.productionTypes.map(t => TECH_LABEL[t] ?? t).join(', ')}</td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={q.priority} /></td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={q.status} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {q.desksRequired.map(d => (
                        <span key={d} style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: DESK_COLORS[d].bg, color: DESK_COLORS[d].text, border: `1px solid ${DESK_COLORS[d].border}` }}>{d}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Analyst dashboard (FAT / RAM / GREEN) ────────────────────────────────────

function AnalystDashboard({ desk }: { desk: Desk }) {
  const quotes = usePricingStore(s => s.quotes)
  const user = useSessionStore(s => s.user())
  const navigate = useNavigate()
  const dc = DESK_COLORS[desk]

  const { queue, active, submitted, avgPrice } = useMemo(() => {
    const queue   = quotes.filter(q => q.desksRequired.includes(desk) && (q.deskStatus[desk] === 'Pending' || q.deskStatus[desk] === 'Assigned'))
    const active  = quotes.filter(q => q.desksRequired.includes(desk) && q.deskStatus[desk] === 'InProgress')
    const submitted = quotes.filter(q => q.desksRequired.includes(desk) && q.deskStatus[desk] === 'Submitted')
    const prices = submitted.flatMap(q => q.runs.filter(r => r.desk === desk && r.status === 'Submitted' && r.avgPrice != null).map(r => r.avgPrice!))
    const avgPrice = prices.length ? +(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : null
    return { queue, active, submitted, avgPrice }
  }, [quotes, desk])

  const deskLabel = desk === 'FAT' ? 'Fixed Asset Trading' : desk === 'RAM' ? 'Risk & Asset Management' : 'Green Energy'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em', margin: 0 }}>My Workspace</h1>
            <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}>{desk} Desk</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Welcome back, <strong>{user.name.split(' ')[0]}</strong> · {deskLabel}
            {queue.length > 0 && <span style={{ marginLeft: 8, color: dc.text, fontWeight: 500 }}>· {queue.length} quote{queue.length !== 1 ? 's' : ''} waiting in your queue</span>}
          </p>
        </div>
        <button style={{ ...btnBase, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} onClick={() => navigate('/quotes')}>
          All Requests <ArrowRight size={13} />
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard
          label="In My Queue" value={queue.length}
          icon={ClipboardList} accentColor={dc.text}
          trendLabel={queue.length > 0 ? 'needs pick-up' : 'queue clear'}
          trend={queue.length > 0 ? 'down' : 'up'}
        />
        <KpiCard
          label="Active Runs" value={active.length}
          icon={Activity} accentColor="var(--color-info)"
        />
        <KpiCard
          label="Submitted" value={submitted.length}
          icon={CheckCircle2} accentColor="var(--color-success)"
          trend={submitted.length > 0 ? 'up' : undefined}
          trendLabel={submitted.length > 0 ? `${submitted.length} completed` : undefined}
        />
        {desk === 'FAT' ? (
          <KpiCard
            label="Avg Power Price" value={avgPrice ?? '—'} unit={avgPrice ? 'EUR/MWh' : undefined}
            icon={Zap} accentColor={dc.text}
          />
        ) : (
          <KpiCard
            label="Avg Bal Fee" value={avgPrice ?? '—'} unit={avgPrice ? 'EUR/MWh' : undefined}
            icon={Zap} accentColor={dc.text}
          />
        )}
      </div>

      {/* My Queue — needs action */}
      {queue.length > 0 && (
        <div style={{ background: 'var(--color-bg-secondary)', border: `1px solid ${dc.border}`, borderLeft: `3px solid ${dc.text}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <SectionHeader title={`My ${desk} Queue — ${queue.length} waiting`} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                {['Reference', 'Customer', 'Technology', 'Parks', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}>{q.reference}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{q.customerName}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.productionTypes.map(t => TECH_LABEL[t] ?? t).join(', ')}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.parks.length}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={q.deskStatus[desk]} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      style={{ ...btnBase, background: dc.bg, color: dc.text, border: `1px solid ${dc.border}`, height: 26 }}
                      onClick={() => navigate(`/quotes/${q.id}/pricing`)}
                    >
                      <UserCheck size={12} /> Pick Up &amp; Price
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Active Runs */}
      {active.length > 0 && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <SectionHeader title={`Active Runs — ${active.length} in progress`} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                {['Reference', 'Customer', 'Technology', 'Assigned To', 'Action'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map(q => {
                const run = [...q.runs].reverse().find(r => r.desk === desk)
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}>{q.reference}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{q.customerName}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.productionTypes.map(t => TECH_LABEL[t] ?? t).join(', ')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.deskAssignee[desk] ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        style={{ ...btnBase, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', height: 26 }}
                        onClick={() => navigate(`/quotes/${q.id}/pricing`)}
                      >
                        <ExternalLink size={12} /> Open Workspace {run ? `· v${run.version}` : ''}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recently Submitted */}
      {submitted.length > 0 && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <SectionHeader title="Recently Submitted" action={() => navigate('/quotes')} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                {['Reference', 'Customer', desk === 'RAM' ? 'Avg Bal Fee' : 'Avg Power Price', 'Quote Status', 'Submitted'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submitted.slice(0, 5).map(q => {
                const run = [...q.runs].reverse().find(r => r.desk === desk && r.status === 'Submitted')
                return (
                  <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{q.reference}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-primary)' }}>{q.customerName}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: dc.text }}>{run?.avgPrice?.toFixed(2) ?? '—'} EUR/MWh</td>
                    <td style={{ padding: '10px 14px' }}><StatusBadge status={q.status} /></td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--color-text-muted)' }}>{run?.submittedAt ? relativeTime(run.submittedAt) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {queue.length === 0 && active.length === 0 && submitted.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Queue is clear</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>No {desk} pricing requests at the moment.</div>
        </div>
      )}
    </div>
  )
}

// ─── Desk Lead dashboard ──────────────────────────────────────────────────────

function DeskLeadDashboard() {
  const quotes = usePricingStore(s => s.quotes)
  const user = useSessionStore(s => s.user())
  const navigate = useNavigate()

  const byDesk = useMemo(() => {
    const compute = (desk: Desk) => ({
      queue:     quotes.filter(q => q.desksRequired.includes(desk) && (q.deskStatus[desk] === 'Pending' || q.deskStatus[desk] === 'Assigned')).length,
      active:    quotes.filter(q => q.desksRequired.includes(desk) && q.deskStatus[desk] === 'InProgress').length,
      submitted: quotes.filter(q => q.desksRequired.includes(desk) && q.deskStatus[desk] === 'Submitted').length,
    })
    return { FAT: compute('FAT'), RAM: compute('RAM') }
  }, [quotes])

  const total = {
    pending: quotes.filter(q => ['PricingComplete', 'UnderReview'].includes(q.status)).length,
    active:  quotes.filter(q => q.status === 'InPricing').length,
    done:    quotes.filter(q => ['Finalised', 'Approved'].includes(q.status)).length,
  }

  const allActive = quotes.filter(q => q.status === 'InPricing' || ['PricingComplete', 'UnderReview'].includes(q.status))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3, letterSpacing: '-0.01em' }}>Desk Overview</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Welcome back, <strong>{user.name.split(' ')[0]}</strong> · Team throughput &amp; queue health
          </p>
        </div>
        <button style={{ ...btnBase, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }} onClick={() => navigate('/quotes')}>
          All Requests <ArrowRight size={13} />
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <KpiCard label="In Pricing" value={total.active} icon={Activity} accentColor="var(--color-info)" />
        <KpiCard label="Pending Originator Review" value={total.pending} icon={CheckCircle2} accentColor="var(--color-warning)" onClick={() => navigate('/approvals')} />
        <KpiCard label="Completed" value={total.done} icon={BarChart3} accentColor="var(--color-success)" trend="up" trendLabel="this period" />
      </div>

      {/* FAT + RAM queue cards side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {(['FAT', 'RAM'] as Desk[]).map(desk => {
          const dc = DESK_COLORS[desk]
          const d = byDesk[desk]
          const deskLabel = desk === 'FAT' ? 'Fixed Asset Trading' : 'Risk & Asset Management'
          return (
            <div key={desk} style={{ background: 'var(--color-bg-secondary)', border: `1px solid ${dc.border}`, borderLeft: `3px solid ${dc.text}`, borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: dc.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{desk}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{deskLabel}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Queue', value: d.queue, color: d.queue > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' },
                  { label: 'Active', value: d.active, color: d.active > 0 ? dc.text : 'var(--color-text-muted)' },
                  { label: 'Submitted', value: d.submitted, color: d.submitted > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '8px 0', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* All active requests */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <SectionHeader title="Active &amp; Pending Review Requests" action={() => navigate('/quotes')} />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-tertiary)' }}>
              {['Reference', 'Customer', 'Technology', 'FAT', 'RAM', 'Quote Status'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allActive.map(q => (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer' }} onClick={() => navigate(`/quotes/${q.id}`)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{q.reference}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-primary)' }}>{q.customerName}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--color-text-secondary)' }}>{q.productionTypes.map(t => TECH_LABEL[t] ?? t).join(', ')}</td>
                {(['FAT', 'RAM'] as Desk[]).map(desk => {
                  const dc = DESK_COLORS[desk]
                  const st = q.desksRequired.includes(desk) ? q.deskStatus[desk] : 'NotRequired'
                  const label = st === 'NotRequired' ? '—' : st === 'Pending' ? 'Queued' : st === 'Assigned' ? 'Picked up' : st === 'InProgress' ? 'Pricing' : 'Submitted'
                  const color = st === 'Submitted' ? 'var(--color-success)' : st === 'InProgress' ? dc.text : st === 'NotRequired' ? 'var(--color-text-muted)' : 'var(--color-warning)'
                  return (
                    <td key={desk} style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
                    </td>
                  )
                })}
                <td style={{ padding: '10px 14px' }}><StatusBadge status={q.status} /></td>
              </tr>
            ))}
            {allActive.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>No active requests</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── DashboardPage — route to correct view ────────────────────────────────────

export function DashboardPage() {
  const caps = useSessionStore(s => s.role().capabilities)

  // Pure FAT analyst (no RAM, not admin)
  if (caps.canPriceFat && !caps.canPriceRam && !caps.isAdmin) return <AnalystDashboard desk="FAT" />
  // Pure RAM analyst
  if (caps.canPriceRam && !caps.canPriceFat && !caps.isAdmin) return <AnalystDashboard desk="RAM" />
  // Green analyst
  if (caps.canPriceGreen && !caps.canPriceFat && !caps.canPriceRam && !caps.isAdmin) return <AnalystDashboard desk="GREEN" />
  // Desk lead (both FAT + RAM, not full admin)
  if (caps.canPriceFat && caps.canPriceRam && !caps.isAdmin) return <DeskLeadDashboard />

  // Originator or Admin — full portfolio view
  return <OriginatorDashboard />
}
