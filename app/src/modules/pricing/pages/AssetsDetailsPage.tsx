import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UploadCloud, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { useDataValidationStore } from '@/store/dataValidation'

type Phase = 'setup' | 'processing' | 'classified'

const PROCESS_STEPS = ['uploading', 'reading', 'classifying'] as const
type ProcessStep = (typeof PROCESS_STEPS)[number]

const STEP_LABELS: Record<ProcessStep, string> = {
  uploading: 'Uploading file...',
  reading: 'Parsing time-series structure...',
  classifying: 'Running AI classification...',
}

interface ClassifiedField {
  key: string
  label: string
  value: string
  confidence: number
  confirmed: boolean
  needsConfirmation: boolean
}

const DETECTED_GAP = {
  start: '2024-05-14 09:00',
  end: '2024-05-21 08:00',
  durationHours: 167,
  pctOfDataset: 0.9,
}

const INITIAL_FIELDS: ClassifiedField[] = [
  { key: 'technology', label: 'Technology', value: 'WIND_ONSHORE', confidence: 0.94, confirmed: true, needsConfirmation: false },
  { key: 'capacity', label: 'Capacity (MW)', value: '32', confidence: 0.71, confirmed: false, needsConfirmation: true },
  { key: 'country', label: 'Country', value: 'DE', confidence: 0.97, confirmed: true, needsConfirmation: false },
  { key: 'rangeStart', label: 'Data starts', value: '2023-01-01', confidence: 0.99, confirmed: true, needsConfirmation: false },
  { key: 'rangeEnd', label: 'Data ends', value: '2025-12-31', confidence: 0.99, confirmed: true, needsConfirmation: false },
  { key: 'dataPoints', label: 'Data points', value: '26,280', confidence: 0.99, confirmed: true, needsConfirmation: false },
]

// ─── Local primitives ─────────────────────────────────────────────────────────

function Btn({ children, variant = 'secondary', size = 'md', onClick, disabled }: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  onClick?: () => void
  disabled?: boolean
}) {
  const h = size === 'sm' ? 28 : 32
  const px = size === 'sm' ? 10 : 14
  const fs = size === 'sm' ? 11 : 12
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none' },
    secondary: { background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' },
    danger:    { background: 'transparent', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 40%, transparent)' },
    ghost:     { background: 'transparent', color: 'var(--color-text-secondary)', border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ height: h, padding: `0 ${px}px`, borderRadius: 'var(--radius-md)', fontSize: fs, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'all 120ms', whiteSpace: 'nowrap', ...styles[variant] }}
    >
      {children}
    </button>
  )
}

