import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, CheckCircle2, Loader2, FileText, Sparkles, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { useDataValidationStore } from '@/store/dataValidation'
import { useSessionStore } from '@/store/session'
import type { DVCustomer, Site } from '@/mock/dataValidation/types'

interface QueuedFile {
  name: string
  sizeKb: number
  status: 'queued' | 'parsing' | 'ready'
  hint: string
  siteId: string
  manualEntry: boolean
}

const DEMO_FILES = [
  { name: 'Encavis_MaStR_Q3.csv',             sizeKb:   176, status: 'queued' as const, hint: '—', siteId: '', manualEntry: false },
  { name: 'Rostock_prod_MaLo1_2024.csv',      sizeKb: 8_400, status: 'queued' as const, hint: '—', siteId: '', manualEntry: false },
  { name: 'Rostock_prod_MaLo2_2024.csv',      sizeKb: 8_400, status: 'queued' as const, hint: '—', siteId: '', manualEntry: false },
  { name: 'Encavis_Redispatch_2024-2025.pdf', sizeKb:   640, status: 'queued' as const, hint: '—', siteId: '', manualEntry: false },
]

function guessCustomerSite(fileName: string, customers: DVCustomer[]): { customer: DVCustomer; site: Site } {
  const lower = fileName.toLowerCase()
  for (const c of customers) {
    for (const site of c.sites) {
      const keyword = site.name.toLowerCase().split(' ')[0]
      if (keyword.length > 3 && lower.includes(keyword)) return { customer: c, site }
    }
    const cKeyword = c.name.toLowerCase().split(' ')[0]
    if (cKeyword.length > 3 && lower.includes(cKeyword)) return { customer: c, site: c.sites[0] }
  }
  return { customer: customers[0], site: customers[0]?.sites[0] }
}

function findSite(siteId: string, customers: DVCustomer[]): { customer: DVCustomer; site: Site } {
  for (const c of customers) {
    const site = c.sites.find((s) => s.id === siteId)
    if (site) return { customer: c, site }
  }
  return { customer: customers[0], site: customers[0].sites[0] }
}

function fileHint(name: string, sizeKb: number): string {
  const mb = (sizeKb / 1024).toFixed(1)
  const lower = name.toLowerCase()
  if (lower.endsWith('.pdf')) return `Redispatch · 24 instructions`
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
    const sheets = sizeKb > 2000 ? '4 sheets' : '2 sheets'
    return `${sheets} · ${mb} MB`
  }
  if (lower.includes('mastr')) return `Asset detail · 3 parks · 176 KB`
  if (lower.includes('malo')) return `15 min TS · ${mb} MB`
  if (lower.endsWith('.csv') && sizeKb > 1_000) return `15 min TS · ${mb} MB`
  return `${sizeKb} KB`
}

