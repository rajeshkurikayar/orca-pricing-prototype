# Orca Portfolio Management Platform — Project Context & Handoff

> **Purpose of this file:** a complete, self-contained history of this project so any LLM/agent
> picking up the work later (or a new session) has full context without re-deriving decisions.
> Read this top to bottom before making changes. Update the "Progress" and "Next steps" sections
> as work continues.

---

## 1. Original request (verbatim intent)

The user (Rajesh) asked to build an **interactive prototype application for a stakeholder
walkthrough**, combining two previously-separate apps — **Data Validation** and **Pricing
Framework** — into **one unified ecosystem app**, keeping the **existing light-theme pricing UI
style** as the visual reference, while using the Data Validation screens for functional-flow
reference. New v2 features (AI file upload/classification, SPV/opportunity workflow, indicative
offer) described in two attached HTML mockups should be layered in, but **restyled to match the
existing light app**, not copied as-is (those mockups are dark-themed and served only as a
content/flow reference).

The user explicitly asked for a staged process:
1. **Step 1** — rewrite/improve the prompt into a clear brief, get approval.
2. **Step 2** — produce a build plan, get approval.
3. **Step 3** — build the prototype with dummy data.
4. Ask questions at every step rather than assume.

## 2. Reference files provided by the user

| File / folder | Role |
|---|---|
| `orca-newpricing/ref/pricing/*.png` (screenshots) | **Visual/UI source of truth** — light theme, teal accent (~#2f8f94), IBM Plex Sans/Mono fonts, icon-rail sidebar (module icons + contextual page icons below a divider), top bar (search, role pill, notification bell, avatar), card/table styling. Confirmed against a live app screenshot at build time. |
| `orca-newpricing/ref/data val/*.png` (screenshots) | Data Validation app's actual screens (Work Queue, Upload, Exceptions, Approvals, Data Explorer, Published Datasets, Customers & Sites, Mapping Templates, Audit, **`launcher.png`** — a combined-home-page concept already sketched for a unified ecosystem app, which confirmed the "Home" landing page direction). |
| `orca-newpricing/ref/screenshots/*` | Duplicate/additional set of the pricing + data-val screenshots. |
| `workflow.md` (Downloads, referenced in chat) | Full **Pricing Framework** functional spec: status state machine (`Draft → Submitted → InPricing → RevisionRequestedByOriginator → PricingComplete → UnderReview → Finalised/Approved/Rejected/Cancelled/Expired`), Contract Originator flow (Quotes List, 4-tab New Quote wizard, Quote Detail tabs, Review Action Bar), FAT Analyst flow (Pricing Workspace, pricing table formulas, templates, market data, run lifecycle), full API endpoint list, role/permission summary. |
| `data-validation-workflow.md` (Downloads, referenced in chat) | Full **Data Validation** functional spec: file lifecycle status enum, file types, source channels, all 10 pages with their purpose/actions/APIs, `AgentRunOutput` schema, `ValidationFinding` schema, timeseries data model, `DatasetVersion` + pricing-readiness gates, mapping templates, audit event types, cross-app handoff URL format (`/quotes/new?datasetId=...&assetName=...&coverageStart=...`), key business rules (redispatch never merged into production, LLMs never do arithmetic, BLOCKING findings block approval, datasets are versioned, lineage mandatory). |
| `Orca_Pricing_v2_E2E_Walkthrough.html` (Downloads, attached) | Dark-themed HTML mockup — **24-step Scenario A** (Encavis AG, existing customer, 2 German wind parks: Neubrandenburg=existing Puma-linked 48MW, Rostock=new draft 32MW; full lifecycle through AI file classification, HITL gap review, SPV/opportunity/front-sheet/KYC/credit, indicative offer, signed contract) and **11-step Scenario B** (NordEnergie GmbH, brand-new customer, 2 new draft parks: Kiel 24MW + Flensburg 36MW; demonstrates CE-onboarding-pending banner, enhanced KYC path, SPVs registered externally by CRM team). Used as the **narrative/content source** for v2 features — not the visual style. |
| `Orca_Pricing_v2_Design_Wireframes.html` (Downloads, attached) | Dark-themed HTML wireframes + full **design document**: end-to-end flow diagram, W1–W16 wireframe specs (Tab 1–4, Assets & Details Page, SPV Search modal, Indicative Offer, Dashboard, Quotes List, Quote Detail, Pricing Workspace, Templates, Approvals, Audit, Settings), interaction flows (IF1 draft-asset creation, IF2 SPV→opportunity, IF3 late-data-upload), **23 locked design decisions (D1–D23)**, and **19 open questions for the business (Q1–Q19)**. Also content/flow reference only, not visual style. |

## 3. Process so far — what was agreed at each gate

### Step 1 — Rewritten brief (approved)
Locked scope: unify Data Validation + Pricing Framework into one light-themed ecosystem app
("Orca Portfolio Management Platform"), full page inventory from both workflow docs plus new v2
screens (Assets & Details AI-upload page, SPV & Approvals panel, Indicative Offer, new-customer/
CE-pending path), dummy/seeded data only (Encavis 2-park scenario + NordEnergie new-customer
scenario), no live integrations.

**Locked build decisions from Q&A:**
- **Stack:** React + Vite + TypeScript + Tailwind (v4, CSS-first `@theme` config, no tailwind.config.js)
- **Scope:** Full page inventory (not trimmed to just the walkthrough narrative)
- **Demo mode:** Free-clicking app, **no** guided-walkthrough overlay
- **New-feature styling:** Redesign to match the existing light pricing app's component patterns
  (tables/cards/modals), not the dark mockup's literal layout

### Step 2 — Build plan (approved)
- **Nav structure** — single icon-rail sidebar: top group = module switcher (Home / Data
  Validation / Pricing), divider, then contextual page icons for the *currently active* module,
  Settings pinned at the bottom. Matches the reference screenshots exactly (confirmed visually).
- **Approvals and Audit trail stay SEPARATE per module** (Data Validation has its own Approvals +
  Audit; Pricing keeps its own Approvals + Audit) — explicitly NOT unified, per user's answer.
- **Role switcher does REAL gating** — buttons/actions hide or disable based on role capability
  (not cosmetic). Role model lives in `src/lib/roles.ts`.
- **App scaffolds at `orca-newpricing/app`** (this repo, sibling to `ref/`).
- **Demo data** = Encavis (Scenario A) + NordEnergie (Scenario B) as described in the walkthrough,
  plus filler rows/quotes so list pages don't look empty.
- **Cross-module handoff**: Data Validation's Published Datasets "Request Pricing" button
  deep-links into Pricing's New Quote wizard with dataset context in the URL query string
  (`datasetId`, `datasetVersion`, `assetName`, `assetId`, `seriesType`, `coverageStart`,
  `coverageEnd`) — this is implemented and verified working.
- **Build phases:** 1) scaffold/theme/shell/routing, 2) Data Validation module, 3) Pricing module,
  4) deepen v2 features (Assets & Details AI-upload, SPV existing-opportunity handshake), 5)
  Settings/Integrations + final polish.