function StatusPill({ variant, children }: { variant: 'success' | 'warning' | 'info'; children: React.ReactNode }) {
  const colors: Record<string, string> = { success: 'var(--color-success)', warning: 'var(--color-warning)', info: 'var(--color-info)' }
  const c = colors[variant]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: c, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 30%, transparent)` }}>
      {children}
    </span>
  )
}

function ConfBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'var(--color-success)' : pct >= 70 ? 'var(--color-warning)' : 'var(--color-danger)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 6, borderRadius: 3, background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 600ms ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{pct}%</span>
    </div>
  )
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 13,
  background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AssetsDetailsPage() {
  useSearchParams()
  const navigate = useNavigate()
  const customers = useDataValidationStore((s) => s.customers)

  const [fileName, setFileName] = useState('rostock_windpark_production_2023_2025.csv')
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const customer = customers.find((c) => c.id === customerId)
  const [siteId, setSiteId] = useState(customer?.sites[0]?.id ?? '')

  const [phase, setPhase] = useState<Phase>('setup')
  const [stepIdx, setStepIdx] = useState(0)
  const [fields, setFields] = useState<ClassifiedField[]>(INITIAL_FIELDS)
  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>({})
  const [gapReviewed, setGapReviewed] = useState(false)
  const [showGapInspector, setShowGapInspector] = useState(false)

  function startClassification() {
    setPhase('processing')
    setStepIdx(0)
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i < PROCESS_STEPS.length) { setStepIdx(i) } else { clearInterval(interval); setPhase('classified') }
    }, 1100)
  }

  function confirmField(key: string, value: string) {
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, value, confirmed: true } : f)))
  }

  const allConfirmed = fields.every((f) => f.confirmed)
  const readyToUse = allConfirmed && gapReviewed

  function handleUseAsset() {
    const site = customer?.sites.find((s) => s.id === siteId)
    const assetName = site?.name ?? fileName.replace(/\.[^.]+$/, '')
    const capacityMw = fields.find((f) => f.key === 'capacity')?.value ?? '20'
    const technology = fields.find((f) => f.key === 'technology')?.value ?? 'WIND_ONSHORE'
    const countryCode = fields.find((f) => f.key === 'country')?.value ?? 'DE'
    const datasetName = `${assetName.toLowerCase().replace(/\s+/g, '_')}_clean_v1`

    const pending = localStorage.getItem('orca_pending_park')
    if (pending) {
      try {
        const { parkId, returnTo } = JSON.parse(pending) as { parkId: string; returnTo: string }
        localStorage.setItem('orca_park_data_ready', JSON.stringify({ parkId, datasetName }))
        localStorage.removeItem('orca_pending_park')
        navigate(returnTo)
        return
      } catch {}
    }
    navigate(`/quotes/new?assetName=${encodeURIComponent(assetName)}&capacityMw=${capacityMw}&technology=${technology}&countryCode=${countryCode}&fromAiUpload=1`)
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}>
            <ArrowLeft size={12} /> Back
          </button>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Pricing</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Assets &amp; Details</h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>Upload production data for AI classification and time-series validation.</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Setup phase ─────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
            {/* Drop zone */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--color-border)', background: 'var(--color-bg-primary)', padding: '36px 24px', textAlign: 'center', marginBottom: 20 }}>
              <UploadCloud size={28} style={{ color: 'var(--color-text-muted)' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Drag &amp; drop a production data file here</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>.xlsx, .xlsm, .csv · or configure simulated upload below</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InputField label="File name">
                <input style={inputStyle} value={fileName} onChange={(e) => setFileName(e.target.value)} />
              </InputField>
              <InputField label="Customer">
                <select
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    const c = customers.find((c) => c.id === e.target.value)
                    setSiteId(c?.sites[0]?.id ?? '')
                  }}
                >
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </InputField>
              <InputField label="Site / Park">
                <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                  {customer?.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </InputField>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <Btn variant="primary" onClick={startClassification}>Upload &amp; Classify</Btn>
            </div>
          </div>
        )}

        {/* ── Processing phase ─────────────────────────────────────────── */}
        {phase === 'processing' && (
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Analysing file — please wait...</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PROCESS_STEPS.map((step, i) => {
                const done = i < stepIdx
                const active = i === stepIdx
                const color = done ? 'var(--color-success)' : active ? 'var(--color-text-primary)' : 'var(--color-text-muted)'
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color }}>
                    {done ? (
                      <CheckCircle2 size={16} style={{ flexShrink: 0, color: 'var(--color-success)' }} />
                    ) : (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: active ? '2px solid var(--color-accent)' : '2px solid var(--color-border)', borderTopColor: active ? 'transparent' : undefined, flexShrink: 0, animation: active ? 'spin 0.9s linear infinite' : undefined }} />
                    )}
                    {STEP_LABELS[step]}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Classified phase ─────────────────────────────────────────── */}
        {phase === 'classified' && (
          <>
            {/* Classification results */}
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Classification Results</span>
                <StatusPill variant="success">AI classified · {fileName}</StatusPill>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Field', 'Detected value', 'Confidence', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f) => (
                    <tr key={f.key} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{f.label}</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{f.value}</td>
                      <td style={{ padding: '10px 16px' }}><ConfBar value={f.confidence} /></td>
                      <td style={{ padding: '10px 16px' }}>
                        {f.confirmed ? <StatusPill variant="success">Confirmed</StatusPill> : <StatusPill variant="warning">Needs review</StatusPill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Needs confirmation tray */}
            {fields.some((f) => f.needsConfirmation && !f.confirmed) && (
              <div style={{ background: 'color-mix(in srgb, var(--color-warning) 6%, var(--color-bg-secondary))', border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-warning)' }}>
                    Needs Confirmation — low-confidence fields
                  </span>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {fields.filter((f) => f.needsConfirmation && !f.confirmed).map((f) => (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 120, flexShrink: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{f.label}</span>
                      <input
                        style={{ flex: 1, height: 32, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 13, background: 'var(--color-bg-primary)', border: '1px solid color-mix(in srgb, var(--color-warning) 40%, transparent)', color: 'var(--color-text-primary)', outline: 'none' }}
                        value={fieldDraft[f.key] ?? f.value}
                        onChange={(e) => setFieldDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                      <Btn size="sm" variant="primary" onClick={() => confirmField(f.key, fieldDraft[f.key] ?? f.value)}>Confirm</Btn>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time-series gap inspector */}
            <div style={{ background: 'var(--color-bg-secondary)', border: `1px solid ${gapReviewed ? 'color-mix(in srgb, var(--color-success) 40%, transparent)' : 'color-mix(in srgb, var(--color-warning) 40%, transparent)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <button
                onClick={() => setShowGapInspector((v) => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {gapReviewed ? <CheckCircle2 size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} /> : <AlertTriangle size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Time-Series Gap Review</span>
                  {!gapReviewed && <StatusPill variant="warning">1 gap detected</StatusPill>}
                  {gapReviewed && <StatusPill variant="success">Reviewed</StatusPill>}
                </div>
                {showGapInspector ? <ChevronUp size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
              </button>

              {showGapInspector && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}>
                  <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Hourly time-series · {fields.find((f) => f.key === 'rangeStart')?.value} → {fields.find((f) => f.key === 'rangeEnd')?.value}
                  </div>

                  {/* Gap bar */}
                  <div style={{ position: 'relative', height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      <div style={{ flex: 1, background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }} />
                      <div style={{ width: '2%', background: 'color-mix(in srgb, var(--color-danger) 30%, transparent)' }} />
                      <div style={{ flex: 1, background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' }} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-danger)' }}>Gap · 167h</span>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                    <thead>
                      <tr>
                        {['Gap start', 'Gap end', 'Duration', '% of dataset', 'Severity'].map((h) => (
                          <th key={h} style={{ paddingBottom: 8, paddingRight: 16, textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 16px 8px 0', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{DETECTED_GAP.start}</td>
                        <td style={{ padding: '8px 16px 8px 0', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{DETECTED_GAP.end}</td>
                        <td style={{ padding: '8px 16px 8px 0', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{DETECTED_GAP.durationHours}h</td>
                        <td style={{ padding: '8px 16px 8px 0', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{DETECTED_GAP.pctOfDataset}%</td>
                        <td style={{ padding: '8px 0' }}><StatusPill variant="warning">Medium</StatusPill></td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--color-info) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-info) 30%, transparent)', fontSize: 12, color: 'var(--color-info)' }}>
                    A 7-day gap consistent with scheduled maintenance. P50 annual generation is unaffected — gap accounts for &lt;0.2% of total data.
                  </div>

                  {gapReviewed ? (
                    <div style={{ fontSize: 12, color: 'var(--color-success)' }}>✓ Gap reviewed and accepted</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn size="sm" variant="primary" onClick={() => setGapReviewed(true)}>Accept &amp; Mark Reviewed</Btn>
                      <Btn size="sm" variant="secondary">Request Fill from Customer</Btn>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CTA bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)', background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)', padding: '12px 16px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {!allConfirmed && 'Confirm low-confidence fields above to continue.'}
                {allConfirmed && !gapReviewed && 'Review the detected time-series gap to continue.'}
                {readyToUse && <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>✓ All checks passed — ready to use this asset.</span>}
              </p>
              <Btn variant="primary" disabled={!readyToUse} onClick={handleUseAsset}>Use this Asset</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
