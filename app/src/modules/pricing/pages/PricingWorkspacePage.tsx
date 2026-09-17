import React, { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, RotateCcw, Send, UserCheck,
  ChevronDown, ChevronUp, Plus, History, TrendingUp, Check, X, ArrowRightLeft,
} from 'lucide-react'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import type { Desk, PricingComponents, PricingRowResult } from '@/mock/pricing/types'
import { EmptyState } from '@/components/ui/EmptyState'

// ─── Constants ───────────────────────────────────────────────────────────────

const DESK_COLORS: Record<Desk, { text: string; bg: string; border: string }> = {
  FAT:   { text: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.4)' },
  RAM:   { text: '#3FB950', bg: 'rgba(63,185,80,.12)',   border: 'rgba(63,185,80,.4)'  },
  GREEN: { text: '#34D399', bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.4)' },
}

const DESK_STATUS_LABEL: Record<string, string> = {
  NotRequired: 'Not Required',
  Pending: 'Pending',
  Assigned: 'Assigned',
  InProgress: 'In Pricing',
  Submitted: 'Submitted',
}

const TECH_LABEL: Record<string, string> = {
  WIND_ONSHORE: 'Wind Onshore',
  WIND_OFFSHORE: 'Wind Offshore',
  SOLAR: 'Solar',
}

// Mock EEX Baseload forward curve
const FORWARD_CURVES = [
  { contract: 'Jan-26', bid: 113.50, ask: 115.50, mid: 114.50, hours: 744 },
  { contract: 'Feb-26', bid: 110.50, ask: 112.50, mid: 111.50, hours: 672 },
  { contract: 'Mar-26', bid: 104.25, ask: 106.25, mid: 105.25, hours: 744 },
  { contract: 'Apr-26', bid:  96.25, ask:  98.25, mid:  97.25, hours: 720 },
  { contract: 'May-26', bid:  92.00, ask:  94.00, mid:  93.00, hours: 744 },
  { contract: 'Jun-26', bid:  88.50, ask:  90.50, mid:  89.50, hours: 720 },
  { contract: 'Jul-26', bid:  89.50, ask:  91.50, mid:  90.50, hours: 744 },
  { contract: 'Aug-26', bid:  92.00, ask:  94.00, mid:  93.00, hours: 744 },
  { contract: 'Sep-26', bid:  97.50, ask:  99.50, mid:  98.50, hours: 720 },
  { contract: 'Oct-26', bid: 102.50, ask: 104.50, mid: 103.50, hours: 744 },
  { contract: 'Nov-26', bid: 108.00, ask: 110.00, mid: 109.00, hours: 720 },
  { contract: 'Dec-26', bid: 112.00, ask: 114.00, mid: 113.00, hours: 744 },
]

const MKT_AVG = (() => {
  const totalHours = FORWARD_CURVES.reduce((s, r) => s + r.hours, 0)
  return FORWARD_CURVES.reduce((s, r) => s + r.mid * r.hours, 0) / totalHours
})()

// DE wind production profile Jan-Dec
const DE_WIND = [1.61, 1.30, 1.13, 0.77, 0.62, 0.58, 0.57, 0.58, 0.76, 1.08, 1.34, 1.65]

const SEASONAL_RATIO = (() => {
  const h = FORWARD_CURVES.map(r => r.hours)
  const m = FORWARD_CURVES.map(r => r.mid)
  const profileWeightedAvg =
    m.reduce((s, mi, i) => s + mi * h[i] * DE_WIND[i], 0) /
    h.reduce((s, hi, i) => s + hi * DE_WIND[i], 0)
  const simpleWeightedAvg =
    m.reduce((s, mi, i) => s + mi * h[i], 0) /
    h.reduce((s, hi) => s + hi, 0)
  return profileWeightedAvg / simpleWeightedAvg - 1
})()

// ─── Types ────────────────────────────────────────────────────────────────────

type EditableCol =
  | 'baseloadPrice' | 'priceRiskPremium' | 'seasonalValue'
  | 'cannibalisationRisk' | 'volumeRisk' | 'margin' | 'balancingFee'

interface ParkRow {
  parkId: string
  parkName: string
  capacityMw: number
  p50PerHour: number
  capFactor: number
  products: string[]
  startDate: string
  endDate: string
  baseloadPrice: number
  priceRiskPremium: number
  seasonalValue: number
  cannibalisationRisk: number
  volumeRisk: number
  margin: number
  balancingFee: number
  seasonalOverride: boolean
  cannibalisationOverride: boolean
  volumeRiskOverride: boolean
  marginOverride: boolean
}

interface ActiveCell { parkIdx: number; col: EditableCol }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, mo, day] = d.split('-')
  return `${day}/${mo}/${y}`
}

function powerPrice(row: ParkRow) {
  return r2(
    row.baseloadPrice + row.priceRiskPremium + row.seasonalValue +
    row.cannibalisationRisk + row.volumeRisk + row.margin + row.balancingFee,
  )
}

