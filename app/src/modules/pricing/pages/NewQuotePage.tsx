import { useMemo, useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, Database, ExternalLink, Upload, Pencil, Sparkles, AlertTriangle, X, BarChart2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDataValidationStore } from '@/store/dataValidation'
import { usePricingStore } from '@/store/pricing'
import { useSessionStore } from '@/store/session'
import type { Desk, QuotePark, Technology } from '@/mock/pricing/types'
import type { Technology as DVTechnology } from '@/mock/dataValidation/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_CURRENCY: Record<string, string> = { DE: 'EUR', SE: 'SEK', DK: 'DKK', GB: 'GBP' }

type AssetBrowserTab = 'SEARCH' | 'CUSTOMER' | 'BALANCE_AREAS' | 'NEW_ASSET'

interface CatalogueProduct {
  name: string
  description: string
  desks: Desk[]
}

const CATALOGUE_PRODUCTS: CatalogueProduct[] = [
  { name: 'Fixed Price PPA — Baseload', description: 'Fixed energy price, baseload shape. Standard onshore wind / solar product.', desks: ['FAT'] },
  { name: 'Shape PPA — Baseload + Profile', description: 'Baseload price with additional profile/cannibalisation premium. FAT + Green desk.', desks: ['FAT', 'GREEN'] },
  { name: 'RAM Balancing Service', description: 'Balancing service add-on. RAM desk only — typically paired with a FAT product.', desks: ['RAM'] },
  { name: 'Full Service PPA', description: 'Energy price, balancing service, and green certificates. All three desks.', desks: ['FAT', 'RAM', 'GREEN'] },
  { name: 'Green GoO Bundle', description: 'Guarantee of Origin (GoO) certificate bundle — Green desk only.', desks: ['GREEN'] },
]

const BALANCE_AREAS: Record<string, { label: string; id: string }[]> = {
  DE: [
    { label: 'DE-50Hertz (North/East)', id: 'DE-50HzT' },
    { label: 'DE-Amprion (West)', id: 'DE-AMP' },
    { label: 'DE-TenneT (South/East)', id: 'DE-TNT' },
    { label: 'DE-TransnetBW (South/West)', id: 'DE-TNBW' },
  ],
  SE: [{ label: 'SE1 · Luleå', id: 'SE1' }, { label: 'SE2 · Sundsvall', id: 'SE2' }, { label: 'SE3 · Stockholm', id: 'SE3' }, { label: 'SE4 · Malmö', id: 'SE4' }],
  DK: [{ label: 'DK1 · Jutland/Funen (West)', id: 'DK1' }, { label: 'DK2 · Zealand (East)', id: 'DK2' }],
  GB: [{ label: 'GB · National Grid ESO', id: 'GB' }],
}

function mapDvTech(t: DVTechnology): Technology {
  if (t === 'SOLAR') return 'SOLAR'
  return 'WIND_ONSHORE'
}

function siteBalanceArea(siteId: string, countryCode: string): string {
  const areas = BALANCE_AREAS[countryCode] ?? []
  if (!areas.length) return ''
  let h = 0
  for (let i = 0; i < siteId.length; i++) h = (h * 31 + siteId.charCodeAt(i)) >>> 0
  return areas[h % areas.length]?.id ?? ''
}

const DESK_COLORS = {
  FAT:   { text: 'var(--color-desk-fat)',   bg: 'var(--color-desk-fat-muted)',   border: 'var(--color-desk-fat-border)' },
  RAM:   { text: 'var(--color-desk-ram)',   bg: 'var(--color-desk-ram-muted)',   border: 'var(--color-desk-ram-border)' },
  GREEN: { text: 'var(--color-desk-green)', bg: 'var(--color-desk-green-muted)', border: 'var(--color-desk-green-border)' },
}

// ─── Data-readiness layer ──────────────────────────────────────────────────────

type MockDataset = { id: string; name: string; customer: string; technology: string; granularity: string; points: number; p50: number; lf: number; approved: string }

type ParkDataStatus = { status: 'none' | 'validating' | 'ready'; datasetName?: string; sourceFile?: string }

const MOCK_VALIDATED_DATASETS: MockDataset[] = [
  // Encavis AG — matches DV seed sites (site-rostock, site-neubrandenburg)
  { id: 'ds-001', name: 'encavis_rostock_2024_clean_v1',         customer: 'Encavis AG',       technology: 'WIND_ONSHORE',  granularity: '15min', points: 35040, p50: 6842, lf: 39.1, approved: '2026-08-15' },
  { id: 'ds-006', name: 'encavis_neubrandenburg_2024_clean_v1',  customer: 'Encavis AG',       technology: 'WIND_ONSHORE',  granularity: '15min', points: 35040, p50: 9187, lf: 43.8, approved: '2026-08-22' },
  // NordEnergie GmbH — matches DV seed sites (site-kiel, site-flensburg)
  { id: 'ds-002', name: 'nordenergie_kiel_2024_clean_v1',        customer: 'NordEnergie GmbH', technology: 'WIND_ONSHORE',  granularity: '15min', points: 35040, p50: 5260, lf: 35.7, approved: '2026-09-01' },
  { id: 'ds-007', name: 'nordenergie_flensburg_2024_clean_v1',   customer: 'NordEnergie GmbH', technology: 'WIND_ONSHORE',  granularity: '15min', points: 35040, p50: 7920, lf: 38.2, approved: '2026-09-03' },
  // Other customers
  { id: 'ds-003', name: 'rwe_nordsee_a_2024_clean_v1',           customer: 'RWE Renewables',   technology: 'WIND_OFFSHORE', granularity: '15min', points: 35040, p50: 128400, lf: 49.8, approved: '2026-07-20' },
  { id: 'ds-004', name: 'vattenfall_wind_de_2024_clean_v1',      customer: 'Vattenfall',       technology: 'WIND_ONSHORE',  granularity: '15min', points: 35040, p50: 7100, lf: 40.5, approved: '2026-08-28' },
  { id: 'ds-005', name: 'rwe_solar_munich_2023_clean_v2',        customer: 'RWE Renewables',   technology: 'SOLAR',         granularity: '1h',    points: 8760,  p50: 1840, lf: 21.0, approved: '2026-08-10' },
]

const MOCK_UPLOAD_EXCEPTIONS = [
  { id: 0, type: 'Gap' as const, range: 'Jan 15–18', cause: 'Turbine maintenance — 3 days', suggestion: 'Auto-fill (interpolate)' },
  { id: 1, type: 'Gap' as const, range: 'Mar 7, 02:00–06:00', cause: 'Grid fault — 4 h', suggestion: 'Auto-fill (zero production)' },
  { id: 2, type: 'Anomaly' as const, range: 'Aug 22 03:15', cause: 'Spike: 142% of rated capacity', suggestion: 'Cap to rated capacity' },
]

// ─── Shared helpers ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
      <div style={{ marginBottom: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</div>
      {children}
    </div>
  )
}

