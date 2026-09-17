import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfidenceBar } from '@/components/ui/ConfidenceBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatBytes, timeAgo } from '@/lib/format'
import { useDataValidationStore } from '@/store/dataValidation'
import { useSessionStore } from '@/store/session'

export function DVApprovalsPage() {
  const allJobs = useDataValidationStore((s) => s.jobs)
  const jobs = useMemo(() => allJobs.filter((j) => j.status === 'AWAITING_REVIEW'), [allJobs])
  const { approveJob, rejectJob } = useDataValidationStore()
  const user = useSessionStore((s) => s.user())
  const [comments, setComments] = useState<Record<string, string>>({})
  const [resolved, setResolved] = useState<string[]>([])

  return (
    <div>
      <PageHeader
        module="Data Validation"
        title="Approvals"
        description="Review queue for jobs awaiting human sign-off before publishing."
        backTo="/data"
        backLabel="Work Queue"
      />
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {jobs.length === 0 && <EmptyState title="Nothing awaiting review" description="All caught up." />}
        {jobs.map((job) => (
          <Card key={job.id}>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <Link to={`/data/jobs/${job.id}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                  {job.fileName}
                </Link>
                <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {job.customerName} / {job.siteName} · {formatBytes(job.fileSizeKb)} · received {timeAgo(job.receivedAt)}
                </div>
              </div>
              <Badge variant="warning">Awaiting Review</Badge>
            </div>

            <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', padding: 12 }}>
              <div>
                <div style={{ marginBottom: 4, fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Classification</div>
                <div style={{ marginBottom: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{job.agentRun.classification.fileType}</div>
                <ConfidenceBar value={job.agentRun.classification.confidence} />
              </div>
              <div>
                <div style={{ marginBottom: 4, fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>Proposed interpretation</div>
                <div style={{ fontSize: '12.5px', color: 'var(--color-text-primary)' }}>
                  {job.agentRun.assetResolution.customerName} · {job.agentRun.assetResolution.siteName}
                </div>
              </div>
            </div>

            {job.agentRun.recommendations.length > 0 && (
              <ul style={{ marginBottom: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '12.5px', color: 'var(--color-text-secondary)' }}>
                {job.agentRun.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}

            <textarea
              value={comments[job.id] ?? ''}
              onChange={(e) => setComments((c) => ({ ...c, [job.id]: e.target.value }))}
              placeholder="Optional comment..."
              rows={2}
              style={{
                marginBottom: 12,
                width: '100%',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-primary)',
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="primary"
                onClick={() => {
                  approveJob(job.id, user.email, comments[job.id])
                  setResolved((r) => [...r, job.id])
                }}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  approveJob(job.id, user.email, comments[job.id] || 'Approved with note')
                  setResolved((r) => [...r, job.id])
                }}
              >
                Approve with Note
              </Button>
              <Button variant="danger" onClick={() => rejectJob(job.id, user.email, comments[job.id])}>
                Reject
              </Button>
            </div>
          </Card>
        ))}

        {resolved.length > 0 && (
          <div style={{ paddingTop: 8, fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Resolved this session: {resolved.length}</div>
        )}
      </div>
    </div>
  )
}
