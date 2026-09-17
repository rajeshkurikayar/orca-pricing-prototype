import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const TABS = ['Users', 'Market Data', 'Notifications', 'Security', 'Integrations'] as const
type Tab = (typeof TABS)[number]

const card: React.CSSProperties = {
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
}

const thStyle: React.CSSProperties = {
  padding: '8px 16px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
  background: 'var(--color-bg-tertiary)',
  borderBottom: '1px solid var(--color-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: 13,
  color: 'var(--color-text-secondary)',
  borderBottom: '1px solid var(--color-border-subtle)',
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Integrations')

  return (
    <div>
      <PageHeader module="Shared" title="Settings" description="Platform configuration, integrations, and user management." />
      <div style={{ borderBottom: '1px solid var(--color-border)', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderBottom: t === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: t === tab ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                transition: 'all 120ms',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 900, padding: 24 }}>
        {tab === 'Users'        && <UsersTab />}
        {tab === 'Market Data'  && <MarketDataTab />}
        {tab === 'Notifications'&& <NotificationsTab />}
        {tab === 'Security'     && <SecurityTab />}
        {tab === 'Integrations' && <IntegrationsTab />}
      </div>
    </div>
  )
}

// ─── Users ────────────────────────────────────────────────────────────────────

const USERS = [
  { name: 'Priya Nair',       email: 'p.nair@orca.energy',       role: 'Desk Lead',           status: 'Active',   lastActive: 'Just now' },
  { name: 'Aarav Shah',       email: 'a.shah@orca.energy',       role: 'Contract Originator', status: 'Active',   lastActive: '2 hours ago' },
  { name: 'Maria Bergström',  email: 'm.bergstrom@orca.energy',  role: 'FAT Analyst',         status: 'Active',   lastActive: '1 day ago' },
  { name: 'Jonas Müller',     email: 'j.mueller@orca.energy',    role: 'RAM Analyst',         status: 'Active',   lastActive: '3 days ago' },
  { name: 'Liu Wei',          email: 'l.wei@orca.energy',        role: 'DV Reviewer',         status: 'Active',   lastActive: '5 hours ago' },
  { name: 'Emily Larsen',     email: 'e.larsen@orca.energy',     role: 'Green Analyst',       status: 'Inactive', lastActive: '12 days ago' },
  { name: 'Raj Kumar',        email: 'r.kumar@orca.energy',      role: 'Admin',               status: 'Active',   lastActive: 'Just now' },
]

function UsersTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {USERS.length} users · {USERS.filter(u => u.status === 'Active').length} active
        </span>
        <Button variant="primary">Invite User</Button>
      </div>
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Last active', ''].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {USERS.map(u => (
              <tr key={u.email}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.name}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                <td style={tdStyle}>{u.role}</td>
                <td style={tdStyle}><Badge variant={u.status === 'Active' ? 'success' : 'neutral'}>{u.status}</Badge></td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{u.lastActive}</td>
                <td style={tdStyle}><Button size="sm" variant="ghost">Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Market Data ──────────────────────────────────────────────────────────────

const FEEDS = [
  { name: 'Nord Pool Spot',       provider: 'Nord Pool',  type: 'Day-ahead',       status: 'Live',    lastSync: '2 min ago' },
  { name: 'EPEX SPOT DE',         provider: 'EPEX SPOT',  type: 'Intraday',        status: 'Live',    lastSync: '5 min ago' },
  { name: 'EEX Power Futures',    provider: 'EEX',        type: 'Futures',         status: 'Live',    lastSync: '15 min ago' },
  { name: 'Bloomberg Energy',     provider: 'Bloomberg',  type: 'Reference rates', status: 'Delayed', lastSync: '2h ago' },
  { name: 'DNV Wind Resource',    provider: 'DNV GL',     type: 'Wind resource',   status: 'Live',    lastSync: '1h ago' },
  { name: 'ENTSO-E Transparency', provider: 'ENTSO-E',    type: 'Grid data',       status: 'Live',    lastSync: '30 min ago' },
]

function MarketDataTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
        {FEEDS.filter(f => f.status === 'Live').length} of {FEEDS.length} feeds live
      </span>
      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Feed', 'Provider', 'Type', 'Status', 'Last sync'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEEDS.map(f => (
              <tr key={f.name}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.name}</td>
                <td style={tdStyle}>{f.provider}</td>
                <td style={tdStyle}>{f.type}</td>
                <td style={tdStyle}>
                  <Badge variant={f.status === 'Live' ? 'success' : f.status === 'Delayed' ? 'warning' : 'danger'}>{f.status}</Badge>
                </td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{f.lastSync}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

interface NotifGroup { label: string; items: { key: string; label: string; on: boolean }[] }

const NOTIF_GROUPS: NotifGroup[] = [
  { label: 'Quote lifecycle', items: [
    { key: 'q-submitted',        label: 'Quote submitted',            on: true  },
    { key: 'q-pricing-complete', label: 'Pricing complete',           on: true  },
    { key: 'q-approved',         label: 'Quote approved / rejected',  on: true  },
    { key: 'q-revision',         label: 'Revision requested',         on: false },
  ]},
  { label: 'Data Validation', items: [
    { key: 'dv-upload',     label: 'File upload complete',  on: true  },
    { key: 'dv-failed',     label: 'Validation failed',     on: true  },
    { key: 'dv-published',  label: 'Dataset published',     on: false },
  ]},
  { label: 'System', items: [
    { key: 'sys-maintenance', label: 'Scheduled maintenance',  on: true },
    { key: 'sys-api',         label: 'API / integration alerts', on: true },
  ]},
]

