// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"

export default async function AuditPage({ searchParams }) {
  const sp = await searchParams
  const db = await createServiceClient()
  const page = parseInt(sp?.page || "1")
  const pageSize = 50
  const from = (page - 1) * pageSize

  const { data: logs, count } = await db
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  const actionColors = {
    LOGIN: "info", CREATE: "success", UPDATE: "warning",
    DELETE: "destructive", IMPORT: "info", ASSIGN: "success",
    DISABLE_USER: "destructive", ENABLE_USER: "success",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm">{(count ?? 0).toLocaleString()} total events — immutable record</p>
      </div>
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
        Audit logs are immutable. Database triggers prevent any UPDATE or DELETE operations.
      </div>
      <Card>
        <CardContent className="p-0">
          {!logs?.length ? (
            <div className="flex flex-col items-center py-16"><p className="text-muted-foreground">No audit events yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 text-muted-foreground font-semibold">Time</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">User</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Action</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Entity</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 text-xs">
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="p-3 font-mono font-semibold">{log.user_login_id ?? "System"}</td>
                      <td className="p-3"><Badge variant={actionColors[log.action] ?? "secondary"}>{log.action}</Badge></td>
                      <td className="p-3 text-muted-foreground">{log.entity_type}</td>
                      <td className="p-3 text-muted-foreground max-w-xs truncate">{log.new_data ? JSON.stringify(log.new_data).slice(0, 80) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
