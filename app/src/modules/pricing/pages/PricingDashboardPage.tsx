import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { STATUS_LABEL, statusVariant } from '@/lib/pricingStatus'
import { formatDate } from '@/lib/format'
import { usePricingStore } from '@/store/pricing'

export function PricingDashboardPage() {
  const quotes = usePricingStore((s) => s.quotes)

  const active = quotes.filter((q) => !['Draft', 'Finalised', 'Rejected'].includes(q.status)).length
  const drafts = quotes.filter((q) => q.status === 'Draft').length
  const approvals = quotes.filter((q) => q.status === 'PricingComplete' || q.status === 'UnderReview').length
  const subProcesses = quotes.reduce((sum, q) => sum + q.spvLinks.filter((s) => s.state === 'PLACEHOLDER').length, 0)

  const recent = [...quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6)

  return (
    <div>
      <PageHeader
        module="Pricing"
        title="Dashboard"
        description="Portfolio overview across all pricing requests."
        actions={
          <Link to="/pricing/quotes/new">
            <Button variant="primary">+ New Quote</Button>
          </Link>
        }
      />
      <div className="p-6">
        <div className="mb-6 grid grid-cols-4 gap-3">
          <KpiTile label="Active" value={active} />
          <KpiTile label="Drafts" value={drafts} />
          <KpiTile label="Approvals" value={approvals} warn />
          <KpiTile label="Sub-Processes" value={subProcesses} accent />
        </div>

        <Card>
          <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Recent requests
          </div>
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-surface-muted text-[10.5px] uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Reference</th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((q) => (
                <tr key={q.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="px-4 py-2.5">
                    <Link to={`/pricing/quotes/${q.id}`} className="font-mono text-[12px] text-accent hover:underline">
                      {q.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">{q.customerName}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={statusVariant(q.status)}>{STATUS_LABEL[q.status]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{formatDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

function KpiTile({ label, value, warn, accent }: { label: string; value: number; warn?: boolean; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? 'text-accent' : warn ? 'text-warning' : 'text-text-primary'}`}>{value}</div>
    </Card>
  )
}
