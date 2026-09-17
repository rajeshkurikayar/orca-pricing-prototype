import type {
  AssumptionTemplate,
  PricingAuditEvent,
  PricingRun,
  Quote,
  QuotePark,
  SpvLink,
  TenorRow,
} from './types'
import { computeFatRow, flatBalancingComponents } from '@/lib/pricingFormula'

export const PRICING_TEMPLATES: AssumptionTemplate[] = [
  {
    id: 'tmpl-fat-wind-de',
    desk: 'FAT',
    name: 'FAT · Wind Onshore Germany (Post-EEG)',
    countryCode: 'DE',
    technology: 'WIND_ONSHORE',
    status: 'Approved',
    factors: [
      { key: 'capacityFactor', label: 'Capacity Factor', value: 23.2, unit: '%' },
      { key: 'curtailment', label: 'Curtailment', value: 2.5, unit: '%' },
      { key: 'availability', label: 'Availability', value: 97, unit: '%' },
      { key: 'contractYears', label: 'Contract Years', value: 3, unit: 'years' },
      { key: 'floor', label: 'Floor Price', value: 0, unit: 'EUR/MWh' },
      { key: 'cap', label: 'Cap Price', value: 200, unit: 'EUR/MWh' },
      { key: 'shutdown', label: 'Shutdown Risk', value: 0.3, unit: '%' },
      { key: 'cannibalisationPct', label: 'Cannibalisation', value: -18, unit: '%' },
      { key: 'volumeRiskPct', label: 'Volume Risk', value: -5, unit: '%' },
      { key: 'marginPct', label: 'Margin', value: -4.5, unit: '%' },
      { key: 'marginOffset', label: 'Margin Offset', value: 0.15, unit: 'EUR/MWh' },
    ],
  },
  {
    id: 'tmpl-fat-wind-uk',
    desk: 'FAT',
    name: 'FAT · Wind Onshore UK',
    countryCode: 'GB',
    technology: 'WIND_ONSHORE',
    status: 'Approved',
    factors: [
      { key: 'capacityFactor', label: 'Capacity Factor', value: 27.5, unit: '%' },
      { key: 'curtailment', label: 'Curtailment', value: 3.8, unit: '%' },
      { key: 'availability', label: 'Availability', value: 96, unit: '%' },
      { key: 'contractYears', label: 'Contract Years', value: 3, unit: 'years' },
      { key: 'floor', label: 'Floor Price', value: 0, unit: 'EUR/MWh' },
      { key: 'cap', label: 'Cap Price', value: 210, unit: 'EUR/MWh' },
      { key: 'shutdown', label: 'Shutdown Risk', value: 0.4, unit: '%' },
      { key: 'cannibalisationPct', label: 'Cannibalisation', value: -15, unit: '%' },
      { key: 'volumeRiskPct', label: 'Volume Risk', value: -5, unit: '%' },
      { key: 'marginPct', label: 'Margin', value: -4.5, unit: '%' },
      { key: 'marginOffset', label: 'Margin Offset', value: 0.15, unit: 'EUR/MWh' },
    ],
  },
  {
    id: 'tmpl-fat-solar-de',
    desk: 'FAT',
    name: 'FAT · Solar Germany',
    countryCode: 'DE',
    technology: 'SOLAR',
    status: 'Pending Review',
    factors: [
      { key: 'capacityFactor', label: 'Capacity Factor', value: 11.5, unit: '%' },
      { key: 'curtailment', label: 'Curtailment', value: 1.2, unit: '%' },
      { key: 'availability', label: 'Availability', value: 98, unit: '%' },
      { key: 'contractYears', label: 'Contract Years', value: 3, unit: 'years' },
      { key: 'floor', label: 'Floor Price', value: 0, unit: 'EUR/MWh' },
      { key: 'cap', label: 'Cap Price', value: 180, unit: 'EUR/MWh' },
      { key: 'shutdown', label: 'Shutdown Risk', value: 0.2, unit: '%' },
      { key: 'cannibalisationPct', label: 'Cannibalisation', value: -22, unit: '%' },
      { key: 'volumeRiskPct', label: 'Volume Risk', value: -4, unit: '%' },
      { key: 'marginPct', label: 'Margin', value: -4, unit: '%' },
      { key: 'marginOffset', label: 'Margin Offset', value: 0.1, unit: 'EUR/MWh' },
    ],
  },
  {
    id: 'tmpl-ram-de',
    desk: 'RAM',
    name: 'RAM · Standard Balancing (DE)',
    countryCode: 'DE',
    technology: 'WIND_ONSHORE',
    status: 'Approved',
    factors: [
      { key: 'balancingFee1y', label: 'Balancing Fee 1Y', value: 2.35, unit: 'EUR/MWh' },
      { key: 'balancingFee2y', label: 'Balancing Fee 2Y', value: 2.45, unit: 'EUR/MWh' },
      { key: 'balancingFee3y', label: 'Balancing Fee 3Y', value: 2.55, unit: 'EUR/MWh' },
      { key: 'floor', label: 'Floor', value: 2.0, unit: 'EUR/MWh' },
    ],
  },
]