const iStyle: React.CSSProperties = {
  width: '100%', height: 28, padding: '0 8px',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
  fontSize: 12, fontFamily: 'var(--font-sans)', outline: 'none',
}
const sStyle: React.CSSProperties = {
  width: '100%', height: 28, padding: '0 8px', appearance: 'none',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
  fontSize: 12, fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewQuotePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const customers = useDataValidationStore((s) => s.customers)
  const { createDraftQuote, submitQuote } = usePricingStore()
  const user = useSessionStore((s) => s.user)

  const [tab, setTab] = useState(0)

  const [countryCode, setCountryCode] = useState(params.get('countryCode') ?? 'DE')
  const currency = COUNTRY_CURRENCY[countryCode] ?? 'EUR'
  const [productionTypes, setProductionTypes] = useState<Technology[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerId, setCustomerId] = useState<string | undefined>()
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [parks, setParks] = useState<QuotePark[]>(() => {
    const assetName = params.get('assetName')
    if (!assetName) return []
    const capacityMw = params.get('capacityMw') ? Number(params.get('capacityMw')) : 32
    const technology = (params.get('technology') as Technology) ?? 'WIND_ONSHORE'
    const fromAiUpload = params.get('fromAiUpload') === '1'
    return [{ id: params.get('assetId') ?? `draft-${Date.now()}`, name: assetName, capacityMw, technology, countryCode: params.get('countryCode') ?? 'DE', existing: !fromAiUpload, p50MwhPerYear: Math.round(capacityMw * 8760 * 0.28) }]
  })
  const [assetBrowserTab, setAssetBrowserTab] = useState<AssetBrowserTab>('SEARCH')
  const [parkSearch, setParkSearch] = useState('')
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
  const [expandedArea, setExpandedArea] = useState<string | null>(null)
  const [qaName, setQaName] = useState('')
  const [qaCapacity, setQaCapacity] = useState(20)
  const [qaTech, setQaTech] = useState<Technology>('WIND_ONSHORE')
  const [pricingRequestNameEdited, setPricingRequestNameEdited] = useState(false)
  const [pricingRequestNameOverride, setPricingRequestNameOverride] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')

  const [companyName, setCompanyName] = useState('')
  const [parentAccount, setParentAccount] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [techName, setTechName] = useState('')
  const [techTitle, setTechTitle] = useState('')
  const [techPhone, setTechPhone] = useState('')
  const [techEmail, setTechEmail] = useState('')
  const [commName, setCommName] = useState('')
  const [commTitle, setCommTitle] = useState('')
  const [commPhone, setCommPhone] = useState('')
  const [commEmail, setCommEmail] = useState('')
  const [currentBrp, setCurrentBrp] = useState('')
  const [currentSupplier, setCurrentSupplier] = useState('')
  const [expectedCommDate, setExpectedCommDate] = useState('')
  const [expectedCodDate, setExpectedCodDate] = useState('')
  const [expectedFidDate, setExpectedFidDate] = useState('')
  const [contractTenorYears, setContractTenorYears] = useState(3)
  const [buildingPermit, setBuildingPermit] = useState('In progress')
  const [environmentalPermit, setEnvironmentalPermit] = useState('In progress')
  const [gridConnection, setGridConnection] = useState('In progress')
  const [financingType, setFinancingType] = useState('Project Finance')
  const [operations247, setOperations247] = useState('No')

  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [contractType, setContractType] = useState('PPA')
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [hedgingRequired, setHedgingRequired] = useState('')
  const [inPortfolio, setInPortfolio] = useState('')
  const [hasHistoricalData, setHasHistoricalData] = useState('')
  const [timezone, setTimezone] = useState('')
  const [tsRepresents, setTsRepresents] = useState('')
  const [deadline, setDeadline] = useState('')
  const [productName, setProductName] = useState('')
  const [desksRequired, setDesksRequired] = useState<Desk[]>([])
  const [showProductCatalogue, setShowProductCatalogue] = useState(false)

  const [parkDataMap, setParkDataMap] = useState<Record<string, ParkDataStatus>>({})
  function updateParkData(parkId: string, s: ParkDataStatus) {
    setParkDataMap(m => ({ ...m, [parkId]: s }))
  }

  type LinkedDoc = { name: string; classification?: string }
  const [linkedDocuments, setLinkedDocuments] = useState<Record<string, LinkedDoc[]>>({})
  function onDocumentsLinked(docs: Record<string, LinkedDoc[]>) {
    setLinkedDocuments((prev) => {
      const next = { ...prev }
      for (const [key, files] of Object.entries(docs)) {
        next[key] = [...(next[key] ?? []), ...files.filter((f) => !(next[key] ?? []).some((e) => e.name === f.name))]
      }
      return next
    })
  }

  useEffect(() => {
    const raw = localStorage.getItem('orca_park_data_ready')
    if (raw) {
      try {
        const { parkId, datasetName } = JSON.parse(raw) as { parkId: string; datasetName: string }
        setParkDataMap(m => ({ ...m, [parkId]: { status: 'ready', datasetName } }))
      } catch {}
      localStorage.removeItem('orca_park_data_ready')
    }
  }, [])

  const autoName = useMemo(() => {
    if (!customerName && parks.length === 0) return ''
    return [customerName || '(customer)', parks.map((p) => p.name).join(', ')].filter(Boolean).join(' — ')
  }, [customerName, parks])

  const pricingRequestName = pricingRequestNameEdited ? pricingRequestNameOverride : autoName

  const datasetRef = params.get('datasetId')
    ? { datasetId: params.get('datasetId')!, assetName: params.get('assetName') ?? '' }
    : undefined

  const searchResults = useMemo(() => {
    if (!parkSearch || parkSearch.length < 2) return []
    const q = parkSearch.toLowerCase()
    return customers.flatMap((c) =>
      c.sites.filter((s) => s.countryCode === countryCode && s.name.toLowerCase().includes(q)).map((s) => ({ site: s, customer: c })),
    )
  }, [customers, parkSearch, countryCode])

  function addSitePark(siteId: string, siteName: string, siteCapacity: number, siteTech: DVTechnology, custName: string, custId: string) {
    if (parks.some((p) => p.id === siteId)) return
    setParks((prev) => [...prev, { id: siteId, name: siteName, capacityMw: siteCapacity, technology: mapDvTech(siteTech), countryCode, existing: true, p50MwhPerYear: Math.round(siteCapacity * 8760 * 0.28) }])
    if (!customerName) { setCustomerName(custName); setCustomerId(custId) }
    setParkSearch('')
  }

  function addQuickAsset() {
    if (!qaName.trim()) return
    setParks((prev) => [...prev, { id: `draft-${Date.now()}`, name: qaName.trim(), capacityMw: qaCapacity, technology: qaTech, countryCode, existing: false, p50MwhPerYear: Math.round(qaCapacity * 8760 * 0.28) }])
    setQaName(''); setQaCapacity(20); setQaTech('WIND_ONSHORE')
  }

  function addBatchParks(detected: { name: string; capacityMw: number; technology: Technology; datasetName?: string; sourceFile?: string }[]) {
    const stamped = detected.map((d) => ({ ...d, id: `detected-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }))
    setParks((prev) => [...prev, ...stamped.map((d) => ({
      id: d.id, name: d.name, capacityMw: d.capacityMw, technology: d.technology,
      countryCode, existing: false, p50MwhPerYear: Math.round(d.capacityMw * 8760 * 0.28),
    }))])
    stamped.forEach((d) => { if (d.datasetName) updateParkData(d.id, { status: 'ready', datasetName: d.datasetName, sourceFile: d.sourceFile }) })
  }

  function fillDemoData() {
    // Step 1 — use Encavis AG + real DV site (site-rostock) so everything is connected
    setCountryCode('DE')
    setProductionTypes(['WIND_ONSHORE'])
    setDirection('BUY')
    setContractType('PPA')
    setCustomerName('Encavis AG')
    setCustomerId('cust-encavis')
    if (parks.length === 0) {
      // Use the real DV seed site so park shows "Existing" and links to DV customer
      addSitePark('site-rostock', 'Rostock Wind Park', 32, 'WIND', 'Encavis AG', 'cust-encavis')
      setParkDataMap(m => ({ ...m, 'site-rostock': { status: 'ready', datasetName: 'encavis_rostock_2024_clean_v1' } }))
    }
    // Step 2 — Encavis AG company profile
    setCompanyName('Encavis AG')
    setParentAccount('Encavis AG (listed, SDAX)')
    setVatNumber('DE 218 549 169')
    setCompanyAddress('Große Galachowstraße 18, 22767 Hamburg, Germany')
    setTechName('Thomas Richter')
    setTechTitle('Head of Asset Management')
    setTechPhone('+49 40 37 85 7400')
    setTechEmail('t.richter@encavis.com')
    setCommName('Anna Schmidt')
    setCommTitle('Commercial Director — Germany')
    setCommPhone('+49 40 37 85 7420')
    setCommEmail('a.schmidt@encavis.com')
    setCurrentBrp('50Hertz Transmission GmbH')
    setCurrentSupplier('Vattenfall Europe Sales GmbH')
    setExpectedCodDate('2027-04-01')
    setExpectedCommDate('2027-01-01')
    setExpectedFidDate('2026-11-30')
    setContractTenorYears(10)
    setBuildingPermit('Granted')
    setEnvironmentalPermit('Granted')
    setGridConnection('Granted')
    setFinancingType('Project Finance')
    setOperations247('Yes')
    // Step 3 — Pricing parameters
    setPriority('High')
    setHedgingRequired('Yes')
    setInPortfolio('Yes')
    setHasHistoricalData('Yes')
    setTimezone('CET (UTC+1)')
    setTsRepresents('Period start')
    setDeadline('2026-09-15')
    setProductName('Fixed Price PPA — Baseload')
    setDesksRequired(['FAT'])
    setAdditionalComments('Encavis requires a 10-year fixed-price PPA for Rostock Wind Park. Priority delivery before Q3 close. Validated production data already attached.')
    setLinkedDocuments({
      'Rostock Wind Park': [
        { name: 'Rostock_prod_MaLo1_2024.csv', classification: 'Production → Rostock via meter-point 50123456…' },
        { name: 'Rostock_prod_MaLo2_2024.csv', classification: 'Production → Rostock via meter-point 50123457…' },
      ],
      'Neubrandenburg Wind Park': [
        { name: 'Encavis_MaStR_Q3.csv', classification: 'Asset detail · 3 parks detected' },
      ],
      request: [
        { name: 'Encavis_Redispatch_2024-2025.pdf', classification: 'Redispatch · 24 instructions extracted' },
      ],
    })
  }

  function handleSubmit(alsoSubmit: boolean) {
    const id = createDraftQuote({
      countryCode, currency,
      customerName: customerName || 'Unnamed Customer', customerId, isNewCustomer,
      productionTypes: productionTypes.length ? productionTypes : ['WIND_ONSHORE'],
      direction, contractType, parks,
      productName: productName || 'Fixed Price PPA — Baseload',
      desksRequired: desksRequired.length ? desksRequired : ['FAT'],
      projectInfo: {
        companyName: companyName || customerName, parentAccount, vatNumber, companyAddress,
        technicalContactName: techName, technicalContactTitle: techTitle, technicalContactPhone: techPhone, technicalContactEmail: techEmail,
        commercialContactName: commName, commercialContactTitle: commTitle, commercialContactPhone: commPhone, commercialContactEmail: commEmail,
        currentBrp, currentSupplier, cod: expectedCodDate || new Date().getFullYear() + '-06-01',
        expectedCommissioningDate: expectedCommDate, expectedFidDate,
        contractTenorYears, buildingPermit, environmentalPermit, financingType,
        gridConnectionSecured: gridConnection, operations247,
      },
      datasetRef, createdBy: user().email,
    })
    if (alsoSubmit) {
      submitQuote(id)
      navigate('/quotes')
    } else {
      navigate(`/quotes/${id}`)
    }
  }

  const TABS = ['Pricing Request Summary', 'Project Info', 'Pricing Request Details', 'Asset Details']

  return (
    <div>
      <Link to="/quotes" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12, fontSize: 12, color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
        <ChevronLeft size={13} /> Back to Quotes
      </Link>

      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 20 }}>New Pricing Request</h1>

      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {/* Wizard header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '14px 24px' }}>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>Complete the request details</div>
            <div style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-muted)' }}>Required fields are marked with *.</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>{TABS.length} STEPS</span>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 24px' }}>
          {TABS.map((t, i) => {
            const active = i === tab
            return (
              <button key={t} onClick={() => setTab(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px 12px 0', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)', background: 'none', border: 'none', borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent', cursor: 'pointer', marginBottom: -1, transition: 'color 120ms ease' }}>
                <span style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 11, fontWeight: 600, background: active ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: active ? 'var(--color-on-accent)' : 'var(--color-text-muted)', border: active ? 'none' : '1px solid var(--color-border)' }}>
                  {i + 1}
                </span>
                {t}
              </button>
            )
          })}
        </div>

        {/* Step content */}
        <div style={{ padding: 24 }}>
          {tab === 0 && <Step1 countryCode={countryCode} setCountryCode={setCountryCode} currency={currency} productionTypes={productionTypes} setProductionTypes={setProductionTypes} customerName={customerName} setCustomerName={setCustomerName} isNewCustomer={isNewCustomer} setIsNewCustomer={setIsNewCustomer} direction={direction} setDirection={setDirection} contractType={contractType} setContractType={setContractType} parks={parks} removePark={(id: string) => setParks((p) => p.filter((x) => x.id !== id))} assetBrowserTab={assetBrowserTab} setAssetBrowserTab={setAssetBrowserTab} parkSearch={parkSearch} setParkSearch={setParkSearch} searchResults={searchResults} addSitePark={addSitePark} customers={customers} expandedCustomer={expandedCustomer} setExpandedCustomer={setExpandedCustomer} expandedArea={expandedArea} setExpandedArea={setExpandedArea} qaName={qaName} setQaName={setQaName} qaCapacity={qaCapacity} setQaCapacity={setQaCapacity} qaTech={qaTech} setQaTech={setQaTech} addQuickAsset={addQuickAsset} addBatchParks={addBatchParks} pricingRequestName={pricingRequestName} onPricingRequestNameChange={(v: string) => { setPricingRequestNameEdited(true); setPricingRequestNameOverride(v) }} additionalComments={additionalComments} setAdditionalComments={setAdditionalComments} parkDataMap={parkDataMap} updateParkData={updateParkData} onDocumentsLinked={onDocumentsLinked} />}
          {tab === 1 && <Step2 companyName={companyName} setCompanyName={setCompanyName} parentAccount={parentAccount} setParentAccount={setParentAccount} vatNumber={vatNumber} setVatNumber={setVatNumber} companyAddress={companyAddress} setCompanyAddress={setCompanyAddress} techName={techName} setTechName={setTechName} techTitle={techTitle} setTechTitle={setTechTitle} techPhone={techPhone} setTechPhone={setTechPhone} techEmail={techEmail} setTechEmail={setTechEmail} commName={commName} setCommName={setCommName} commTitle={commTitle} setCommTitle={setCommTitle} commPhone={commPhone} setCommPhone={setCommPhone} commEmail={commEmail} setCommEmail={setCommEmail} currentBrp={currentBrp} setCurrentBrp={setCurrentBrp} currentSupplier={currentSupplier} setCurrentSupplier={setCurrentSupplier} expectedCommDate={expectedCommDate} setExpectedCommDate={setExpectedCommDate} expectedCodDate={expectedCodDate} setExpectedCodDate={setExpectedCodDate} expectedFidDate={expectedFidDate} setExpectedFidDate={setExpectedFidDate} contractTenorYears={contractTenorYears} setContractTenorYears={setContractTenorYears} buildingPermit={buildingPermit} setBuildingPermit={setBuildingPermit} environmentalPermit={environmentalPermit} setEnvironmentalPermit={setEnvironmentalPermit} gridConnection={gridConnection} setGridConnection={setGridConnection} financingType={financingType} setFinancingType={setFinancingType} operations247={operations247} setOperations247={setOperations247} />}
          {tab === 2 && <Step3 countryCode={countryCode} currency={currency} productionTypes={productionTypes} customerName={customerName} parks={parks} contractType={contractType} additionalComments={additionalComments} setAdditionalComments={setAdditionalComments} priority={priority} setPriority={setPriority} hedgingRequired={hedgingRequired} setHedgingRequired={setHedgingRequired} inPortfolio={inPortfolio} setInPortfolio={setInPortfolio} hasHistoricalData={hasHistoricalData} setHasHistoricalData={setHasHistoricalData} timezone={timezone} setTimezone={setTimezone} tsRepresents={tsRepresents} setTsRepresents={setTsRepresents} deadline={deadline} setDeadline={setDeadline} productName={productName} desksRequired={desksRequired} setDesksRequired={setDesksRequired} showProductCatalogue={showProductCatalogue} setShowProductCatalogue={setShowProductCatalogue} onSelectProduct={(p: CatalogueProduct) => { setProductName(p.name); setDesksRequired(p.desks); setShowProductCatalogue(false) }} userDisplayName={useSessionStore.getState().user().name} linkedDocuments={linkedDocuments} />}
          {tab === 3 && <Step4 parks={parks} countryCode={countryCode} />}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', padding: '14px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/quotes')} style={{ fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button
              type="button"
              onClick={fillDemoData}
              title="Fill all fields with realistic demo data"
              style={{ height: 26, padding: '0 10px', background: 'transparent', border: '1px dashed var(--color-accent)', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 500, color: 'var(--color-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ⚡ Fill demo data
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setTab((t) => Math.max(0, t - 1))} disabled={tab === 0} style={{ fontSize: 13, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: tab === 0 ? 'not-allowed' : 'pointer', opacity: tab === 0 ? 0.4 : 1 }}>Previous</button>
            {tab < TABS.length - 1 && (
              <button onClick={() => setTab((t) => t + 1)} style={{ height: 28, padding: '0 10px', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Next step</button>
            )}
            <button onClick={() => handleSubmit(true)} style={{ height: 28, padding: '0 12px', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Submit request</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

// ─── Customer Typeahead ───────────────────────────────────────────────────────

function CustomerTypeahead({ value, onChange, customers, isNewCustomer, onToggleNew }: {
  value: string
  onChange: (v: string) => void
  customers: { id: string; name: string; countryCode: string }[]
  isNewCustomer: boolean
  onToggleNew: () => void
}) {
  const [open, setOpen] = useState(false)

  const suggestions = value.length > 0
    ? customers.filter(c => c.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : customers.slice(0, 8)

  return (
    <div style={{ position: 'relative', display: 'flex', gap: 6 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="e.g. Encavis AG, RWE Renewables…"
          style={{ ...(iStyle as React.CSSProperties), width: '100%' }}
        />
        {open && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--color-bg-elevated, var(--color-bg-secondary))', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)', marginTop: 2, overflow: 'hidden' }}>
            {suggestions.map(c => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onChange(c.name); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-muted, rgba(88,166,255,.08))')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{c.countryCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleNew}
        style={{ flexShrink: 0, height: 28, padding: '0 8px', borderRadius: 'var(--radius-md)', border: isNewCustomer ? 'none' : '1px solid var(--color-border)', background: isNewCustomer ? 'var(--color-accent)' : 'transparent', color: isNewCustomer ? 'var(--color-on-accent)' : 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      >
        + New
      </button>
    </div>
  )
}

// ─── Suggest Input ────────────────────────────────────────────────────────────

const BALANCE_AREAS_LIST = ['Amprion', 'TenneT', '50Hertz', 'TransnetBW']
const TSO_LIST = ['Amprion GmbH', 'TenneT TSO GmbH', '50Hertz Transmission GmbH', 'TransnetBW GmbH']
const DSO_LIST = ['Bayernwerk Netz GmbH', 'Westnetz GmbH', 'E.ON Netz GmbH', 'Schleswig-Holstein Netz GmbH', 'Netz Leipzig GmbH', 'Netze BW GmbH', 'SachsenNetze GmbH']
const ASSET_NAME_SUGGESTIONS = [
  'Rostock Wind Park GmbH', 'Nordsee Offshore Wind I GmbH', 'Brandenburg Solar Park AG',
  'Windpark Schleswig GmbH & Co. KG', 'Solarpark Bayern Süd GmbH', 'Windkraft Hannover GmbH',
  'Offshore Wind Borkum GmbH', 'Windpark Thüringen GmbH', 'Solarpark Frankfurt Oder GmbH',
]

function SuggestInput({ value, onChange, suggestions, iStyle, placeholder }: {
  value: string; onChange: (v: string) => void
  suggestions: string[]; iStyle: React.CSSProperties; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const filtered = value.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : suggestions.slice(0, 6)

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={iStyle}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)',
          maxHeight: 180, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(s => (
            <div key={s}
              onMouseDown={() => { onChange(s); setOpen(false) }}
              style={{ padding: '6px 10px', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── New Asset Panel (tabbed) ─────────────────────────────────────────────────

interface DetectedPark {
  id: string
  name: string
  capacityMw: number
  technology: Technology
  note: string
  badge: 'linked' | 'draft' | 'extra'
}

interface DemoFileMeta {
  name: string
  sizeKb: number
  classificationDesc: string
  confidence: number
}

// Exact files from the Encavis demo scenario
const DEMO_ASSET_FILES: DemoFileMeta[] = [
  { name: 'Encavis_MaStR_Q3.csv',             sizeKb:   176, classificationDesc: 'Asset detail · 3 parks detected',                 confidence: 98  },
  { name: 'Rostock_prod_MaLo1_2024.csv',      sizeKb: 8_400, classificationDesc: 'Production → Rostock via meter-point 50123456…', confidence: 100 },
  { name: 'Rostock_prod_MaLo2_2024.csv',      sizeKb: 8_400, classificationDesc: 'Production → Rostock via meter-point 50123457…', confidence: 100 },
  { name: 'Encavis_Redispatch_2024-2025.pdf', sizeKb:   640, classificationDesc: 'Redispatch · 24 instructions extracted',           confidence: 92  },
]
const DEMO_FILE_META: Record<string, DemoFileMeta> = Object.fromEntries(DEMO_ASSET_FILES.map((d) => [d.name, d]))

// Detected parks for the Encavis MaStR file — exactly matching the reference storyboard
const ENCAVIS_MASTR_PARKS: DetectedPark[] = [
  { id: 'dp-neubrandenburg', name: 'Neubrandenburg Wind Park', capacityMw: 48, technology: 'WIND_ONSHORE', note: 'MaStR SEE904111… (matched to Puma)',                   badge: 'linked' },
  { id: 'dp-rostock',        name: 'Rostock Wind Park',        capacityMw: 32, technology: 'WIND_ONSHORE', note: 'MaStR SEE904123… · 2 MaLos will be summed to park',    badge: 'draft'  },
  { id: 'dp-solar-rostock',  name: 'Encavis Solar Rostock',    capacityMw: 18, technology: 'SOLAR' as Technology,        note: 'not requested in this pricing — ignore',              badge: 'extra'  },
]

const PARK_BADGE_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  linked: { label: 'already linked',  bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  draft:  { label: 'new draft',        bg: '#ccfbf1', color: '#0f766e', border: '#5eead4' },
  extra:  { label: 'Extra — skip?',    bg: '#ffedd5', color: '#c2410c', border: '#fdba74' },
}

const MODAL_GAP_START = 1718323200000 // 2024-06-14 00:00 UTC
const MODAL_GAP_END   = 1719014400000 // 2024-06-22 00:00 UTC

const MODAL_PREVIEW_ROWS: { kind: string; cells: string[] }[] = [
  { kind: 'preamble', cells: ['', '', 'S-W I 207755 WEA3', 'S-W I 207756 WEA7', 'S-W II 207754', 'S-W I 207757', 'S-W II 207758'] },
  { kind: 'header',   cells: ['DateValueCET', 'TimeValueCET', 'Volume_KWh', 'Volume_KWh', 'Volume_KWh', 'Volume_KWh', 'Volume_KWh'] },
  { kind: 'data',     cells: ['2024-01-01', '00:00:00', '0', '0', '0', '0', '0'] },
  { kind: 'data',     cells: ['2024-01-01', '00:15:00', '2.38', '4.375', '2.94', '3.185', '1.92'] },
  { kind: 'data',     cells: ['2024-01-01', '00:30:00', '0.197', '0.424', '0.276', '0.493', '0.31'] },
  { kind: 'data',     cells: ['2024-01-01', '00:45:00', '6.717', '6.488', '6.586', '6.291', '5.84'] },
  { kind: 'data',     cells: ['2024-01-01', '01:00:00', '1.845', '2.291', '3.302', '2.856', '2.11'] },
  { kind: 'data',     cells: ['2024-01-01', '01:15:00', '0', '0', '0', '0', '0'] },
  { kind: 'data',     cells: ['2024-01-01', '01:30:00', '0', '2.873', '4.111', '2.44', '1.95'] },
  { kind: 'data',     cells: ['2024-01-01', '01:45:00', '4.593', '10.298', '12.18', '9.47', '8.63'] },
]

function TimeSeriesInspectorModal({ fileName, onClose, onDecision, readOnly }: {
  fileName: string
  onClose: () => void
  onDecision: (d: 'legitimate' | 'error') => void
  readOnly?: boolean
}) {
  const [gapDecision, setGapDecision] = useState<'legitimate' | 'error' | null>(readOnly ? 'legitimate' : null)
  const [fileInspectorOpen, setFileInspectorOpen] = useState(false)
  const gapFile = fileName.replace('.csv', '')
  const hasMaloGap = fileName.toLowerCase().includes('malo')

  const chartData = useMemo(() => {
    const start = 1704067200000
    const end   = 1735689600000
    const step  = 4 * 60 * 60 * 1000
    const span  = end - start
    const pts: { t: number; production: number | null }[] = []
    for (let t = start; t <= end; t += step) {
      if (t >= MODAL_GAP_START && t < MODAL_GAP_END) { pts.push({ t, production: null }); continue }
      const yr  = (t - start) / span
      const day = (t % (24 * 3600 * 1000)) / (24 * 3600 * 1000)
      const seasonal = Math.sin(yr * Math.PI * 2 - Math.PI * 0.5) * 0.25 + 0.65
      const daily    = Math.max(0, Math.sin(day * Math.PI * 2 - Math.PI * 0.5)) * 0.4 + 0.1
      const noise    = (Math.sin(t * 0.0000003 + 1.7) + Math.sin(t * 0.0000007)) * 0.08
      pts.push({ t, production: Math.round(Math.max(0, (seasonal * daily + noise) * 32) * 10) / 10 })
    }
    return pts
  }, [])

  function decide(d: 'legitimate' | 'error') {
    setGapDecision(d)
    onDecision(d)
    setFileInspectorOpen(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '92vw', height: '88vh', background: 'var(--color-bg-primary)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', border: '1px solid var(--color-border)' }}>

        {/* ── Header ── */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bg-secondary)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{fileName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
              {hasMaloGap ? (
                <>Rostock production · 15 min · 234,528 rows · <span style={{ color: '#d97706', fontWeight: 600 }}>178 gaps detected</span></>
              ) : (
                <>Asset detail · validated dataset · 35,040 rows · <span style={{ color: '#16a34a', fontWeight: 600 }}>no gaps</span></>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 6 }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Top 3-panel section ── */}
        <div style={{ flex: '0 0 220px', display: 'flex', borderBottom: '1px solid var(--color-border)', overflow: 'hidden' }}>

          {/* Left sidebar */}
          <div style={{ width: 168, flexShrink: 0, borderRight: '1px solid var(--color-border)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{fileName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Awaiting Review</span>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Files</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 4, background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-border)' }}>
                <span style={{ color: 'var(--color-accent)', fontSize: 11 }}>✓</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{fileName}</span>
              </div>
            </div>
          </div>

          {/* Centre: Raw Preview */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>Raw Preview</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>10 rows × 7 cols</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                    <th style={{ padding: '3px 7px', border: '1px solid var(--color-border)', fontSize: 10, color: 'var(--color-text-muted)', minWidth: 24 }}></th>
                    {['A','B','C','D','E','F','G'].map((c) => (
                      <th key={c} style={{ padding: '3px 9px', border: '1px solid var(--color-border)', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'center', minWidth: 80 }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODAL_PREVIEW_ROWS.map((row, ri) => (
                    <tr key={ri} style={{ background: row.kind === 'preamble' ? '#fffbeb' : row.kind === 'header' ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ padding: '2px 7px', border: '1px solid var(--color-border)', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 9.5 }}>{ri + 1}</td>
                      {row.cells.map((cell, ci) => {
                        const isDateish = row.kind === 'data' && ci < 2
                        return (
                          <td key={ci} style={{ padding: '2px 9px', border: '1px solid var(--color-border)', fontFamily: row.kind === 'data' ? 'var(--font-mono)' : undefined, fontSize: 10.5, color: isDateish ? '#b45309' : row.kind === 'preamble' ? '#92400e' : row.kind === 'header' ? '#166534' : 'var(--color-text-primary)', background: isDateish ? '#fffbeb' : undefined, whiteSpace: 'nowrap' }}>{cell}</td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Agent Analysis */}
          <div style={{ width: 228, flexShrink: 0, borderLeft: '1px solid var(--color-border)', padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>Agent Analysis</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 5 }}>Classification</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>File type</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-primary)' }}>PRODUCTION_ACTUAL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Confidence</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-primary)' }}>100%</span>
              </div>
            </div>
            <div style={{ padding: '7px 9px', borderRadius: 4, background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-border)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent)', marginBottom: 3 }}>Evidence</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-primary)' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)' }}>METER_MATCH</span> — meter-point 50123456 → Rostock Wind Park</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 5 }}>Detected Parks</div>
              <div style={{ padding: '7px 9px', borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>Rostock Wind Park</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#ccfbf1', color: '#0f766e', border: '1px solid #5eead4' }}>new draft</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>32 MW · 2 MaLos summed to park</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Graph & Validation ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', position: 'relative' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 12, marginTop: -4 }}>
            <div style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', borderBottom: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', gap: 5 }}>
              📊 Graph &amp; Validation
            </div>
          </div>

          <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{hasMaloGap ? 'Rostock production' : 'Neubrandenburg production'}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>·</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>15 min · {hasMaloGap ? '234,528' : '35,040'} rows</span>
            {hasMaloGap && <><span style={{ color: 'var(--color-text-muted)' }}>·</span><span style={{ color: '#d97706', fontWeight: 600 }}>178 gaps detected</span></>}
            {!hasMaloGap && <><span style={{ color: 'var(--color-text-muted)' }}>·</span><span style={{ color: '#16a34a', fontWeight: 600 }}>✓ validated, no gaps</span></>}
          </div>

          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} tick={{ fontSize: 10, fill: '#667085' }} />
              <YAxis tick={{ fontSize: 10, fill: '#667085' }} unit=" MW" width={46} />
              <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString('en-GB')} formatter={(v) => [`${v} MW`, 'Production']} />
              {hasMaloGap && <ReferenceArea x1={MODAL_GAP_START} x2={MODAL_GAP_END} fill="#f59e0b" fillOpacity={0.15} stroke="#f59e0b" strokeOpacity={0.7} label={{ value: 'GAP', position: 'insideTop', fontSize: 10, fill: '#d97706', fontWeight: 700 }} />}
              <Line type="monotone" dataKey="production" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>

          {/* Gap table — only for MaLo production files */}
          {!hasMaloGap && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, color: '#16a34a' }}>✓</span>
              <span style={{ fontSize: 12, color: '#166534' }}>Dataset validated — 35,040 rows · 100% complete · no gaps detected. Load factor: 43.8%. P50: 9,187 MWh/yr.</span>
            </div>
          )}
          {hasMaloGap && <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 7, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>Data Gaps</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 100, background: '#fef3c7', color: '#92400e' }}>HITL Review</span>
            </div>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  <tr>
                    {['#', 'FILE · LINES', 'RANGE', 'DIAGNOSIS', 'DECISION'].map((h) => (
                      <th key={h} style={{ padding: '6px 11px', textAlign: 'left', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 11px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>G1</td>
                    <td style={{ padding: '8px 11px' }}>
                      <button onClick={() => setFileInspectorOpen(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-accent)', textDecoration: 'underline' }}>
                        {gapFile} · 3,412–3,589
                      </button>
                    </td>
                    <td style={{ padding: '8px 11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>2024-06-14 → 06-21</td>
                    <td style={{ padding: '8px 11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <AlertTriangle size={11} color="#d97706" />
                        <span style={{ color: '#92400e', fontSize: 11 }}>Missing 177 rows</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 11px' }}>
                      {gapDecision ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>✓ {gapDecision === 'legitimate' ? 'Legitimate outage' : 'Error — flagged'}</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => decide('legitimate')} style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, border: '1px solid #16a34a', borderRadius: 4, background: '#f0fdf4', color: '#16a34a', cursor: 'pointer' }}>✓ Legitimate</button>
                          <button onClick={() => decide('error')} style={{ padding: '3px 9px', fontSize: 11, fontWeight: 600, border: '1px solid #ef4444', borderRadius: 4, background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}>✗ Error</button>
                          <button onClick={() => setFileInspectorOpen(true)} style={{ padding: '3px 9px', fontSize: 11, border: '1px solid var(--color-border)', borderRadius: 4, background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>View rows</button>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>}

          {/* Post-decision blocks — only for MaLo gap review */}
          {hasMaloGap && gapDecision && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ padding: '9px 13px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #86efac' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16a34a', marginBottom: 2 }}>Cleansed Series Generated</div>
                <div style={{ fontSize: 11, color: '#166534' }}>178 gaps filled from prior-year shape. Load factor: 27.3%. P50: 76,564 MWh/yr. All values tagged "auto-filled".</div>
              </div>
              <div style={{ padding: '9px 13px', borderRadius: 4, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 2 }}>Audit Event</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-secondary)' }}>
                  hitl-gap-decision · G1 · {gapDecision} · file {gapFile} · lines 3412-3589 · by Aditya
                </div>
              </div>
            </div>
          )}

          {/* File Inspector sub-drawer — only for MaLo gap review */}
          {hasMaloGap && fileInspectorOpen && (
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 420, background: 'var(--color-bg-primary)', borderLeft: '2px solid var(--color-border)', zIndex: 10, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 16px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '9px 13px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>File Inspector</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1, fontFamily: 'var(--font-mono)' }}>{gapFile} · lines 3,408–3,592</div>
                </div>
                <button onClick={() => setFileInspectorOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                    <tr>
                      {['#', 'Timestamp (CET)', 'MaLo', 'kWh'].map((h) => (
                        <th key={h} style={{ padding: '5px 9px', textAlign: 'left', fontSize: '9.5px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { row: 3408, ts: '2024-06-13 22:15', kwh: '18.5' },
                      { row: 3409, ts: '2024-06-13 22:30', kwh: '16.2' },
                      { row: 3410, ts: '2024-06-13 22:45', kwh: '11.8' },
                      { row: 3411, ts: '2024-06-13 23:00', kwh: '9.4' },
                      { row: 3412, ts: '2024-06-13 23:15', kwh: '7.1' },
                    ] as { row: number; ts: string; kwh: string }[]).map((r) => (
                      <tr key={r.row} style={{ borderBottom: '1px solid var(--color-border)', background: r.row === 3412 ? '#fef9c3' : 'transparent' }}>
                        <td style={{ padding: '4px 9px', color: 'var(--color-text-muted)' }}>{r.row.toLocaleString()}</td>
                        <td style={{ padding: '4px 9px', color: '#b45309' }}>{r.ts}</td>
                        <td style={{ padding: '4px 9px', color: 'var(--color-text-secondary)' }}>50123456</td>
                        <td style={{ padding: '4px 9px', color: 'var(--color-text-primary)' }}>{r.kwh}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} style={{ padding: '8px 10px', background: '#fff7ed', borderTop: '2px dashed #f59e0b', borderBottom: '2px dashed #f59e0b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <AlertTriangle size={11} color="#d97706" />
                          <span style={{ color: '#92400e', fontWeight: 600 }}>3,413 – 3,588 · 177 rows missing</span>
                          <span style={{ color: '#d97706' }}> · 2024-06-14 → 06-21</span>
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
                        <td style={{ padding: '4px 9px', color: 'var(--color-text-muted)' }}>{r.row.toLocaleString()}</td>
                        <td style={{ padding: '4px 9px', color: '#b45309' }}>{r.ts}</td>
                        <td style={{ padding: '4px 9px', color: 'var(--color-text-secondary)' }}>50123456</td>
                        <td style={{ padding: '4px 9px', color: 'var(--color-text-primary)' }}>{r.kwh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '9px 13px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 1 }}>Classify this gap:</div>
                <button onClick={() => decide('legitimate')} style={{ width: '100%', padding: '8px 11px', border: '1px solid #16a34a', borderRadius: 4, background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  ✓ Legitimate outage · auto-fill from 2023 same week
                </button>
                <button onClick={() => decide('error')} style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--color-border)', borderRadius: 4, background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
                  ✗ Data error · flag for re-delivery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function detectParks(fileName: string): DetectedPark[] {
  const lower = fileName.toLowerCase()
  if (lower.includes('mastr') || lower.includes('encavis_mastr')) return ENCAVIS_MASTR_PARKS
  // MaLo / production files contribute data to parks already detected from the MaStR file;
  // they don't introduce new park entries of their own
  if (lower.includes('malo') || lower.includes('rostock_prod')) return []
  if (lower.endsWith('.pdf')) return [] // PDFs contain instructions, not parks
  if (lower.includes('schluchtern') || lower.includes('schlüchtern')) {
    return [{ id: `dp-${Date.now()}`, name: 'WP Schlüchtern-Wallroth (4 WEA)', capacityMw: 16, technology: 'WIND_ONSHORE', note: '4 turbines · LGD 2020–2024', badge: 'draft' }]
  }
  if (lower.includes('distelrasen')) {
    return [{ id: `dp-${Date.now()}`, name: 'Windkraft Distelrasen 504', capacityMw: 50, technology: 'WIND_ONSHORE', note: 'Matched from filename', badge: 'draft' }]
  }
  if (lower.includes('german_wind') || lower.includes('german wind')) {
    return [
      { id: `dp-${Date.now()}-a`, name: 'German Wind Portfolio A', capacityMw: 80, technology: 'WIND_ONSHORE', note: 'Sheet 1', badge: 'draft' },
      { id: `dp-${Date.now()}-b`, name: 'German Wind Portfolio B', capacityMw: 40, technology: 'WIND_ONSHORE', note: 'Sheet 2', badge: 'draft' },
    ]
  }
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_\- ]+/g, ' ').replace(/\d{4}.*/, '').trim()
  return [{ id: `dp-${Date.now()}`, name: base || fileName, capacityMw: 30, technology: 'WIND_ONSHORE', note: 'Inferred from filename', badge: 'draft' }]
}

function NewAssetPanel({ qaName, setQaName, qaCapacity, setQaCapacity, qaTech, setQaTech, addQuickAsset, addBatchParks, onDocumentsLinked, iStyle, sStyle }: {
  qaName: string; setQaName: (v: string) => void
  qaCapacity: number; setQaCapacity: (v: number) => void
  qaTech: Technology; setQaTech: (v: Technology) => void
  addQuickAsset: () => void
  addBatchParks: (parks: { name: string; capacityMw: number; technology: Technology; datasetName?: string; sourceFile?: string }[]) => void
  onDocumentsLinked?: (docs: Record<string, { name: string; classification?: string }[]>) => void
  iStyle: React.CSSProperties; sStyle: React.CSSProperties
}) {
  const [mode, setMode] = useState<'UPLOAD' | 'MANUAL'>('MANUAL')
  const [balanceArea, setBalanceArea] = useState('')
  const [tso, setTso] = useState('')
  const [dso, setDso] = useState('')
  const [dropHovered, setDropHovered] = useState(false)
  type UploadEntry = { name: string; status: 'queued' | 'parsing' | 'ready'; parks: DetectedPark[]; classificationDesc?: string; confidence?: number }
  const [uploadedFiles, setUploadedFiles] = useState<UploadEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [inspectorFile, setInspectorFile] = useState<string | null>(null)
  const [fileGapDecisions, setFileGapDecisions] = useState<Record<string, 'legitimate' | 'error'>>({})

  function enqueueNames(names: string[]) {
    const entries: UploadEntry[] = names
      .filter((name) => !uploadedFiles.some((u) => u.name === name))
      .map((name) => ({ name, status: 'queued', parks: [] }))
    setUploadedFiles((prev) => [...prev, ...entries])
    entries.forEach((entry, i) => {
      setTimeout(() => {
        setUploadedFiles((prev) => prev.map((u) => u.name === entry.name ? { ...u, status: 'parsing' } : u))
      }, 300 + i * 200)
      setTimeout(() => {
        const parks = detectParks(entry.name)
        const meta = DEMO_FILE_META[entry.name]
        setUploadedFiles((prev) => prev.map((u) => u.name === entry.name ? { ...u, status: 'ready', parks, classificationDesc: meta?.classificationDesc, confidence: meta?.confidence } : u))
        // auto-select linked/draft parks, not extra
        setSelected((s) => { const n = new Set(s); parks.filter((p) => p.badge !== 'extra').forEach((p) => n.add(p.id)); return n })
      }, 1000 + i * 400)
    })
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    enqueueNames(Array.from(incoming).map((f) => f.name))
  }

  function loadDemoFiles() {
    enqueueNames(DEMO_ASSET_FILES.map((d) => d.name))
  }

  const allDetected = uploadedFiles.flatMap((u) => u.parks)
  const selectedParks = allDetected.filter((p) => selected.has(p.id))

  function handleAddParks() {
    // Find first reviewed MaLo file (legitimate decision)
    const reviewedMaLo = Object.entries(fileGapDecisions).find(
      ([name, decision]) => name.toLowerCase().includes('malo') && decision === 'legitimate'
    )
    const maLoReviewed = !!reviewedMaLo
    // Derive dataset name from actual uploaded file, e.g. Rostock_prod_MaLo1_2024.csv → rostock_prod_malo1_2024_clean_v1
    const rostockDataset = reviewedMaLo
      ? reviewedMaLo[0].replace(/\.csv$/i, '_clean_v1').toLowerCase()
      : 'encavis_rostock_2024_clean_v1'
    // MaStR file is the source that identified linked parks (e.g. Neubrandenburg)
    const maStrFile = uploadedFiles.find((f) => f.name.toLowerCase().includes('mastr'))?.name

    const parksWithData = selectedParks.map((p) => {
      const lname = p.name.toLowerCase()
      // Rostock: link to reviewed MaLo-derived dataset
      if (maLoReviewed && lname.includes('rostock')) {
        return { ...p, datasetName: rostockDataset, sourceFile: reviewedMaLo![0] }
      }
      // Neubrandenburg (already linked in DV): auto-attach existing validated dataset
      if (p.badge === 'linked' && lname.includes('neubrandenburg')) {
        const ds = MOCK_VALIDATED_DATASETS.find((d) => d.name.toLowerCase().includes('neubrandenburg'))
        return { ...p, datasetName: ds?.name ?? 'encavis_neubrandenburg_2024_clean_v1', sourceFile: maStrFile ?? 'Encavis_MaStR_Q3.csv' }
      }
      // Generic linked park: try to match by first word of park name
      if (p.badge === 'linked') {
        const key = lname.split(' ')[0]
        const ds = MOCK_VALIDATED_DATASETS.find((d) => d.name.toLowerCase().includes(key))
        if (ds) return { ...p, datasetName: ds.name, sourceFile: maStrFile }
      }
      return { ...p, datasetName: undefined, sourceFile: undefined }
    })
    addBatchParks(parksWithData)

    // Build document → park associations for Step 3 Attached Documents
    if (onDocumentsLinked) {
      const docMap: Record<string, { name: string; classification?: string }[]> = {}
      const rostockPark = selectedParks.find((p) => p.name.toLowerCase().includes('rostock'))
      const linkedPark  = selectedParks.find((p) => p.badge === 'linked')
      for (const f of uploadedFiles.filter((u) => u.status === 'ready')) {
        const lower = f.name.toLowerCase()
        const entry = { name: f.name, classification: f.classificationDesc }
        if (lower.includes('malo') || lower.includes('rostock_prod')) {
          const key = rostockPark?.name ?? 'Rostock Wind Park'
          docMap[key] = [...(docMap[key] ?? []), entry]
        } else if (lower.includes('mastr')) {
          const key = linkedPark?.name ?? 'Neubrandenburg Wind Park'
          docMap[key] = [...(docMap[key] ?? []), entry]
        } else if (lower.endsWith('.pdf')) {
          docMap['request'] = [...(docMap['request'] ?? []), entry]
        }
      }
      onDocumentsLinked(docMap)
    }

    setUploadedFiles([])
    setSelected(new Set())
    setMode('MANUAL')
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    height: 30,
    padding: '0 14px',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 14 }}>
        <button type="button" style={tabStyle(mode === 'UPLOAD')} onClick={() => setMode('UPLOAD')}>
          <Upload size={13} /> Upload files
        </button>
        <button type="button" style={tabStyle(mode === 'MANUAL')} onClick={() => setMode('MANUAL')}>
          <Pencil size={13} /> Key in manually
        </button>
      </div>

      {mode === 'UPLOAD' && (
        <div>
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDropHovered(true) }}
            onDragLeave={() => setDropHovered(false)}
            onDrop={(e) => { e.preventDefault(); setDropHovered(false); addFiles(e.dataTransfer.files) }}
            style={{
              border: `2px dashed ${dropHovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: uploadedFiles.length ? '16px 20px' : '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dropHovered ? 'var(--color-accent-muted)' : undefined,
              transition: 'border-color 120ms, background 120ms',
              marginBottom: uploadedFiles.length ? 10 : 0,
            }}
          >
            <Upload size={22} style={{ marginBottom: 6, color: dropHovered ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
              Drop CSV / Excel / PDF here — or <span style={{ color: 'var(--color-accent)' }}>Browse files</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              AI auto-detects parks, capacity, technology, and production profile
            </div>
            <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.xlsm,.pdf" style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
          </div>

          {/* Demo shortcut */}
          {uploadedFiles.length === 0 && (
            <div style={{ marginTop: 8, marginBottom: 2 }}>
              <button
                type="button"
                onClick={loadDemoFiles}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', border: '1px dashed var(--color-accent-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
              >
                <Sparkles size={11} /> Load demo files — Encavis MaStR · Rostock MaLo×2 · Redispatch PDF
              </button>
            </div>
          )}

          {/* File list — Classification results */}
          {uploadedFiles.length > 0 && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 10 }}>
              {uploadedFiles.map((entry, i) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined, fontSize: 12 }}>
                  {entry.status === 'ready'
                    ? <span style={{ color: 'var(--color-success)', fontSize: 13, flexShrink: 0 }}>✓</span>
                    : entry.status === 'parsing'
                    ? <span style={{ color: 'var(--color-accent)', fontSize: 11, flexShrink: 0 }}>…</span>
                    : <span style={{ color: 'var(--color-text-muted)', fontSize: 11, flexShrink: 0 }}>–</span>}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)', flexShrink: 0 }}>{entry.name}</span>
                  {entry.classificationDesc && (
                    <span style={{ flex: 1, fontSize: 11, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🌿 {entry.classificationDesc}
                    </span>
                  )}
                  {entry.confidence != null && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {entry.confidence}% conf.
                    </span>
                  )}
                  {entry.status !== 'ready' && !entry.classificationDesc && (
                    <span style={{ flex: 1, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {entry.status === 'parsing' ? 'Analysing…' : '—'}
                    </span>
                  )}
                  {entry.status === 'ready' && entry.name.toLowerCase().includes('malo') && (
                    fileGapDecisions[entry.name] ? (
                      <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>✓ Gap reviewed</span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setInspectorFile(entry.name) }}
                        style={{ fontSize: 10, color: '#92400e', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 3, padding: '1px 8px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <AlertTriangle size={10} color="#d97706" /> Review gaps →
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detected parks */}
          {allDetected.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Detected Parks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {allDetected.map((park) => {
                  const bs = PARK_BADGE_STYLE[park.badge]
                  const isChecked = selected.has(park.id)
                  return (
                    <label key={park.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: `1px solid ${isChecked ? bs.border : 'var(--color-border)'}`, background: isChecked ? bs.bg + '55' : 'var(--color-bg-tertiary)', cursor: 'pointer', opacity: park.badge === 'extra' ? 0.8 : 1 }}>
                      <input type="checkbox" checked={isChecked} onChange={() => setSelected((s) => { const n = new Set(s); n.has(park.id) ? n.delete(park.id) : n.add(park.id); return n })} />
                      <span style={{ fontSize: 13 }}>📍</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{park.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{park.capacityMw} MW · {park.note}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`, whiteSpace: 'nowrap' }}>
                        {bs.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {allDetected.length > 0 && uploadedFiles.some((f) => f.status === 'ready' && f.name.toLowerCase().includes('malo') && !fileGapDecisions[f.name]) && (
            <div style={{ marginBottom: 8, padding: '7px 10px', borderRadius: 4, background: '#fffbeb', border: '1px solid #f59e0b', fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={11} color="#d97706" style={{ flexShrink: 0 }} />
              <span>Production files have unreviewed gaps — click <strong>Review gaps →</strong> to accept or flag before adding</span>
            </div>
          )}

          {allDetected.length > 0 && (
            <button
              type="button"
              disabled={selectedParks.length === 0}
              onClick={handleAddParks}
              style={{ height: 30, padding: '0 14px', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, cursor: selectedParks.length > 0 ? 'pointer' : 'not-allowed', opacity: selectedParks.length > 0 ? 1 : 0.5 }}
            >
              Add {selectedParks.length} park{selectedParks.length !== 1 ? 's' : ''} to request
            </button>
          )}
        </div>
      )}

      {inspectorFile && (
        <TimeSeriesInspectorModal
          fileName={inspectorFile}
          onClose={() => setInspectorFile(null)}
          onDecision={(d) => { setFileGapDecisions((prev) => ({ ...prev, [inspectorFile!]: d })); setInspectorFile(null) }}
        />
      )}

      {mode === 'MANUAL' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Asset name *">
            <SuggestInput value={qaName} onChange={setQaName} suggestions={ASSET_NAME_SUGGESTIONS} iStyle={iStyle} placeholder="e.g. Rostock Wind Park GmbH" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Capacity (MW)"><input type="number" min={1} value={qaCapacity} onChange={(e) => setQaCapacity(Number(e.target.value))} style={iStyle} /></Field>
            <Field label="Technology">
              <select value={qaTech} onChange={(e) => setQaTech(e.target.value as Technology)} style={sStyle}>
                <option value="WIND_ONSHORE">Wind Onshore</option>
                <option value="WIND_OFFSHORE">Wind Offshore</option>
                <option value="SOLAR">Solar</option>
              </select>
            </Field>
            <Field label="Balance Area">
              <SuggestInput value={balanceArea} onChange={setBalanceArea} suggestions={BALANCE_AREAS_LIST} iStyle={iStyle} placeholder="e.g. Amprion" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="TSO">
              <SuggestInput value={tso} onChange={setTso} suggestions={TSO_LIST} iStyle={iStyle} placeholder="e.g. Amprion GmbH" />
            </Field>
            <Field label="DSO">
              <SuggestInput value={dso} onChange={setDso} suggestions={DSO_LIST} iStyle={iStyle} placeholder="e.g. Bayernwerk Netz GmbH" />
            </Field>
            <Field label="Latitude"><input placeholder="e.g. 52.4321" style={iStyle} /></Field>
            <Field label="Longitude"><input placeholder="e.g. 13.7654" style={iStyle} /></Field>
            <Field label="COD (Planned)"><input type="date" style={iStyle} /></Field>
            <Field label="Registry ID (MaStR/REPD)"><input placeholder="e.g. SEE900000123456" style={iStyle} /></Field>
            <Field label="Meter-point ID"><input placeholder="e.g. DE00-123456-789" style={iStyle} /></Field>
            <Field label="Notes"><input placeholder="Optional notes" style={iStyle} /></Field>
          </div>
          <button type="button" disabled={!qaName.trim()} onClick={addQuickAsset} style={{ alignSelf: 'flex-start', height: 28, padding: '0 12px', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500, cursor: qaName.trim() ? 'pointer' : 'not-allowed', opacity: qaName.trim() ? 1 : 0.5 }}>
            Add Asset
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ParkDataRow ──────────────────────────────────────────────────────────────

function ParkDataRow({
  park,
  dataStatus,
  onUpdate,
  onRemove,
  onPreviewChart,
  iStyle: rowIStyle,
}: {
  park: QuotePark
  dataStatus: ParkDataStatus
  onUpdate: (s: ParkDataStatus) => void
  onRemove: () => void
  onPreviewChart?: (file: string) => void
  iStyle: React.CSSProperties
}) {
  const navigate = useNavigate()
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [datasetSearch, setDatasetSearch] = useState('')
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [resolvedExceptions, setResolvedExceptions] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (uploadPhase !== 'running') return
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploadPhase('done')
          return 100
        }
        return Math.min(100, prev + 3)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [uploadPhase])

  const filteredDatasets = MOCK_VALIDATED_DATASETS.filter(ds => {
    const q = datasetSearch.toLowerCase()
    return ds.name.toLowerCase().includes(q) || ds.customer.toLowerCase().includes(q)
  }).sort((a, b) => {
    const aSameTech = a.technology === park.technology ? 0 : 1
    const bSameTech = b.technology === park.technology ? 0 : 1
    return aSameTech - bSameTech
  })

  const allResolved = MOCK_UPLOAD_EXCEPTIONS.every(e => resolvedExceptions[e.id] !== undefined)
  const resolvedCount = Object.keys(resolvedExceptions).length

  let statusPill: React.ReactNode
  if (dataStatus.status === 'none') {
    statusPill = (
      <span style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, padding: '1px 7px' }}>
        No data
      </span>
    )
  } else if (dataStatus.status === 'validating') {
    statusPill = (
      <span style={{ background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)', color: 'var(--color-warning)', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, padding: '1px 7px' }}>
        Validation in progress
      </span>
    )
  } else {
    statusPill = (
      <span style={{ background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, padding: '1px 7px' }}>
        ● Pricing ready · {dataStatus.datasetName}
      </span>
    )
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    fontWeight: active ? 600 : 400,
    fontSize: 12,
    cursor: 'pointer',
    marginBottom: -1,
  })

  return (
    <div style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{park.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{park.capacityMw} MW</span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: park.existing ? 'var(--color-info-muted, rgba(88,166,255,0.12))' : 'var(--color-warning-muted)', color: park.existing ? 'var(--color-info)' : 'var(--color-warning)', border: park.existing ? '1px solid rgba(88,166,255,0.3)' : '1px solid var(--color-warning-border)' }}>{park.existing ? 'Existing' : 'New'}</span>
          {statusPill}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {dataStatus.status !== 'ready' && (
            <button type="button" onClick={() => setPanelOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-accent)', background: 'none', border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
              Add data {panelOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
          {dataStatus.status === 'ready' && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{dataStatus.datasetName}</span>
          )}
          {dataStatus.status === 'ready' && dataStatus.sourceFile && onPreviewChart && (
            <button type="button" onClick={() => onPreviewChart(dataStatus.sourceFile!)} title="Preview production chart" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', padding: 2 }}>
              <BarChart2 size={14} />
            </button>
          )}
          <button type="button" onClick={() => {
            localStorage.setItem('orca_pending_park', JSON.stringify({ parkId: park.id, returnTo: window.location.pathname + window.location.search }))
            navigate('/assets/new')
          }} style={{ fontSize: 11, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            Assets &amp; Details <ExternalLink size={11} />
          </button>
          <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Inline panel */}
      {panelOpen && (
        <div style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border-subtle)', padding: 14 }}>
          {/* Tab strip */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
            <button type="button" style={tabStyle(activeTab === 'library')} onClick={() => setActiveTab('library')}>
              📦 Use validated library
            </button>
            <button type="button" style={tabStyle(activeTab === 'upload')} onClick={() => setActiveTab('upload')}>
              ⬆ Upload &amp; validate
            </button>
          </div>

          {/* Library tab */}
          {activeTab === 'library' && (
            <div>
              <input
                value={datasetSearch}
                onChange={e => setDatasetSearch(e.target.value)}
                placeholder="Search by name or customer…"
                style={{ ...rowIStyle, marginBottom: 10 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredDatasets.map(ds => (
                  <div
                    key={ds.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', gap: 12 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-secondary)')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500 }}>{ds.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {ds.customer} · {ds.technology} · {ds.granularity} · {ds.points.toLocaleString()} pts · P50 {ds.p50.toLocaleString()} MWh · LF {ds.lf}% · approved {ds.approved}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onUpdate({ status: 'ready', datasetName: ds.name }); setPanelOpen(false) }}
                      style={{ flexShrink: 0, height: 26, padding: '0 10px', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Use this ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload & validate tab */}
          {activeTab === 'upload' && (
            <div>
              {uploadPhase === 'idle' && (
                <div
                  style={{ border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '28px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <Upload size={24} style={{ marginBottom: 8, color: 'var(--color-accent)' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>Drop your production CSV / Excel here</div>
                  <button
                    type="button"
                    onClick={() => { setProgress(0); setUploadPhase('running'); setResolvedExceptions({}) }}
                    style={{ height: 28, padding: '0 14px', background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Simulate upload
                  </button>
                </div>
              )}

              {uploadPhase === 'running' && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    Parsing 35,040 rows… detecting gaps… checking anomalies…
                  </div>
                  <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-accent)', transition: 'width 80ms linear', borderRadius: 2 }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>{progress}%</div>
                </div>
              )}

              {uploadPhase === 'done' && (
                <div>
                  <div style={{ display: 'flex', gap: 16, padding: '10px 12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 10 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>35,040</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>data points</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--color-warning)' }}>3</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>issues found</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--color-success)' }}>91%</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>quality score</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{resolvedCount}/{MOCK_UPLOAD_EXCEPTIONS.length}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>resolved</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    {MOCK_UPLOAD_EXCEPTIONS.map(exc => {
                      const resolved = resolvedExceptions[exc.id] !== undefined
                      return (
                        <div key={exc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: resolved ? 'color-mix(in srgb, var(--color-success) 5%, var(--color-bg-secondary))' : 'var(--color-bg-secondary)', border: `1px solid ${resolved ? 'color-mix(in srgb, var(--color-success) 30%, transparent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: exc.type === 'Gap' ? 'color-mix(in srgb, var(--color-warning) 12%, transparent)' : 'color-mix(in srgb, var(--color-danger) 12%, transparent)', color: exc.type === 'Gap' ? 'var(--color-warning)' : 'var(--color-danger)', border: exc.type === 'Gap' ? '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)' : '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)' }}>
                            {exc.type}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{exc.range}</span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>{exc.cause}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0 }}>{exc.suggestion}</span>
                          {!resolved ? (
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button type="button" onClick={() => setResolvedExceptions(r => ({ ...r, [exc.id]: true }))} style={{ height: 24, padding: '0 8px', fontSize: 11, fontWeight: 600, background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✓ Accept suggestion</button>
                              <button type="button" onClick={() => setResolvedExceptions(r => ({ ...r, [exc.id]: false }))} style={{ height: 24, padding: '0 8px', fontSize: 11, fontWeight: 600, background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', color: 'var(--color-danger)', border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✗ Skip</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--color-success)', flexShrink: 0 }}>✓ Resolved</span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {allResolved && (
                    <button
                      type="button"
                      onClick={() => { onUpdate({ status: 'ready', datasetName: 'uploaded_dataset_clean_v1' }); setPanelOpen(false) }}
                      style={{ width: '100%', height: 32, background: 'var(--color-accent)', color: 'var(--color-on-accent)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
                    >
                      ✓ Approve for pricing
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Send to DV team */}
          <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border-subtle)', paddingTop: 8 }}>
            <button type="button" onClick={() => navigate('/data/upload')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-accent)', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              Send to DV team for full review → <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function Step1({ countryCode, setCountryCode, currency, productionTypes, setProductionTypes, customerName, setCustomerName, isNewCustomer, setIsNewCustomer, direction, setDirection, contractType, setContractType, parks, removePark, assetBrowserTab, setAssetBrowserTab, parkSearch, setParkSearch, searchResults, addSitePark, customers, expandedCustomer, setExpandedCustomer, expandedArea, setExpandedArea, qaName, setQaName, qaCapacity, setQaCapacity, qaTech, setQaTech, addQuickAsset, addBatchParks, pricingRequestName, onPricingRequestNameChange, additionalComments, setAdditionalComments, parkDataMap, updateParkData, onDocumentsLinked }: any) {
  const navigate = useNavigate()
  const [previewChartFile, setPreviewChartFile] = useState<string | null>(null)
  const TECH_OPTIONS: Technology[] = ['WIND_ONSHORE', 'WIND_OFFSHORE', 'SOLAR']
  const TECH_LABEL: Record<Technology, string> = { WIND_ONSHORE: 'Wind Onshore', WIND_OFFSHORE: 'Wind Offshore', SOLAR: 'Solar' }
  const areaList = BALANCE_AREAS[countryCode] ?? []
  const customerSitesInCountry = customers.filter((c: any) => c.sites.some((s: any) => s.countryCode === countryCode))

  const subTabKeys: AssetBrowserTab[] = ['SEARCH', 'CUSTOMER', 'BALANCE_AREAS', 'NEW_ASSET']
  const subTabLabels = ['SEARCH', `CUSTOMER (${customerSitesInCountry.length})`, `BALANCE AREAS (${areaList.length})`, '+ NEW ASSET']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Step 1</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Pricing Request Summary</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Start with the counterparty, market, and project names for this request.</span>
        </div>
      </div>

      {/* 6-col row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
        <Field label="Country *">
          <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} style={sStyle}>
            <option value="">Select country</option>
            <option value="DE">Germany</option>
            <option value="SE">Sweden</option>
            <option value="DK">Denmark</option>
            <option value="GB">United Kingdom</option>
          </select>
        </Field>
        <Field label="Currency *">
          <select value={currency} disabled style={{ ...sStyle, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}>
            <option value="EUR">EUR</option><option value="SEK">SEK</option><option value="DKK">DKK</option><option value="GBP">GBP</option>
          </select>
        </Field>
        <Field label="Production Type(s) *">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 8px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', minHeight: 28 }}>
            {TECH_OPTIONS.map((t) => (
              <button key={t} type="button" onClick={() => setProductionTypes((cur: Technology[]) => cur.includes(t) ? cur.filter((x: Technology) => x !== t) : [...cur, t])}
                style={{ padding: '1px 8px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 500, cursor: 'pointer', border: productionTypes.includes(t) ? 'none' : '1px solid var(--color-border)', background: productionTypes.includes(t) ? 'var(--color-accent)' : 'transparent', color: productionTypes.includes(t) ? 'var(--color-on-accent)' : 'var(--color-text-secondary)' }}>
                {TECH_LABEL[t]}
              </button>
            ))}
            {productionTypes.length === 0 && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Select technology types...</span>}
          </div>
        </Field>
        <Field label="Direction *">
          <select value={direction} onChange={e => setDirection(e.target.value as 'BUY' | 'SELL')} style={{ height: 32, width: '100%', padding: '0 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', appearance: 'none' }}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </Field>
        <Field label="Contract Type *">
          <select value={contractType} onChange={e => setContractType(e.target.value)} style={{ height: 32, width: '100%', padding: '0 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: 12, cursor: 'pointer', outline: 'none', appearance: 'none' }}>
            <option value="PPA">PPA</option>
            <option value="Tolling">Tolling</option>
            <option value="CfD">CfD</option>
            <option value="Physical Baseload">Physical Baseload</option>
            <option value="VPPA">VPPA</option>
          </select>
        </Field>
        <Field label="Customer (search CE) *">
          <CustomerTypeahead
            value={customerName}
            onChange={setCustomerName}
            customers={customers}
            isNewCustomer={isNewCustomer}
            onToggleNew={() => setIsNewCustomer((v: boolean) => !v)}
          />
        </Field>
      </div>

      {/* Selected Assets */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--color-border)', padding: '8px 16px' }}>
          <Database size={14} color="var(--color-text-muted)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Selected Assets</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{parks.length}</span>
        </div>
        {parks.length === 0
          ? <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--color-text-muted)' }}>No assets selected yet. Use the browser below to search, browse, or create assets.</div>
          : parks.map((p: QuotePark) => (
            <ParkDataRow
              key={p.id}
              park={p}
              dataStatus={parkDataMap[p.id] ?? { status: 'none' }}
              onUpdate={(s) => updateParkData(p.id, s)}
              onRemove={() => removePark(p.id)}
              onPreviewChart={setPreviewChartFile}
              iStyle={iStyle}
            />
          ))
        }
      </div>

      {/* Browse Assets */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} color="var(--color-text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>Browse Assets</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>18,368 assets cached</span>
        </div>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 16px' }}>
          {subTabKeys.map((key, i) => (
            <button key={key} onClick={() => setAssetBrowserTab(key)}
              style={{ padding: '8px 16px 8px 0', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', borderBottom: assetBrowserTab === key ? '2px solid var(--color-accent)' : '2px solid transparent', color: assetBrowserTab === key ? 'var(--color-accent)' : 'var(--color-text-muted)', cursor: 'pointer', marginBottom: -1, transition: 'color 120ms ease' }}>
              {subTabLabels[i]}
            </button>
          ))}
        </div>
        <div style={{ padding: 16 }}>
          {assetBrowserTab === 'SEARCH' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 10px', height: 32, background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <Search size={13} color="var(--color-text-muted)" />
                <input value={parkSearch} onChange={(e) => setParkSearch(e.target.value)} placeholder="Search Puma assets by name..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--color-text-primary)' }} />
              </div>
              {parkSearch.length < 2
                ? <EmptyState title="Search Puma Assets" description="Type at least 2 characters to search across all Puma meter points. Results are filtered to your selected country." />
                : searchResults.length === 0
                  ? <EmptyState title="No results" description="No matching assets for this country and search term." />
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {searchResults.map(({ site, customer }: any) => (
                      <button key={site.id} type="button" onClick={() => addSitePark(site.id, site.name, site.capacityMw, site.technology, customer.name, customer.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
                        <span style={{ color: 'var(--color-text-primary)' }}>{site.name} <span style={{ color: 'var(--color-text-muted)' }}>· {customer.name}</span></span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{site.capacityMw} MW</span>
                      </button>
                    ))}
                  </div>
              }
            </div>
          )}
          {assetBrowserTab === 'CUSTOMER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {customerSitesInCountry.length === 0
                ? <EmptyState title="No customers" description="No customers have assets in the selected country." />
                : customerSitesInCountry.map((c: any) => {
                  const sitesInCountry = c.sites.filter((s: any) => s.countryCode === countryCode)
                  const expanded = expandedCustomer === c.id
                  return (
                    <div key={c.id}>
                      <button type="button" onClick={() => setExpandedCustomer(expanded ? null : c.id)}
                        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13 }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sitesInCountry.length} site{sitesInCountry.length !== 1 ? 's' : ''}</span>
                          <ChevronDown size={13} color="var(--color-text-muted)" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 120ms ease' }} />
                        </div>
                      </button>
                      {expanded && (
                        <div style={{ marginLeft: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {sitesInCountry.map((s: any) => (
                            <button key={s.id} type="button" onClick={() => addSitePark(s.id, s.name, s.capacityMw, s.technology, c.name, c.id)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13 }}>
                              <span style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{s.capacityMw} MW</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}
          {assetBrowserTab === 'BALANCE_AREAS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {areaList.length === 0
                ? <EmptyState title="No balance areas" description="Select a country to see balance areas." />
                : areaList.map((area) => {
                  const areaSites = customers.flatMap((c: any) => c.sites.filter((s: any) => s.countryCode === countryCode && siteBalanceArea(s.id, countryCode) === area.id).map((s: any) => ({ site: s, customer: c })))
                  const expanded = expandedArea === area.id
                  return (
                    <div key={area.id}>
                      <button type="button" onClick={() => setExpandedArea(expanded ? null : area.id)}
                        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13 }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{area.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{areaSites.length} site{areaSites.length !== 1 ? 's' : ''}</span>
                          <ChevronDown size={13} color="var(--color-text-muted)" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 120ms ease' }} />
                        </div>
                      </button>
                      {expanded && (
                        <div style={{ marginLeft: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {areaSites.length === 0
                            ? <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>No sites in this balance area.</div>
                            : areaSites.map(({ site, customer }: any) => (
                              <button key={site.id} type="button" onClick={() => addSitePark(site.id, site.name, site.capacityMw, site.technology, customer.name, customer.id)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13 }}>
                                <span style={{ color: 'var(--color-text-primary)' }}>{site.name} <span style={{ color: 'var(--color-text-muted)' }}>· {customer.name}</span></span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{site.capacityMw} MW</span>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}
          {assetBrowserTab === 'NEW_ASSET' && (
            <NewAssetPanel
              qaName={qaName} setQaName={setQaName}
              qaCapacity={qaCapacity} setQaCapacity={setQaCapacity}
              qaTech={qaTech} setQaTech={setQaTech}
              addQuickAsset={addQuickAsset}
              addBatchParks={addBatchParks}
              onDocumentsLinked={onDocumentsLinked}
              iStyle={iStyle} sStyle={sStyle}
            />
          )}
        </div>
      </div>

      {/* Request Name */}
      <Field label="Pricing Request Name">
        <input value={pricingRequestName} onChange={(e) => onPricingRequestNameChange(e.target.value)} placeholder="Auto-generated from counterparty + assets — edit to override" style={iStyle} />
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>Auto-generated from counterparty and assets</div>
      </Field>

      {previewChartFile && (
        <TimeSeriesInspectorModal
          fileName={previewChartFile}
          onClose={() => setPreviewChartFile(null)}
          onDecision={() => {}}
          readOnly
        />
      )}
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2({ companyName, setCompanyName, parentAccount, setParentAccount, vatNumber, setVatNumber, companyAddress, setCompanyAddress, techName, setTechName, techTitle, setTechTitle, techPhone, setTechPhone, techEmail, setTechEmail, commName, setCommName, commTitle, setCommTitle, commPhone, setCommPhone, commEmail, setCommEmail, currentBrp, setCurrentBrp, currentSupplier, setCurrentSupplier, expectedCommDate, setExpectedCommDate, expectedCodDate, setExpectedCodDate, expectedFidDate, setExpectedFidDate, contractTenorYears, setContractTenorYears, buildingPermit, setBuildingPermit, environmentalPermit, setEnvironmentalPermit, gridConnection, setGridConnection, financingType, setFinancingType, operations247, setOperations247 }: any) {
  const PERMIT_OPTIONS = ['In progress', 'Granted', 'Not required', 'Refused']
  const YESNO_OPTIONS = ['In progress', 'Yes', 'No', 'N/A']
  const FINANCE_OPTIONS = ['Project Finance', 'Corporate Finance', 'Balance Sheet', 'Unknown']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Step 2</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Company Information</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Add the company details and the main contacts needed for follow-up.</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Field label="Company name *"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Encavis AG" style={iStyle} /></Field>
        <Field label="Parent account"><input value={parentAccount} onChange={(e) => setParentAccount(e.target.value)} placeholder="e.g. Encavis International GmbH" style={iStyle} /></Field>
        <Field label="VAT number"><input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="e.g. DE123456789" style={iStyle} /></Field>
      </div>
      <Field label="Company address">
        <textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2} maxLength={300} placeholder="e.g. Große Elbstraße 59, 22767 Hamburg, Germany" style={{ ...iStyle, height: 'auto', padding: '6px 8px', resize: 'none' }} />
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>{companyAddress.length}/300 characters</div>
      </Field>
      <SubSection title="Customer Technical Contact Person">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Name *"><input value={techName} onChange={(e) => setTechName(e.target.value)} placeholder="e.g. Dr. Anna Müller" style={iStyle} /></Field>
          <Field label="Title *"><input value={techTitle} onChange={(e) => setTechTitle(e.target.value)} placeholder="e.g. Head of Asset Management" style={iStyle} /></Field>
          <Field label="Phone *"><input value={techPhone} onChange={(e) => setTechPhone(e.target.value)} placeholder="+49 40 1234 5678" style={iStyle} /></Field>
          <Field label="Email *"><input value={techEmail} onChange={(e) => setTechEmail(e.target.value)} placeholder="a.mueller@encavis.com" style={iStyle} /></Field>
        </div>
      </SubSection>
      <SubSection title="Commercial Person Responsible">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Field label="Name"><input value={commName} onChange={(e) => setCommName(e.target.value)} placeholder="e.g. Thomas Becker" style={iStyle} /></Field>
          <Field label="Title"><input value={commTitle} onChange={(e) => setCommTitle(e.target.value)} placeholder="e.g. VP Commercial" style={iStyle} /></Field>
          <Field label="Phone"><input value={commPhone} onChange={(e) => setCommPhone(e.target.value)} placeholder="+49 40 1234 9000" style={iStyle} /></Field>
          <Field label="Email"><input value={commEmail} onChange={(e) => setCommEmail(e.target.value)} placeholder="t.becker@encavis.com" style={iStyle} /></Field>
        </div>
      </SubSection>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Current BRP (if any)"><input value={currentBrp} onChange={(e) => setCurrentBrp(e.target.value)} placeholder="e.g. Amprion GmbH" style={iStyle} /></Field>
        <Field label="Current Supplier (if any)"><input value={currentSupplier} onChange={(e) => setCurrentSupplier(e.target.value)} placeholder="e.g. E.ON Energy Solutions" style={iStyle} /></Field>
      </div>
      <div>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Project Characteristics</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Capture timeline, permits, and operating model information.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <Field label="Commissioning Date"><input type="date" value={expectedCommDate} onChange={(e) => setExpectedCommDate(e.target.value)} style={iStyle} /></Field>
          <Field label="COD"><input type="date" value={expectedCodDate} onChange={(e) => setExpectedCodDate(e.target.value)} style={iStyle} /></Field>
          <Field label="FID Date"><input type="date" value={expectedFidDate} onChange={(e) => setExpectedFidDate(e.target.value)} style={iStyle} /></Field>
          <Field label="Contract Tenor">
            <div style={{ display: 'flex', gap: 4 }}>
              <input type="number" min={1} value={contractTenorYears} onChange={(e) => setContractTenorYears(Number(e.target.value))} style={{ ...iStyle, width: 56, flexShrink: 0 }} />
              <select style={{ ...sStyle, flex: 1 }}><option>Years</option></select>
            </div>
          </Field>
          <Field label="Building permit">
            <select value={buildingPermit} onChange={(e) => setBuildingPermit(e.target.value)} style={sStyle}>
              {PERMIT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Environmental permit">
            <select value={environmentalPermit} onChange={(e) => setEnvironmentalPermit(e.target.value)} style={sStyle}>
              {PERMIT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
          <Field label="Grid connection secured">
            <select value={gridConnection} onChange={(e) => setGridConnection(e.target.value)} style={sStyle}>
              {YESNO_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Type of financing">
            <select value={financingType} onChange={(e) => setFinancingType(e.target.value)} style={sStyle}>
              {FINANCE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="24/7 Operations">
            <select value={operations247} onChange={(e) => setOperations247(e.target.value)} style={sStyle}>
              <option>No</option><option>Yes</option><option>Partial</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3({ countryCode, currency, productionTypes, customerName, parks, contractType, additionalComments, setAdditionalComments, priority, setPriority, hedgingRequired, setHedgingRequired, inPortfolio, setInPortfolio, hasHistoricalData, setHasHistoricalData, timezone, setTimezone, tsRepresents, setTsRepresents, deadline, setDeadline, productName, desksRequired, setDesksRequired, showProductCatalogue, setShowProductCatalogue, onSelectProduct, userDisplayName, linkedDocuments }: any) {
  const TECH_LABEL: Record<string, string> = { WIND_ONSHORE: 'Wind Onshore', WIND_OFFSHORE: 'Wind Offshore', SOLAR: 'Solar' }
  const deskList: Desk[] = ['FAT', 'RAM', 'GREEN']
  const requestTime = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const panelHdr: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', padding: '8px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Step 3</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Pricing Request Details</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Add routing, internal context, and desk-specific information.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Request Context */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={panelHdr}>Request Context</div>
          {[
            { label: 'Time of request', value: requestTime },
            { label: 'Name (Originator)', value: userDisplayName || 'Contract Originator' },
            { label: 'Name (Requester)', value: userDisplayName || 'Contract Originator' },
            { label: 'Country', value: countryCode || '—' },
            { label: 'Currency', value: currency || '—' },
            { label: 'Production Type', value: productionTypes.map((t: string) => TECH_LABEL[t] ?? t).join(', ') || '—' },
            { label: 'Contract Type', value: contractType || '—' },
            { label: 'Customer', value: customerName || '—' },
            { label: 'Assets', value: parks.map((p: QuotePark) => p.name).join(', ') || '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 16px', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 13 }}>
              <span style={{ width: 160, flexShrink: 0, color: 'var(--color-text-secondary)', fontSize: 12 }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Pricing Parameters */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={panelHdr}>Pricing Parameters</div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Priority *">
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={sStyle}>
                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
              </select>
            </Field>
            <Field label="Is hedging required?">
              <select value={hedgingRequired} onChange={(e) => setHedgingRequired(e.target.value)} style={sStyle}>
                <option value="">Select</option><option>Yes</option><option>No</option><option>TBD</option>
              </select>
            </Field>
            <Field label="Included in our portfolio">
              <select value={inPortfolio} onChange={(e) => setInPortfolio(e.target.value)} style={sStyle}>
                <option value="">Select</option><option>Yes</option><option>No</option>
              </select>
            </Field>
            <Field label="Historical production data available">
              <select value={hasHistoricalData} onChange={(e) => setHasHistoricalData(e.target.value)} style={sStyle}>
                <option value="">Select</option><option>Yes</option><option>No</option><option>Partial</option>
              </select>
            </Field>
            <Field label="Time zone of data">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={sStyle}>
                <option value="">Select time zone</option>
                <option value="UTC">UTC</option><option value="CET">CET</option><option value="WET">WET</option>
              </select>
            </Field>
            <Field label="Timestamp represents">
              <select value={tsRepresents} onChange={(e) => setTsRepresents(e.target.value)} style={sStyle}>
                <option value="">Select</option><option value="start">Start of interval</option><option value="end">End of interval</option>
              </select>
            </Field>
            <Field label="Deadline">
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={iStyle} />
            </Field>
            <Field label="Additional comments">
              <textarea value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} maxLength={1000} rows={3} placeholder="e.g. Turbine type: 7 Vestas V117 (6 x 4.3 MW and 1 x 4.2 MW)" style={{ ...iStyle, height: 'auto', padding: '6px 8px', resize: 'none' }} />
              <div style={{ marginTop: 3, fontSize: 10, color: 'var(--color-text-muted)' }}>{(additionalComments || '').length}/1000</div>
            </Field>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Product Selection</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Desk routing is automatically set from selected products.</span>
        </div>
        {productName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ padding: '2px 8px', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', border: '1px solid var(--color-accent-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600 }}>{productName}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>→ Desks:</span>
            {desksRequired.map((d: Desk) => {
              const c = DESK_COLORS[d] ?? DESK_COLORS.FAT
              return <span key={d} style={{ padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{d}</span>
            })}
          </div>
        )}
        <button type="button" onClick={() => setShowProductCatalogue(true)} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Search size={14} /> Browse product catalogue</div>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Desk Selection */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Desk Selection</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Auto-set from product. You can override.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {deskList.map((d) => {
            const required = desksRequired.includes(d)
            const c = DESK_COLORS[d] ?? DESK_COLORS.FAT
            return (
              <button key={d} type="button" onClick={() => setDesksRequired((cur: Desk[]) => cur.includes(d) ? cur.filter((x: Desk) => x !== d) : [...cur, d])}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: required ? `1px solid ${c.border}` : '1px solid var(--color-border)', background: required ? c.bg : 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{d} Desk required?</span>
                <span style={{ fontWeight: 600, color: required ? c.text : 'var(--color-text-muted)' }}>{required ? 'Yes' : 'No'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Attached Documents */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Attached Documents</span>
          <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 600, background: 'transparent', color: 'var(--color-accent)', border: `1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)`, cursor: 'pointer' }}>
            + Attach file
          </button>
        </div>
        {parks.length === 0 ? (
          <div style={{ padding: '12px 16px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            No files attached. Upload production files via the Assets &amp; Details workbench, or attach request-level documents above.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {/* Request-level docs (PDFs, redispatch, etc.) */}
            {(linkedDocuments?.request ?? []).length > 0 && (
              <div style={{ borderBottom: '1px solid var(--color-border-subtle)', padding: '8px 16px', background: 'var(--color-bg-tertiary)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Request level</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(linkedDocuments.request ?? []).map((doc: { name: string; classification?: string }) => (
                    <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12 }}>{doc.name.endsWith('.pdf') ? '📄' : '📊'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{doc.name}</span>
                      {doc.classification && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>— {doc.classification}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Per-park docs */}
            {parks.map((p: QuotePark, i: number) => {
              const docs: { name: string; classification?: string }[] = linkedDocuments?.[p.name] ?? []
              return (
                <div key={p.id} style={{ borderBottom: i < parks.length - 1 ? '1px solid var(--color-border-subtle)' : undefined, padding: '8px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: docs.length ? 5 : 0 }}>{p.name}</div>
                  {docs.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No files yet — upload via Assets &amp; Details workbench</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {docs.map((doc) => (
                        <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12 }}>📊</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{doc.name}</span>
                          {doc.classification && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>— {doc.classification}</span>}
                          <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600, marginLeft: 'auto' }}>✓ validated</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tenor Rows Table */}
      {parks.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Tenor Rows</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Auto-generated from selected assets. Edit as needed.</span>
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Park', 'Tenor', 'Start', 'End', 'FP?', 'FP Type', 'Bal?', 'Floor (EUR)', 'MWh/yr', 'Hedge %', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parks.flatMap((p: QuotePark) =>
                  (['1Y', '2Y', '3Y'] as const).map((tenor, ti) => {
                    const refYear = new Date().getFullYear()
                    const startY = refYear + ti
                    return (
                      <tr key={`${p.id}-${tenor}`} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: '6px 10px', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{p.name}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>{tenor}</td>
                        <td style={{ padding: '6px 10px' }}><input type="date" defaultValue={`${startY}-06-01`} style={{ height: 24, padding: '0 6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} /></td>
                        <td style={{ padding: '6px 10px' }}><input type="date" defaultValue={`${startY + 1}-06-01`} style={{ height: 24, padding: '0 6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} /></td>
                        <td style={{ padding: '6px 10px' }}><select defaultValue="No" style={{ height: 24, padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }}><option>Yes</option><option>No</option></select></td>
                        <td style={{ padding: '6px 10px' }}><input placeholder="CPI" style={{ height: 24, width: 60, padding: '0 6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }} /></td>
                        <td style={{ padding: '6px 10px' }}><select defaultValue="No" style={{ height: 24, padding: '0 4px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none' }}><option>Yes</option><option>No</option></select></td>
                        <td style={{ padding: '6px 10px' }}><input type="number" placeholder="0" style={{ height: 24, width: 70, padding: '0 6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }} /></td>
                        <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-primary)' }}>{p.p50MwhPerYear.toLocaleString()}</td>
                        <td style={{ padding: '6px 10px' }}><input type="number" defaultValue={100} min={0} max={100} style={{ height: 24, width: 60, padding: '0 6px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 11, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }} /></td>
                        <td style={{ padding: '6px 10px' }}><button type="button" style={{ fontSize: 11, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: 8 }}>
              <button type="button" style={{ height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-accent)', border: `1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)`, cursor: 'pointer' }}>+ Add Tenor Row</button>
              <button type="button" style={{ height: 26, padding: '0 10px', fontSize: 11, fontWeight: 600, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>+ Add Curtailment Scenario</button>
            </div>
          </div>
        </div>
      )}

      {showProductCatalogue && (
        <Modal title="Browse Product Catalogue" onClose={() => setShowProductCatalogue(false)} size="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATALOGUE_PRODUCTS.map((p) => (
              <button key={p.name} type="button" onClick={() => onSelectProduct(p)}
                style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-muted)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', fontSize: 13 }}>{p.name}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {p.desks.map((d) => { const c = DESK_COLORS[d] ?? DESK_COLORS.FAT; return <span key={d} style={{ padding: '1px 6px', borderRadius: 'var(--radius-sm)', fontSize: 10, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{d}</span> })}
                  </div>
                </div>
                <span style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.description}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

type TechGroup = 'Wind' | 'Solar' | 'BESS' | 'All'

function AssetSectionTable({ title, rows, parks }: { title: string; rows: { label: string; getValue: (p: QuotePark) => string; warn?: (p: QuotePark) => boolean }[]; parks: QuotePark[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 5, paddingLeft: 2 }}>{title}</div>
      {rows.map(({ label, getValue, warn }) => (
        <tr key={label} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
          <td style={{ padding: '7px 16px 7px 8px', fontWeight: 500, color: 'var(--color-text-secondary)', fontSize: 11, width: 160, whiteSpace: 'nowrap' }}>{label}</td>
          {parks.map((p) => {
            const v = getValue(p)
            const isWarn = warn?.(p) ?? false
            return <td key={p.id} style={{ padding: '7px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: isWarn ? 'var(--color-warning)' : v === '—' ? 'var(--color-text-muted)' : 'var(--color-text-primary)', minWidth: 140 }}>{v}</td>
          })}
        </tr>
      ))}
    </div>
  )
}

function Step4({ parks, countryCode }: { parks: QuotePark[]; countryCode: string }) {
  const [techGroup, setTechGroup] = useState<TechGroup>('All')

  const visibleParks = parks.filter(p => {
    if (techGroup === 'Wind') return p.technology === 'WIND_ONSHORE' || p.technology === 'WIND_OFFSHORE'
    if (techGroup === 'Solar') return p.technology === 'SOLAR'
    return true
  })

  const warnings: string[] = []
  parks.forEach(p => {
    if (!p.p50MwhPerYear || p.p50MwhPerYear === 0) warnings.push(`${p.name}: P50 generation missing`)
    if (p.capacityMw <= 0) warnings.push(`${p.name}: Capacity not set`)
  })

  const mockLat = (p: QuotePark) => (52.5 + (p.id.charCodeAt(0) % 10) * 0.4).toFixed(4) + '° N'
  const mockLon = (p: QuotePark) => (13.4 + (p.id.charCodeAt(1) % 10) * 0.5).toFixed(4) + '° E'
  const mockTurbines = (p: QuotePark) => Math.round(p.capacityMw / 4.3)
  const mockHubHeight = (p: QuotePark) => p.technology === 'WIND_OFFSHORE' ? '120 m' : '95 m'
  const refYear = new Date().getFullYear()

  const spvPlaceholders = parks.map((p, i) => `PR-DRAFT-P${String(i + 1).padStart(2, '0')}-${p.name.split(' ').slice(0, 2).map(w => w.toUpperCase()).join('')} GmbH & Co. KG`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 4 }}>Step 4</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Asset Details</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Review all asset attributes before submitting.</span>
        </div>
      </div>

      {parks.length === 0 ? (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '48px 24px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', background: 'var(--color-bg-secondary)' }}>
          No assets selected. Go back to Step 1 and add assets using the Asset Browser.
        </div>
      ) : (
        <>
          {/* Tech-group sub-tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
            {(['All', 'Wind', 'Solar', 'BESS'] as TechGroup[]).map(g => (
              <button key={g} onClick={() => setTechGroup(g)} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: techGroup === g ? '2px solid var(--color-accent)' : '2px solid transparent', color: techGroup === g ? 'var(--color-accent)' : 'var(--color-text-muted)', marginBottom: -1 }}>
                {g}{g === 'Wind' ? ` (${parks.filter(p => p.technology !== 'SOLAR').length})` : g === 'Solar' ? ` (${parks.filter(p => p.technology === 'SOLAR').length})` : g === 'BESS' ? ' (0)' : ''}
              </button>
            ))}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(248,81,73,.08)', border: '1px solid rgba(248,81,73,.3)', fontSize: 12, color: 'var(--color-danger)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Missing or incomplete data</div>
              {warnings.map(w => <div key={w} style={{ fontSize: 11 }}>• {w}</div>)}
            </div>
          )}

          {/* Attribute table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ width: 170, padding: '8px 8px 8px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Field</th>
                  {visibleParks.map(p => (
                    <th key={p.id} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 140 }}>
                      <div>{p.name}</div>
                      <div style={{ marginTop: 2, fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 10 }}>{p.capacityMw} MW · {countryCode} · {p.existing ? 'Existing' : 'New draft'}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techGroup !== 'BESS' && (
                  <AssetSectionTable title="Power Generation" parks={visibleParks} rows={[
                    { label: 'P50 MWh/year', getValue: p => p.p50MwhPerYear.toLocaleString(), warn: p => !p.p50MwhPerYear },
                    { label: 'Load factor', getValue: p => ((p.p50MwhPerYear / (p.capacityMw * 8760)) * 100).toFixed(1) + '%' },
                    { label: 'Curtailment %', getValue: p => p.technology === 'WIND_OFFSHORE' ? '6.5%' : '3.8%' },
                    { label: 'Data source', getValue: p => p.existing ? 'Puma (metered)' : 'AI-classified upload' },
                    ...[
                      ['Jan', 0.062], ['Feb', 0.068], ['Mar', 0.075], ['Apr', 0.082],
                      ['May', 0.095], ['Jun', 0.100], ['Jul', 0.098], ['Aug', 0.090],
                      ['Sep', 0.085], ['Oct', 0.080], ['Nov', 0.072], ['Dec', 0.063],
                    ].map(([month, share]) => ({
                      label: `P50 ${month} (MWh)`,
                      getValue: (p: QuotePark) => Math.round(p.p50MwhPerYear * (share as number)).toLocaleString(),
                    })),
                  ]} />
                )}
                {techGroup !== 'BESS' && (<>
                  <AssetSectionTable title="Site" parks={visibleParks} rows={[
                    { label: 'Latitude', getValue: p => mockLat(p) },
                    { label: 'Longitude', getValue: p => mockLon(p) },
                    { label: 'Balance area', getValue: p => p.countryCode === 'DE' ? 'Amprion' : '—' },
                    { label: 'TSO', getValue: p => p.countryCode === 'DE' ? 'Amprion GmbH' : '—' },
                    { label: 'DSO', getValue: () => '—', warn: () => true },
                  ]} />
                  {(techGroup === 'Wind' || techGroup === 'All') && visibleParks.some(p => p.technology !== 'SOLAR') && (
                    <AssetSectionTable title="Turbine (Wind)" parks={visibleParks.filter(p => p.technology !== 'SOLAR')} rows={[
                      { label: 'No. of turbines', getValue: p => String(mockTurbines(p)) },
                      { label: 'Unit capacity (MW)', getValue: () => '4.30' },
                      { label: 'Manufacturer', getValue: () => 'Vestas' },
                      { label: 'Model', getValue: () => 'V117-4.3' },
                      { label: 'Hub height', getValue: p => mockHubHeight(p) },
                    ]} />
                  )}
                  <AssetSectionTable title="Controls & Market" parks={visibleParks} rows={[
                    { label: 'Availability %', getValue: () => '97.0%' },
                    { label: 'Curtailment %', getValue: p => p.technology === 'WIND_OFFSHORE' ? '6.5%' : '3.8%' },
                    { label: '1Y tenor', getValue: () => `${refYear}-06-01 → ${refYear + 1}-06-01` },
                    { label: '2Y tenor', getValue: () => `${refYear}-06-01 → ${refYear + 2}-06-01` },
                    { label: '3Y tenor', getValue: () => `${refYear}-06-01 → ${refYear + 3}-06-01` },
                    { label: 'Asset type', getValue: p => p.existing ? 'Existing (Puma)' : 'New Draft' },
                  ]} />
                </>)}
                {techGroup === 'BESS' && (
                  <tr><td colSpan={visibleParks.length + 1} style={{ padding: '16px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: 10 }}>BESS Characteristics</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 11 }}>
                      {[['Battery Supplier', '—'], ['Project Type', '—'], ['Voltage (kV)', '—'], ['Usable Power — Charge (MW)', '—'],
                        ['Usable Power — Discharge (MW)', '—'], ['Usable Energy (MWh)', '—'], ['Duration (h)', '—'], ['RTE (%)', '—'],
                        ['Cycles/day', '—'], ['Degradation (%/yr)', '—']].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, fontSize: 10, color: 'var(--color-text-muted)' }}>No BESS assets selected — add a battery asset in Step 1 to populate this tab.</div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Attached files footer per park */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Attached Files</div>
            {parks.map((p: QuotePark, i: number) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < parks.length - 1 ? '1px solid var(--color-border-subtle)' : undefined }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No files attached</span>
                </div>
                <button type="button" style={{ fontSize: 11, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Attach file to this park</button>
              </div>
            ))}
          </div>

          {/* On Submit — SPV preview */}
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 8 }}>On Submit — dummy SPV placeholders (auto-created)</div>
            {spvPlaceholders.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)', fontSize: 10, padding: '1px 6px', background: 'rgba(210,153,34,.1)', border: '1px solid rgba(210,153,34,.3)', borderRadius: 2 }}>PLACEHOLDER</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{parks[i].name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{name}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>Replace placeholders with real CRM SPVs from the Quote Detail page after submission.</div>
          </div>
        </>
      )}
    </div>
  )
}
