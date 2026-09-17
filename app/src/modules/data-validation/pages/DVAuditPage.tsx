import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/format'
import { useDataValidationStore } from '@/store/dataValidation'
import type { DVAuditEventType } from '@/mock/dataValidation/types'

const TYPE_VARIANT: Record<DVAuditEventType, 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral'> = {
  FILE_UPLOADED: 'info',
  JOB_STARTED: 'neutral',
  JOB_COMPLETED: 'accent',
  EXCEPTION_RAISED: 'danger',
  APPROVED: 'success',
  PUBLISHED: 'success',
  SUPERSEDED: 'warning',
  USER_ACTION: 'neutral',
  MAPPING_APPLIED: 'accent',
}

export function DVAuditPage() {
  const audit = useDataValidationStore((s) => s.audit)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return audit
    const q = query.toLowerCase()
    return audit.filter((a) => a.entityName.toLowerCase().includes(q) || a.actor.toLowerCase().includes(q) || a.action.toLowerCase().includes(q))
  }, [audit, query])

  return (
    <div>
      <PageHeader module="Data Validation" title="Audit Trail" description="Immutable event log for compliance, debugging, and traceability." backTo="/data" backLabel="Work Queue" />
      <div style={{ padding: 24 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entity, actor, action..."
          style={{
            marginBottom: 16,
            width: 320,
            height: 32,
            padding: '0 12px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            fontSize: 13,
            outline: 'none',
            display: 'block',
          }}
        />
        <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <tr>
                {['Timestamp', 'Event', 'Entity', 'Actor', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>{formatDateTime(a.timestamp)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <Badge variant={TYPE_VARIANT[a.eventType]}>{a.eventType.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{a.entityName}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)' }}>{a.actor}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)' }}>{a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
