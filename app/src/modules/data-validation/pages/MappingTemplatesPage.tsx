import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useDataValidationStore } from '@/store/dataValidation'

export function MappingTemplatesPage() {
  const templates = useDataValidationStore((s) => s.templates)
  const customers = useDataValidationStore((s) => s.customers)

  return (
    <div>
      <PageHeader module="Data Validation" title="Mapping Templates" description="Reusable column-mapping rule library, applied automatically when a known format is detected." backTo="/data" backLabel="Work Queue" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 24 }}>
        {templates.map((t) => {
          const customer = t.customerId ? customers.find((c) => c.id === t.customerId) : undefined
          return (
            <Card key={t.id}>
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 13 }}>{t.name}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {customer ? `Scoped to ${customer.name}` : 'Applies to any customer'}
                  </div>
                </div>
                <Badge variant="accent">{t.fileType}</Badge>
              </div>
              <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>{t.description}</p>
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {t.rules.map((r) => (
                  <div key={r.field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{r.sourceColumn}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                    <span style={{ color: 'var(--color-accent)' }}>{r.field}</span>
                    {r.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>Used {t.usageCount} times</div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
