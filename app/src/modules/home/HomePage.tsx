import { NAV_MODULES } from '@/app/nav'
import { Link } from 'react-router-dom'

export function HomePage() {
  const dv = NAV_MODULES.find((m) => m.id === 'data-validation')!
  const pricing = NAV_MODULES.find((m) => m.id === 'pricing')!

  return (
    <div className="p-6">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-accent">Orca · Portfolio Management</div>
      <h1 className="mb-2 text-2xl font-semibold text-text-primary">Home</h1>
      <p className="mb-6 max-w-2xl text-sm text-text-secondary">
        One ecosystem across Data Validation and Pricing. Pick a module below or use the sidebar.
      </p>

      <div className="grid max-w-4xl grid-cols-2 gap-4">
        <ModuleCard title={dv.label} items={dv.items.map((i) => i.label)} to={dv.rootPath} accent="info" />
        <ModuleCard title={pricing.label} items={pricing.items.map((i) => i.label)} to={pricing.rootPath} accent="accent" />
      </div>
    </div>
  )
}

function ModuleCard({
  title,
  items,
  to,
  accent,
}: {
  title: string
  items: string[]
  to: string
  accent: 'info' | 'accent'
}) {
  return (
    <Link
      to={to}
      className="rounded-md border border-border bg-surface p-5 shadow-sm transition-colors hover:border-accent-border"
    >
      <div
        className={
          accent === 'info'
            ? 'mb-3 inline-flex rounded-full bg-info-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info'
            : 'mb-3 inline-flex rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent'
        }
      >
        Module
      </div>
      <h2 className="mb-3 text-lg font-semibold text-text-primary">{title}</h2>
      <ul className="space-y-1 text-sm text-text-secondary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Link>
  )
}