function factorMap(template: AssumptionTemplate) {
  return Object.fromEntries(template.factors.map((f) => [f.key, f.value])) as Record<string, number>
}

function fatFactorsFrom(template: AssumptionTemplate) {
  const f = factorMap(template)
  return {
    cannibalisationPct: f.cannibalisationPct / 100,
    volumeRiskPct: f.volumeRiskPct / 100,
    marginPct: f.marginPct / 100,
    marginOffset: f.marginOffset,
  }
}

function tenorRows(parks: QuotePark[], startYear: number): TenorRow[] {
  const rows: TenorRow[] = []
  for (const park of parks) {
    for (const tenor of ['1Y', '2Y', '3Y'] as const) {
      const years = tenor === '1Y' ? 1 : tenor === '2Y' ? 2 : 3
      rows.push({
        id: `${park.id}-${tenor}`,
        parkId: park.id,
        parkName: park.name,
        tenor,
        startDate: `${startYear}-06-01`,
        endDate: `${startYear + years}-06-01`,
        mwhPerYear: park.p50MwhPerYear,
        balancingRequired: true,
        curtailmentPct: park.technology === 'WIND_OFFSHORE' ? 6.5 : park.countryCode === 'DE' ? 3.8 : 4.5,
      })
    }
  }
  return rows
}

// ---- Q1: Encavis — Scenario A, fully finalised ----
const q1Parks: QuotePark[] = [
  { id: 'site-neubrandenburg', name: 'Neubrandenburg Wind Park', capacityMw: 48, technology: 'WIND_ONSHORE', countryCode: 'DE', existing: true, p50MwhPerYear: 130570 },
  { id: 'site-rostock', name: 'Rostock Wind Park', capacityMw: 32, technology: 'WIND_ONSHORE', countryCode: 'DE', existing: false, p50MwhPerYear: 76564 },
]
const q1Tenors = tenorRows(q1Parks, 2029)
const fatTemplateDE = PRICING_TEMPLATES[0]
const ramTemplateDE = PRICING_TEMPLATES[3]
const q1FatResults = q1Tenors.map((row) => {
  const { withCurtailment, withoutCurtailment } = computeFatRow(102, fatFactorsFrom(fatTemplateDE), row.curtailmentPct / 100)
  return { tenorRowId: row.id, parkName: row.parkName, tenor: row.tenor, withCurtailment, withoutCurtailment }
})
const q1RamFactors = factorMap(ramTemplateDE)
const q1RamResults = q1Tenors.map((row) => {
  const fee = row.tenor === '1Y' ? q1RamFactors.balancingFee1y : row.tenor === '2Y' ? q1RamFactors.balancingFee2y : q1RamFactors.balancingFee3y
  const c = flatBalancingComponents(fee)
  return { tenorRowId: row.id, parkName: row.parkName, tenor: row.tenor, withCurtailment: c, withoutCurtailment: c }
})

