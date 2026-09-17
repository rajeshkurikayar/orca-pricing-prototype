# Integration Instructions — Prototype → `orca.portfoliomanagement.ui`

## Purpose

The `orca-newpricing` prototype has been approved as the reference design and new-flow specification
for the product. The target repository (`orca.portfoliomanagement.ui`, locally at
`orca-pricing-data-standardisation/pricing-data-main`) has fully working, approved Pricing and
Data Standardisation workflows backed by a real Python backend.

**The agent's job is to layer the approved prototype's visual system and new-only flows on top of
the target repo — changing nothing that already works.**

---

## Ground Rules (read before writing a single line)

1. **Do not touch existing target pages, routes, API calls, hooks, or types.** Every Data
   Standardisation page in the target has a real backend and is approved. So does the existing
   Pricing workflow. Touch only what is explicitly listed in the workstreams below.
2. **When in doubt, add alongside — never replace.**
3. **Preserve the CopilotPanel.** The target has an off-canvas AI assistant panel toggled from the
   TopBar. It has no equivalent in the prototype. It must survive the layout changes.
4. **Preserve the three stub routes** (`/rules`, `/integrations`, `/admin`). They exist intentionally.
5. **React version:** The target is React 18; the prototype is React 19. Do not upgrade React.
   The prototype components are compatible — just check for any React 19-only imports before
   copying and remove them.

---

## Pre-flight: Diff Analysis

Before touching any file, produce a written inventory:

1. List every route in `App.tsx` (target) with its component file path.
2. List every route in the prototype's router with its component file path.
3. For each prototype route, mark it as **EXISTS** (target has an equivalent), **PARTIAL** (target
   has something at that path but serving a different domain), or **NEW** (no equivalent at all).

Use the table at the end of this document as a starting reference — but verify it against the actual
files before relying on it, since the target repo may have been updated since this was written.

Do not proceed to Workstream 1 until this inventory is on paper and any discrepancies are resolved.

---

## Tech Stack Summary

| | Prototype (`orca-newpricing`) | Target (`orca.portfoliomanagement.ui`) |
|--|--|--|
| Framework | React 19 | React 18 |
| Router | react-router-dom v7 | react-router-dom v6 |
| State | Zustand v5 + persist | TanStack Query v5 (no Zustand) |
| CSS | CSS custom properties (`tokens.css`) + Tailwind v4 + inline styles | Tailwind v3 only |
| HTTP | None (mock) | Axios (`api/client.ts`, `/api/v1` base) |
| Charts | Recharts v3 | Plotly.js |
| Tables | — | TanStack Table v8 + Virtual v3 |
| Forms | — | react-hook-form v7 + Zod v3 |
| Build | Vite 8 | Vite 5 |

---

## Workstream 1 — Design System

**Goal:** Make the target look like the prototype. No logic changes.

### 1.1 Install fonts

Add to `index.html` (or the Vite entry point):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet">
```

### 1.2 Copy design token files

Copy these files verbatim from the prototype into the target's `src/styles/` folder (create it if
it doesn't exist):

- `app/src/styles/tokens.css` → `frontend/src/styles/tokens.css`
- `app/src/styles/global.css` → `frontend/src/styles/global.css`

Then in `frontend/src/index.css`, **prepend** (do not replace):

```css
@import './styles/tokens.css';
@import './styles/global.css';
```

Keep the existing `@tailwind base/components/utilities` lines — they must remain.

### 1.3 Extend Tailwind config to consume the CSS vars

Open `tailwind.config.js` in the target. Extend its `theme` to reference the CSS custom properties
so that existing Tailwind classes continue to work alongside the new token system:

```js
theme: {
  extend: {
    colors: {
      accent:      'var(--color-accent)',
      'accent-hover': 'var(--color-accent-hover)',
      border:      'var(--color-border)',
      'bg-primary':    'var(--color-bg-primary)',
      'bg-secondary':  'var(--color-bg-secondary)',
      'text-primary':  'var(--color-text-primary)',
      'text-secondary':'var(--color-text-secondary)',
      'text-muted':    'var(--color-text-muted)',
    },
    fontFamily: {
      sans:    ['Source Sans 3', 'Source Sans Pro', 'Helvetica Neue', 'sans-serif'],
      display: ['DM Serif Display', 'Georgia', 'serif'],
      mono:    ['IBM Plex Mono', 'Courier New', 'monospace'],
    },
  },
},
```

Do not remove any existing Tailwind configuration.

### 1.4 Add ThemeContext

Copy verbatim:
- `app/src/contexts/ThemeContext.tsx` → `frontend/src/contexts/ThemeContext.tsx`

In `frontend/src/App.tsx`, wrap the existing `QueryClientProvider` with `ThemeProvider`:

```tsx
// Before:
<QueryClientProvider client={queryClient}>
  <RouterProvider router={router} />
