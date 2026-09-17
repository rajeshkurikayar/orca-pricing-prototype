import { useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, ChevronUp, ChevronDown as ChevronDownIcon, AlertTriangle } from 'lucide-react'
import { usePricingStore } from '@/store/pricing'

interface Gap {
  id: number
  start: string
  end: string
  durationH: number
  decision: 'auto-fill' | 'manual' | 'reject' | 'leave' | null
}

interface Anomaly {
  id: number
  ts: string
  value: number
  note: string
}

function mockTimeSeries(parkId: string): { gaps: Gap[]; anomalies: Anomaly[]; dataPoints: number; p50: number; p90: number; lf: number } {
  const seed = parkId.charCodeAt(0) + parkId.charCodeAt(parkId.length - 1)
  const gaps: Gap[] = [
    { id: 1, start: '2024-03-12T06:00', end: '2024-03-12T09:00', durationH: 3, decision: null },
    { id: 2, start: '2024-07-04T14:00', end: '2024-07-05T02:00', durationH: 12, decision: null },
    { id: 3, start: '2024-11-20T00:00', end: '2024-11-20T04:00', durationH: 4, decision: null },
  ].slice(0, 1 + (seed % 3))
  const anomalies: Anomaly[] = [
    { id: 1, ts: '2024-05-15T08:15', value: 0.02, note: 'Value near zero — likely sensor dropout' },
    { id: 2, ts: '2024-09-03T12:30', value: p50Value(seed) * 1.45, note: 'Spike above 1.4× median — suspect meter error' },
  ].slice(0, 1 + (seed % 2))
  return { gaps, anomalies, dataPoints: 35040 + (seed % 5000), p50: p50Value(seed), p90: Math.round(p50Value(seed) * 1.12), lf: 32 + (seed % 15) }
}
function p50Value(seed: number) { return Math.round(48000 + seed * 150) }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SHAPE = [0.062, 0.068, 0.075, 0.082, 0.095, 0.100, 0.098, 0.090, 0.085, 0.080, 0.072, 0.063]

// Simple SVG chart
function TimeSeriesChart({ gaps, anomalies, p50 }: { gaps: Gap[]; anomalies: Anomaly[]; p50: number }) {
  const W = 700, H = 180
  const points = MONTHS.map((_, i) => ({ x: (i / 11) * (W - 40) + 20, y: H - 20 - (SHAPE[i] * p50 / (p50 * 0.105)) * (H - 40), v: Math.round(SHAPE[i] * p50) }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
      {/* Gap bands */}
      {gaps.map((g, i) => {
        const x = ((i + 0.3) / 11) * (W - 40) + 20
        return <rect key={g.id} x={x - 10} width={20} y={10} height={H - 30} fill="rgba(210,153,34,.18)" stroke="rgba(210,153,34,.4)" strokeWidth={1} />
      })}
      {/* Anomaly dots */}
      {anomalies.map((a, i) => {
        const x = ((i + 0.5) / 11) * (W - 40) + 20
        return <circle key={a.id} cx={x} cy={50 + i * 20} r={5} fill="rgba(248,81,73,.7)" />
      })}
      {/* Line */}
      <path d={pathD} stroke="var(--color-accent)" strokeWidth={2} fill="none" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-accent)" />
      ))}
      {/* X-axis labels */}
      {MONTHS.map((m, i) => (
        <text key={m} x={points[i].x} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">{m}</text>
      ))}
      {/* Legend */}
      <rect x={W - 120} y={12} width={10} height={10} fill="rgba(210,153,34,.3)" stroke="rgba(210,153,34,.6)" strokeWidth={1} />
      <text x={W - 106} y={21} fontSize={9} fill="var(--color-text-muted)">Gap</text>
      <circle cx={W - 85} cy={17} r={5} fill="rgba(248,81,73,.7)" />
      <text x={W - 76} y={21} fontSize={9} fill="var(--color-text-muted)">Anomaly</text>
      <line x1={W - 46} y1={17} x2={W - 36} y2={17} stroke="var(--color-accent)" strokeWidth={2} />
      <text x={W - 32} y={21} fontSize={9} fill="var(--color-text-muted)">Data</text>
    </svg>
  )
}