const q1Runs: PricingRun[] = [
  { id: 'run-q1-fat', desk: 'FAT', version: 1, status: 'Submitted', analyst: 'anna.nowak@centrica.com', templateId: fatTemplateDE.id, results: q1FatResults, avgPrice: 68.3, submittedAt: '2026-09-01T10:32:00Z' },
  { id: 'run-q1-ram', desk: 'RAM', version: 1, status: 'Submitted', analyst: 'rob.meyer@centrica.com', templateId: ramTemplateDE.id, results: q1RamResults, avgPrice: 2.47, submittedAt: '2026-09-01T11:38:00Z' },
]

const q1Spv: SpvLink[] = [
  { parkId: 'site-neubrandenburg', parkName: 'Neubrandenburg Wind Park', state: 'LINKED', spvName: 'Encavis Wind Neubrandenburg GmbH & Co. KG', spvId: 'SPV-77001', opportunityId: 'OPP-01234', frontSheetStatus: 'APPROVED', kycStatus: 'APPROVED', creditStatus: 'APPROVED' },
  { parkId: 'site-rostock', parkName: 'Rostock Wind Park', state: 'LINKED', spvName: 'Encavis Wind Rostock GmbH & Co. KG', spvId: 'SPV-77002', opportunityId: 'OPP-01235', frontSheetStatus: 'APPROVED', kycStatus: 'APPROVED', creditStatus: 'APPROVED' },
]

export const Q1_ENCAVIS: Quote = {
  id: 'q-2026-de-042',
  reference: 'PR-2026-DE-042',
  status: 'Finalised',
  countryCode: 'DE',
  currency: 'EUR',
  customerId: 'cust-encavis',
  customerName: 'Encavis AG',
  isNewCustomer: false,
  productionTypes: ['WIND_ONSHORE'],
  direction: 'BUY',
  contractType: 'PPA',
  priority: 'Medium',
  hedgingRequired: true,
  deadline: '2026-09-10',
  createdBy: 'aditya.agarwal@centrica.com',
  createdAt: '2026-09-01T09:04:00Z',
  parks: q1Parks,
  desksRequired: ['FAT', 'RAM'],
  deskStatus: { FAT: 'Submitted', RAM: 'Submitted', GREEN: 'NotRequired' },
  deskAssignee: { FAT: 'anna.nowak@centrica.com', RAM: 'rob.meyer@centrica.com' },
  tenorRows: q1Tenors,
  spvLinks: q1Spv,
  runs: q1Runs,
  projectInfo: {
    companyName: 'Encavis AG',
    parentAccount: '—',
    vatNumber: 'DE 123 456 789',
    technicalContactName: 'Anna Schmidt',
    technicalContactTitle: 'Head of Ops',
    technicalContactPhone: '+49 40 000 0000',
    technicalContactEmail: 'anna@encavis.de',
    cod: '2029-06-01',
    contractTenorYears: 3,
    buildingPermit: 'Granted',
    financingType: 'Project Finance',
  },
  productName: 'Fixed Price PPA — Baseload',
}