function NotificationsTab() {
  const [groups, setGroups] = useState(NOTIF_GROUPS)

  function toggle(groupLabel: string, key: string) {
    setGroups(gs => gs.map(g =>
      g.label !== groupLabel ? g : { ...g, items: g.items.map(item => item.key === key ? { ...item, on: !item.on } : item) }
    ))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(g => (
        <div key={g.label} style={card}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
            {g.label}
          </div>
          {g.items.map((item, i) => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{item.label}</span>
              <button
                onClick={() => toggle(g.label, item.key)}
                style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: item.on ? 'var(--color-accent)' : 'var(--color-border-strong)', transition: 'background 150ms', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: 3, left: item.on ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Security ─────────────────────────────────────────────────────────────────

const API_KEYS = [
  { name: 'CI pipeline key',      masked: '••••••••••••••• b4e2', created: '2025-11-01', lastUsed: '1 hour ago' },
  { name: 'Data ingestion SFTP',  masked: '••••••••••••••• 9f71', created: '2025-08-15', lastUsed: '4 min ago' },
  { name: 'Staging environment',  masked: '••••••••••••••• 3c1a', created: '2025-06-20', lastUsed: 'Never' },
]

function SecurityTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)' }}>API Keys</span>
          <Button size="sm" variant="secondary">Generate Key</Button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Name', 'Key', 'Created', 'Last used', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {API_KEYS.map(k => (
              <tr key={k.name}>
                <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-text-primary)' }}>{k.name}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{k.masked}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{k.created}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)' }}>{k.lastUsed}</td>
                <td style={tdStyle}><Button size="sm" variant="danger">Revoke</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', background: 'var(--color-bg-tertiary)' }}>
          Session &amp; Access
        </div>
        {[
          { label: 'Session timeout',     sub: 'Auto-logout after inactivity',                 value: '60 minutes' },
          { label: 'Audit log retention', sub: undefined,                                       value: '24 months' },
        ].map((row, i) => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.label}</div>
              {row.sub && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{row.sub}</div>}
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{row.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>MFA enforcement</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>Required for all Admin and Desk Lead roles</div>
          </div>
          <Badge variant="success">Enabled</Badge>
        </div>
      </div>
    </div>
  )
}

// ─── Integrations ─────────────────────────────────────────────────────────────

function IntegrationsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <IntegrationCard name="Salesforce CRM" status="Connected" statusVariant="success"
        description="SPV search, opportunity creation, front-sheet workflow, KYC/credit status."
        details={[
          { label: 'Org',              value: 'orca-energy.my.salesforce.com' },
          { label: 'Last sync',        value: '14 min ago' },
          { label: 'Sync frequency',   value: 'Every 15 minutes' },
          { label: 'Objects synced',   value: 'Account, Opportunity, Contact, SPV__c' },
        ]}
      />
      <IntegrationCard name="Anthropic Claude (AI Agent)" status="Connected" statusVariant="success"
        description="Powers AI file classification, time-series anomaly detection, and gap assessment in Assets & Details."
        details={[
          { label: 'Model',        value: 'claude-sonnet-5' },
          { label: 'Max tokens',   value: '8,192' },
          { label: 'Temperature',  value: '0.1 (deterministic)' },
          { label: 'Routing',      value: 'EU region (Frankfurt)' },
        ]}
      />
      <IntegrationCard name="Puma Platform" status="Connected" statusVariant="success"
        description="Asset registry — provides existing park names, capacities, technology, and linked timeseries IDs for the New Quote wizard."
        details={[
          { label: 'Endpoint',       value: 'puma.internal/api/v2' },
          { label: 'Last sync',      value: '1 hour ago' },
          { label: 'Assets loaded',  value: '127 assets across 5 customers' },
          { label: 'Auth',           value: 'Service account (OAuth 2.0)' },
        ]}
      />
      <IntegrationCard name="DocuSign" status="Connected" statusVariant="success"
        description="Sends draft contracts for e-signature after a quote is finalised."
        details={[
          { label: 'Account',            value: 'orca-energy (EU)' },
          { label: 'Envelope template',  value: 'PPA-Standard-v4' },
          { label: 'Last envelope',      value: 'PR-2026-DE-042 · 3 days ago' },
        ]}
      />
      <IntegrationCard name="SFTP Ingestion" status="Connected" statusVariant="success"
        description="Automated file pickup for production data files sent by customers via SFTP."
        details={[
          { label: 'Host',                 value: 'sftp.orca.energy:22' },
          { label: 'Channels configured',  value: '3 (Encavis, Vattenfall, NordEnergie)' },
          { label: 'Poll interval',        value: 'Every 5 minutes' },
          { label: 'Last file received',   value: '47 min ago' },
        ]}
      />
    </div>
  )
}

function IntegrationCard({ name, description, status, statusVariant, details }: {
  name: string; description: string; status: string
  statusVariant: 'success' | 'warning' | 'danger' | 'neutral'
  details: { label: string; value: string }[]
}) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</span>
            <Badge variant={statusVariant}>{status}</Badge>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: 0 }}>{description}</p>
        </div>
        <Button size="sm" variant="secondary" style={{ marginLeft: 16, flexShrink: 0 }}>Configure</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {details.map((d, i) => (
          <div key={d.label} style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border-subtle)', borderLeft: i % 2 !== 0 ? '1px solid var(--color-border-subtle)' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: 3 }}>{d.label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{d.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