export function AssetsChartPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const parkId = searchParams.get('parkId') ?? ''
  const navigate = useNavigate()
  const quotes = usePricingStore(s => s.quotes)
  const quote = quotes.find(q => q.id === id)
  const park = quote?.parks.find(p => p.id === parkId) ?? quote?.parks[0]

  const { gaps, anomalies, dataPoints, p50, p90, lf } = useMemo(() => park ? mockTimeSeries(park.id) : { gaps: [], anomalies: [], dataPoints: 0, p50: 0, p90: 0, lf: 0 }, [park])
  const [gapDecisions, setGapDecisions] = useState<Record<number, Gap['decision']>>({})
  const [selectedGap, setSelectedGap] = useState<number | null>(gaps[0]?.id ?? null)
  const [downloaded, setDownloaded] = useState(false)

  function setDecision(gapId: number, dec: Gap['decision']) {
    setGapDecisions(prev => ({ ...prev, [gapId]: dec }))
  }

  function downloadCleansed() {
    const csv = ['timestamp,value_mwh', ...MONTHS.map((m, i) => `2024-${String(i + 1).padStart(2, '0')}-01T00:00,${Math.round(SHAPE[i] * p50)}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${park?.name ?? 'park'}-cleansed.csv`; a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true); setTimeout(() => setDownloaded(false), 2000)
  }

  const currentGapIdx = gaps.findIndex(g => g.id === selectedGap)

  function prevGap() { if (currentGapIdx > 0) setSelectedGap(gaps[currentGapIdx - 1].id) }
  function nextGap() { if (currentGapIdx < gaps.length - 1) setSelectedGap(gaps[currentGapIdx + 1].id) }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <button onClick={() => navigate(`/quotes/${id}/assets`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0', fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}>
            <ArrowLeft size={13} /> Assets Workbench
          </button>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Time-Series Review</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{park?.name ?? '—'}</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>Production profile · {park?.capacityMw} MW · {park?.technology?.replace('_', ' ')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadCleansed} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: downloaded ? 'var(--color-success)' : 'var(--color-bg-tertiary)', color: downloaded ? '#fff' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
            <Download size={14} /> {downloaded ? 'Downloaded!' : 'Download cleansed series'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0 }}>
        {/* Main panel */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--color-border)' }}>
          {/* Chart */}
          <TimeSeriesChart gaps={gaps} anomalies={anomalies} p50={p50} />

          {/* Gap navigation */}
          {gaps.length > 0 && (
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Gaps ({gaps.length})</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={prevGap} disabled={currentGapIdx <= 0} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'transparent', color: currentGapIdx <= 0 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: currentGapIdx <= 0 ? 'default' : 'pointer' }}>
                    <ChevronUp size={12} /> Prev gap
                  </button>
                  <button onClick={nextGap} disabled={currentGapIdx >= gaps.length - 1} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'transparent', color: currentGapIdx >= gaps.length - 1 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: currentGapIdx >= gaps.length - 1 ? 'default' : 'pointer' }}>
                    Next gap <ChevronDownIcon size={12} />
                  </button>
                </div>
              </div>
              {gaps.map((g) => (
                <div key={g.id} onClick={() => setSelectedGap(g.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-subtle)', cursor: 'pointer', background: selectedGap === g.id ? 'color-mix(in srgb, var(--color-warning) 6%, var(--color-bg-secondary))' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>
                      {g.start} → {g.end} <span style={{ color: 'var(--color-warning)' }}>({g.durationH}h)</span>
                    </div>
                    {gapDecisions[g.id] && (
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-success)', padding: '1px 6px', background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', borderRadius: 2 }}>
                        {gapDecisions[g.id]?.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                  {/* Raw rows preview around gap */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', lineHeight: 1.8 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{g.start.replace('T', ' ')} | {(Math.random() * 3 + 1.5).toFixed(2)} MWh</span>{'\n'}
                    <span style={{ color: 'var(--color-danger)', display: 'block' }}>{'─'.repeat(32)} GAP ({g.durationH * 4} rows missing) {'─'.repeat(8)}</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{g.end.replace('T', ' ')} | {(Math.random() * 3 + 1.5).toFixed(2)} MWh</span>
                  </div>
                  {selectedGap === g.id && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {([['auto-fill', 'Legitimate outage + auto-fill', 'var(--color-success)'], ['manual', 'Manual values', 'var(--color-info)'], ['reject', 'Reject & fix source', 'var(--color-danger)'], ['leave', 'Leave gap as-is', 'var(--color-text-muted)']] as [Gap['decision'], string, string][]).map(([dec, label, col]) => (
                        <button key={dec} onClick={e => { e.stopPropagation(); setDecision(g.id, dec) }} style={{ height: 26, padding: '0 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, cursor: 'pointer', border: `1px solid color-mix(in srgb, ${col} 40%, transparent)`, background: gapDecisions[g.id] === dec ? `color-mix(in srgb, ${col} 15%, transparent)` : 'transparent', color: col }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Anomalies */}
              {anomalies.length > 0 && (
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--color-border)', background: 'rgba(248,81,73,.04)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-danger)', marginBottom: 6 }}>Anomalies ({anomalies.length})</div>
                  {anomalies.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', fontSize: 11 }}>
                      <AlertTriangle size={12} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{a.ts}</span>
                        <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}>{a.value.toFixed(2)} MWh</span>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{a.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: '8px 14px', borderTop: '1px solid var(--color-border)' }}>
                <button style={{ height: 28, padding: '0 12px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer' }}>
                  Save gap decisions &amp; regenerate series
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: quality summary */}
        <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Quality Summary</div>
          {[
            ['Total data points', dataPoints.toLocaleString()],
            ['Time range', '2024-01-01 → 2025-01-01'],
            ['Detected granularity', '15min'],
            ['Duplicates removed', '3'],
            ['Unreadable rows', '0'],
            ['Gap count', String(gaps.length)],
            ['Load factor', lf + '%'],
            ['P50 estimate (MWh/yr)', p50.toLocaleString()],
            ['P90 estimate (MWh/yr)', p90.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: 4, padding: '10px 12px', background: gaps.length === 0 ? 'rgba(63,185,80,.08)' : 'rgba(210,153,34,.08)', border: `1px solid ${gaps.length === 0 ? 'rgba(63,185,80,.3)' : 'rgba(210,153,34,.3)'}`, borderRadius: 'var(--radius-md)', fontSize: 11, color: gaps.length === 0 ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {gaps.length === 0
              ? 'Data quality is good. No gaps or anomalies detected. Ready for P50/P90 derivation.'
              : `${gaps.length} gap region${gaps.length > 1 ? 's' : ''} detected totalling ${gaps.reduce((s, g) => s + g.durationH, 0)}h. Review and decide before generating time-series.`}
          </div>
          {gaps.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Gap regions</div>
              {gaps.map(g => (
                <div key={g.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 11 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>{g.durationH}h</span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>{g.start.slice(0, 10)}</span>
                  {gapDecisions[g.id] && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--color-success)' }}>→ {gapDecisions[g.id]?.replace('-', ' ')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