// ---- Q2: NordEnergie — Scenario B, just submitted, new customer pending CE ----
const q2Parks: QuotePark[] = [
  { id: 'site-kiel', name: 'Kiel Wind Farm', capacityMw: 24, technology: 'WIND_ONSHORE', countryCode: 'DE', existing: false, p50MwhPerYear: 68120 },
  { id: 'site-flensburg', name: 'Flensburg Wind Farm', capacityMw: 36, technology: 'WIND_ONSHORE', countryCode: 'DE', existing: false, p50MwhPerYear: 107530 },
]
export const Q2_NORDENERGIE: Quote = {
  id: 'q-2026-de-b01',
  reference: 'PR-2026-DE-B01',
  status: 'Submitted',
  countryCode: 'DE',
  currency: 'EUR',
  customerId: undefined,
  customerName: 'NordEnergie GmbH',
  isNewCustomer: true,
  cePendingCustomerName: 'NordEnergie GmbH',
  productionTypes: ['WIND_ONSHORE'],
  direction: 'BUY',
  contractType: 'PPA',
  priority: 'Medium',
  hedgingRequired: true,
  deadline: '2026-09-18',
  createdBy: 'aditya.agarwal@centrica.com',
  createdAt: '2026-09-04T14:36:00Z',
  parks: q2Parks,
  desksRequired: ['FAT', 'RAM'],
  deskStatus: { FAT: 'Pending', RAM: 'Pending', GREEN: 'NotRequired' },
  deskAssignee: {},
  tenorRows: tenorRows(q2Parks, 2029),
  spvLinks: [
    { parkId: 'site-kiel', parkName: 'Kiel Wind Farm', state: 'PLACEHOLDER' },
    { parkId: 'site-flensburg', parkName: 'Flensburg Wind Farm', state: 'PLACEHOLDER' },
  ],
  runs: [],
  projectInfo: {
    companyName: 'NordEnergie GmbH',
    vatNumber: 'DE 987 654 321',
    technicalContactName: 'Lars Hansen',
    technicalContactTitle: 'CTO',
    technicalContactPhone: '+49 431 000 000',
    technicalContactEmail: 'lars@nordenergie.de',
    cod: '2029-06-01',
    contractTenorYears: 3,
    buildingPermit: 'Granted',
    financingType: 'Project Finance',
  },
  productName: 'Fixed Price PPA — Baseload',
}

// ---- Q3: RWE — InPricing, FAT picked up mid-flow ----
const q3Parks: QuotePark[] = [
  { id: 'site-nordsee-a', name: 'Windpark Nordsee A', capacityMw: 295, technology: 'WIND_OFFSHORE', countryCode: 'DE', existing: true, p50MwhPerYear: 980_000 },
]
export const Q3_RWE: Quote = {
  id: 'q-2026-de-015',
  reference: 'PR-2026-DE-015',
  status: 'InPricing',
  countryCode: 'DE',
  currency: 'EUR',
  customerId: 'cust-rwe',
  customerName: 'RWE Renewables',
  isNewCustomer: false,
  productionTypes: ['WIND_OFFSHORE'],
  direction: 'BUY',
  contractType: 'PPA',
  priority: 'High',
  hedgingRequired: false,
  deadline: '2026-09-15',
  createdBy: 'aditya.agarwal@centrica.com',
  createdAt: '2026-09-03T08:00:00Z',
  parks: q3Parks,
  desksRequired: ['FAT', 'RAM'],
  deskStatus: { FAT: 'InProgress', RAM: 'Pending', GREEN: 'NotRequired' },
  deskAssignee: { FAT: 'anna.nowak@centrica.com' },
  tenorRows: tenorRows(q3Parks, 2027),
  spvLinks: [{ parkId: 'site-nordsee-a', parkName: 'Windpark Nordsee A', state: 'PLACEHOLDER' }],
  runs: [
    { id: 'run-q3-fat', desk: 'FAT', version: 1, status: 'Draft', analyst: 'anna.nowak@centrica.com', templateId: fatTemplateDE.id, results: [], avgPrice: undefined },
  ],
  projectInfo: {
    companyName: 'RWE Renewables',
    vatNumber: 'DE 555 111 222',
    technicalContactName: 'Peter Klein',
    technicalContactTitle: 'Asset Manager',
    technicalContactPhone: '+49 201 000 000',
    technicalContactEmail: 'peter.klein@rwe.com',
    cod: '2027-01-01',
    contractTenorYears: 3,
    buildingPermit: 'Granted',
    financingType: 'Corporate',
  },
  productName: 'Fixed Price PPA — Baseload',
}

