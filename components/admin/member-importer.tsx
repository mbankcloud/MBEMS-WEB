"use client"

import { useState, useCallback } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { importMembers } from "@/lib/actions/import"
import { downloadCSV, formatDateTime } from "@/lib/utils"
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react"

const DEST_FIELDS = [
  { key: "member_id", label: "Member ID", required: true },
  { key: "full_name", label: "Full Name", required: true },
  { key: "age", label: "Age", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "address", label: "Address", required: false },
  { key: "mobile_number", label: "Mobile Number", required: false },
  { key: "branch_name", label: "Branch Name", required: false },
]

const AUTO_MATCH: Record<string, string> = {
  member_id: "member_id", memberid: "member_id", "member id": "member_id",
  "member number": "member_id", memberno: "member_id",
  full_name: "full_name", fullname: "full_name", name: "full_name",
  "member name": "full_name", "full name": "full_name",
  age: "age", dob: "age",
  gender: "gender", sex: "gender",
  address: "address", addr: "address",
  mobile_number: "mobile_number", mobile: "mobile_number", phone: "mobile_number",
  "mobile number": "mobile_number", "phone number": "mobile_number",
  branch_name: "branch_name", branch: "branch_name", "branch name": "branch_name",
}

interface ImportBatch {
  id: string; filename: string; total_rows: number; successful_rows: number
  failed_rows: number; skipped_rows: number; status: string; created_at: string
  profiles: { full_name: string; login_id: string } | null
}

