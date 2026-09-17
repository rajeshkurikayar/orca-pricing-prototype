import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, CheckCircle2, Save, Send } from 'lucide-react'
import { usePricingStore } from '@/store/pricing'
import { DESK_LABEL } from '@/lib/pricingStatus'
import type { Desk, Technology, TemplateFactor } from '@/mock/pricing/types'

const DESK_COLORS: Record<Desk, string> = { FAT: '#F97316', RAM: '#3FB950', GREEN: '#34D399' }
const TECH_OPTIONS: { value: Technology; label: string }[] = [
  { value: 'WIND_ONSHORE', label: 'Wind Onshore' },
  { value: 'WIND_OFFSHORE', label: 'Wind Offshore' },
  { value: 'SOLAR', label: 'Solar' },
]

const DEFAULT_FACTORS: TemplateFactor[] = [
  { key: 'discount_rate', label: 'Discount Rate', value: 6.5, unit: '%' },
  { key: 'capture_rate_adj', label: 'Capture Rate Adj.', value: -2.1, unit: '%' },
  { key: 'capture_rate_wind', label: 'Capture Rate (Wind)', value: 84.5, unit: '%' },
  { key: 'capture_rate_solar', label: 'Capture Rate (Solar)', value: 78.0, unit: '%' },
  { key: 'balancing_fee', label: 'Balancing Fee', value: 2.5, unit: 'EUR/MWh' },
  { key: 'margin', label: 'Margin', value: 1.8, unit: 'EUR/MWh' },
]

type FormRow = TemplateFactor & { editing: boolean; formulaExpr: string }