function formulaFor(col: EditableCol, row: ParkRow): string {
  const bp = row.baseloadPrice
  switch (col) {
    case 'seasonalValue':       return `=BP × ${(SEASONAL_RATIO * 100).toFixed(1)}%`
    case 'cannibalisationRisk': return `=BP × -23%`
    case 'volumeRisk':          return `=BP × -5%`
    case 'margin':              return `=BP × -4.5% + 0.15`
    case 'baseloadPrice':       return `${bp.toFixed(2)}`
    case 'priceRiskPremium':    return `${row.priceRiskPremium.toFixed(2)}`
    case 'balancingFee':        return `${row.balancingFee.toFixed(2)}`
    default: return '—'
  }
}

function isFormulaCol(col: EditableCol): boolean {
  return ['seasonalValue', 'cannibalisationRisk', 'volumeRisk', 'margin'].includes(col)
}

function isOverridden(col: EditableCol, row: ParkRow): boolean {
  if (col === 'seasonalValue')        return row.seasonalOverride
  if (col === 'cannibalisationRisk')  return row.cannibalisationOverride
  if (col === 'volumeRisk')           return row.volumeRiskOverride
  if (col === 'margin')               return row.marginOverride
  return false
}

function buildRows(quote: ReturnType<typeof usePricingStore.getState>['quotes'][0]): ParkRow[] {
  const bp = r2(MKT_AVG)
  return quote.parks.map(park => {
    const p50h = r2(park.p50MwhPerYear / 8760)
    const cf = park.capacityMw > 0 ? r2((p50h / park.capacityMw) * 100) : 0
    const tenors = quote.tenorRows.filter(t => t.parkId === park.id)
    const startDate = tenors[0]?.startDate ?? ''
    const endDate = tenors[tenors.length - 1]?.endDate ?? ''

    const prods: string[] = []
    if (quote.desksRequired.includes('RAM')) prods.push('Balancing Fixed')
    if (quote.productName) prods.push(quote.productName.replace('Fixed Price PPA — ', ''))
    else prods.push('Baseload Profile')

    return {
      parkId: park.id,
      parkName: park.name,
      capacityMw: park.capacityMw,
      p50PerHour: p50h,
      capFactor: cf,
      products: prods,
      startDate,
      endDate,
      baseloadPrice: bp,
      priceRiskPremium: 0,
      seasonalValue: r2(bp * SEASONAL_RATIO),
      cannibalisationRisk: r2(bp * -0.23),
      volumeRisk: r2(bp * -0.05),
      margin: r2(bp * -0.045 + 0.15),
      balancingFee: 0,
      seasonalOverride: false,
      cannibalisationOverride: false,
      volumeRiskOverride: false,
      marginOverride: false,
    }
  })
}

// Returns display-only values adjusted for the selected scenario.
// "Without curtailment" reverses the curtailment penalty: cannibalisation is
// less negative (curtailment no longer suppresses cannibalisation) → higher power price.
function getDisplayRow(
  row: ParkRow,
  scenario: 'with' | 'without',
  curtailmentPct: number,
): ParkRow & { powerPrice: number } {
  const pp = r2(
    row.baseloadPrice + row.priceRiskPremium + row.seasonalValue +
    row.cannibalisationRisk + row.volumeRisk + row.margin + row.balancingFee,
  )
  if (scenario === 'with') return { ...row, powerPrice: pp }
  const delta = r2(row.baseloadPrice * (curtailmentPct / 100) * 0.3)
  const adjCann = r2(row.cannibalisationRisk + delta)
  const adjPP   = r2(pp + delta)
  return { ...row, cannibalisationRisk: adjCann, powerPrice: adjPP }
}

function recomputeFormulas(row: ParkRow): ParkRow {
  const bp = row.baseloadPrice
  return {
    ...row,
    seasonalValue:        row.seasonalOverride        ? row.seasonalValue        : r2(bp * SEASONAL_RATIO),
    cannibalisationRisk:  row.cannibalisationOverride ? row.cannibalisationRisk  : r2(bp * -0.23),
    volumeRisk:           row.volumeRiskOverride       ? row.volumeRisk           : r2(bp * -0.05),
    margin:               row.marginOverride           ? row.margin               : r2(bp * -0.045 + 0.15),
  }
}

// ─── PricingWorkspacePage ─────────────────────────────────────────────────────