// ---- Q4: Vattenfall — Draft, not yet submitted ----
const q4Parks: QuotePark[] = [
  { id: 'site-karnyttan', name: 'Karnyttan Solar Park', capacityMw: 18, technology: 'SOLAR', countryCode: 'SE', existing: true, p50MwhPerYear: 21_600 },
]
export const Q4_VATTENFALL: Quote = {
  id: 'q-2026-se-007',
  reference: 'PR-2026-SE-007',
  status: 'Draft',
  countryCode: 'SE',
  currency: 'SEK',
  customerId: 'cust-vattenfall',
  customerName: 'Vattenfall',
  isNewCustomer: false,
  productionTypes: ['SOLAR'],
  direction: 'BUY',
  contractType: 'PPA',
  priority: 'Low',
  hedgingRequired: false,
  deadline: '2026-09-25',
  createdBy: 'aditya.agarwal@centrica.com',
  createdAt: '2026-09-06T09:00:00Z',
  parks: q4Parks,
  desksRequired: ['FAT'],
  deskStatus: { FAT: 'NotRequired', RAM: 'NotRequired', GREEN: 'NotRequired' },
  deskAssignee: {},
  tenorRows: [],
  spvLinks: [],
  runs: [],
  projectInfo: {
    companyName: 'Vattenfall',
    vatNumber: 'SE 111 222 333',
    technicalContactName: 'Erik Lund',
    technicalContactTitle: 'Portfolio Lead',
    technicalContactPhone: '+46 8 000 000',
    technicalContactEmail: 'erik.lund@vattenfall.com',
    cod: '2027-03-01',
    contractTenorYears: 3,
    buildingPermit: 'Granted',
    financingType: 'Corporate',
  },
  productName: '',
}

// ---- Q5: Ørsted — PricingComplete, awaiting originator review ----
const q5Parks: QuotePark[] = [
  { id: 'site-anholt', name: 'Anholt Offshore', capacityMw: 400, technology: 'WIND_OFFSHORE', countryCode: 'DK', existing: true, p50MwhPerYear: 1_450_000 },
]
const q5Tenors = tenorRows(q5Parks, 2027)
const q5FatResults = q5Tenors.map((row) => {
  const { withCurtailment, withoutCurtailment } = computeFatRow(96, fatFactorsFrom(fatTemplateDE), row.curtailmentPct / 100)
  return { tenorRowId: row.id, parkName: row.parkName, tenor: row.tenor, withCurtailment, withoutCurtailment }
})
export const Q5_ORSTED: Quote = {
  id: 'q-2026-dk-003',
  reference: 'PR-2026-DK-003',
  status: 'PricingComplete',
  countryCode: 'DK',
  currency: 'EUR',
  customerId: 'cust-orsted',
  customerName: 'Ørsted',
  isNewCustomer: false,
  productionTypes: ['WIND_OFFSHORE'],
  direction: 'BUY',
  contractType: 'PPA',
  priority: 'High',
  hedgingRequired: true,
  deadline: '2026-09-12',
  createdBy: 'aditya.agarwal@centrica.com',
  createdAt: '2026-08-28T09:00:00Z',
  parks: q5Parks,
  desksRequired: ['FAT', 'RAM'],
  deskStatus: { FAT: 'Submitted', RAM: 'Submitted', GREEN: 'NotRequired' },
  deskAssignee: { FAT: 'anna.nowak@centrica.com', RAM: 'rob.meyer@centrica.com' },
  tenorRows: q5Tenors,
  spvLinks: [{ parkId: 'site-anholt', parkName: 'Anholt Offshore', state: 'PLACEHOLDER' }],
  runs: [
    { id: 'run-q5-fat', desk: 'FAT', version: 1, status: 'Submitted', analyst: 'anna.nowak@centrica.com', templateId: fatTemplateDE.id, results: q5FatResults, avgPrice: 71.4, submittedAt: '2026-08-30T10:00:00Z' },
    {
      id: 'run-q5-ram',
      desk: 'RAM',
      version: 1,
      status: 'Submitted',
      analyst: 'rob.meyer@centrica.com',
      templateId: ramTemplateDE.id,
      results: q5Tenors.map((row) => {
        const c = flatBalancingComponents(2.6)
        return { tenorRowId: row.id, parkName: row.parkName, tenor: row.tenor, withCurtailment: c, withoutCurtailment: c }
      }),
      avgPrice: 2.6,
      submittedAt: '2026-08-30T11:00:00Z',
    },
  ],
  projectInfo: {
    companyName: 'Ørsted',
    vatNumber: 'DK 999 888 777',
    technicalContactName: 'Mette Sørensen',
    technicalContactTitle: 'Commercial Manager',
    technicalContactPhone: '+45 99 000 000',
    technicalContactEmail: 'mette.sorensen@orsted.com',
    cod: '2027-06-01',
    contractTenorYears: 3,
    buildingPermit: 'Granted',
    financingType: 'Project Finance',
  },
  productName: 'Fixed Price PPA — Baseload',
}

