// @ts-nocheck
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollText, Search, Eye, Download } from "lucide-react"

const ACTION_COLORS = {
  CREATE: "bg-green-100 text-green-800 border-green-200",
  UPDATE: "bg-blue-100 text-blue-800 border-blue-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
}

const TABLE_LABELS = {
  members: "Members",
  agents: "Agents",
  directors: "Directors",
  profiles: "Profiles/Users",
  agent_member_assignments: "Assignments",
  counseling_visits: "Counseling",
  polling_records: "Polling",
  voter_classifications: "Voter Classification",
  panel_candidates: "Candidates",
  permissions: "Permissions",
  system_settings: "Settings",
}

function formatVal(val) {
  if (!val) return "—"
  if (typeof val === "object") {
    // Show key fields only
    const keys = ["full_name","name","member_id","login_id","agent_code","director_code","status","role","classification","polling_status","voted_for"]
    const relevant = Object.entries(val).filter(([k]) => keys.includes(k))
    if (relevant.length > 0) return relevant.map(([k,v]) => `${k}: ${v}`).join(" · ")
    return JSON.stringify(val).slice(0, 100) + "..."
  }
  return String(val)
}

export function AuditLogsView({ logs }) {
  const [search, setSearch] = useState("")
  const [filterAction, setFilterAction] = useState("ALL")
  const [filterTable, setFilterTable] = useState("ALL")
  const [detailLog, setDetailLog] = useState(null)

  const tables = [...new Set(logs.map(l => l.entity_type).filter(Boolean))]

  const filtered = logs.filter(log => {
    const matchAction = filterAction === "ALL" || log.action === filterAction
    const matchTable = filterTable === "ALL" || log.entity_type === filterTable
    const matchSearch = !search ||
      log.user_login_id?.toLowerCase().includes(search.toLowerCase()) ||
      log.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase())
    return matchAction && matchTable && matchSearch
  })

  const counts = { CREATE: 0, UPDATE: 0, DELETE: 0 }
  logs.forEach(l => { if (counts[l.action] !== undefined) counts[l.action]++ })

  function downloadCSV() {
    const rows = filtered.map(l => ({
      time: new Date(l.created_at).toLocaleString("en-IN"),
      user_login_id: l.user_login_id || l.profile?.login_id || "System",
      user_name: l.profile?.full_name || "—",
      role: l.profile?.role || "—",
      action: l.action,
      table: l.entity_type || "—",
      record_id: l.entity_id || "—",
      old_value: l.old_data ? formatVal(l.old_data) : "—",
      new_value: l.new_data ? formatVal(l.new_data) : "—",
    }))
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g,'""')}"`).join(","))].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground text-sm">{logs.length.toLocaleString()} total entries — root admin only</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
          <div className="text-xl font-bold text-green-700">{counts.CREATE.toLocaleString()}</div>
          <div className="text-xs text-green-600 font-semibold">CREATE operations</div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
          <div className="text-xl font-bold text-blue-700">{counts.UPDATE.toLocaleString()}</div>
          <div className="text-xs text-blue-600 font-semibold">UPDATE operations</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center border border-red-100">
          <div className="text-xl font-bold text-red-700">{counts.DELETE.toLocaleString()}</div>
          <div className="text-xs text-red-600 font-semibold">DELETE operations</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search user, table, action..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            <SelectItem value="CREATE">CREATE</SelectItem>
            <SelectItem value="UPDATE">UPDATE</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tables</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{TABLE_LABELS[t] || t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} entries shown</p>

      <Card>
        <CardContent className="p-0">
          {!filtered.length ? (
            <div className="flex flex-col items-center py-16">
              <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
              <p className="text-xs text-muted-foreground mt-1">Logs are created automatically when data is changed. Run Migration 010 to enable audit triggers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 text-muted-foreground font-semibold">Time</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">User</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Action</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Table</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">What Changed</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-semibold text-xs">{log.user_login_id || log.profile?.login_id || "System"}</div>
                        {log.profile?.full_name && <div className="text-xs text-muted-foreground">{log.profile.full_name}</div>}
                        {log.profile?.role && <div className="text-xs text-muted-foreground/60">{log.profile.role}</div>}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{TABLE_LABELS[log.entity_type] || log.entity_type || "—"}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs">
                        {log.action === "CREATE" && log.new_data && <span className="text-green-700">{formatVal(log.new_data)}</span>}
                        {log.action === "DELETE" && log.old_data && <span className="text-red-700">{formatVal(log.old_data)}</span>}
                        {log.action === "UPDATE" && (
                          <span>
                            <span className="text-red-600 line-through mr-1">{formatVal(log.old_data)}</span>
                            <span className="text-green-700">→ {formatVal(log.new_data)}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button onClick={() => setDetailLog(log)} className="p-1 hover:bg-muted rounded">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={o => !o && setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Audit Log Detail</DialogTitle></DialogHeader>
          {detailLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-xs text-muted-foreground">Action</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ACTION_COLORS[detailLog.action]}`}>{detailLog.action}</span>
                </div>
                <div><div className="text-xs text-muted-foreground">Table</div><div className="font-semibold">{TABLE_LABELS[detailLog.entity_type] || detailLog.entity_type}</div></div>
                <div><div className="text-xs text-muted-foreground">By User</div><div className="font-mono font-semibold">{detailLog.user_login_id || detailLog.profile?.login_id || "System"}</div></div>
                <div><div className="text-xs text-muted-foreground">Name</div><div>{detailLog.profile?.full_name || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Role</div><div>{detailLog.profile?.role || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Time</div><div>{new Date(detailLog.created_at).toLocaleString("en-IN")}</div></div>
              </div>
              {detailLog.old_data && (
                <div>
                  <div className="text-xs font-semibold text-red-700 mb-1">BEFORE</div>
                  <pre className="text-xs bg-red-50 border border-red-100 rounded p-3 overflow-auto max-h-48">
                    {JSON.stringify(detailLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.new_data && (
                <div>
                  <div className="text-xs font-semibold text-green-700 mb-1">AFTER</div>
                  <pre className="text-xs bg-green-50 border border-green-100 rounded p-3 overflow-auto max-h-48">
                    {JSON.stringify(detailLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
