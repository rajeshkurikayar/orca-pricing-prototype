import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { useDataValidationStore } from '@/store/dataValidation'
import { formatDate } from '@/lib/format'

export function DataExplorerPage() {
  const series = useDataValidationStore((s) => s.timeseries)
  const [seriesId, setSeriesId] = useState(series[0]?.id ?? '')
  const active = series.find((s) => s.id === seriesId)

  const chartData = useMemo(() => {
    if (!active) return []
    // downsample to keep the chart light
    const step = Math.max(1, Math.floor(active.points.length / 240))
    return active.points.filter((_, i) => i % step === 0).map((p) => ({
      t: new Date(p.timestampUtc).getTime(),
      value: p.value,
    }))
  }, [active])

  const stats = useMemo(() => {
    if (!active) return null
    const totalMwh = active.points.reduce((sum, p) => sum + p.value, 0)
    const peak = active.points.reduce((max, p) => Math.max(max, p.value), 0)
    const missingPct = active.pointCount > 0 ? (active.missingCount / (active.pointCount + active.missingCount)) * 100 : 0
    return { totalMwh: Math.round(totalMwh), peak: Math.round(peak * 10) / 10, missingPct: missingPct.toFixed(1), points: active.pointCount }
  }, [active])

  return (
    <div>
      <PageHeader module="Data Validation" title="Data Explorer" description="Visualise canonical timeseries data before requesting pricing." backTo="/data" backLabel="Work Queue" />
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            style={{
              height: 32,
              padding: '0 10px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          >
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.assetName} — {s.seriesType} ({s.unit})
              </option>
            ))}
          </select>
          {active && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {formatDate(active.coverageStart)} → {formatDate(active.coverageEnd)} · {active.intervalMinutes} min interval
            </span>
          )}
        </div>

        <Card style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillAccent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2f8f94" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2f8f94" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                tick={{ fontSize: 11, fill: '#667085' }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#667085' }} unit={` ${active?.unit ?? ''}`} />
              <Tooltip
                labelFormatter={(t) => new Date(Number(t)).toLocaleString('en-GB')}
                formatter={(v) => [`${v} ${active?.unit}`, 'Output']}
              />
              <Area type="monotone" dataKey="value" stroke="#2f8f94" fill="url(#fillAccent)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <StatTile label="Total output" value={`${stats.totalMwh.toLocaleString()} ${active?.unit}h`} />
            <StatTile label="Peak" value={`${stats.peak} ${active?.unit}`} />
            <StatTile label="Missing intervals" value={`${stats.missingPct}%`} />
            <StatTile label="Total points" value={stats.points.toLocaleString()} />
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div style={{ marginBottom: 4, fontFamily: 'var(--font-mono)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</div>
    </Card>
  )
}