export function PricingWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const quote = usePricingStore(s => s.quotes.find(q => q.id === id))
  const templates = usePricingStore(s => s.templates)
  const { pickUpDesk, submitRun } = usePricingStore()
  const user = useSessionStore(s => s.user())
  const navigate = useNavigate()

  const [activeDesk, setActiveDesk] = useState<Desk>(
    () => (quote?.desksRequired[0] ?? 'FAT') as Desk,
  )
  const [rows, setRows] = useState<ParkRow[]>(() => (quote ? buildRows(quote) : []))
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showMarketData, setShowMarketData] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [scenario, setScenario] = useState<'with' | 'without'>('with')
  const [showComputedSummary, setShowComputedSummary] = useState(true)

  const deskTemplates = useMemo(
    () => templates.filter(t => t.desk === activeDesk),
    [templates, activeDesk],
  )

  if (!quote) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState title="Quote not found" />
      </div>
    )
  }

  const dc = DESK_COLORS[activeDesk]
  const assignee = quote.deskAssignee[activeDesk]
  const deskStatus = quote.deskStatus[activeDesk]
  const isLocked = deskStatus === 'Submitted' || submitted
  const runs = quote.runs.filter(r => r.desk === activeDesk)
  const versionCount = runs.length

  const totalCap = quote.parks.reduce((s, p) => s + p.capacityMw, 0)
  const totalP50 = quote.parks.reduce((s, p) => s + p.p50MwhPerYear / 8760, 0)
  const capFactor = totalCap > 0 ? (totalP50 / totalCap) * 100 : 0
  const tech = [...new Set(quote.productionTypes.map(t => TECH_LABEL[t] ?? t))].join(', ')

  // Per-park avg curtailment pct — used by the scenario toggle for display
  const curtailmentByPark = useMemo(() => {
    const map: Record<string, number> = {}
    for (const park of quote.parks) {
      const tenors = quote.tenorRows.filter(t => t.parkId === park.id)
      map[park.id] = tenors.length
        ? tenors.reduce((s, t) => s + t.curtailmentPct, 0) / tenors.length
        : 3.8
    }
    return map
  }, [quote])

  const displayRows = useMemo(
    () => rows.map(r => getDisplayRow(r, scenario, curtailmentByPark[r.parkId] ?? 3.8)),
    [rows, scenario, curtailmentByPark],
  )

  const avgPowerPrice = displayRows.length > 0
    ? r2(displayRows.reduce((s, r) => s + r.powerPrice, 0) / displayRows.length)
    : 0

  // ── Cell editing ──

  function startEdit(rowIdx: number, col: EditableCol) {
    if (isLocked) return
    setActiveCell({ rowIdx, col })
    setEditingValue(String(rows[rowIdx][col]))
  }

  function commitEdit() {
    if (!activeCell) return
    const val = parseFloat(editingValue)
    if (isNaN(val)) { setActiveCell(null); return }

    setRows(prev => prev.map((row, i) => {
      if (i !== activeCell.rowIdx) return row
      const updated = { ...row, [activeCell.col]: val }
      if (activeCell.col === 'seasonalValue')        updated.seasonalOverride = true
      if (activeCell.col === 'cannibalisationRisk')  updated.cannibalisationOverride = true
      if (activeCell.col === 'volumeRisk')           updated.volumeRiskOverride = true
      if (activeCell.col === 'margin')               updated.marginOverride = true
      if (activeCell.col === 'baseloadPrice')        return recomputeFormulas(updated)
      return updated
    }))
    setActiveCell(null)
  }

  function handleRequote() {
    setRows(quote ? buildRows(quote) : [])
    setActiveCell(null)
    setSubmitted(false)
  }

  function handlePickUp() {
    if (!quote) return
    pickUpDesk(quote.id, activeDesk, user.email)
  }

  function computeRunResults(): { results: PricingRowResult[]; avgPrice: number } {
    if (!quote) return { results: [], avgPrice: 0 }
    const results: PricingRowResult[] = []
    for (const tenorRow of quote.tenorRows) {
      const parkRow = rows.find(r => r.parkId === tenorRow.parkId)
      if (!parkRow) continue
      if (activeDesk === 'FAT') {
        const curtailmentEffect = r2(parkRow.baseloadPrice * (tenorRow.curtailmentPct / 100) * 0.3)
        const withCurtailment: PricingComponents = {
          baseload: parkRow.baseloadPrice,
          seasonal: parkRow.seasonalValue,
          cannibalisation: parkRow.cannibalisationRisk,
          volumeRisk: parkRow.volumeRisk,
          margin: parkRow.margin,
          balancingFee: 0,
          power: r2(parkRow.baseloadPrice + parkRow.seasonalValue + parkRow.cannibalisationRisk + parkRow.volumeRisk + parkRow.margin),
        }
        const withoutCurtailment: PricingComponents = {
          ...withCurtailment,
          cannibalisation: r2(withCurtailment.cannibalisation + curtailmentEffect),
          power: r2(withCurtailment.power + curtailmentEffect),
        }
        results.push({ tenorRowId: tenorRow.id, parkName: tenorRow.parkName, tenor: tenorRow.tenor, withCurtailment, withoutCurtailment })
      } else {
        const fee = parkRow.balancingFee > 0 ? parkRow.balancingFee : (tenorRow.tenor === '1Y' ? 2.35 : tenorRow.tenor === '2Y' ? 2.45 : 2.55)
        const c: PricingComponents = { baseload: 0, seasonal: 0, cannibalisation: 0, volumeRisk: 0, margin: 0, balancingFee: fee, power: fee }
        results.push({ tenorRowId: tenorRow.id, parkName: tenorRow.parkName, tenor: tenorRow.tenor, withCurtailment: c, withoutCurtailment: c })
      }
    }
    const avgPrice = r2(results.reduce((sum, r) => sum + r.withCurtailment.power, 0) / (results.length || 1))
    return { results, avgPrice }
  }

  function handleSubmit() {
    if (!quote) return
    const { results, avgPrice } = computeRunResults()
    submitRun(quote.id, activeDesk, results, avgPrice)
    setSubmitted(true)
    setShowSubmitModal(false)
    navigate(`/quotes/${quote.id}`)
  }

  // ── Styles ──

  const s = {
    btn: (variant: 'ghost' | 'secondary' | 'primary' | 'accent'): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 28, padding: '0 10px',
      borderRadius: 'var(--radius-md)',
      fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
      cursor: 'pointer', border: 'none', transition: 'all 120ms',
      ...(variant === 'ghost'     && { background: 'transparent',                  color: 'var(--color-text-secondary)',     border: '1px solid var(--color-border)' }),
      ...(variant === 'secondary' && { background: 'var(--color-bg-tertiary)',      color: 'var(--color-text-primary)',        border: '1px solid var(--color-border)' }),
      ...(variant === 'primary'   && { background: 'var(--color-accent)',           color: 'var(--color-on-accent)',           border: 'none' }),
      ...(variant === 'accent'    && { background: 'var(--color-bg-tertiary)',      color: 'var(--color-accent)',              border: `1px solid var(--color-accent-border)` }),
    }),
    thBase: { padding: '7px 10px', textAlign: 'left' as const, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)', borderRight: '1px solid var(--color-border-subtle)', whiteSpace: 'nowrap' as const },
  }

  // ── Formula bar content ──

  const activeCellLabel = activeCell
    ? `${COL_DEFS.find(c => c.key === activeCell.col)?.label ?? activeCell.col} · Row ${activeCell.parkIdx + 1}`
    : 'Select a cell'
  const activeCellFormula = activeCell ? formulaFor(activeCell.col, rows[activeCell.parkIdx]) : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Breadcrumb bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', height: 44, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', flexShrink: 0 }}>
        <Link to="/quotes" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={13} /> Quotes
        </Link>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>›</span>
        <Link to={`/quotes/${quote.id}`} style={{ fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>
          {quote.reference}
        </Link>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>Pricing Workspace</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button style={s.btn('secondary')} onClick={handleRequote} disabled={isLocked}>
            <RotateCcw size={13} /> Re-quote
          </button>
          <button style={s.btn('ghost')}>
            <Save size={13} /> Save Draft
          </button>
          <button
            style={{ ...s.btn('primary'), opacity: isLocked ? 0.5 : 1 }}
            disabled={isLocked || !assignee}
            onClick={() => setShowSubmitModal(true)}
          >
            <Send size={13} /> Send to Originator
          </button>
        </div>
      </div>

      {/* ── Project Banner ─────────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Identity */}
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowRightLeft size={18} color="var(--color-accent)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {quote.customerName}
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(88,166,255,.12)', color: '#58A6FF', border: '1px solid rgba(88,166,255,.3)' }}>
                {quote.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {quote.reference} · {quote.customerName} · {quote.countryCode}
            </div>
          </div>

          {/* Metric tiles */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
            {[
              { label: 'TOTAL CAP',   value: `${totalCap.toFixed(1)} MW` },
              { label: 'TECHNOLOGY',  value: tech },
              { label: 'CAP. FACTOR', value: `${capFactor.toFixed(1)}%` },
              { label: 'TOTAL P50',   value: `${r2(totalP50).toFixed(2)} MWh/h` },
              { label: 'MKT AVG',     value: `${r2(MKT_AVG).toFixed(1)} EUR/MWh` },
              { label: 'PARKS',       value: String(quote.parks.length) },
            ].map((tile, i) => (
              <div key={tile.label} style={{ padding: '6px 14px', borderLeft: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 3, whiteSpace: 'nowrap' }}>{tile.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{tile.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Desk Tabs ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', padding: '0 20px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {quote.desksRequired.map(desk => {
          const active = desk === activeDesk
          const c = DESK_COLORS[desk]
          const status = quote.deskStatus[desk]
          return (
            <button
              key={desk}
              onClick={() => setActiveDesk(desk)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: active ? `2px solid ${c.text}` : '2px solid transparent',
                color: active ? c.text : 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 600,
                transition: 'all 120ms',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
              {desk} Desk
              <span style={{ padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                {DESK_STATUS_LABEL[status] ?? status}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Desk content ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Pick-up row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          {assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${dc.text}22`, fontSize: 10, fontWeight: 700, color: dc.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {assignee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{assignee}</span>
              <span style={{ padding: '1px 7px', borderRadius: 'var(--radius-sm)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(63,185,80,.12)', color: '#3FB950', border: '1px solid rgba(63,185,80,.3)' }}>Assigned</span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Unassigned</span>
          )}
          {!assignee && (
            <button style={s.btn('primary')} onClick={handlePickUp}>
              <UserCheck size={13} /> Pick Up
            </button>
          )}
          {isLocked && (
            <span style={{ padding: '2px 10px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(63,185,80,.12)', color: '#3FB950', border: '1px solid rgba(63,185,80,.3)' }}>
              Submitted
            </span>
          )}
        </div>

        {/* ── Computed Results Summary ──────────────────────────────────── */}
        {(() => {
          const sr = computeRunResults()
          const groups: Record<string, { parkName: string; tenors: PricingRowResult[] }> = {}
          for (const r of sr.results) {
            if (!groups[r.parkName]) groups[r.parkName] = { parkName: r.parkName, tenors: [] }
            groups[r.parkName].tenors.push(r)
          }
          const groupList = Object.values(groups)
          const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          return (
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {/* Header */}
              <button
                onClick={() => setShowComputedSummary(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--color-bg-tertiary)', border: 'none', cursor: 'pointer', borderBottom: showComputedSummary ? '1px solid var(--color-border)' : 'none' }}
              >
                <span style={{ padding: '2px 8px', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)', borderRadius: 'var(--radius-sm)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>DAY 1</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Pricing computed — {sr.results.length} rows × 2 curtailment scenarios
                </span>
                <span style={{ padding: '1px 8px', background: 'rgba(168,139,250,.12)', color: '#A78BFA', border: '1px solid rgba(168,139,250,.3)', borderRadius: 'var(--radius-sm)', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Formula engine</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>t = 01 · {now}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}>{showComputedSummary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
              </button>

              {showComputedSummary && sr.results.length > 0 && (
                <div style={{ display: 'flex' }}>
                  {/* Left: compact comparison table */}
                  <div style={{ flex: 1, overflowX: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Pricing Table</span>
                      <span style={{ padding: '1px 8px', background: 'rgba(249,115,22,.1)', color: '#F97316', border: '1px solid rgba(249,115,22,.3)', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600 }}>With / Without Curtailment</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '5px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)', minWidth: 130, background: 'var(--color-bg-tertiary)' }}>Park · Tenor</th>
                          {(['Baseload', 'Cann', 'Margin', 'Power'] as const).map((h, i) => (
                            <th key={`w${h}`} style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#F97316', borderBottom: '1px solid var(--color-border-subtle)', borderLeft: i === 0 ? '2px solid rgba(249,115,22,.35)' : '1px solid var(--color-border-subtle)', background: 'rgba(249,115,22,.04)' }}>{h}</th>
                          ))}
                          {(['Baseload', 'Cann', 'Margin', 'Power'] as const).map((h, i) => (
                            <th key={`wo${h}`} style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-info)', borderBottom: '1px solid var(--color-border-subtle)', borderLeft: i === 0 ? '2px solid rgba(56,189,248,.35)' : '1px solid var(--color-border-subtle)', background: 'rgba(56,189,248,.04)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupList.map(group => {
                          const parkRow = rows.find(r => r.parkName === group.parkName)
                          const curtPct = curtailmentByPark[parkRow?.parkId ?? ''] ?? 3.8
                          const words = group.parkName.split(' ')
                          const abbr = words.length >= 2 ? `${words[0].slice(0, 3)} · ` : `${words[0].slice(0, 4)} · `
                          return (
                            <React.Fragment key={group.parkName}>
                              <tr style={{ background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border-subtle)' }}>
                                <td colSpan={9} style={{ padding: '5px 10px' }}>
                                  <span style={{ fontSize: 10, marginRight: 4 }}>📍</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>{group.parkName}</span>
                                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 6 }}>· {parkRow?.capacityMw ?? '—'} MW · {curtPct.toFixed(1)}% curt</span>
                                </td>
                              </tr>
                              {group.tenors.map(result => {
                                const w = result.withCurtailment
                                const wo = result.withoutCurtailment
                                return (
                                  <tr key={result.tenorRowId} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', borderRight: '1px solid var(--color-border-subtle)', whiteSpace: 'nowrap' }}>{abbr}{result.tenor}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', borderLeft: '2px solid rgba(249,115,22,.35)', background: 'rgba(249,115,22,.03)' }}>{w.baseload.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-danger)', background: 'rgba(249,115,22,.03)' }}>{w.cannibalisation.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-danger)', background: 'rgba(249,115,22,.03)' }}>{w.margin.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,.03)' }}>{w.power.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', borderLeft: '2px solid rgba(56,189,248,.35)', background: 'rgba(56,189,248,.03)' }}>{wo.baseload.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-danger)', background: 'rgba(56,189,248,.03)' }}>{wo.cannibalisation.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-danger)', background: 'rgba(56,189,248,.03)' }}>{wo.margin.toFixed(2)}</td>
                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--color-info)', background: 'rgba(56,189,248,.03)' }}>{wo.power.toFixed(2)}</td>
                                  </tr>
                                )
                              })}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Right: explanation panel */}
                  <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--color-border)', padding: '16px 18px', background: 'var(--color-bg-tertiary)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                      {sr.results.length} Rows × 2 Scenarios
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                      Each row computes twice — once with curtailment applied (customer's stated %) and once without. The <em>Cannibalisation</em> component is the main variable that shifts between the two.
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {groupList.map(group => {
                        const first = group.tenors[0]
                        if (!first) return null
                        const w = first.withCurtailment.power
                        const wo = first.withoutCurtailment.power
                        const spread = r2(wo - w)
                        const parkRow = rows.find(r => r.parkName === group.parkName)
                        const curtPct = curtailmentByPark[parkRow?.parkId ?? ''] ?? 3.8
                        return (
                          <li key={group.parkName} style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{group.parkName} 1Y with curt.</span>
                            {' '}= {w.toFixed(2)} EUR/MWh · without = {wo.toFixed(2)} (spread {spread.toFixed(2)}{curtPct > 4 ? ' — higher curtailment %' : ''})
                          </li>
                        )
                      })}
                    </ul>
                    <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-accent)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 6 }}>System · Formula Engine</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        Each computed column = <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-bg-tertiary)', padding: '0 3px', borderRadius: 2 }}>BASELOAD × factor + offset</code>. The template's default factors apply; {user.displayName?.split(' ')[0] ?? 'User'} can override per cell if needed.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showComputedSummary && sr.results.length === 0 && (
                <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No tenor rows configured — add parks with tenor data to see computed results.
                </div>
              )}
            </div>
          )
        })()}

        {/* Pricing table section */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid var(--color-border-subtle)', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {quote.parks[0]?.name ?? quote.customerName}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{activeDesk} Desk</span>
            {quote.productName && (
              <span style={{ padding: '1px 7px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', fontSize: 10, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                {quote.productName.replace('Fixed Price PPA — ', '')}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                style={s.btn(showTemplates ? 'accent' : 'ghost')}
                onClick={() => { setShowTemplates(v => !v); setShowMarketData(false) }}
              >
Templates <ChevronDown size={11} />
              </button>
              <button
                style={s.btn(showMarketData ? 'accent' : 'ghost')}
                onClick={() => { setShowMarketData(v => !v); setShowTemplates(false) }}
              >
                <TrendingUp size={13} /> Market Data {r2(MKT_AVG).toFixed(2)} <ChevronDown size={11} />
              </button>
              <button style={s.btn('ghost')} disabled={isLocked}>
                <Plus size={13} /> Variable
              </button>
              <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                <button onClick={() => setScenario('with')} style={{ height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: scenario === 'with' ? '#F97316' : 'var(--color-bg-tertiary)', color: scenario === 'with' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 120ms' }}>
                  With curtailment
                </button>
                <button onClick={() => setScenario('without')} style={{ height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: scenario === 'without' ? 'var(--color-info)' : 'var(--color-bg-tertiary)', color: scenario === 'without' ? '#fff' : 'var(--color-text-secondary)', transition: 'all 120ms' }}>
                  Without curtailment
                </button>
              </div>
            </div>
          </div>

          {/* Templates panel */}
          {showTemplates && (
            <div style={{ padding: 14, borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                Assumption Templates — {activeDesk} · {quote.countryCode}
              </div>
              {deskTemplates.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>No templates available for {activeDesk} · {quote.countryCode}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {deskTemplates.map(t => (
                    <div key={t.id} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', cursor: 'pointer' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {t.factors.slice(0, 4).map(f => `${f.label}: ${f.value}${f.unit === '%' ? '%' : ''}`).join(' · ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Market Data panel */}
          {showMarketData && (
            <div style={{ padding: 14, borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)', maxHeight: 240, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                EEX Baseload Forward Curve · Hours-weighted avg: <span style={{ color: 'var(--color-accent)' }}>{r2(MKT_AVG).toFixed(2)} EUR/MWh</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    {['Contract', 'Bid', 'Ask', 'Mid', 'Hours'].map(h => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: h === 'Contract' ? 'left' : 'right', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FORWARD_CURVES.map((row, i) => (
                    <tr key={row.contract} style={{ background: i % 3 === 0 ? 'var(--color-accent-muted)' : 'transparent', borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{row.contract}</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{row.bid.toFixed(2)}</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{row.ask.toFixed(2)}</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>{row.mid.toFixed(2)}</td>
                      <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{row.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Formula bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-tertiary)' }}>
            <div style={{ minWidth: 180, padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: activeCell ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderRight: '1px solid var(--color-border-subtle)' }}>
              {activeCellLabel}
            </div>
            <div style={{ padding: '3px 10px', borderRight: '1px solid var(--color-border-subtle)' }}>
              <span style={{ padding: '1px 7px', borderRadius: 'var(--radius-sm)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: scenario === 'with' ? 'rgba(249,115,22,.15)' : 'rgba(56,189,248,.15)', color: scenario === 'with' ? '#F97316' : 'var(--color-info)', border: `1px solid ${scenario === 'with' ? 'rgba(249,115,22,.35)' : 'rgba(56,189,248,.35)'}` }}>
                {scenario === 'with' ? 'With curtailment' : 'Without curtailment'}
              </span>
            </div>
            <div style={{ padding: '5px 10px', fontSize: 13, fontWeight: 700, color: 'var(--color-cell-computed, #A78BFA)', borderRight: '1px solid var(--color-border-subtle)', lineHeight: 1 }}>
              f
            </div>
            <div style={{ flex: 1, padding: '5px 12px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
              {activeCellFormula}
            </div>
          </div>

          {/* Pricing table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
              <thead>
                <tr>
                  {COL_DEFS.map(col => (
                    <th
                      key={col.key}
                      style={{
                        ...s.thBase,
                        width: col.width,
                        minWidth: col.width,
                        position: col.sticky ? 'sticky' : undefined,
                        left: col.sticky ? 0 : undefined,
                        zIndex: col.sticky ? 2 : undefined,
                        color: col.formula ? 'var(--color-cell-computed, #A78BFA)' : 'var(--color-text-secondary)',
                      }}
                    >
                      <div>{col.label}</div>
                      {col.unit && (
                        <div style={{ fontSize: 8, fontWeight: 400, color: col.formula ? 'var(--color-cell-computed, #A78BFA)' : 'var(--color-text-muted)', textTransform: 'none', letterSpacing: 0, marginTop: 1, opacity: 0.7 }}>
                          {col.hint ?? col.unit}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, parkIdx) => {
                  const pp = row.powerPrice
                  return (
                    <tr key={row.parkId} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      {/* Park Name - sticky */}
                      <td style={{ padding: '8px 10px', position: 'sticky', left: 0, zIndex: 1, background: 'var(--color-bg-secondary)', fontWeight: 600, fontSize: 12, color: 'var(--color-text-primary)', borderRight: '1px solid var(--color-border-subtle)', minWidth: 200, width: 200 }}>
                        {row.parkName}
                      </td>

                      {/* Product (stacked) */}
                      <td style={{ padding: '6px 10px', minWidth: 120, width: 120, borderRight: '1px solid var(--color-border-subtle)' }}>
                        {row.products.map(p => (
                          <div key={p} style={{ fontSize: 11, color: 'var(--color-accent)', background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-border)', borderRadius: 2, padding: '1px 5px', marginBottom: 2, display: 'inline-block', whiteSpace: 'nowrap' }}>{p}</div>
                        ))}
                      </td>

                      {/* Cap */}
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 72, width: 72, borderRight: '1px solid var(--color-border-subtle)' }}>
                        {row.capacityMw}
                      </td>

                      {/* P50 */}
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 80, width: 80, borderRight: '1px solid var(--color-border-subtle)' }}>
                        {row.p50PerHour.toFixed(2)}
                      </td>

                      {/* Cap Factor */}
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 80, width: 80, borderRight: '1px solid var(--color-border-subtle)' }}>
                        {row.capFactor.toFixed(1)}%
                      </td>

                      {/* Start */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 90, width: 90, borderRight: '1px solid var(--color-border-subtle)' }}>
                        {fmtDate(row.startDate)}
                      </td>

                      {/* End */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 90, width: 90, borderRight: '1px solid var(--color-border-subtle)' }}>
                        {fmtDate(row.endDate)}
                      </td>

                      {/* Editable input columns */}
                      {EDITABLE_COLS.map(col => {
                        const isFml = isFormulaCol(col)
                        const isOverride = isOverridden(col, row)
                        const isActive = activeCell?.parkIdx === parkIdx && activeCell?.col === col
                        const val = row[col] as number
                        return (
                          <td
                            key={col}
                            style={{
                              padding: 0, minWidth: 120, width: 120,
                              borderRight: '1px solid var(--color-border-subtle)',
                              background: isActive
                                ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                                : isFml && !isOverride
                                  ? 'color-mix(in srgb, #A78BFA 6%, transparent)'
                                  : 'transparent',
                              outline: isActive ? '2px solid var(--color-accent)' : 'none',
                              outlineOffset: -2,
                            }}
                            onClick={() => !isLocked && startEdit(parkIdx, col)}
                          >
                            {isActive && !isLocked ? (
                              <input
                                autoFocus
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit() }
                                  if (e.key === 'Escape') setActiveCell(null)
                                }}
                                style={{ width: '100%', height: '100%', minHeight: 32, padding: '7px 10px', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)', textAlign: 'right' }}
                              />
                            ) : (
                              <div style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: val < 0 ? 'var(--color-danger)' : val > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                {isOverride && (
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-warning)', flexShrink: 0 }} />
                                )}
                                {val.toFixed(2)}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Power Price (output) */}
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--color-success)', minWidth: 110, width: 110 }}>
                        {pp.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}

                {/* Units footer row */}
                <tr style={{ background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '5px 10px', position: 'sticky', left: 0, background: 'var(--color-bg-tertiary)', fontSize: 10, fontStyle: 'italic', color: 'var(--color-text-muted)' }} colSpan={2}>
                    all values EUR/MWh
                  </td>
                  <td colSpan={5} />
                  {EDITABLE_COLS.map(col => (
                    <td key={col} style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>EUR/MWh</td>
                  ))}
                  <td style={{ padding: '5px 10px', textAlign: 'right', fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>EUR/MWh</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Version History */}
          <div style={{ borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setShowVersionHistory(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              <History size={13} />
              Version History ({versionCount} {versionCount === 1 ? 'version' : 'versions'})
              <span style={{ marginLeft: 'auto' }}>
                {showVersionHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {showVersionHistory && (
              <div style={{ padding: '0 14px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                {versionCount === 0 ? (
                  <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 11 }}>No versions saved yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Version', 'Status', 'Power Price', 'Submitted', 'Analyst'].map(h => (
                          <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-subtle)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map(run => (
                        <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>v{run.version}</td>
                          <td style={{ padding: '6px 8px', fontSize: 11 }}>{run.status}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-success)' }}>{run.avgPrice ?? '—'}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{run.submittedAt ? new Date(run.submittedAt).toLocaleDateString() : '—'}</td>
                          <td style={{ padding: '6px 8px', fontSize: 11 }}>{run.analyst ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit Modal ───────────────────────────────────────────────── */}
      {showSubmitModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Send size={18} color="var(--color-accent)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>Submit Pricing Run?</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 18, lineHeight: 1.6 }}>
              Power Price: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-success)' }}>{avgPowerPrice.toFixed(2)} EUR/MWh</span> · {activeDesk} Desk
              <br />This will submit the pricing run to the originator and lock the workspace.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.btn('primary'), flex: 1, justifyContent: 'center', height: 36 }} onClick={handleSubmit}>
                <Check size={14} /> Submit
              </button>
              <button style={{ ...s.btn('secondary'), flex: 1, justifyContent: 'center', height: 36 }} onClick={() => setShowSubmitModal(false)}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef { key: string; label: string; width: number; sticky?: boolean; formula?: boolean; unit?: string; hint?: string }

const COL_DEFS: ColDef[] = [
  { key: 'parkName',           label: 'Park Name',            width: 200, sticky: true },
  { key: 'product',            label: 'Product',              width: 120 },
  { key: 'cap',                label: 'Cap',                  width: 72,  unit: 'MW' },
  { key: 'p50',                label: 'P50',                  width: 80,  unit: 'MWh/h' },
  { key: 'capFactor',          label: 'Cap Factor',           width: 80,  unit: '%' },
  { key: 'start',              label: 'Start',                width: 90 },
  { key: 'end',                label: 'End',                  width: 90 },
  { key: 'baseloadPrice',      label: 'Baseload Price',       width: 120, unit: 'EUR/MWh' },
  { key: 'priceRiskPremium',   label: 'Price Risk Premium',   width: 138, unit: 'EUR/MWh' },
  { key: 'seasonalValue',      label: 'Seasonal Value',       width: 128, formula: true, unit: 'EUR/MWh', hint: 'AUTO · FWD CURVE' },
  { key: 'cannibalisationRisk',label: 'Cannibalisation Risk', width: 148, formula: true, unit: 'EUR/MWh', hint: 'BP × %' },
  { key: 'volumeRisk',         label: 'Volume Risk',          width: 110, formula: true, unit: 'EUR/MWh', hint: 'BP × %' },
  { key: 'margin',             label: 'Margin',               width: 110, formula: true, unit: 'EUR/MWh', hint: 'BP × % + offset' },
  { key: 'balancingFee',       label: 'Balancing Fee',        width: 110, unit: 'EUR/MWh' },
  { key: 'powerPrice',         label: 'Power Price',          width: 110, unit: 'EUR/MWh' },
]

const EDITABLE_COLS: EditableCol[] = [
  'baseloadPrice', 'priceRiskPremium', 'seasonalValue',
  'cannibalisationRisk', 'volumeRisk', 'margin', 'balancingFee',
]
