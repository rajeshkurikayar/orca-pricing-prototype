import { useState } from 'react'
import { Search, Bell, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useSessionStore } from '@/store/session'
import { ROLES, type RoleId } from '@/lib/roles'

export function TopBar() {
  const { roleId, setRoleId, user, role } = useSessionStore()
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const currentUser = user()
  const currentRole = role()

  return (
    <header className="flex h-16 items-center gap-4 border-b border-border bg-surface px-5">
      <div className="flex items-center gap-2 pr-2 font-semibold text-text-primary">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-on-accent text-xs font-bold">
          O
        </span>
        <span className="hidden text-sm md:inline">Orca</span>
      </div>

      <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-page px-3 py-2 text-sm text-text-muted">
        <Search size={16} />
        <span className="flex-1">Search or jump to...</span>
        <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
          ⌘K
        </kbd>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setRoleMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-warning-border bg-warning-muted px-3 py-1.5 text-xs font-medium text-warning"
        >
          <span>{currentRole.label}</span>
          <span className="rounded-full bg-surface/60 px-1.5 py-0.5 font-mono text-[10px]">{roleId}</span>
          <ChevronDown size={14} />
        </button>
        {roleMenuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-border bg-surface p-1 shadow-lg">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRoleId(r.id as RoleId)
                  setRoleMenuOpen(false)
                }}
                className={clsx(
                  'flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-surface-muted',
                  r.id === roleId && 'bg-accent-muted text-accent',
                )}
              >
                <span>{r.label}</span>
                <span className="text-[10px] uppercase text-text-muted">{r.group}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-muted"
      >
        <Bell size={18} />
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">
          2
        </span>
      </button>

      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent">
        {currentUser.initials}
      </div>
    </header>
  )
}
