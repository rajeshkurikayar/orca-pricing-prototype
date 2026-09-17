import React from 'react'

interface TabItem {
  id: string
  label: string
  badge?: number
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  children?: React.ReactNode
}

export function Tabs({ tabs, activeTab, onTabChange, children }: TabsProps) {
  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
    gap: 0,
  }

  return (
    <div>
      <div style={tabBarStyle}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          const tabStyle: React.CSSProperties = {
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'color 120ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }

          const badgeStyle: React.CSSProperties = {
            fontSize: 10,
            padding: '1px 5px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-accent-muted)',
            color: 'var(--color-accent)',
          }

          return (
            <button key={tab.id} style={tabStyle} onClick={() => onTabChange(tab.id)}>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={badgeStyle}>{tab.badge}</span>
              )}
            </button>
          )
        })}
      </div>
      {children}
    </div>
  )
}
