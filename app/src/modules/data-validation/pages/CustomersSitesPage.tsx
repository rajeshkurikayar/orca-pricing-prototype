import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useDataValidationStore } from '@/store/dataValidation'

export function CustomersSitesPage() {
  const customers = useDataValidationStore((s) => s.customers)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <div>
      <PageHeader module="Data Validation" title="Customers &amp; Sites" description="Asset register — customers and their renewable energy sites." backTo="/data" backLabel="Work Queue" />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {customers.map((c) => {
          const isOpen = expanded[c.id] ?? true
          return (
            <Card key={c.id} noPadding>
              <button
                onClick={() => setExpanded((e) => ({ ...e, [c.id]: !isOpen }))}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isOpen
                    ? <ChevronDown size={16} color="var(--color-text-muted)" />
                    : <ChevronRight size={16} color="var(--color-text-muted)" />
                  }
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>{c.name}</span>
                  <Badge variant="neutral">{c.countryCode}</Badge>
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.sites.length} site{c.sites.length !== 1 ? 's' : ''}</span>
              </button>
              {isOpen && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                    <tr>
                      {['Site', 'Technology', 'Capacity', 'Timezone', 'Coordinates'].map((h) => (
                        <th key={h} style={{ padding: '8px 16px', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {c.sites.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: i < c.sites.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                        <td style={{ padding: '8px 16px', color: 'var(--color-text-primary)' }}>{s.name}</td>
                        <td style={{ padding: '8px 16px' }}>
                          <Badge variant={s.technology === 'WIND' ? 'info' : 'warning'}>{s.technology}</Badge>
                        </td>
                        <td style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.capacityMw} MW</td>
                        <td style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>{s.timezone}</td>
                        <td style={{ padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                          {s.lat.toFixed(3)}, {s.lon.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
