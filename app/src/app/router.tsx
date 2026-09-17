import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

// New feature pages
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { QuoteListPage } from '@/features/quotes/QuoteListPage'

// Existing module pages (kept until fully migrated)
import { NewQuotePage } from '@/modules/pricing/pages/NewQuotePage'
import { QuoteDetailPage } from '@/modules/pricing/pages/QuoteDetailPage'
import { PricingWorkspacePage } from '@/modules/pricing/pages/PricingWorkspacePage'
import { PricingTemplatesPage } from '@/modules/pricing/pages/PricingTemplatesPage'
import { PricingApprovalsPage } from '@/modules/pricing/pages/PricingApprovalsPage'
import { PricingAuditPage } from '@/modules/pricing/pages/PricingAuditPage'
import { AssetsDetailsPage } from '@/modules/pricing/pages/AssetsDetailsPage'
import { AssetsWorkbenchPage } from '@/modules/pricing/pages/AssetsWorkbenchPage'
import { AssetsChartPage } from '@/modules/pricing/pages/AssetsChartPage'
import { PricingTemplateEditorPage } from '@/modules/pricing/pages/PricingTemplateEditorPage'

// Data validation pages
import { WorkQueuePage } from '@/modules/data-validation/pages/WorkQueuePage'
import { UploadPage } from '@/modules/data-validation/pages/UploadPage'
import { FileWorkspacePage } from '@/modules/data-validation/pages/FileWorkspacePage'
import { ExceptionsPage } from '@/modules/data-validation/pages/ExceptionsPage'
import { DVApprovalsPage } from '@/modules/data-validation/pages/DVApprovalsPage'
import { DataExplorerPage } from '@/modules/data-validation/pages/DataExplorerPage'
import { PublishedDatasetsPage } from '@/modules/data-validation/pages/PublishedDatasetsPage'
import { CustomersSitesPage } from '@/modules/data-validation/pages/CustomersSitesPage'
import { MappingTemplatesPage } from '@/modules/data-validation/pages/MappingTemplatesPage'
import { DVAuditPage } from '@/modules/data-validation/pages/DVAuditPage'
import { SettingsPage } from './SettingsPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Main pages (spec paths)
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'quotes', element: <QuoteListPage /> },
      { path: 'quotes/new', element: <NewQuotePage /> },
      { path: 'quotes/:id', element: <QuoteDetailPage /> },
      { path: 'quotes/:id/edit', element: <NewQuotePage /> },
      { path: 'quotes/:id/pricing', element: <PricingWorkspacePage /> },
      { path: 'approvals', element: <PricingApprovalsPage /> },
      { path: 'audit', element: <PricingAuditPage /> },
      { path: 'templates', element: <PricingTemplatesPage /> },
      { path: 'settings', element: <SettingsPage /> },

      // Assets upload flow
      { path: 'assets/new', element: <AssetsDetailsPage /> },
      { path: 'quotes/:id/assets', element: <AssetsWorkbenchPage /> },
      { path: 'quotes/:id/assets/chart', element: <AssetsChartPage /> },

      // Template editor
      { path: 'templates/new', element: <PricingTemplateEditorPage /> },
      { path: 'templates/:id/edit', element: <PricingTemplateEditorPage /> },

      // Data pipeline (spec paths: /data/*)
      { path: 'data', element: <WorkQueuePage /> },
      { path: 'data/upload', element: <UploadPage /> },
      { path: 'data/jobs/:id', element: <FileWorkspacePage /> },
      { path: 'data/exceptions', element: <ExceptionsPage /> },
      { path: 'data/approvals', element: <DVApprovalsPage /> },
      { path: 'data/explorer', element: <DataExplorerPage /> },
      { path: 'data/datasets', element: <PublishedDatasetsPage /> },
      { path: 'data/customers', element: <CustomersSitesPage /> },
      { path: 'data/templates', element: <MappingTemplatesPage /> },
      { path: 'data/audit', element: <DVAuditPage /> },

      // Legacy path redirects
      { path: 'pricing', element: <Navigate to="/dashboard" replace /> },
      { path: 'pricing/quotes', element: <Navigate to="/quotes" replace /> },
      { path: 'pricing/quotes/new', element: <Navigate to="/quotes/new" replace /> },
      { path: 'pricing/quotes/:id', element: <Navigate to="/quotes/:id" replace /> },
      { path: 'pricing/assets/new', element: <Navigate to="/assets/new" replace /> },
      { path: 'data-validation', element: <Navigate to="/data" replace /> },
      { path: 'data-validation/upload', element: <Navigate to="/data/upload" replace /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