## 4. Technical foundation (how the app is built)

**Location:** `/Users/rajeshkurikayar/orca-newpricing/app` (Vite + React 19 + TypeScript + Tailwind v4)

**Key conventions — read before editing:**
- Path alias `@/*` → `src/*` (configured in both `tsconfig.app.json` `paths` + `vite.config.ts`
  `resolve.alias`, using `import.meta.dirname` not `__dirname`).
- **Tailwind v4** uses CSS-first config: all design tokens (`--color-*`, `--font-*`) are defined in
  `src/index.css` inside an `@theme { ... }` block. There is **no** `tailwind.config.js`.
  Design tokens: `--color-page` #f7f8fa, `--color-surface` white, `--color-accent` #2f8f94 (teal),
  IBM Plex Sans (UI) / IBM Plex Mono (data/tables) loaded via Google Fonts `<link>` in `index.html`.
- **State management:** Zustand stores with the `persist` middleware (localStorage), so demo state
  survives a page refresh during a live walkthrough. Two stores so far:
  `src/store/dataValidation.ts` and `src/store/pricing.ts`, plus a small `src/store/session.ts`
  for the current role/user.
- **⚠️ Critical bug pattern already hit twice — avoid repeating it:** never call `.filter()` /
  `.map()` **inline inside a Zustand selector callback**, e.g.
  `useStore(s => s.jobs.filter(...))`. This returns a **new array reference every render**, which
  Zustand's default `Object.is` equality check sees as "changed", triggering an infinite
  re-render loop (React "Maximum update depth exceeded"). **Always** select the raw array from
  the store, then compute the derived/filtered list with `useMemo` in the component body. This bit
  us in `FileWorkspacePage`, `DVApprovalsPage`, `PricingApprovalsPage`, and `QuoteDetailPage`'s
  `AuditTab` — all now fixed with the `useMemo` pattern.
