import { useState } from 'react'
import { useLocation, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle,
  Clock,
  Layout,
  ListFilter,
  Upload,
  AlertTriangle,
  Database,
  BarChart3,
  Users,
  Columns,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogIn,
  Sliders,
  Palette,
  PanelTopOpen,
  Check,
} from 'lucide-react'
import { useTheme, type Theme } from '@/contexts/ThemeContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/quotes', label: 'Quotes', icon: ClipboardList },
  { path: '/approvals', label: 'Approvals', icon: CheckCircle },
  { path: '/audit', label: 'Audit Trail', icon: Clock },
  { path: '/templates', label: 'Templates', icon: Layout },
]

const dataNavItems = [
  { path: '/data', label: 'Work Queue', icon: ListFilter, exact: true },
  { path: '/data/upload', label: 'Upload', icon: Upload },
  { path: '/data/approvals', label: 'Review Queue', icon: CheckCircle },
  { path: '/data/exceptions', label: 'Exceptions', icon: AlertTriangle },
  { path: '/data/datasets', label: 'Datasets', icon: Database },
  { path: '/data/explorer', label: 'Explorer', icon: BarChart3 },
  { path: '/data/customers', label: 'Customers', icon: Users },
  { path: '/data/templates', label: 'Mappings', icon: Columns },
  { path: '/data/audit', label: 'Data Audit', icon: ScrollText },
]

const THEMES: { id: Theme; label: string; from: string; to: string }[] = [
  { id: 'light',  label: 'Teal',   from: '#1a9090', to: '#45c2c2' },
  { id: 'indigo', label: 'Indigo', from: '#1A0A5E', to: '#4B35C0' },
  { id: 'forest', label: 'Forest', from: '#0D2818', to: '#1A5C34' },
  { id: 'dark',   label: 'Dark',   from: '#181C23', to: '#242938' },
]

interface NavItemProps {
  path: string
  label: string
  Icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>
  collapsed: boolean
  exact?: boolean
}

function NavItem({ path, label, Icon, collapsed, exact }: NavItemProps) {
  const location = useLocation()
  const isActive = exact
    ? location.pathname === path
    : location.pathname.startsWith(path)

  return (
    <NavLink
      to={path}
      data-active={isActive ? 'true' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 36,
        padding: collapsed ? '0 0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.92)',
        background: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
        transition: 'all 120ms ease',
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <Icon size={19} strokeWidth={2.5} color={isActive ? '#ffffff' : 'rgba(255,255,255,0.92)'} style={{ flexShrink: 0 }} />
      {!collapsed && label}
    </NavLink>
  )
}

function BottomItem({ label, icon: Icon, onClick, collapsed, active }: { label: string; icon: React.ComponentType<{ size?: number; color?: string }>; onClick?: () => void; collapsed: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 34,
        padding: collapsed ? '0 0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 8,
        background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 400,
        color: 'rgba(255,255,255,0.65)',
        width: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        transition: 'all 120ms ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(255,255,255,0.13)' : 'transparent' }}
    >
      <Icon size={19} strokeWidth={2.5} color="rgba(255,255,255,0.65)" />
      {!collapsed && label}
    </button>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { theme, setTheme } = useTheme()
  const [themePickerOpen, setThemePickerOpen] = useState(false)

  return (
    <div
      style={{
        width: collapsed ? 56 : 220,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(180deg, var(--sidebar-from) 0%, var(--sidebar-to) 100%)`,
        transition: 'width 200ms ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .sidebar-nav a,
        .sidebar-nav a:visited,
        .sidebar-nav a:hover,
        .sidebar-nav a.active {
          color: rgba(255,255,255,0.92) !important;
        }
        .sidebar-nav a[data-active="true"],
        .sidebar-nav a.active {
          color: #ffffff !important;
        }
      `}</style>

      {/* Logo */}
      <div
        style={{
          height: 60,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {collapsed
              ? (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src="/orca.png" height={20} style={{ objectFit: 'contain' }} alt="orca" />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src="/orca.png" height={20} style={{ objectFit: 'contain' }} alt="orca" />
                  </div>
                  <img src="/rcaLarge.png" height={30} style={{ objectFit: 'contain', flexShrink: 0 }} alt="rca" />
                </div>
              )
            }
          </div>
          {!collapsed && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-sublabel)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              Pricing
            </span>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav
        className="sidebar-nav"
        style={{
          flex: 1,
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          overflowY: 'auto',
        }}
      >
        {mainNavItems.map((item) => (
          <NavItem
            key={item.path}
            path={item.path}
            label={item.label}
            Icon={item.icon}
            collapsed={collapsed}
          />
        ))}

        {/* Data Pipeline section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 8, marginTop: 6 }}>
          {!collapsed && (
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 12px 6px' }}>
              Data Pipeline
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {dataNavItems.map((item) => (
              <NavItem
                key={item.path}
                path={item.path}
                label={item.label}
                Icon={item.icon}
                collapsed={collapsed}
                exact={item.exact}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom utility items */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '6px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <BottomItem label="Help" icon={HelpCircle} collapsed={collapsed} />
        <BottomItem label="Configurations" icon={Sliders} collapsed={collapsed} />
        <BottomItem label="Dock To Top" icon={PanelTopOpen} collapsed={collapsed} />

        {/* Theme picker */}
        <BottomItem
          label="Theme"
          icon={Palette}
          collapsed={collapsed}
          active={themePickerOpen}
          onClick={() => setThemePickerOpen(o => !o)}
        />

        {themePickerOpen && (
          <div
            style={{
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {THEMES.map(t => {
              const isActive = theme === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  style={{
                    height: 30,
                    borderRadius: 6,
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? 0 : '0 8px',
                    gap: 8,
                    width: '100%',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(255,255,255,0.12)' : 'transparent' }}
                >
                  {/* Colour circle */}
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)`,
                      border: isActive ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.35)',
                      flexShrink: 0,
                    }}
                  />
                  {!collapsed && (
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? '#ffffff' : 'rgba(255,255,255,0.75)' }}>
                      {t.label}
                    </span>
                  )}
                  {!collapsed && isActive && <Check size={12} color="#ffffff" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        )}

        <NavItem path="/settings" label="Log In" Icon={LogIn} collapsed={collapsed} />

        {/* Toggle collapse */}
        <button
          onClick={onToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 34,
            padding: collapsed ? '0 0' : '0 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 12,
            fontWeight: 500,
            width: '100%',
            marginTop: 4,
            transition: 'all 120ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
        >
          {collapsed
            ? <ChevronRight size={15} color="rgba(255,255,255,0.92)" />
            : <><ChevronLeft size={15} color="rgba(255,255,255,0.92)" /><span>Collapse</span></>
          }
        </button>
      </div>
    </div>
  )
}
