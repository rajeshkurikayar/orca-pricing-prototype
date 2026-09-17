import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, ChevronDown } from 'lucide-react'
import { useSessionStore } from '@/store/session'
import type { RoleId } from '@/lib/roles'

const ROLE_LANDING: Record<RoleId, string> = {
  'contract-originator': '/quotes',
  'fat-analyst':         '/quotes',
  'ram-analyst':         '/quotes',
  'green-analyst':       '/quotes',
  'desk-lead':           '/approvals',
  'dv-reviewer':         '/data',
  'admin':               '/dashboard',
}

const ROLE_COLORS: Record<RoleId, string> = {
  'contract-originator': '#D29922',
  'fat-analyst': '#F97316',
  'ram-analyst': '#3FB950',
  'green-analyst': '#34D399',
  'desk-lead': '#58A6FF',
  'dv-reviewer': '#8B949E',
  admin: '#8B949E',
}

const ROLE_LABELS: Record<RoleId, string> = {
  'contract-originator': 'Contract Originator',
  'fat-analyst': 'FAT Analyst',
  'ram-analyst': 'RAM Analyst',
  'green-analyst': 'Green Analyst',
  'desk-lead': 'Desk Lead',
  'dv-reviewer': 'DV Reviewer',
  admin: 'Admin',
}

const ALL_ROLE_IDS: RoleId[] = [
  'contract-originator',
  'fat-analyst',
  'ram-analyst',
  'green-analyst',
  'desk-lead',
  'dv-reviewer',
  'admin',
]

const USERS_BY_ROLE: Record<RoleId, string> = {
  'contract-originator': 'Aditya Agarwal',
  'fat-analyst': 'Anna Nowak',
  'ram-analyst': 'Rob Meyer',
  'green-analyst': 'Greta Lindqvist',
  'desk-lead': 'Priya Shah',
  'dv-reviewer': 'Jonas Weber',
  admin: 'Rajesh Kurikayar',
}

export function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const roleId = useSessionStore((s) => s.roleId)
  const setRoleId = useSessionStore((s) => s.setRoleId)
  const user = useSessionStore((s) => s.user)()
  const navigate = useNavigate()

  const roleColor = ROLE_COLORS[roleId]

  return (
    <header
      style={{
        height: 48,
        background: 'transparent',
        borderBottom: '1px solid var(--color-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 8,
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Search bar */}
      <div
        style={{
          flex: 1,
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
          height: 30,
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
        }}
      >
        <Search size={16} />
        <span style={{ fontSize: 'var(--text-sm)' }}>Search or jump to…</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 'var(--text-xs)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '1px 5px',
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Right slot */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {/* Full role switcher dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            style={{
              height: 26,
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 11,
              fontWeight: 500,
              background: `${roleColor}18`,
              border: `1px solid ${roleColor}40`,
              color: roleColor,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <Users size={13} />
            {user.name}
            <ChevronDown size={12} />
          </button>

          {dropdownOpen && (
            <>
              {/* backdrop */}
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99,
                }}
                onClick={() => setDropdownOpen(false)}
              />
              <div
                style={{
                  width: 280,
                  position: 'absolute',
                  right: 0,
                  top: 34,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-xl)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {ALL_ROLE_IDS.map((id) => {
                  const color = ROLE_COLORS[id]
                  return (
                    <div
                      key={id}
                      onClick={() => {
                        setRoleId(id)
                        setDropdownOpen(false)
                        navigate(ROLE_LANDING[id])
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--color-text-primary)',
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{ROLE_LABELS[id]}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                        {USERS_BY_ROLE[id]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* User avatar */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: roleColor,
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: '#0D1117',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {user.initials}
        </div>
      </div>
    </header>
  )
}