- **Role/capability model:** `src/lib/roles.ts` defines 7 roles (`contract-originator`,
  `fat-analyst`, `ram-analyst`, `green-analyst`, `desk-lead`, `dv-reviewer`, `admin`) each with a
  `capabilities` object (`canCreateRequest`, `canSubmitRequest`, `canPriceResponse`,
  `canPriceFat/Ram/Green`, `canApproveTemplates`, `canReviewDataValidation`, `isAdmin`). UI reads
  `useSessionStore(s => s.role())` and conditionally renders/disables actions — this is real
  gating, verified live (e.g. RAM Analyst role cannot see the "Pick Up" button on the FAT desk card).
- **Icon library:** `lucide-react`. **Charts:** `recharts` (used in Data Explorer). **Routing:**
  `react-router-dom` v7 (`createBrowserRouter`).
- **Design-system primitives** in `src/components/ui/`: `Badge`, `Button`, `Card`/`CardHeader`,
  `ConfidenceBar`, `EmptyState`, `Modal`, `PageHeader`. Reuse these for all new pages instead of
  writing raw Tailwind classes from scratch.

## 5. Progress — what's built and verified

### Phase 1 — Shell, theme, routing ✅ DONE
- Vite/React/TS/Tailwind scaffolded; fonts + tokens in place.
- `src/app/Shell.tsx` (layout), `Sidebar.tsx` (icon-rail with module+contextual pattern),
  `TopBar.tsx` (search bar, role-switcher dropdown, notification bell, avatar), `nav.ts` (nav
  config for both modules + Settings), `router.tsx` (all routes wired).
- `src/modules/home/HomePage.tsx` — combined landing page with module cards.
- Visually confirmed against reference screenshots — very close match.

### Phase 2 — Data Validation module ✅ DONE
- `src/mock/dataValidation/types.ts` + `seed.ts` — full type system (FileStatus, FileType,
  SourceChannel, Severity, AgentRunOutput, ValidationFinding, TimeSeries, DatasetVersion,
  DVCustomer/Site, MappingTemplate, DVAuditEvent) and seed data: 5 customers (Encavis, NordEnergie,
  RWE, Vattenfall, Ørsted) with sites, 10 jobs across all statuses (including the Rostock/
  Neubrandenburg/Kiel/Flensburg files from the walkthrough scenarios), 5 validation findings
  (including the week-long gap on Rostock and the capacity-exceeded blocking finding on RWE),
  4 timeseries (synthetic wind-shaped hourly data with a deliberate gap on Rostock for the HITL
  narrative), 5 published datasets with pricing-readiness gates, 4 mapping templates, 8 audit events.
- `src/store/dataValidation.ts` — actions: `approveJob`, `rejectJob`, `reprocessJob`,
  `resolveFinding`, `publishDataset`, `supersedeDataset`, `uploadFile` (simulates async
  AI-classification delay), `logAudit`.
- Pages (`src/modules/data-validation/pages/`): `WorkQueuePage`, `UploadPage`,
  `FileWorkspacePage` (job detail, route `/data-validation/jobs/:id`), `ExceptionsPage`,
  `DVApprovalsPage`, `DataExplorerPage` (recharts area chart with stats tiles),
  `PublishedDatasetsPage` (readiness-gate dots, Lineage modal, **working "Request Pricing"
  cross-module handoff**), `CustomersSitesPage`, `MappingTemplatesPage`, `DVAuditPage`.
