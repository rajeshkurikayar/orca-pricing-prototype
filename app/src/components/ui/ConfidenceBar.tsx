export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const barColor =
    pct >= 85 ? 'var(--color-success)' :
    pct >= 60 ? 'var(--color-warning)' :
                'var(--color-danger)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ height: 6, width: 64, overflow: 'hidden', borderRadius: 'var(--radius-full)', background: 'var(--color-bg-tertiary)' }}>
        <div style={{ height: '100%', borderRadius: 'var(--radius-full)', background: barColor, width: `${pct}%` }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{pct}%</span>
    </div>
  )
}
