# Integration Instructions — Part 2: Gaps & Deep-Dives

This document supplements `INTEGRATION_INSTRUCTIONS.md`. Part 1 covered the broad strokes —
design system, route list, store setup. This document covers everything Part 1 omitted:

1. Missing lib files that won't compile without
2. The curtailment model in full (the main pricing logic gap)
3. The `NewQuotePage` multi-step wizard
4. The Computed Results Summary panel
5. The `AssetsWorkbenchPage` file-upload flow
6. The `QuoteDetailPage` SPV / CE linking section
7. Complete `pricing.ts` store action surface
8. Additional verification checklist items

---

## 1 — Missing `lib/` Files (Build Will Fail Without These)

Part 1's copy list omitted four files that the pricing pages import directly. Copy them before
attempting to compile.

| Source (prototype) | Destination (target) |
|---|---|
| `app/src/lib/pricingFormula.ts` | `frontend/src/lib/pricingFormula.ts` |
| `app/src/lib/pricingStatus.ts` | `frontend/src/lib/pricingStatus.ts` |
| `app/src/lib/format.ts` | `frontend/src/lib/format.ts` |
| `app/src/lib/dvStatus.ts` | `frontend/src/lib/dvStatus.ts` |

**Why each matters:**

- `pricingFormula.ts` — exports `computeFatRow` and `flatBalancingComponents`. The `pricing.ts`
  Zustand store imports these to run the formula engine. The store file will not compile without it.

- `pricingStatus.ts` — exports `STATUS_LABEL`, `DESK_LABEL`, `statusVariant`, `deskRunVariant`,
  `DESK_RUN_LABEL`. Used by `QuoteDetailPage`, `QuotesListPage`, and `PricingDashboardPage`.

- `format.ts` — exports `formatDateTime`, `formatDate`, `formatBytes`, `timeAgo`. Used by
  `QuoteDetailPage` and the audit page.

- `dvStatus.ts` — exports DV-domain status helpers. Used by `NewQuotePage` when rendering
  dataset readiness badges.

---

## 2 — The Curtailment Model (Full Explanation)

This is the most important business logic in the prototype that Part 1 did not describe.

### 2.1 Where curtailment lives in the data model

`TenorRow` (in `mock/pricing/types.ts`) has a `curtailmentPct: number` field. Each tenor row
represents one park × one tenor combination (e.g. "Park A · 1Y"). The curtailment percentage is
entered during quote creation (Step 4 of the New Quote wizard — see §3 below) and represents the
percentage of expected annual generation that will be lost to curtailment events.

```ts
export interface TenorRow {
  id: string
  parkId: string
  parkName: string
  tenor: Tenor           // '1Y' | '2Y' | '3Y'
  startDate: string
  endDate: string
  mwhPerYear: number
  balancingRequired: boolean
  curtailmentPct: number  // ← e.g. 3.8 means 3.8% curtailment
}
```

### 2.2 The formula engine (`pricingFormula.ts`)

`computeFatRow(baseload, factors, curtailmentPct)` is the core function. It computes the
`PricingComponents` struct **twice** — once with curtailment factored in, once without:

```ts
// With curtailment: curtailment suppresses cannibalisation (less negative)
cannPctWith    = factors.cannibalisationPct - (curtailmentPct / 100) * 0.3

// Without curtailment: full cannibalisation exposure
cannPctWithout = factors.cannibalisationPct
```

The intuition: a curtailed asset produces less during high-generation hours, which reduces
cannibalisation risk relative to an uncurtailed asset. The `0.3` coefficient is the assumed
sensitivity.

`PricingComponents` captures every additive term:

```ts
{
  baseload,       // e.g. 100.67 EUR/MWh — from EEX forward curve
  seasonal,       // e.g.  +4.15 — profile-weighted uplift vs flat baseload
  cannibalisation,// e.g. -23.15 — depends on with/without scenario
  volumeRisk,     // e.g.  -5.03
  margin,         // e.g.  -4.38
  balancingFee,   // 0 for FAT desk; the fee for RAM desk
  power,          // = sum of all above
}
```

### 2.3 The scenario toggle in `PricingWorkspacePage`

The "With curtailment / Without curtailment" toggle button in the pricing table toolbar switches
the `scenario` state variable (`'with' | 'without'`). This feeds into `getDisplayRow()`, which
re-derives the `cannibalisationRisk` and `powerPrice` values **for display only** — the underlying
`rows` state is not mutated.