- **Verified live in browser**: navigation, job drill-down, role-gated approve/reject, chart
  rendering with the seeded gap visible, and the full cross-module handoff (clicked "Request
  Pricing" on the Rostock dataset → landed on New Quote wizard with all query params populated).

### Phase 3 — Pricing module ✅ DONE
- `src/mock/pricing/types.ts` + `seed.ts` — full type system (QuoteStatus, Desk, DeskRunStatus,
  QuotePark, TenorRow, SpvLink, PricingComponents/Row/Run, ProjectInfo, Quote,
  AssumptionTemplate, PricingAuditEvent) and 6 seeded quotes covering every status:
  - **Q1 PR-2026-DE-042 (Encavis)** — `Finalised`, full lifecycle incl. linked SPVs, approved
    KYC/credit/front-sheet, submitted FAT+RAM runs — mirrors walkthrough Scenario A end state.
  - **Q2 PR-2026-DE-B01 (NordEnergie)** — `Submitted`, new customer with `cePendingCustomerName`
    set (drives the CE-pending banner in the SPV panel) — mirrors walkthrough Scenario B start.
  - **Q3 PR-2026-DE-015 (RWE, offshore)** — `InPricing`, FAT picked up with a draft run in progress.
  - **Q4 PR-2026-SE-007 (Vattenfall, solar)** — `Draft`, not yet submitted.
  - **Q5 PR-2026-DK-003 (Ørsted, offshore)** — `PricingComplete`, awaiting originator review.
  - **Q6 PR-2026-DE-099 (8Power)** — `Rejected` filler.
  - 4 assumption templates (FAT Wind DE, FAT Wind UK, FAT Solar DE, RAM Standard DE).
- `src/lib/pricingFormula.ts` — deterministic formula engine: `computeFatRow(baseload, factors,
  curtailmentPct)` returns with/without-curtailment `PricingComponents`
  (baseload/seasonal/cannibalisation/volumeRisk/margin/balancingFee/power); `flatBalancingComponents(fee)`
  for RAM's flat per-MWh balancing fee.
- `src/store/pricing.ts` — actions: `createDraftQuote`, `submitQuote` (creates SPV placeholders),
  `pickUpDesk` (creates a run, flips quote to `InPricing`), `applyTemplate` (computes all tenor-row
  results from the template's factors), `submitRun` (**auto-flips quote status to
  `PricingComplete` once every required desk has submitted** — verified live), `requestRevision`,
  `linkSpv`, `createOpportunity`, `triggerFrontSheet` (simulates an async CRM callback via
  `setTimeout` that auto-approves front-sheet/KYC/credit after ~2s), `finaliseQuote`,
  `rejectQuote`, `logAudit`.
- Pages (`src/modules/pricing/pages/`): `PricingDashboardPage` (KPI tiles + recent requests),
  `QuotesListPage` (filter chips, status-gated row actions), `NewQuotePage` (4-tab wizard:
  Pricing Request Summary incl. Puma-style park search against DV sites + manual "+ New Asset"
  entry + reads dataset-handoff query params to prefill a park; Project Info; Pricing Request
  Details with live tenor-row preview; Review & Submit with Save-as-Draft vs Submit), `QuoteDetailPage`
  (Overview w/ status pipeline, Submission Details, Desk Responses w/ embedded **SPV & Approvals
  panel** incl. Search & Replace modal + Create Opportunity + Trigger Front Sheet, **Approval &
  Offer** tab w/ internal-vs-customer-shareable indicative offer range, Audit Trail),
  `PricingWorkspacePage` (route `/pricing/quotes/:id/pricing` — desk tabs, Pick Up, template
  picker cards, live formula-computed pricing table with a with/without-curtailment toggle, Submit
  to Originator), `PricingTemplatesPage`, `PricingApprovalsPage`, `PricingAuditPage`.
- **Verified live end-to-end in browser**: created a brand-new quote via the wizard (with the
  Rostock dataset handoff prefill) → submitted it → picked up FAT as `fat-analyst` role → applied
  the DE wind template → watched the pricing table compute correctly (baseload 102 → power 72.94
  after cann/volume-risk/margin) → submitted the FAT run → **switched role to `ram-analyst`** →
  picked up RAM → applied the RAM template (flat balancing fee table renders correctly, different
  columns than FAT) → submitted the RAM run → **quote auto-transitioned to `PricingComplete`** →
  opened the Approval & Offer tab → indicative offer range rendered correctly
  (75.4–76.5 EUR/MWh) matching the with/without-curtailment components. Role gating confirmed
  (RAM Analyst cannot see "Pick Up" on the FAT card and vice versa). State persisted correctly
  across a full page reload (localStorage).

## 6. What's yet to be done

### Phase 4 — Deepen v2 features (NOT STARTED)
These were called out in the plan but not yet built as dedicated screens (some overlap already
exists implicitly — e.g. the New Quote wizard already has a basic manual "+ New Asset" entry and
Puma-style search — but the following are still open):
- **Shared "Assets & Details" page** — the AI-simulated file-upload/classification screen from
  wireframe W3, reachable from New Quote Tab 1's "+ NEW ASSET" and from a park's own detail link.
  Should reuse/extend the Data Validation upload-classification pattern (confidence scoring,
  "Needs Confirmation" tray for low-confidence matches) but themed for the Pricing side.
- **Time-Series Gap Review (HITL) screen** (wireframe W3c) — currently this concept only exists
  inside the Data Validation module's seed data (the Rostock gap) and chart; it does not yet have
  its own dedicated gap-inspector screen with the file-inspector row view described in the
  wireframe. Could be built as a sub-route reachable from the (new) Assets & Details page.
  reflected via the FileWorkspacePage. A dedicated gap-inspector UI is deferred.
- **SPV-already-has-an-opportunity handshake modal** (wireframe W7c, decision D23) — the current
  `SpvPanel` search modal always shows fresh/available SPVs; it doesn't yet simulate the "this SPV
  already has an open opportunity — cancel / create parallel / reuse existing" 3-way choice.
- **New-customer / CE-onboarding-pending simulated background poller** — currently the CE-pending
  banner in the SPV panel is static (shows a message, doesn't auto-resolve). The walkthrough
  describes a background poller that "auto-links" the customer after a delay; not yet simulated.

### Phase 5 — Settings/Integrations + final polish (NOT STARTED)
- `SettingsPage` is still the original placeholder stub (`src/app/placeholderPages.tsx`). Needs:
  Users, Market Data, Notifications, Security tabs (per `workflow.md`/reference) plus a new
  **Integrations** tab (CRM connection status, LLM agent settings, Puma sync status — per
  wireframe W16).
- No README / demo-driver instructions yet for whoever runs the stakeholder walkthrough.
- Responsive/empty-state polish pass not yet done across all pages.
- The `PricingDashboardPage`'s KPI tiles and `HomePage`'s module cards are functional but haven't
  been cross-checked pixel-for-pixel against the reference dashboard screenshot's 7-day volume
  chart — that chart doesn't exist yet anywhere in the app.

### Known minor gaps / things a future session should double check
- `NewQuotePage`'s manual "+ New Asset" entry creates a generic placeholder park (`New Draft Park
  N`) rather than opening a proper manual-entry form with editable name/capacity/technology fields
  — wireframe W2c describes a fuller manual form.
- The formula engine (`pricingFormula.ts`) is intentionally simplified (no seasonal/SUMPRODUCT
  logic, no per-cell manual override / fill-down / undo stack described in `workflow.md`'s
  Pricing Table section) — acceptable for a stakeholder demo but not a literal implementation of
  every Excel-like interaction described in the spec.
- Green desk is modelled in types/roles but has no seeded quote exercising it end-to-end yet.
- No automated tests exist; verification so far has been manual (`tsc --noEmit` + live browser
  interaction via the integrated browser tools).

## 7. How to resume this work

1. Read this file fully.
2. `cd /Users/rajeshkurikayar/orca-newpricing/app && npm run dev` to start the dev server
   (default port 5173, will bump to 5174+ if busy).
3. Run `npx tsc -b --noEmit` after any change before considering it done — this project has hit
   real type errors before and they're cheap to catch this way.
4. Re-read section 4's Zustand selector warning before writing any new store-connected component.
5. Continue with Phase 4/5 as scoped above, or take new direction from the user — this is a living
   prototype, not a finished product; ask before assuming scope.