export function UploadPage() {
  const customers = useDataValidationStore((s) => s.customers)
  const uploadFile = useDataValidationStore((s) => s.uploadFile)
  const user = useSessionStore((s) => s.user())
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [dropHovered, setDropHovered] = useState(false)
  const [uploading, setUploading] = useState(false)

  const siteOptions = customers.flatMap((c) =>
    c.sites.map((s) => ({ value: s.id, label: `${c.name} — ${s.name}` }))
  )

  function enqueue(entries: typeof DEMO_FILES) {
    const resolved = entries.map((e) => ({
      ...e,
      siteId: e.siteId || guessCustomerSite(e.name, customers).site.id,
      manualEntry: false,
    }))
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name))
      return [...prev, ...resolved.filter((e) => !names.has(e.name))]
    })
    resolved.forEach((entry, i) => {
      setTimeout(() => {
        setFiles((prev) => prev.map((f) => f.name === entry.name ? { ...f, status: 'parsing', hint: 'Analysing…' } : f))
      }, 300 + i * 150 + Math.random() * 100)
      setTimeout(() => {
        const hint = fileHint(entry.name, entry.sizeKb)
        setFiles((prev) => prev.map((f) => f.name === entry.name ? { ...f, status: 'ready', hint } : f))
      }, 1000 + i * 300 + Math.random() * 400)
    })
  }

  function updateFileSite(name: string, siteId: string) {
    setFiles((prev) => prev.map((f) => f.name === name ? { ...f, siteId } : f))
  }

  function setManualEntry(name: string, manual: boolean) {
    setFiles((prev) => prev.map((f) =>
      f.name === name
        ? { ...f, manualEntry: manual, siteId: manual ? '' : guessCustomerSite(f.name, customers).site.id }
        : f
    ))
  }

  function addRealFiles(incoming: FileList | null) {
    if (!incoming) return
    enqueue(Array.from(incoming).map((f) => ({ name: f.name, sizeKb: Math.round(f.size / 1024) || 1, status: 'queued' as const, hint: '—', siteId: '', manualEntry: false })))
  }

  function loadDemoFiles() {
    enqueue(DEMO_FILES.map((d) => ({ ...d, status: 'queued', hint: '—' })))
  }

  async function handleUpload() {
    if (files.length === 0) return
    setUploading(true)
    for (const entry of files) {
      let customerId: string, customerName: string, siteId: string, siteName: string, countryCode: string
      if (entry.manualEntry) {
        const fallback = customers[0]
        customerId = fallback.id
        customerName = fallback.name
        siteId = entry.siteId.trim()
        siteName = entry.siteId.trim()
        countryCode = fallback.sites[0]?.countryCode ?? 'DE'
      } else {
        const { customer, site } = findSite(entry.siteId, customers)
        customerId = customer.id
        customerName = customer.name
        siteId = site.id
        siteName = site.name
        countryCode = site.countryCode
      }
      uploadFile({ fileName: entry.name, fileSizeKb: entry.sizeKb, customerId, customerName, siteId, siteName, countryCode }, user.email)
    }
    await new Promise((r) => setTimeout(r, 400))
    navigate('/data')
  }

  const allReady = files.length > 0 && files.every((f) => f.status === 'ready') && files.every((f) => !f.manualEntry || f.siteId.trim() !== '')

  return (
    <div>
      <PageHeader
        module="Data Validation"
        title="Upload"
        description="Drop any mix of CSV, Excel and PDF — the AI will classify and match each file automatically."
        backTo="/data"
        backLabel="Work Queue"
      />

      <div style={{ padding: 24, maxWidth: 680 }}>
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDropHovered(true) }}
          onDragLeave={() => setDropHovered(false)}
          onDrop={(e) => { e.preventDefault(); setDropHovered(false); addRealFiles(e.dataTransfer.files) }}
          style={{
            marginBottom: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '36px 24px',
            border: `2px dashed ${dropHovered ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
            borderRadius: 'var(--radius-lg)',
            background: dropHovered ? 'var(--color-accent-muted)' : 'var(--color-bg-secondary)',
            textAlign: 'center',
            transition: 'all 150ms ease',
            cursor: 'pointer',
          }}
        >
          <UploadCloud size={30} color={dropHovered ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              Drag &amp; drop CSV / Excel / PDF here — or{' '}
              <span style={{ color: 'var(--color-accent)' }}>Browse files</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Supports .xlsx, .xlsm, .csv, .pdf up to 50 MB each</div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xlsm,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => addRealFiles(e.target.files)}
          />
        </div>

        {/* Demo shortcut */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={loadDemoFiles}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', border: '1px dashed var(--color-accent-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >
            <Sparkles size={12} /> Load demo files (3)
          </button>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Encavis MaStR Q3 · Rostock MaLo×2 · Redispatch PDF
          </span>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)', overflow: 'hidden', marginBottom: 16 }}>
            {files.map((entry, i) => (
              <div
                key={entry.name}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}
              >
                {entry.status === 'ready'
                  ? <CheckCircle2 size={15} color="var(--color-success)" style={{ flexShrink: 0 }} />
                  : entry.status === 'parsing'
                  ? <Loader2 size={15} color="var(--color-accent)" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                  : <FileText size={15} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />}
                <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </span>
                {entry.manualEntry ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Asset ID…"
                      value={entry.siteId}
                      onChange={(e) => updateFileSite(entry.name, e.target.value)}
                      style={{
                        height: 24,
                        padding: '0 7px',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-accent)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 11,
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                        width: 140,
                      }}
                    />
                    <button
                      type="button"
                      title="Back to list"
                      onClick={() => setManualEntry(entry.name, false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, flexShrink: 0 }}
                    >
                      ↩
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <select
                      value={entry.siteId}
                      onChange={(e) => {
                        if (e.target.value === '__manual__') setManualEntry(entry.name, true)
                        else updateFileSite(entry.name, e.target.value)
                      }}
                      style={{
                        height: 24,
                        padding: '0 22px 0 7px',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        background: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 11,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        outline: 'none',
                        width: 172,
                      }}
                    >
                      {siteOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      <option disabled>─────────────</option>
                      <option value="__manual__">Enter ID manually…</option>
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                  </div>
                )}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {entry.hint}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {files.length > 0 && (
            <Button variant="secondary" onClick={() => setFiles([])}>Clear all</Button>
          )}
          <Button variant="primary" size="lg" onClick={handleUpload} disabled={!allReady || uploading}>
            <UploadCloud size={14} />
            {uploading ? 'Uploading…' : `Upload & classify${files.length > 1 ? ` (${files.length} files)` : ''}`}
          </Button>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