function evalFormula(expr: string, factors: FormRow[]): number | null {
  try {
    const ctx = Object.fromEntries(factors.map(f => [f.key, f.value]))
    const keys = Object.keys(ctx)
    const vals = Object.values(ctx)
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return (${expr})`)
    const result = fn(...vals)
    if (typeof result === 'number' && isFinite(result)) return Math.round(result * 1000) / 1000
    return null
  } catch {
    return null
  }
}

export function PricingTemplateEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const templates = usePricingStore((s) => s.templates)
  const existing = id ? templates.find((t) => t.id === id) : undefined
  const isNew = !existing

  const [name, setName] = useState(existing?.name ?? '')
  const [desk, setDesk] = useState<Desk>(existing?.desk ?? 'FAT')
  const [country, setCountry] = useState(existing?.countryCode ?? 'DE')
  const [tech, setTech] = useState<Technology>(existing?.technology ?? 'WIND_ONSHORE')
  const [rows, setRows] = useState<FormRow[]>(() =>
    (existing?.factors ?? DEFAULT_FACTORS).map((f) => ({ ...f, editing: false, formulaExpr: '' }))
  )
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [editingFormulaKey, setEditingFormulaKey] = useState<string | null>(null)

  const accentColor = DESK_COLORS[desk]

  function addRow() {
    const key = `factor_${Date.now()}`
    setRows(prev => [...prev, { key, label: 'New Factor', value: 0, unit: '%', editing: true, formulaExpr: '' }])
  }

  function removeRow(key: string) {
    setRows(prev => prev.filter(r => r.key !== key))
  }

  function updateRow(key: string, patch: Partial<FormRow>) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r))
  }

  function applyFormula(key: string) {
    const row = rows.find(r => r.key === key)
    if (!row) return
    const result = evalFormula(row.formulaExpr, rows)
    if (result !== null) {
      updateRow(key, { value: result, formulaExpr: '', editing: false })
      setEditingFormulaKey(null)
    }
  }

  const formulaPreview = useMemo(() => {
    if (!editingFormulaKey) return null
    const row = rows.find(r => r.key === editingFormulaKey)
    if (!row) return null
    return evalFormula(row.formulaExpr, rows)
  }, [editingFormulaKey, rows])

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  function handleSubmit() { setSubmitted(true) }

  const inputStyle: React.CSSProperties = {
    height: 32, padding: '0 10px', borderRadius: 'var(--radius-md)', fontSize: 12,
    background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)', outline: 'none', width: '100%',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer', paddingRight: 28 }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>Submitted for Review</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>A desk lead will review and approve <strong>{name}</strong>.</div>
        <button onClick={() => navigate('/templates')} style={{ height: 36, padding: '0 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', cursor: 'pointer', marginTop: 8 }}>
          Back to Templates
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '18px 24px' }}>
        <div>
          <button onClick={() => navigate('/templates')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 0', fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}>
            <ArrowLeft size={13} /> Templates
          </button>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: accentColor, marginBottom: 4 }}>
            {DESK_LABEL[desk]}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            {isNew ? 'New Template' : `Edit: ${existing?.name}`}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: saved ? 'var(--color-success)' : 'var(--color-bg-tertiary)', color: saved ? '#fff' : 'var(--color-text-primary)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.2s' }}>
            <Save size={14} /> {saved ? 'Saved!' : 'Save Draft'}
          </button>
          <button onClick={handleSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, background: accentColor, color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Send size={14} /> Submit for Review
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
        {/* Metadata */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 12 }}>Template Metadata</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Template Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Germany Wind 2026 Base" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Desk</label>
              <select value={desk} onChange={e => setDesk(e.target.value as Desk)} style={selectStyle}>
                {(['FAT', 'RAM', 'GREEN'] as Desk[]).map(d => <option key={d} value={d}>{DESK_LABEL[d]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Country</label>
              <select value={country} onChange={e => setCountry(e.target.value)} style={selectStyle}>
                {['DE', 'GB', 'FR', 'ES', 'IT', 'PL', 'NL'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Technology</label>
              <select value={tech} onChange={e => setTech(e.target.value as Technology)} style={selectStyle}>
                {TECH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Factor rows table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Factors & Assumptions</div>
            <button onClick={addRow} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, background: 'transparent', color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 40%, transparent)`, cursor: 'pointer' }}>
              <Plus size={12} /> Add factor
            </button>
          </div>
          <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Key', 'Label', 'Value', 'Unit', 'Formula', ''].map(h => (
                    <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '7px 12px' }}>
                      <input value={row.key} onChange={e => updateRow(row.key, { key: e.target.value })} style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 11, width: 140 }} />
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      <input value={row.label} onChange={e => updateRow(row.key, { label: e.target.value })} style={{ ...inputStyle, width: 180 }} />
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      <input
                        type="number"
                        value={row.value}
                        onChange={e => updateRow(row.key, { value: parseFloat(e.target.value) || 0 })}
                        style={{ ...inputStyle, fontFamily: 'var(--font-mono)', width: 90, color: accentColor, fontWeight: 600 }}
                      />
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      <select value={row.unit} onChange={e => updateRow(row.key, { unit: e.target.value as TemplateFactor['unit'] })} style={{ ...selectStyle, width: 110 }}>
                        {['%', 'EUR/MWh', 'years', 'MWh'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      {editingFormulaKey === row.key ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={row.formulaExpr}
                            onChange={e => updateRow(row.key, { formulaExpr: e.target.value })}
                            placeholder="e.g. discount_rate * 0.5"
                            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 10, width: 180 }}
                            onKeyDown={e => { if (e.key === 'Enter') applyFormula(row.key); if (e.key === 'Escape') setEditingFormulaKey(null) }}
                          />
                          {formulaPreview !== null && (
                            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', whiteSpace: 'nowrap' }}>= {formulaPreview}</span>
                          )}
                          <button onClick={() => applyFormula(row.key)} style={{ height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-success)', color: '#fff', border: 'none', cursor: 'pointer' }}>Apply</button>
                          <button onClick={() => setEditingFormulaKey(null)} style={{ height: 26, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingFormulaKey(row.key); updateRow(row.key, { formulaExpr: '' }) }} style={{ height: 24, padding: '0 8px', borderRadius: 'var(--radius-sm)', fontSize: 10, background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)', cursor: 'pointer' }}>
                          ƒ formula
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      <button onClick={() => removeRow(row.key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-danger)', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
            Tip: In the formula editor you can reference any factor by its key (e.g. <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--color-bg-tertiary)', padding: '1px 4px', borderRadius: 2 }}>discount_rate * 0.5 + 1.2</code>). Press Enter or click Apply.
          </div>
        </div>

        {/* Live preview card */}
        <div style={{ background: 'var(--color-bg-secondary)', border: `1px solid color-mix(in srgb, ${accentColor} 30%, var(--color-border))`, borderLeft: `3px solid ${accentColor}`, borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 10 }}>
            Live Preview — {name || 'Unnamed Template'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px 16px' }}>
            {rows.map(row => (
              <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: accentColor, fontWeight: 600 }}>
                  {row.value}{row.unit === '%' ? '%' : ` ${row.unit}`}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8 }}>
            <span style={{ padding: '1px 7px', borderRadius: 2, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: DESK_COLORS[desk], background: `color-mix(in srgb, ${DESK_COLORS[desk]} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${DESK_COLORS[desk]} 30%, transparent)` }}>{DESK_LABEL[desk]}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{country} · {TECH_OPTIONS.find(o => o.value === tech)?.label}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{rows.length} factors</span>
          </div>
        </div>
      </div>
    </div>
  )
}