// ---- Q6: 8Power — Rejected filler ----
const q6Parks: QuotePark[] = [
  { id: 'site-8power-1', name: '8Power Demo Site', capacityMw: 6, technology: 'WIND_ONSHORE', countryCode: 'DE', existing: false, p50MwhPerYear: 14_000 },
]
export const Q6_8POWER: Quote = {
  id: 'q-2026-de-099',
  reference: 'PR-2026-DE-099',
  status: 'Rejected',
  countryCode: 'DE',
  currency: 'EUR',
  customerId: undefined,
  customerName: '8Power GmbH',
  isNewCustomer: true,
  productionTypes: ['WIND_ONSHORE'],
  direction: 'BUY',
  contractType: 'PPA',
  priority: 'Low',
  hedgingRequired: false,
  deadline: '2026-08-20',
  createdBy: 'aditya.agarwal@centrica.com',
  createdAt: '2026-08-10T09:00:00Z',
  parks: q6Parks,
  desksRequired: ['FAT'],
  deskStatus: { FAT: 'NotRequired', RAM: 'NotRequired', GREEN: 'NotRequired' },
  deskAssignee: {},
  tenorRows: tenorRows(q6Parks, 2028),
  spvLinks: [],
  runs: [],
  projectInfo: {
    companyName: '8Power GmbH',
    vatNumber: 'DE 000 111 222',
    technicalContactName: 'Sam Fischer',
    technicalContactTitle: 'Founder',
    technicalContactPhone: '+49 30 000 000',
    technicalContactEmail: 'sam@8power.de',
    cod: '2028-01-01',
    contractTenorYears: 3,
    buildingPermit: 'Pending',
    financingType: 'Corporate',
  },
  productName: 'Fixed Price PPA — Baseload',
}

export const PRICING_QUOTES: Quote[] = [Q1_ENCAVIS, Q2_NORDENERGIE, Q3_RWE, Q4_VATTENFALL, Q5_ORSTED, Q6_8POWER]

