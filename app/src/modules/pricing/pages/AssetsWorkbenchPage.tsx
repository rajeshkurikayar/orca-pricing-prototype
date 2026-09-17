import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, ChevronDown, RotateCcw, FileText } from 'lucide-react'
import { usePricingStore } from '@/store/pricing'

type GranularityType = '15min' | '30min' | '45min' | '1h' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'
type ClassifyStatus = 'Pending' | 'Processing' | 'Matched' | 'Unmatched' | 'Conflict'

interface ParsedAsset {
  fileName: string
  rows: number
  granularity: GranularityType
  p50Mwh: number
  matchedParkId: string | null
  matchedParkName: string | null
  status: ClassifyStatus
  confidence: number
}

const GRANULARITY_OPTS: GranularityType[] = ['15min', '30min', '45min', '1h', 'Daily', 'Weekly', 'Monthly', 'Yearly']

const STATUS_STYLE: Record<ClassifyStatus, { color: string; bg: string; label: string }> = {
  Pending:    { color: 'var(--color-text-muted)',    bg: 'transparent',              label: 'Pending'    },
  Processing: { color: 'var(--color-info)',           bg: 'rgba(88,166,255,.08)',     label: 'Processing' },
  Matched:    { color: 'var(--color-success)',        bg: 'rgba(63,185,80,.08)',      label: 'Matched'    },
  Unmatched:  { color: 'var(--color-warning)',        bg: 'rgba(210,153,34,.08)',     label: 'Unmatched'  },
  Conflict:   { color: 'var(--color-danger)',         bg: 'rgba(248,81,73,.08)',      label: 'Conflict'   },
}

function mockParse(fileName: string, parks: { id: string; name: string }[]): ParsedAsset {
  const seed = fileName.charCodeAt(0) + fileName.charCodeAt(fileName.length - 1)
  const rows = 8760 + (seed % 1000)
  const granularity: GranularityType = seed % 4 === 0 ? '15min' : seed % 4 === 1 ? 'Hourly' : seed % 4 === 2 ? 'Daily' : 'Monthly'
  const p50Mwh = Math.round(50000 + seed * 100)
  const confidence = 70 + (seed % 30)
  const matchIdx = parks.length > 0 ? seed % (parks.length + 1) : 1
  const matched = matchIdx < parks.length ? parks[matchIdx] : null
  const status: ClassifyStatus = matched ? (confidence > 85 ? 'Matched' : 'Conflict') : 'Unmatched'
  return { fileName, rows, granularity, p50Mwh, matchedParkId: matched?.id ?? null, matchedParkName: matched?.name ?? null, status, confidence }
}