export function MemberImporter({ userId, batches: initialBatches }: { userId: string; batches: ImportBatch[] }) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "result">("upload")
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [mappedRows, setMappedRows] = useState<Record<string, unknown>[]>([])
  const [mode, setMode] = useState<"insert" | "upsert">("insert")
  const [filename, setFilename] = useState("")
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<null | { total: number; inserted: number; updated: number; skipped: number; failed: number; errors: Array<{ row: number; member_id?: string; error: string }> }>(null)
  const [batches, setBatches] = useState(initialBatches)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFilename(file.name)

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })

      if (!rows.length) { toast.error("File appears empty"); return }

      const cols = Object.keys(rows[0])
      setRawRows(rows)
      setColumns(cols)

      // Auto-match columns
      const autoMapping: Record<string, string> = {}
      cols.forEach((col) => {
        const normalized = col.toLowerCase().trim()
        if (AUTO_MATCH[normalized]) autoMapping[col] = AUTO_MATCH[normalized]
      })
      setMapping(autoMapping)
      setStep("map")
    } catch {
      toast.error("Failed to read file. Please check the format.")
    }
    e.target.value = ""
  }, [])

  function buildMappedRows() {
    return rawRows.map((row) => {
      const mapped: Record<string, unknown> = {}
      Object.entries(mapping).forEach(([src, dst]) => {
        if (dst && dst !== "__skip__") mapped[dst] = row[src]
      })
      return mapped
    })
  }

  function handleConfirmMapping() {
    const hasMemberId = Object.values(mapping).includes("member_id")
    const hasFullName = Object.values(mapping).includes("full_name")
    if (!hasMemberId || !hasFullName) {
      toast.error("Member ID and Full Name must be mapped")
      return
    }
    setMappedRows(buildMappedRows())
    setStep("preview")
  }

  async function handleImport() {
    setImporting(true)
    try {
      const res = await importMembers(mappedRows, mode, userId, filename)
      if ("error" in res) { toast.error(res.error); setImporting(false); return }
      setResult(res)
      setStep("result")
      toast.success(`Import complete: ${res.inserted} inserted, ${res.updated} updated`)
    } catch {
      toast.error("Import failed unexpectedly")
    }
    setImporting(false)
  }

  function reset() {
    setStep("upload")
    setRawRows([])
    setColumns([])
    setMapping({})
    setMappedRows([])
    setFilename("")
    setResult(null)
  }

  const matchedMappings = Object.values(mapping).filter((v) => v && v !== "__skip__").length
  const requiredMapped = ["member_id", "full_name"].filter((f) => Object.values(mapping).includes(f)).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Members</h1>
        <p className="text-muted-foreground text-sm">Upload CSV or Excel files to import member data</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload", "Map Columns", "Preview", "Result"].map((s, i) => {
          const steps = ["upload", "map", "preview", "result"]
          const active = steps.indexOf(step) >= i
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={active ? "font-medium" : "text-muted-foreground"}>{s}</span>
              {i < 3 && <div className="w-8 h-px bg-border" />}
            </div>
          )
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Supported formats: CSV, Excel (.xlsx, .xls)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center gap-4 p-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">CSV, XLS, XLSX up to 10MB</p>
              </div>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
            </label>
            <div className="flex items-center gap-4">
              <Select value={mode} onValueChange={(v) => setMode(v as "insert" | "upsert")}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="insert">Insert Only (skip duplicates)</SelectItem>
                  <SelectItem value="upsert">Upsert (insert + update)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {mode === "insert" ? "Skips existing member IDs without modifying them." : "Updates existing members with new data."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Map */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              {rawRows.length} rows found in &quot;{filename}&quot;. Map your source columns to destination fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
              <span>SOURCE COLUMN</span>
              <span>SAMPLE VALUE</span>
              <span>MAPS TO</span>
            </div>
            {columns.map((col) => {
              const sample = rawRows[0]?.[col]
              const isMatched = mapping[col] && mapping[col] !== "__skip__"
              return (
                <div key={col} className="grid grid-cols-3 gap-2 items-center py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {isMatched
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground shrink-0" />}
                    <span className="font-mono text-sm font-medium">{col}</span>
                  </div>
                  <span className="text-sm text-muted-foreground truncate">{String(sample ?? "—")}</span>
                  <Select
                    value={mapping[col] || "__skip__"}
                    onValueChange={(v) => setMapping((p) => ({ ...p, [col]: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Skip —</SelectItem>
                      {DEST_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}{f.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {matchedMappings} columns mapped · {requiredMapped}/2 required fields covered
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Back</Button>
                <Button onClick={handleConfirmMapping} disabled={requiredMapped < 2}>
                  Preview Import →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Import</CardTitle>
            <CardDescription>Review before confirming. First 10 rows shown.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="text-2xl font-bold text-blue-700">{mappedRows.length}</div>
                <div className="text-xs text-blue-600">Total Rows</div>
              </div>
              <div className="p-3 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-700">{mode === "insert" ? "New" : "Upsert"}</div>
                <div className="text-xs text-green-600">Mode</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-md">
                <div className="text-2xl font-bold text-purple-700">{matchedMappings}</div>
                <div className="text-xs text-purple-600">Fields Mapped</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-md">
                <div className="text-2xl font-bold text-amber-700">{filename}</div>
                <div className="text-xs text-amber-600 truncate">Source File</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    {Object.keys(mappedRows[0] || {}).map((k) => (
                      <th key={k} className="text-left p-2 font-semibold text-muted-foreground">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="p-2 text-muted-foreground">{String(v ?? "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappedRows.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">… and {mappedRows.length - 10} more rows</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("map")}>Back to Mapping</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing {mappedRows.length} rows...
                  </span>
                ) : `Confirm Import (${mappedRows.length} rows)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === "result" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="text-2xl font-bold text-blue-700">{result.total}</div>
                <div className="text-xs text-blue-600">Total</div>
              </div>
              <div className="p-3 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-700">{result.inserted}</div>
                <div className="text-xs text-green-600">Inserted</div>
              </div>
              <div className="p-3 bg-indigo-50 rounded-md">
                <div className="text-2xl font-bold text-indigo-700">{result.updated}</div>
                <div className="text-xs text-indigo-600">Updated</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-md">
                <div className="text-2xl font-bold text-amber-700">{result.skipped}</div>
                <div className="text-xs text-amber-600">Skipped</div>
              </div>
              <div className="p-3 bg-red-50 rounded-md">
                <div className="text-2xl font-bold text-red-700">{result.failed}</div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> {result.errors.length} errors
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCSV(
                      result.errors.map((e) => ({ row: e.row, member_id: e.member_id ?? "", error: e.error })),
                      "import_errors.csv"
                    )}
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download Errors
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-3 p-2.5 border-b last:border-0 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Row {e.row}</span>
                      <span className="font-mono text-xs">{e.member_id}</span>
                      <span className="text-destructive">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={reset} variant="outline">Import Another File</Button>
          </CardContent>
        </Card>
      )}

      {/* Import history */}
      {batches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Recent Imports
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 text-muted-foreground font-semibold">File</th>
                  <th className="text-left p-3 text-muted-foreground font-semibold">By</th>
                  <th className="text-right p-3 text-muted-foreground font-semibold">Total</th>
                  <th className="text-right p-3 text-muted-foreground font-semibold">OK</th>
                  <th className="text-right p-3 text-muted-foreground font-semibold">Failed</th>
                  <th className="text-left p-3 text-muted-foreground font-semibold">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium truncate max-w-[180px]">{b.filename}</td>
                    <td className="p-3 text-muted-foreground">{b.profiles?.login_id ?? "—"}</td>
                    <td className="p-3 text-right">{b.total_rows}</td>
                    <td className="p-3 text-right text-green-700">{b.successful_rows}</td>
                    <td className="p-3 text-right text-red-700">{b.failed_rows}</td>
                    <td className="p-3">
                      <Badge variant={b.status === "completed" ? "success" : b.status === "failed" ? "destructive" : "warning"}>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDateTime(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