When the user edits a cell and then submits, `computeRunResults()` always produces **both**
scenarios for every park × tenor combination. The submission stores `PricingRowResult[]` on the
quote's `runs` array — each result contains both a `withCurtailment` and a `withoutCurtailment`
`PricingComponents`.

The scenario toggle is purely a viewing lens; both scenarios are always computed and stored.

### 2.4 RAM desk is flat — no curtailment adjustment

For the RAM desk, `computeRunResults()` short-circuits: it sets all components to zero except
`balancingFee`, which defaults to `2.35 / 2.45 / 2.55` EUR/MWh for `1Y / 2Y / 3Y` tenors
respectively (or uses the analyst's manual override). Both `withCurtailment` and
`withoutCurtailment` are identical for RAM.

### 2.5 The `applyTemplate` store action

When an analyst picks a template from the Templates panel, the store's `applyTemplate` action
calls `computeFatRow` with the template's factor values to pre-populate the pricing run:

```ts
applyTemplate(quoteId, desk, templateId, baseload)
```

The `baseload` argument is `MKT_AVG` (hours-weighted average of the EEX forward curve — computed
at module load time in `PricingWorkspacePage`). The result is written to `quote.runs` as a new
`PricingRun` with status `'Draft'`.

---

## 3 — The `NewQuotePage` Multi-Step Wizard

Part 1 said "copy the file and wire real API calls for the DV lookups". It did not describe the
form's state machine. The wizard has **six steps**:

| Step | Label | Key fields |
|------|-------|-----------|
| 1 | Customer & Country | `customerName`, `customerId` (from DV API or new), `countryCode`, `currency`, `direction`, `contractType`, `priority`, `deadline` |
| 2 | Product Selection | Select from `CATALOGUE_PRODUCTS` → sets `productName` and `desksRequired` |
| 3 | Parks / Assets | Asset browser (4 tabs: Search, Customer, Balance Areas, New Asset) — adds `QuotePark[]` with `p50MwhPerYear`, `capacityMw`, `technology` |
| 4 | Tenor Rows | For each park: add one row per tenor. **This is where `curtailmentPct` is entered.** Each row = park × tenor × startDate × endDate × mwhPerYear × balancingRequired × **curtailmentPct** |
| 5 | Project Info | Fills `projectInfo` struct (contacts, permits, financing type, etc.) |
| 6 | Review & Submit | Read-only summary → calls `createDraftQuote()` then optionally `submitQuote()` |

### 3.1 Asset browser tabs

The Parks step has four tabs:

- **SEARCH** — full-text search across the DV store's sites. Wire `useDatasets()` for the real API.
- **CUSTOMER** — filters to the selected customer's sites. Wire `useCustomers()` and cross-reference
  with datasets.
- **BALANCE AREAS** — lists all TSO balance areas for the selected country. Generates a draft
  `QuotePark` with a deterministic balance-area assignment.
- **NEW ASSET** — manual form for a brand-new asset not yet in the system.

When a dataset is attached to a park (from the CUSTOMER or SEARCH tabs), the park row shows a
"Data Ready" indicator and pre-fills `p50MwhPerYear` from the dataset's `p50` field.

### 3.2 The `datasetRef` field

When a park is added from a validated dataset, the quote stores:

```ts
datasetRef?: { datasetId: string; assetName: string }
```

This is a top-level field on `Quote` (one ref per quote, not per park — the prototype uses the
first attached dataset). In the real integration, extend this to a per-park ref if the backend
supports it.

### 3.3 `?datasetId=` query param pre-selection

When `NewQuotePage` mounts, it reads `searchParams.get('datasetId')`. If present, it pre-selects
that dataset in the asset browser and pre-fills customer, technology, and p50. This is the
mechanism that makes the "Use in Pricing" button from `PublishedDatasets.tsx` (Workstream 3.2)
work end-to-end.

---

## 4 — The Computed Results Summary Panel

This panel is a collapsible section at the top of the `PricingWorkspacePage` desk content area,
labelled "DAY 1 · Pricing computed — N rows × 2 curtailment scenarios".

It renders a table with two column groups:

| Column group | Color | Columns |
|---|---|---|
| With Curtailment | Orange (`#F97316`) | Baseload · Cann · Margin · Power |
| Without Curtailment | Blue (`var(--color-info)`) | Baseload · Cann · Margin · Power |

Rows are grouped by park, then by tenor within each park. A park header row shows the park name,
capacity, and curtailment %.

A right-hand explanation panel (280 px) shows the spread (`without.power − with.power`) for each
park's 1Y tenor and explains the formula in plain language.

**This panel is always live-computed** — it calls `computeRunResults()` on every render. It does
not require a save or submit action to appear.

---

## 5 — `AssetsWorkbenchPage`: File Upload and Classification Flow

Part 1 listed this as a simple copy. It is not. `AssetsWorkbenchPage` is a production-data
intake page within a quote context (`/quotes/:id/assets`). Its flow:

1. **Drop zone** — user drops one or more CSV / XLSX files.
2. **Parse** — `mockParse()` simulates a backend parse: extracts row count, granularity, P50 MWh,
   and attempts to match each file to one of the quote's parks by filename similarity.
3. **Classification table** — shows each file with status:
   - `Matched` (confidence > 85 %) — green; auto-assigns to park
   - `Conflict` (confidence ≤ 85 %) — amber; analyst must manually confirm
   - `Unmatched` — red; no park candidate found; analyst must pick from a dropdown
4. **Confirm / re-map** — analyst can override any assignment using a dropdown of the quote's parks.
5. **Granularity override** — dropdown to correct the detected granularity.
6. Confirmed files feed into `AssetsChartPage` as the production profile for that park.

In the real integration, replace `mockParse()` with a call to the backend's file-parse endpoint
(which already exists for the DV workflow). The result shape is a superset of `ParsedAsset`.

---

## 6 — `QuoteDetailPage`: SPV and CE Linking Section

Part 1 described the `QuoteDetailPage` as one of the files to copy but did not describe its
lower half. Below the desk status cards and runs table, there are two subsections:

### 6.1 SPV Links panel

For each park in the quote, there is an `SpvLink` record with:

```ts
interface SpvLink {
  parkId: string
  state: 'PLACEHOLDER' | 'LINKED'
  spvName?: string; spvId?: string; opportunityId?: string
  frontSheetStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  kycStatus?:        'PENDING' | 'APPROVED' | 'REJECTED'
  creditStatus?:     'PENDING' | 'APPROVED' | 'REJECTED'
}
```

The UI renders a card per park showing the SPV state and three approval gates (KYC · Credit ·
Front Sheet). Actions available to the current user (gated by role):

| Action | Store call | When available |
|--------|-----------|----------------|
| Link SPV | `linkSpv(quoteId, parkId, spvName, spvId, actor)` | state = PLACEHOLDER |
| Reuse Opportunity | `reuseOpportunity(quoteId, parkId, spvName, spvId, opportunityId, actor)` | state = PLACEHOLDER, existing Salesforce opp ID known |
| Create Opportunity | `createOpportunity(quoteId, parkId, actor)` | state = LINKED, no opportunityId |
| Trigger Front Sheet | `triggerFrontSheet(quoteId, parkId, actor)` | opportunityId set, frontSheetStatus = PENDING |

In the mock, `linkSpv` and `reuseOpportunity` move the state to `LINKED` and log an audit event.
`createOpportunity` generates a mock `opportunityId`. `triggerFrontSheet` sets `frontSheetStatus`
to `'APPROVED'` after a mock 1-second delay.

In the real integration, these actions should fire the corresponding Salesforce / CRM API calls.
For now, wire them to the Zustand store — they will emit audit events and update local state
optimistically while the backend integration is built.

### 6.2 CE Customer linking

At the top of `QuoteDetailPage`, if `quote.isNewCustomer` is `true`, a banner shows a "Link CE
Customer" button. The modal prompts for a CE customer name and calls:

```ts
linkCeCustomer(quoteId, customerId)
```

This sets `quote.cePendingCustomerName` and emits a `ce-linked` audit event. The banner
disappears once the customer is linked.

### 6.3 Originator actions

The originator role (`'ORIGINATOR'`) sees two additional buttons on `QuoteDetailPage`:

| Button | Store call | Resulting quote status |
|--------|-----------|----------------------|
| Finalise | `finaliseQuote(quoteId, actor)` | `'Finalised'` |
| Reject | `rejectQuote(quoteId, actor)` | `'Rejected'` |
| Request Revision | `requestRevision(quoteId, desk, actor)` | `'RevisionRequested'` · resets that desk's run status to `'Pending'` |

These buttons are rendered only when `user.role === 'ORIGINATOR'` (from `useSessionStore`).

---

## 7 — Complete `pricing.ts` Store Action Surface

Part 1 mentioned four store actions. The store exposes fourteen. This is the full list with
signatures, so the developer knows what's already wired into the copied pages:

```ts
// Already described in Part 1
createDraftQuote(input: NewQuoteInput): string   // returns new quoteId
submitQuote(quoteId: string): void
pickUpDesk(quoteId: string, desk: Desk, actor: string): void
submitRun(quoteId: string, desk: Desk, results?: PricingRowResult[], avgPrice?: number): void

// New in Part 2 — called from QuoteDetailPage / PricingWorkspacePage
applyTemplate(quoteId: string, desk: Desk, templateId: string, baseload: number): void
requestRevision(quoteId: string, desk: Desk, actor: string): void
finaliseQuote(quoteId: string, actor: string): void
rejectQuote(quoteId: string, actor: string): void
deleteQuote(quoteId: string): void

// New in Part 2 — called from QuoteDetailPage SPV section
linkSpv(quoteId: string, parkId: string, spvName: string, spvId: string, actor: string): void
reuseOpportunity(quoteId: string, parkId: string, spvName: string, spvId: string, opportunityId: string, actor: string): void
createOpportunity(quoteId: string, parkId: string, actor: string): void
triggerFrontSheet(quoteId: string, parkId: string, actor: string): void
linkCeCustomer(quoteId: string, customerId: string): void

// Internal (used by all mutating actions — no need to call directly)
logAudit(quoteId: string, eventType: PricingAuditEventType, actor: string, detail: string): void
```

All mutating actions call `logAudit` internally. The resulting events are surfaced in
`PricingAuditPage`.

---

## 8 — Design Token Note: `--color-cell-computed`

`PricingWorkspacePage` uses `var(--color-cell-computed)` to colour formula-driven cells purple.
This token is defined in `tokens.css` and **must survive** the Tailwind v3 migration on the target.
If the target's existing `tailwind.config.js` purges unused CSS custom properties, add an explicit
safelist or reference the variable in a Tailwind `extend.colors` entry:

```js
// tailwind.config.js — add to the extend block from Part 1 §1.3
'cell-computed': 'var(--color-cell-computed)',
```

---

## 9 — Additional Verification Checklist Items

Add these to the Workstream 4 checklist from Part 1:

### New Quote wizard
- [ ] Step 1 — Customer dropdown populates from `useCustomers()` (real API)
- [ ] Step 2 — Product selection sets `desksRequired` correctly (FAT-only, FAT+GREEN, all-three, etc.)
- [ ] Step 3 — Asset browser CUSTOMER tab shows datasets for the selected customer
- [ ] Step 4 — Each tenor row accepts a `curtailmentPct` numeric input; value persists to store
- [ ] Step 6 — Submitting creates a quote in Zustand and navigates to `/quotes/:id`
- [ ] `/quotes/new?datasetId=X` — dataset X is pre-selected and customer/p50 pre-filled

### Pricing Workspace
- [ ] "With curtailment" scenario shows lower power price than "Without curtailment" for the same park
- [ ] Switching scenario toggles cannibalisation and power price in the pricing table
- [ ] Computed Results Summary panel shows N rows × 2 columns (with / without)
- [ ] Spread in the right-hand panel = `withoutCurtailment.power − withCurtailment.power` and is positive
- [ ] Template panel lists templates for the active desk; selecting one fills the row values
- [ ] Market Data panel shows 12-month EEX forward curve with correct hours-weighted average
- [ ] Formula bar updates to show the formula for the active cell
- [ ] Override dot (amber) appears on a cell after manual edit of a formula column
- [ ] Re-quote button resets all rows to computed defaults
- [ ] Submit modal shows correct power price; submitting locks the workspace and navigates to quote detail

### Assets Workbench
- [ ] Drop zone accepts CSV / XLSX files
- [ ] Each dropped file gets a `Matched / Conflict / Unmatched` status
- [ ] Analyst can override park assignment via dropdown
- [ ] Confirmed assets are reflected in the quote's park list

### Quote Detail — SPV / CE
- [ ] Each park shows its SPV state (PLACEHOLDER or LINKED)
- [ ] "Link SPV" action changes state to LINKED and emits audit event
- [ ] KYC / Credit / Front Sheet status badges reflect the current approval states
- [ ] "Trigger Front Sheet" button is only visible when `opportunityId` is set
- [ ] "Link CE Customer" banner visible for new customers; disappears after linking
- [ ] Finalise / Reject / Request Revision buttons visible for ORIGINATOR role only

### Lib files
- [ ] `pricingFormula.ts` present and exported correctly (`computeFatRow`, `flatBalancingComponents`)
- [ ] `pricingStatus.ts` present (`STATUS_LABEL`, `DESK_LABEL`, `statusVariant`, `deskRunVariant`)
- [ ] `format.ts` present (`formatDateTime`, `formatDate`, `formatBytes`, `timeAgo`)
- [ ] `dvStatus.ts` present