export const PRICING_AUDIT: PricingAuditEvent[] = [
  { id: 'paud-001', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T09:04:00Z', eventType: 'created', actor: 'aditya.agarwal@centrica.com', detail: 'PR-2026-DE-042 created (Draft)' },
  { id: 'paud-002', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T09:38:00Z', eventType: 'submitted', actor: 'aditya.agarwal@centrica.com', detail: 'Draft → Submitted' },
  { id: 'paud-003', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T09:38:00Z', eventType: 'spv-placeholder', actor: 'system', detail: 'PR-042-P01-neubrandenburg + PR-042-P02-rostock created' },
  { id: 'paud-004', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T09:38:00Z', eventType: 'desk-routed', actor: 'system', detail: 'FAT + RAM notified' },
  { id: 'paud-005', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T10:12:00Z', eventType: 'desk-pickup', actor: 'anna.nowak@centrica.com', detail: 'FAT run v1 created' },
  { id: 'paud-006', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T10:14:00Z', eventType: 'template-applied', actor: 'anna.nowak@centrica.com', detail: 'FAT · Wind Onshore Germany (Post-EEG)' },
  { id: 'paud-007', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T10:32:00Z', eventType: 'desk-priced', actor: 'anna.nowak@centrica.com', detail: 'FAT v1 · avg 68.30 EUR/MWh' },
  { id: 'paud-008', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T11:38:00Z', eventType: 'desk-priced', actor: 'rob.meyer@centrica.com', detail: 'RAM v1 · Bal 2.35–2.60 EUR/MWh' },
  { id: 'paud-009', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T11:38:00Z', eventType: 'status-transition', actor: 'system', detail: 'InPricing → PricingComplete' },
  { id: 'paud-010', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T13:22:00Z', eventType: 'spv-linked', actor: 'aditya.agarwal@centrica.com', detail: 'Neubrandenburg dummy → Encavis Wind NBg GmbH' },
  { id: 'paud-011', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T13:25:00Z', eventType: 'spv-linked', actor: 'aditya.agarwal@centrica.com', detail: 'Rostock dummy → Encavis Wind Rst GmbH' },
  { id: 'paud-012', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T13:28:00Z', eventType: 'opp-created', actor: 'aditya.agarwal@centrica.com', detail: 'CRM OPP-01234 (Neubrandenburg)' },
  { id: 'paud-013', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T13:28:00Z', eventType: 'opp-created', actor: 'aditya.agarwal@centrica.com', detail: 'CRM OPP-01235 (Rostock)' },
  { id: 'paud-014', quoteId: 'q-2026-de-042', timestamp: '2026-09-01T13:35:00Z', eventType: 'fs-triggered', actor: 'aditya.agarwal@centrica.com', detail: 'Front-sheet workflow · OPP-01234 + OPP-01235' },
  { id: 'paud-015', quoteId: 'q-2026-de-042', timestamp: '2026-09-02T15:22:00Z', eventType: 'fs-approved', actor: 'CRM (webhook)', detail: 'OPP-01234 · Front sheet approved' },
  { id: 'paud-016', quoteId: 'q-2026-de-042', timestamp: '2026-09-03T09:41:00Z', eventType: 'fs-approved', actor: 'CRM (webhook)', detail: 'OPP-01235 · Front sheet approved' },
  { id: 'paud-017', quoteId: 'q-2026-de-042', timestamp: '2026-09-03T10:15:00Z', eventType: 'offer-generated', actor: 'aditya.agarwal@centrica.com', detail: 'Indicative Offer email drafted' },
  { id: 'paud-018', quoteId: 'q-2026-de-042', timestamp: '2026-09-05T09:00:00Z', eventType: 'contracts-created', actor: 'system', detail: 'C-2026-DE-01234 + C-2026-DE-01235' },
  { id: 'paud-019', quoteId: 'q-2026-de-b01', timestamp: '2026-09-04T14:36:00Z', eventType: 'created', actor: 'aditya.agarwal@centrica.com', detail: 'PR-2026-DE-B01 created (Draft)' },
  { id: 'paud-020', quoteId: 'q-2026-de-b01', timestamp: '2026-09-04T14:36:00Z', eventType: 'submitted', actor: 'aditya.agarwal@centrica.com', detail: 'Draft → Submitted, new-customer placeholder' },
  { id: 'paud-021', quoteId: 'q-2026-de-015', timestamp: '2026-09-03T08:00:00Z', eventType: 'created', actor: 'aditya.agarwal@centrica.com', detail: 'PR-2026-DE-015 created (Draft)' },
  { id: 'paud-022', quoteId: 'q-2026-de-015', timestamp: '2026-09-03T10:12:00Z', eventType: 'desk-pickup', actor: 'anna.nowak@centrica.com', detail: 'FAT run v1 created' },
]
