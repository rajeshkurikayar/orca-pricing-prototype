import { NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { NAV_MODULES, SETTINGS_ITEM } from './nav'

function activeModuleId(pathname: string) {
  if (pathname.startsWith('/data-validation')) return 'data-validation'
  if (pathname.startsWith('/pricing')) return 'pricing'
  return 'home'
}

export function Sidebar() {
  const location = useLocation()
  const activeModule = activeModuleId(location.pathname)
  const contextualModule = NAV_MODULES.find((m) => m.id === activeModule)

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r border-border bg-surface py-3">
      <nav className="flex flex-col items-center gap-1">
        {NAV_MODULES.map((mod) => (
          <SidebarIcon
            key={mod.id}
            label={mod.label}
            icon={mod.icon}
            to={mod.rootPath}
            active={activeModule === mod.id}
          />
        ))}
      </nav>

      {contextualModule && contextualModule.items.length > 0 && (
        <>
          <div className="my-3 h-px w-8 bg-border" />
          <nav className="flex flex-col items-center gap-1">
            {contextualModule.items.map((item) => (
              <SidebarIcon
                key={item.path}
                label={item.label}
                icon={item.icon}
                to={item.path}
                end={item.path === contextualModule.rootPath}
              />
            ))}
          </nav>
        </>
      )}

      <div className="mt-auto flex flex-col items-center gap-1">
        <SidebarIcon label={SETTINGS_ITEM.label} icon={SETTINGS_ITEM.icon} to={SETTINGS_ITEM.path} />
      </div>
    </aside>
  )
}

function SidebarIcon({
  label,
  icon: Icon,
  to,
  active,
  end,
}: {
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  to: string
  active?: boolean
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        clsx(
          'group relative flex h-10 w-10 items-center justify-center rounded-md border-l-2 transition-colors',
          (active ?? isActive)
            ? 'border-accent bg-accent-muted text-accent'
            : 'border-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary',
        )
      }
    >
      <Icon size={18} strokeWidth={2} />
    </NavLink>
  )
}
