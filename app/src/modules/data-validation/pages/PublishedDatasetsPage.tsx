import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { formatDate, formatDateTime } from '@/lib/format'
import { useDataValidationStore } from '@/store/dataValidation'
import { useSessionStore } from '@/store/session'
import type { DatasetVersion, GateStatus } from '@/mock/dataValidation/types'

const STATUS_VARIANT = {
  DRAFT: 'neutral',
  PRICING_READY: 'accent',
  PUBLISHED: 'success',
  SUPERSEDED: 'neutral',
} as const

const GATE_COLOR: Record<GateStatus, string> = {
  PASS: 'var(--color-success)',
  WARN: 'var(--color-warning)',
  FAIL: 'var(--color-danger)',
}

export function PublishedDatasetsPage() {
  const datasets = useDataValidationStore((s) => s.datasets)
  const { publishDataset, supersedeDataset } = useDataValidationStore()
  const user = useSessionStore((s) => s.user())
  const navigate = useNavigate()
  const [lineageFor, setLineageFor] = useState<DatasetVersion | null>(null)

  const stats = {
    total: datasets.length,
    ready: datasets.filter((d) => d.status === 'PRICING_READY').length,
    withIssues: datasets.filter((d) => d.gates.some((g) => g.status !== 'PASS')).length,
    superseded: datasets.filter((d) => d.status === 'SUPERSEDED').length,
  }

  function requestPricing(d: DatasetVersion) {
    const params = new URLSearchParams({
      datasetId: d.id,
      datasetVersion: String(d.version),
      assetName: d.assetName,
      assetId: d.assetId,
      seriesType: d.seriesType,
      coverageStart: d.coverageStart,
      coverageEnd: d.coverageEnd,
    })
    navigate(`/pricing/quotes/new?${params.toString()}`)
  }

  return (
    <div>
      <PageHeader
        module="Data Validation"
        title="Published Datasets"
        description="Registry of dataset versions — the gate between validation and pricing."
        backTo="/data"
        backLabel="Work Queue"
      />
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatTile label="Total Published" value={stats.total} />
          <StatTile label="Pricing Ready" value={stats.ready} accent />
          <StatTile label="With Issues" value={stats.withIssues} warn />
          <StatTile label="Superseded" value={stats.superseded} />
        </div>

        <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
              <tr>
                {['Asset', 'Series', 'Version', 'Status', 'Coverage', 'Readiness', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '10.5px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datasets.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < datasets.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                  <td style={{ padding: '10px 16px', color: 'var(--color-text-primary)' }}>{d.assetName}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>{d.seriesType}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>v{d.version}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <Badge variant={STATUS_VARIANT[d.status]}>{d.status.replace('_', ' ')}</Badge>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
                    {formatDate(d.coverageStart)} – {formatDate(d.coverageEnd)}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {d.gates.map((g) => (
                        <span key={g.name} title={g.name} style={{ width: 10, height: 10, borderRadius: 'var(--radius-full)', background: GATE_COLOR[g.status], display: 'inline-block' }} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(d.status === 'PRICING_READY' || d.status === 'PUBLISHED') && (
                        <Button size="sm" variant="primary" onClick={() => requestPricing(d)}>
                          Request Pricing
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setLineageFor(d)}>
                        Lineage
                      </Button>
                      {d.status === 'DRAFT' && (
                        <Button size="sm" variant="secondary" onClick={() => publishDataset(d.id, user.email)}>
                          Publish
                        </Button>
                      )}
                      {d.status === 'PUBLISHED' && (
                        <Button size="sm" variant="danger" onClick={() => supersedeDataset(d.id, user.email, 'New version available')}>
                          Supersede
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {lineageFor && (
        <Modal title={`Lineage — ${lineageFor.assetName} v${lineageFor.version}`} onClose={() => setLineageFor(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <Row label="Dataset ID" value={lineageFor.id} />
            <Row label="Series type" value={lineageFor.seriesType} />
            <Row label="Coverage" value={`${formatDate(lineageFor.coverageStart)} – ${formatDate(lineageFor.coverageEnd)}`} />
            <Row label="Point count" value={lineageFor.pointCount.toLocaleString()} />
            <Row label="Published by" value={lineageFor.publishedBy} />
            <Row label="Published at" value={formatDateTime(lineageFor.publishedAt)} />
            <Row label="Source job IDs" value={lineageFor.sourceJobIds.join(', ')} />
          </div>
        </Modal>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  )
}

function StatTile({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <Card>
      <div style={{ marginBottom: 4, fontFamily: 'var(--font-mono)', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent ? 'var(--color-accent)' : warn ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>{value}</div>
    </Card>
  )
}
