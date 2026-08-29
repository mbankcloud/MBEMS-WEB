// @ts-nocheck
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

function downloadCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const csv = [headers.join(","), ...data.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function DirectorReports({ agents, counseling, polling, members }) {
  const visited = counseling.filter(c => c.status === "VISITED").length
  const voted = polling.filter(p => p.polling_status === "VOTED").length
  const ourPanel = polling.filter(p => p.voted_for === "OUR_PANEL").length

  const agentStats = agents.map(a => {
    const c = counseling.filter(cv => cv.agents?.agent_code === a.agent_code)
    const p = polling.filter(pv => pv.agents?.agent_code === a.agent_code)
    return {
      agent_code: a.agent_code,
      full_name: a.profiles?.full_name ?? "",
      members_assigned: (a.agent_member_assignments as any)?.[0]?.count ?? 0,
      counseling_done: c.filter(cv => cv.status === "VISITED").length,
      not_contacted: c.filter(cv => cv.status === "NOT_CONTACTED").length,
      voted: p.filter(pv => pv.polling_status === "VOTED").length,
      our_panel: p.filter(pv => pv.voted_for === "OUR_PANEL").length,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">Your agents&apos; field data</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{members.length.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Members</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{visited}</div>
          <div className="text-xs text-muted-foreground">Counseled</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{voted}</div>
          <div className="text-xs text-muted-foreground">Voted</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{ourPanel}</div>
          <div className="text-xs text-muted-foreground">Our Panel</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="font-semibold">Members Report</div><div className="text-xs text-muted-foreground">{members.length} records</div></div>
            <Button size="sm" variant="outline" onClick={() => downloadCSV(members.map(m => ({ member_id: m.members?.member_id, full_name: m.members?.full_name, branch: m.members?.branch_name, agent: m.agents?.agent_code })), "director_members.csv")}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="font-semibold">Counseling Report</div><div className="text-xs text-muted-foreground">{counseling.length} records</div></div>
            <Button size="sm" variant="outline" onClick={() => downloadCSV(counseling.map(c => ({ member_id: c.members?.member_id, full_name: c.members?.full_name, agent: c.agents?.agent_code, status: c.status })), "director_counseling.csv")}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div><div className="font-semibold">Polling Report</div><div className="text-xs text-muted-foreground">{polling.length} records</div></div>
            <Button size="sm" variant="outline" onClick={() => downloadCSV(polling.map(p => ({ member_id: p.members?.member_id, full_name: p.members?.full_name, agent: p.agents?.agent_code, status: p.polling_status, voted_for: p.voted_for })), "director_polling.csv")}><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Agent Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3 text-muted-foreground">Agent</th>
              <th className="text-right p-3 text-muted-foreground">Members</th>
              <th className="text-right p-3 text-muted-foreground">Counseled</th>
              <th className="text-right p-3 text-muted-foreground">Voted</th>
              <th className="text-right p-3 text-muted-foreground">Our Panel</th>
            </tr></thead>
            <tbody>
              {agentStats.map(a => (
                <tr key={a.agent_code} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3"><div className="font-mono font-semibold text-xs">{a.agent_code}</div><div className="text-xs text-muted-foreground">{a.full_name}</div></td>
                  <td className="p-3 text-right tabular-nums">{a.members_assigned}</td>
                  <td className="p-3 text-right tabular-nums text-green-700">{a.counseling_done}</td>
                  <td className="p-3 text-right tabular-nums text-blue-700">{a.voted}</td>
                  <td className="p-3 text-right tabular-nums text-emerald-700">{a.our_panel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
