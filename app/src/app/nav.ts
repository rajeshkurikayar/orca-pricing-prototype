import {
  LayoutGrid,
  ClipboardList,
  PlusSquare,
  FileSpreadsheet,
  CheckCircle2,
  History,
  Upload,
  AlertTriangle,
  LineChart,
  Archive,
  Users,
  FileStack,
  Settings,
  Database,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export interface NavModule {
  id: 'home' | 'data-validation' | 'pricing'
  label: string
  icon: LucideIcon
  rootPath: string
  items: NavItem[]
}

export const NAV_MODULES: NavModule[] = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutGrid,
    rootPath: '/',
    items: [],
  },
  {
    id: 'data-validation',
    label: 'Data Validation',
    icon: Archive,
    rootPath: '/data-validation',
    items: [
      { label: 'Work Queue', path: '/data-validation', icon: ClipboardList },
      { label: 'Upload', path: '/data-validation/upload', icon: Upload },
      { label: 'Exceptions', path: '/data-validation/exceptions', icon: AlertTriangle },
      { label: 'Approvals', path: '/data-validation/approvals', icon: CheckCircle2 },
      { label: 'Data Explorer', path: '/data-validation/explorer', icon: LineChart },
      { label: 'Published Datasets', path: '/data-validation/datasets', icon: Archive },
      { label: 'Customers & Sites', path: '/data-validation/customers', icon: Users },
      { label: 'Mapping Templates', path: '/data-validation/templates', icon: FileStack },
      { label: 'Audit Trail', path: '/data-validation/audit', icon: History },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: ClipboardList,
    rootPath: '/pricing',
    items: [
      { label: 'Dashboard', path: '/pricing', icon: LayoutGrid },
      { label: 'Quotes', path: '/pricing/quotes', icon: ClipboardList },
      { label: 'New Quote', path: '/pricing/quotes/new', icon: PlusSquare },
      { label: 'Assets & Details', path: '/pricing/assets/new', icon: Database },
      { label: 'Templates', path: '/pricing/templates', icon: FileSpreadsheet },
      { label: 'Approvals', path: '/pricing/approvals', icon: CheckCircle2 },
      { label: 'Audit Trail', path: '/pricing/audit', icon: History },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { label: 'Settings', path: '/settings', icon: Settings }
