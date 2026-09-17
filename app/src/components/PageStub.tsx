interface PageStubProps {
  title: string
  module: string
  description?: string
}

export function PageStub({ title, module, description }: PageStubProps) {
  return (
    <div className="p-6">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-accent">{module}</div>
      <h1 className="mb-2 text-2xl font-semibold text-text-primary">{title}</h1>
      <p className="max-w-xl text-sm text-text-secondary">
        {description ?? 'This screen is scaffolded and will be built out in the next phase.'}
      </p>
      <div className="mt-6 flex h-64 items-center justify-center rounded-md border border-dashed border-border-strong text-sm text-text-muted">
        Coming soon
      </div>
    </div>
  )
}