export function AssetsWorkbenchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const quotes = usePricingStore((s) => s.quotes)
  const quote = quotes.find((q) => q.id === id)

  const parks = quote?.parks ?? []

  const [assets, setAssets] = useState<ParsedAsset[]>([])
  const [granOverride, setGranOverride] = useState<Record<string, GranularityType>>({})
  const [parkOverride, setParkOverride] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [done, setDone] = useState(false)
  const [processingIdx, setProcessingIdx] = useState<number | null>(null)
  const [genGranularity, setGenGranularity] = useState<GranularityType>('15min')
  const [savedProgress, setSavedProgress] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const newAssets: ParsedAsset[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      newAssets.push({ ...mockParse(f.name, parks), status: 'Processing' })
    }
    setAssets(prev => [...prev, ...newAssets])
    newAssets.forEach((_, i) => {
      setTimeout(() => {
        setAssets(prev => prev.map((a) => a.status === 'Processing' ? { ...a, status: mockParse(a.fileName, parks).status } : a))
      }, 800 + i * 300)
    })
    setProcessingIdx(0)
    setTimeout(() => setProcessingIdx(null), 1200)
  }

  function removeAsset(fileName: string) {
    setAssets(prev => prev.filter(a => a.fileName !== fileName))
    setConfirmed(prev => { const n = new Set(prev); n.delete(fileName); return n })
  }

  function toggleConfirm(fileName: string) {
    setConfirmed(prev => {
      const n = new Set(prev)
      if (n.has(fileName)) n.delete(fileName); else n.add(fileName)
      return n
    })
  }

  function confirmAll() {
    setConfirmed(new Set(assets.map(a => a.fileName)))
  }

  function handleReturn() { setDone(true) }
  function handleSaveProgress() { setSavedProgress(true); setTimeout(() => setSavedProgress(false), 2000) }

  const allConfirmed = assets.length > 0 && assets.every(a => confirmed.has(a.fileName))

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Asset classification complete</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{confirmed.size} file{confirmed.size !== 1 ? 's' : ''} confirmed and linked to {quote?.reference ?? id}.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => navigate(`/quotes/${id}/edit?tab=0`)} style={{ height: 36, padding: '0 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer' }}>
            Return to Tab 1 (Wizard)
          </button>
          <button onClick={() => navigate(`/quotes/${id}`)} style={{ height: 36, padding: '0 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
            View Quote
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <button onClick={() => navigate(`/quotes/${id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0', fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}>
            <ArrowLeft size={13} /> {quote?.reference ?? 'Quote'}
          </button>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Assets Workbench</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {quote?.reference ?? id} — Asset Classification
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Upload production files for each park. AI will classify and match them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {assets.length > 0 && (
            <button onClick={handleSaveProgress} style={{ height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: savedProgress ? 'var(--color-success)' : 'var(--color-bg-tertiary)', color: savedProgress ? '#fff' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }}>
              {savedProgress ? '✓ Saved' : 'Save Progress'}
            </button>
          )}
          {assets.length > 0 && !allConfirmed && (
            <button onClick={confirmAll} style={{ height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
              Confirm All
            </button>
          )}
          {allConfirmed && (
            <button onClick={handleReturn} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer' }}>
              <CheckCircle2 size={14} /> Confirm All &amp; Return to Tab 1
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Parks expected */}
        {parks.length > 0 && (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8 }}>Parks in this request ({parks.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {parks.map(p => {
                const hasFile = assets.some(a => {
                  const eff = parkOverride[a.fileName] ?? a.matchedParkId
                  return eff === p.id
                })
                return (
                  <span key={p.id} style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 500, background: hasFile ? 'rgba(63,185,80,.1)' : 'var(--color-bg-tertiary)', color: hasFile ? 'var(--color-success)' : 'var(--color-text-muted)', border: `1px solid ${hasFile ? 'rgba(63,185,80,.3)' : 'var(--color-border)'}` }}>
                    {hasFile && '✓ '}{p.name} · {p.capacityMw} MW
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Generate Time-Series: Granularity selector */}
        {assets.length > 0 && (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Generate Time-Series at</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {GRANULARITY_OPTS.map(g => (
                <button key={g} onClick={() => setGenGranularity(g)} style={{ height: 26, padding: '0 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, border: '1px solid var(--color-border)', cursor: 'pointer', background: genGranularity === g ? 'var(--color-accent)' : 'transparent', color: genGranularity === g ? 'var(--color-on-accent)' : 'var(--color-text-secondary)', transition: 'all 100ms' }}>
                  {g}{g === '15min' ? ' (default)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Per-park time-series status table */}
        {assets.length > 0 && parks.length > 0 && (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Per-Park Status</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Park', 'Production', 'Curtailment', 'Redispatch', 'Load Factor', 'P50 MWh/yr', ''].map(h => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parks.map(p => {
                  const file = assets.find(a => (parkOverride[a.fileName] ?? a.matchedParkId) === p.id)
                  const hasFile = !!file
                  const Pill = ({ label, ok }: { label: string; ok: boolean }) => (
                    <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: ok ? 'var(--color-success)' : 'var(--color-text-muted)', background: ok ? 'rgba(63,185,80,.08)' : 'transparent', border: `1px solid ${ok ? 'rgba(63,185,80,.3)' : 'var(--color-border)'}` }}>{label}</span>
                  )
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.name}</td>
                      <td style={{ padding: '8px 12px' }}><Pill label="Production" ok={hasFile} /></td>
                      <td style={{ padding: '8px 12px' }}><Pill label="Curtailment" ok={false} /></td>
                      <td style={{ padding: '8px 12px' }}><Pill label="Redispatch" ok={false} /></td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {hasFile ? ((p.p50MwhPerYear / (p.capacityMw * 8760)) * 100).toFixed(1) + '%' : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>
                        {hasFile ? file!.p50Mwh.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {hasFile && (
                          <button onClick={() => navigate(`/quotes/${id}/assets/chart?parkId=${p.id}`)} style={{ fontSize: 11, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Chart ↗</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Per-park detection cards */}
        {assets.length > 0 && parks.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 10 }}>Detected / Linked Parks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {parks.map(p => {
                const seed = p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1)
                const lat = (52.5 + (seed % 10) * 0.4).toFixed(4) + '° N'
                const lon = (13.4 + (seed % 10) * 0.5).toFixed(4) + '° E'
                const file = assets.find(a => (parkOverride[a.fileName] ?? a.matchedParkId) === p.id)
                const isConfirmed = file ? confirmed.has(file.fileName) : false
                return (
                  <div key={p.id} style={{ border: `1px solid ${isConfirmed ? 'rgba(63,185,80,.4)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name} · {p.capacityMw} MW</span>
                      {isConfirmed && <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>✓ Confirmed</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      <div style={{ padding: '10px 14px', borderRight: '1px solid var(--color-border-subtle)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', marginBottom: 8 }}>Detected (AI)</div>
                        {[
                          ['Registry ID', `SEE9${seed.toString().padStart(9, '0')}`],
                          ['Latitude', lat], ['Longitude', lon],
                          ['Technology', p.technology.replace('_', ' ')],
                          ['Capacity (MW)', String(p.capacityMw)],
                          ['Balance Area', p.countryCode === 'DE' ? 'Amprion' : '—'],
                          ['DSO', '—'], ['Meter IDs', `${1 + (seed % 3)} MaLo${(1 + (seed % 3)) > 1 ? 's → summed' : ''}`],
                          ['COD', '2025-06-01'],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, borderBottom: '1px solid var(--color-border-subtle)' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8 }}>Edit / Confirm</div>
                        {[
                          ['Registry ID', `SEE9${seed.toString().padStart(9, '0')}`],
                          ['Balance Area', p.countryCode === 'DE' ? 'Amprion' : ''],
                          ['DSO', ''], ['Meter-point ID', ''],
                        ].map(([label, def]) => (
                          <div key={label} style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
                            <input defaultValue={def as string} style={{ height: 26, width: '100%', padding: '0 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} />
                          </div>
                        ))}
                        {file && (
                          <button onClick={() => toggleConfirm(file.fileName)} style={{ marginTop: 4, height: 28, padding: '0 12px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, background: isConfirmed ? 'rgba(63,185,80,.12)' : 'var(--color-accent)', color: isConfirmed ? 'var(--color-success)' : 'var(--color-on-accent)', border: isConfirmed ? '1px solid rgba(63,185,80,.4)' : 'none', cursor: 'pointer' }}>
                            {isConfirmed ? '✓ Confirmed' : 'Confirm & Register as Draft'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Needs Confirmation tray */}
        {assets.some(a => a.status === 'Unmatched') && (
          <div style={{ background: 'rgba(210,153,34,.06)', border: '1px solid rgba(210,153,34,.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', marginBottom: 10 }}>⚠ Needs Confirmation — files with no confident park match</div>
            {assets.filter(a => a.status === 'Unmatched').map(a => (
              <div key={a.fileName} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(210,153,34,.15)', fontSize: 12 }}>
                <FileText size={13} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', flex: 1 }}>{a.fileName}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Attach to:</span>
                <div style={{ position: 'relative' }}>
                  <select value={parkOverride[a.fileName] ?? ''} onChange={e => setParkOverride(prev => ({ ...prev, [a.fileName]: e.target.value }))}
                    style={{ height: 26, padding: '0 22px 0 8px', appearance: 'none', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: parkOverride[a.fileName] ? 'var(--color-text-primary)' : 'var(--color-text-muted)', cursor: 'pointer', outline: 'none', minWidth: 160 }}>
                    <option value="">Choose park...</option>
                    {parks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); if (dropRef.current) dropRef.current.style.borderColor = 'var(--color-accent)' }}
          onDragLeave={() => { if (dropRef.current) dropRef.current.style.borderColor = '' }}
          onDrop={e => { e.preventDefault(); if (dropRef.current) dropRef.current.style.borderColor = ''; handleFiles(e.dataTransfer.files) }}
          style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: 'var(--color-bg-secondary)', transition: 'border-color 0.15s' }}
          onClick={() => document.getElementById('wb-file-input')?.click()}
        >
          <input id="wb-file-input" type="file" multiple accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <Upload size={28} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>Drop production files here</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>CSV, XLSX · one file per park · AI will match parks automatically</div>
        </div>

        {/* Classification table */}
        {assets.length > 0 && (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['File', 'Rows', 'Granularity', 'P50 MWh/yr', 'Matched Park', 'Confidence', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map(a => {
                  const st = STATUS_STYLE[a.status]
                  const effPark = parkOverride[a.fileName] ?? a.matchedParkId
                  const effGran = granOverride[a.fileName] ?? a.granularity
                  const isConfirmed = confirmed.has(a.fileName)
                  return (
                    <tr key={a.fileName} style={{ borderBottom: '1px solid var(--color-border-subtle)', background: isConfirmed ? 'rgba(63,185,80,.04)' : undefined }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.fileName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{a.rows.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <select value={effGran} onChange={e => setGranOverride(prev => ({ ...prev, [a.fileName]: e.target.value as GranularityType }))}
                            style={{ height: 26, padding: '0 22px 0 8px', appearance: 'none', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--color-text-primary)', cursor: 'pointer', outline: 'none' }}>
                            {GRANULARITY_OPTS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{a.p50Mwh.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <select value={effPark ?? ''} onChange={e => setParkOverride(prev => ({ ...prev, [a.fileName]: e.target.value }))}
                            style={{ height: 26, padding: '0 22px 0 8px', appearance: 'none', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: effPark ? 'var(--color-text-primary)' : 'var(--color-text-muted)', cursor: 'pointer', outline: 'none', maxWidth: 180 }}>
                            <option value="">— Unmatched —</option>
                            {parks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-bg-tertiary)', overflow: 'hidden', width: 60 }}>
                            <div style={{ height: '100%', width: `${a.confidence}%`, background: a.confidence >= 85 ? 'var(--color-success)' : a.confidence >= 60 ? 'var(--color-warning)' : 'var(--color-danger)', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>{a.confidence}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: st.color, background: st.bg, border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)` }}>
                          {a.status === 'Processing' ? (
                            <span style={{ animation: 'pulse 1s infinite' }}>Processing…</span>
                          ) : st.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => toggleConfirm(a.fileName)} style={{ height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid var(--color-border)', background: isConfirmed ? 'rgba(63,185,80,.1)' : 'transparent', color: isConfirmed ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                            {isConfirmed ? '✓ Confirmed' : 'Confirm'}
                          </button>
                          <button onClick={() => setAssets(prev => prev.map(x => x.fileName === a.fileName ? { ...x, status: 'Processing' } : x))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }} title="Re-classify">
                            <RotateCcw size={11} />
                          </button>
                          <button onClick={() => removeAsset(a.fileName)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {/* Footer summary */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>{assets.length} file{assets.length !== 1 ? 's' : ''} uploaded</span>
              <span style={{ color: 'var(--color-success)' }}>{assets.filter(a => a.status === 'Matched').length} matched</span>
              <span style={{ color: 'var(--color-warning)' }}>{assets.filter(a => a.status === 'Unmatched').length} unmatched</span>
              {assets.some(a => a.status === 'Conflict') && (
                <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} />{assets.filter(a => a.status === 'Conflict').length} conflict{assets.filter(a => a.status === 'Conflict').length !== 1 ? 's' : ''}
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: 'var(--color-success)' }}>{confirmed.size} confirmed</span>
            </div>
          </div>
        )}

        {assets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--color-text-muted)', fontSize: 13 }}>
            Upload files above to begin classification.
          </div>
        )}
      </div>
    </div>
  )
}