</QueryClientProvider>

// After:
<ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
</ThemeProvider>
```

### 1.5 Replace the layout shell

The target's `components/layout/Sidebar.tsx` and `components/layout/TopBar.tsx` need to be replaced
with the prototype's versions — but with these **mandatory differences**:

**Sidebar:**
- Copy `app/src/components/layout/Sidebar.tsx` → `frontend/src/components/layout/Sidebar.tsx`
  (overwrite).
- After copying, audit the nav items. The prototype sidebar has 5 main items + 9 Data Pipeline
  items. The target sidebar has 13 items (all data pipeline). You must **add** the target's nav
  items that are not present in the prototype (Rules, Integrations, Admin stubs) and keep them.
  Do not remove any existing target route from the nav.
- The new Sidebar has the 4-theme picker at the bottom. Keep it.

**Header / TopBar:**
- The target has `TopBar.tsx`; the prototype has `Header.tsx`. They serve the same slot.
- Copy `app/src/components/layout/Header.tsx` → `frontend/src/components/layout/Header.tsx`
  (new file, do not overwrite TopBar.tsx).
- In `AppShell.tsx`, swap the import from `TopBar` to `Header`. Ensure the CopilotPanel toggle
  button that previously lived in `TopBar.tsx` is moved into the new `Header.tsx`. The Copilot
  panel itself (`components/copilot/CopilotPanel.tsx`) is not touched.

**AppShell:**
- Update `frontend/src/components/layout/AppShell.tsx` to import the new `Header` and the new
  `Sidebar`. Keep the `CopilotPanel` import and rendering unchanged.

### 1.6 Copy UI primitives

Copy the following from `app/src/components/ui/` → `frontend/src/components/ui/`. If a file of
the same name already exists in the target, **do not overwrite it** — instead rename the incoming
file with a `Orca` prefix (e.g. `OrcaBadge.tsx`) so both coexist. Update imports in the new
pricing pages (Workstream 2) to use the renamed version.

Files to copy:
- `Badge.tsx`
- `Button.tsx`
- `Card.tsx`
- `ConfidenceBar.tsx`
- `EmptyState.tsx`
- `Input.tsx`
- `Modal.tsx`
- `PageHeader.tsx`
- `Select.tsx`
- `StatusBadge.tsx`
- `Tabs.tsx`

### 1.7 Copy logo assets

Copy to `frontend/public/`:
- `app/public/orca.png`
- `app/public/rcaLarge.png`

Do not remove any existing assets.

### 1.8 Apply tokens to existing Data Pipeline pages (restyle only)

For each of the 10 existing Data Pipeline pages in the target, update the **presentation layer only**:
- Replace hardcoded `slate-900` / `gray-*` Tailwind classes with the equivalent token-based classes
  from the extended config (`bg-bg-primary`, `text-text-primary`, `border-border`, etc.).
- Use the font family tokens (`font-sans`, `font-display`) where headings and body text are set.
- Do not change any `useQuery`, `useMutation`, API call, or business logic on these pages.
- Do not change any component props or state handling.

The goal is visual consistency with the prototype — same background tones, typography scale, and
accent colour — without altering a single behaviour.

---

## Workstream 2 — New Pricing Routes

**Goal:** Add the pricing-domain pages from the prototype as brand-new routes. The target currently
has zero pricing pages.

### 2.1 Route collision check

Three paths exist in the target that also appear (with different meanings) in the prototype:

| Path | Target meaning | Prototype meaning | Resolution |
|------|---------------|-------------------|-----------|
| `/approvals` | DV job review (keep) | Pricing approvals (new) | Add pricing approvals at `/pricing/approvals` |
| `/audit` | DV pipeline audit (keep) | Pricing audit (new) | Add pricing audit at `/pricing/audit` |
| `/templates` | CSV mapping templates (keep) | Pricing assumption templates (new) | Add pricing templates at `/pricing/templates` |

All other pricing routes (`/dashboard`, `/quotes/*`, `/assets/*`) have no collision.

### 2.2 Copy the Pricing Zustand store

The target has no Zustand. Add it:

```bash
npm install zustand
```

Copy verbatim:
- `app/src/store/session.ts` → `frontend/src/store/session.ts`
- `app/src/mock/pricing/seed.ts` → `frontend/src/mock/pricing/seed.ts`
- `app/src/mock/pricing/types.ts` → `frontend/src/mock/pricing/types.ts`
- `app/src/lib/roles.ts` → `frontend/src/lib/roles.ts`

Also copy the Zustand pricing store — find it at `app/src/store/` (the store that wraps
`mock/pricing/seed.ts`). Copy it as `frontend/src/store/pricing.ts`.

Do not copy or set up the `useDataValidationStore` — the target's TanStack Query hooks already
cover that domain.

### 2.3 Copy the PermissionsContext

Copy:
- `app/src/contexts/PermissionsContext.tsx` → `frontend/src/contexts/PermissionsContext.tsx`

Wrap the router in `App.tsx`:
```tsx
<ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <PermissionsProvider>
      <RouterProvider router={router} />
    </PermissionsProvider>
  </QueryClientProvider>
</ThemeProvider>
```

### 2.4 Add pricing pages

Create `frontend/src/pages/pricing/` and copy the following from the prototype:

| Source (prototype) | Destination (target) | New route |
|-------------------|---------------------|-----------|
| `modules/pricing/pages/PricingDashboardPage.tsx` | `pages/pricing/PricingDashboardPage.tsx` | `/dashboard` |
| `modules/pricing/pages/QuotesListPage.tsx` | `pages/pricing/QuotesListPage.tsx` | `/quotes` |
| `modules/pricing/pages/NewQuotePage.tsx` | `pages/pricing/NewQuotePage.tsx` | `/quotes/new` and `/quotes/:id/edit` |
| `modules/pricing/pages/QuoteDetailPage.tsx` | `pages/pricing/QuoteDetailPage.tsx` | `/quotes/:id` |
| `modules/pricing/pages/PricingWorkspacePage.tsx` | `pages/pricing/PricingWorkspacePage.tsx` | `/quotes/:id/pricing` |
| `modules/pricing/pages/AssetsWorkbenchPage.tsx` | `pages/pricing/AssetsWorkbenchPage.tsx` | `/quotes/:id/assets` |
| `modules/pricing/pages/AssetsChartPage.tsx` | `pages/pricing/AssetsChartPage.tsx` | `/quotes/:id/assets/chart` |
| `modules/pricing/pages/AssetsDetailsPage.tsx` | `pages/pricing/AssetsDetailsPage.tsx` | `/assets/new` |
| `modules/pricing/pages/PricingApprovalsPage.tsx` | `pages/pricing/PricingApprovalsPage.tsx` | `/pricing/approvals` |
| `modules/pricing/pages/PricingAuditPage.tsx` | `pages/pricing/PricingAuditPage.tsx` | `/pricing/audit` |
| `modules/pricing/pages/PricingTemplatesPage.tsx` | `pages/pricing/PricingTemplatesPage.tsx` | `/pricing/templates` |
| `modules/pricing/pages/PricingTemplateEditorPage.tsx` | `pages/pricing/PricingTemplateEditorPage.tsx` | `/pricing/templates/new` and `/pricing/templates/:id/edit` |

Register all these routes in the existing `App.tsx` router definition, nested under the `AppShell`
layout outlet — the same way the existing data pipeline routes are registered.

Update the Sidebar nav to include the new pricing routes. Group them under a "Pricing" section
above the existing "Data Pipeline" section. Suggested items: Dashboard, Quotes, Pricing Approvals,
Pricing Audit, Pricing Templates.

### 2.5 Wire real API calls inside New Quote

The `NewQuotePage` in the prototype fetches customers, validated datasets, and files from mock
stores. In the target, replace those mock calls with the real TanStack Query hooks that already
exist:

| Prototype mock call | Replace with (target hook) |
|--------------------|---------------------------|
| Reading customers from Zustand DV store | `useCustomers()` from `hooks/useDatasets.ts` (or `api/customers.ts` directly) |
| Reading available/published datasets | `useDatasets()` from `hooks/useDatasets.ts` |
| Reading uploaded/processed files | `useFiles()` from `hooks/useFiles.ts` |
| Reading completed jobs | `useJobs()` from `hooks/useJob.ts` (filter for `status === 'approved'`) |

Do not touch any Zustand pricing store calls in `NewQuotePage` — only the data-validation lookups
within the form get swapped.

---

## Workstream 3 — Pricing ↔ Data Standardisation Bridge

**Goal:** Surface pricing-ready data in the Pricing module when a Data Standardisation job
completes. Additive only — nothing on existing pages changes.

### 3.1 Pricing-ready indicator on Assets

In `AssetsWorkbenchPage` and `QuotesListPage` (both new pages added in Workstream 2):
- Call `useDatasets()` and filter for datasets with `status === 'published'` (or equivalent
  approved state in the target API response — check `api/datasets.ts` for the exact field name).
- Render a "Pricing Ready" badge or count chip next to each asset that has a matching published
  dataset (matched by customer ID or asset ID, depending on what the dataset record carries).
- This is a read-only display — no write calls, no changes to the datasets endpoint.

### 3.2 "View in Pricing" shortcut from Datasets page

In `PublishedDatasets.tsx` (existing target page — **presentation layer only**, no logic change):
- Add a "Use in Pricing" action button to each published dataset row. The button navigates to
  `/quotes/new?datasetId=<id>`. It triggers no API call itself.
- In `NewQuotePage`, read the `datasetId` query param on mount and pre-select that dataset in the
  form. This is within the new pricing page — not a change to the existing Datasets page logic.

---

## Workstream 4 — Verification Checklist

Run through every item before marking the integration complete:

### Existing flows (must not regress)
- [ ] `/` (WorkQueue) loads and displays real jobs from the backend
- [ ] `/upload` — file upload triggers real backend job creation
- [ ] `/workspace/:jobId` — file workspace loads real job data and validation findings
- [ ] `/exceptions` — displays real validation findings
- [ ] `/approvals` — DV job approval/rejection works against the real API
- [ ] `/explorer` — timeseries chart loads real data
- [ ] `/datasets` — published datasets list loads; publish/supersede actions work
- [ ] `/customers` — customer list loads
- [ ] `/templates` (mapping templates) — list loads
- [ ] `/audit` — audit log loads
- [ ] Copilot panel opens and sends a message
- [ ] `/rules`, `/integrations`, `/admin` stubs are reachable (no 404)

### New flows
- [ ] `/dashboard` — Pricing Dashboard renders (mock data acceptable)
- [ ] `/quotes` — Quotes list renders
- [ ] `/quotes/new` — New Quote form renders; customer and dataset dropdowns populate from real API
- [ ] `/quotes/:id/pricing` — Pricing Workspace renders
- [ ] `/quotes/:id/assets` — Assets Workbench renders; "Pricing Ready" badge shows for published datasets
- [ ] `/quotes/:id/assets/chart` — Assets Chart renders
- [ ] `/pricing/approvals` — Pricing Approvals renders
- [ ] `/pricing/audit` — Pricing Audit renders
- [ ] `/pricing/templates` — Pricing Templates renders
- [ ] `/datasets` page — "Use in Pricing" button navigates to `/quotes/new?datasetId=...`
- [ ] `/quotes/new?datasetId=X` — pre-selects dataset X in the form

### Design system
- [ ] All 4 themes (Teal, Indigo, Forest, Dark) apply to all pages — new and existing
- [ ] Fonts (Source Sans 3 body, DM Serif Display headings) render on all pages
- [ ] Sidebar theme picker works; preference persists on page reload
- [ ] Sidebar collapses and expands; all nav labels remain correct

---

## Route Reference Table

| Route | Page | Status in target before integration |
|-------|------|-------------------------------------|
| `/` | WorkQueue | Exists — do not change |
| `/upload` | Upload | Exists — do not change |
| `/workspace/:jobId` | FileWorkspace | Exists — do not change |
| `/exceptions` | Exceptions | Exists — do not change |
| `/approvals` | DV Approvals | Exists — do not change |
| `/explorer` | DataExplorer | Exists — do not change |
| `/datasets` | PublishedDatasets | Exists — add "Use in Pricing" button only |
| `/customers` | CustomersAndSites | Exists — do not change |
| `/templates` | MappingTemplates | Exists — do not change |
| `/audit` | Audit | Exists — do not change |
| `/rules` | Stub | Exists — do not change |
| `/integrations` | Stub | Exists — do not change |
| `/admin` | Stub | Exists — do not change |
| `/dashboard` | PricingDashboard | **New** |
| `/quotes` | QuotesList | **New** |
| `/quotes/new` | NewQuote | **New** |
| `/quotes/:id` | QuoteDetail | **New** |
| `/quotes/:id/edit` | NewQuote (edit) | **New** |
| `/quotes/:id/pricing` | PricingWorkspace | **New** |
| `/quotes/:id/assets` | AssetsWorkbench | **New** |
| `/quotes/:id/assets/chart` | AssetsChart | **New** |
| `/assets/new` | AssetsDetails | **New** |
| `/pricing/approvals` | PricingApprovals | **New** (note: `/approvals` is taken by DV) |
| `/pricing/audit` | PricingAudit | **New** (note: `/audit` is taken by DV) |
| `/pricing/templates` | PricingTemplates | **New** (note: `/templates` is taken by mapping templates) |
| `/pricing/templates/new` | PricingTemplateEditor | **New** |
| `/pricing/templates/:id/edit` | PricingTemplateEditor | **New** |
