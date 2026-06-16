'use client'

import { useState, type ReactNode } from 'react'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ImportReport } from '@tradepilot/shared/import'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { previewImport, commitImport, type ImportPreview } from '@/app/(app)/leads/import/actions'

const FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'companyName', label: 'Company name', required: true },
  { key: 'website', label: 'Website' },
  { key: 'domain', label: 'Domain' },
  { key: 'country', label: 'Country' },
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'industry', label: 'Industry' },
  { key: 'language', label: 'Language' },
  { key: 'tags', label: 'Tags' },
  { key: 'contactEmail', label: 'Contact email' },
  { key: 'contactFirstName', label: 'Contact first name' },
  { key: 'contactLastName', label: 'Contact last name' },
  { key: 'contactTitle', label: 'Contact title' },
  { key: 'contactPhone', label: 'Contact phone' },
  { key: 'contactLinkedinUrl', label: 'Contact LinkedIn' },
]

type Step = 'upload' | 'map' | 'running' | 'done'

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function kindOf(name: string): 'csv' | 'xlsx' | null {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return 'csv'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  return null
}

export function ImportDialog({ onImported, children }: { onImported?: () => void; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [pending, setPending] = useState(false)
  const [fileMeta, setFileMeta] = useState<{ name: string; kind: 'csv' | 'xlsx'; base64: string } | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [report, setReport] = useState<ImportReport | null>(null)

  function reset() {
    setStep('upload')
    setFileMeta(null)
    setPreview(null)
    setMapping({})
    setReport(null)
    setPending(false)
  }

  async function onFile(file: File) {
    const kind = kindOf(file.name)
    if (!kind) {
      toast.error('Unsupported file type. Use CSV or XLSX.')
      return
    }
    setPending(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await previewImport({ fileName: file.name, kind, base64 })
      if (!res.ok) {
        toast.error(res.error.message)
        return
      }
      setFileMeta({ name: file.name, kind, base64 })
      setPreview(res.data)
      setMapping(res.data.suggestedMapping as Record<string, number>)
      setStep('map')
    } finally {
      setPending(false)
    }
  }

  async function onCommit() {
    if (!fileMeta) return
    if (mapping.companyName == null) {
      toast.error('Map the Company name column to continue.')
      return
    }
    setStep('running')
    setPending(true)
    try {
      const res = await commitImport({ ...fileMeta, fileName: fileMeta.name, mapping })
      if (!res.ok) {
        toast.error(res.error.message)
        setStep('map')
        return
      }
      setReport(res.data.report)
      setStep('done')
      onImported?.()
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Upload className="h-4 w-4" /> Import leads
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX of importer companies. We dedupe, ICP-score, and add them to your leads.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-center hover:bg-muted/40">
            <Upload className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">Click to choose a CSV or XLSX file</span>
            <span className="text-xs text-muted-foreground">
              {pending ? 'Reading file…' : 'Up to ~50,000 rows'}
            </span>
            <input
              type="file"
              accept=".csv,.tsv,.txt,.xlsx,.xls"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
              }}
            />
          </label>
        )}

        {step === 'map' && preview && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {preview.rowCount.toLocaleString()} rows detected
              {preview.truncated ? ' (truncated to the row cap)' : ''}. Match your columns:
            </p>
            <div className="grid max-h-[40svh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-2">
                  <Label className="flex-1 truncate" htmlFor={`map-${f.key}`}>
                    {f.label}
                    {f.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  <select
                    id={`map-${f.key}`}
                    className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
                    value={mapping[f.key] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setMapping((m) => {
                        const next = { ...m }
                        if (v === '') delete next[f.key]
                        else next[f.key] = Number(v)
                        return next
                      })
                    }}
                  >
                    <option value="">— none —</option>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={reset} disabled={pending}>
                Choose another file
              </Button>
              <Button onClick={onCommit} disabled={pending || mapping.companyName == null}>
                Import {preview.rowCount.toLocaleString()} rows
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'running' && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing, deduping, and scoring…</p>
          </div>
        )}

        {step === 'done' && report && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Import complete</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Created" value={report.created} />
              <Stat label="Merged" value={report.merged} />
              <Stat label="Skipped" value={report.skipped} />
              <Stat label="Contacts" value={report.contactsCreated} />
              <Stat label="Review" value={report.reviewFlagged} />
              <Stat label="Invalid" value={report.invalid} />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
