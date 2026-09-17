import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { severityVariant } from '@/lib/dvStatus'
import { useDataValidationStore } from '@/store/dataValidation'
import { useSessionStore } from '@/store/session'

export function ExceptionsPage() {
  const findings = useDataValidationStore((s) => s.findings)
  const jobs = useDataValidationStore((s) => s.jobs)
  const resolveFinding = useDataValidationStore((s) => s.resolveFinding)
  const user = useSessionStore((s) => s.user())
  const [showResolved, setShowResolved] = useState(false)

  const exceptions = findings.filter(
    (f) => (f.severity === 'BLOCKING' || f.severity === 'ERROR') && (showResolved || f.status === 'OPEN'),
  )

  return (
    <div>
      <PageHeader
        module="Data Validation"
        title="Exceptions"
        description="Blocking and error findings that require human resolution before a file can be approved."
        backTo="/data"
        backLabel="Work Queue"
        actions={
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        }
      />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {exceptions.length === 0 && <EmptyState title="No open exceptions" description="Everything is clear." />}
        {exceptions.map((f) => {
          const job = jobs.find((j) => j.id === f.jobId)
          return (
            <Card key={f.id}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{f.ruleId}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{f.message}</span>
                </div>
                {f.status !== 'OPEN' && <Badge variant="success">{f.status}</Badge>}
              </div>
              {job && (
                <Link to={`/data/jobs/${job.id}`} style={{ display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)', textDecoration: 'none' }}>
                  {job.fileName} · {job.customerName} / {job.siteName}
                </Link>
              )}
              <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>{f.explanation}</p>
              <div style={{ marginBottom: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                affected_records={f.affectedRecords} rule_id={f.ruleId}
                {f.affectedRows.length > 0 && ` rows=${f.affectedRows.join('-')}`}
              </div>
              <div style={{ marginBottom: 12, fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>Recommendation: </span>
                {f.recommendation}
              </div>
              {f.status === 'OPEN' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" onClick={() => resolveFinding(f.id, 'RESOLVED', user.email, 'Resolved by reviewer')}>
                    Resolve
                  </Button>
                  <Button variant="secondary" onClick={() => resolveFinding(f.id, 'OVERRIDDEN', user.email, 'Reclassified by reviewer')}>
                    Reclassify
                  </Button>
                  <Button variant="secondary" onClick={() => resolveFinding(f.id, 'IGNORED', user.email, 'Returned for correction')}>
                    Return for Correction
                  </Button>
                  <Button variant="danger" onClick={() => resolveFinding(f.id, 'IGNORED', user.email, 'Rejected')}>
                    Reject
                  </Button>
                </div>
              ) : (
                <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{f.resolutionNote}</div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
