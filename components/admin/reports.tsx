// @ts-nocheck
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Users, UserCog, UserCheck, HandshakeIcon, Vote, BarChart3 } from "lucide-react"

function downloadCSV(data: any[], filename: string) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h] ?? ""
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(","))
  ].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage({ members, totalMembers, agents, directors, counseling, polling, assignments }) {
  // Summary stats
  const visited = counseling.filter(c => c.status === "VISITED").length
  const voted = polling.filter(p => p.polling_status === "VOTED").length
  const ourPanel = polling.filter(p => p.voted_for === "OUR_PANEL").length
  const opposition = polling.filter(p => p.voted_for === "OPPOSITION").length

  // Counseling by agent
  const agentCounseling = {}
  counseling.forEach(c => {
    const code = c.agents?.agent_code || "Unknown"
    if (!agentCounseling[code]) agentCounseling[code] = { total: 0, visited: 0 }
    agentCounseling[code].total++
    if (c.status === "VISITED") agentCounseling[code].visited++
  })

  // Polling by agent
  const agentPolling = {}
  polling.forEach(p => {
    const code = p.agents?.agent_code || "Unknown"
    if (!agentPolling[code]) agentPolling[code] = { voted: 0, ourPanel: 0 }
    if (p.polling_status === "VOTED") agentPolling[code].voted++
    if (p.voted_for === "OUR_PANEL") agentPolling[code].ourPanel++
  })

  function downloadMembers() {
    downloadCSV(members.map(m => ({
      member_id: m.member_id,
      full_name: m.full_name,
      age: m.age ?? "",
      gender: m.gender ?? "",
      mobile_number: m.mobile_number ?? "",
      branch_name: m.branch_name ?? "",
    })), `members_${new Date().toISOString().split("T")[0]}.csv`)
  }

  function downloadCounseling() {
    downloadCSV(counseling.map(c => ({
      member_id: c.members?.member_id ?? "",
      full_name: c.members?.full_name ?? "",
      agent_code: c.agents?.agent_code ?? "",
      status: c.status ?? "",
    })), `counseling_report_${new Date().toISOString().split("T")[0]}.csv`)
  }

  function downloadPolling() {
    downloadCSV(polling.map(p => ({
      member_id: p.members?.member_id ?? "",
      full_name: p.members?.full_name ?? "",
      agent_code: p.agents?.agent_code ?? "",
      polling_status: p.polling_status ?? "",
      voted_for: p.voted_for ?? "",
    })), `polling_report_${new Date().toISOString().split("T")[0]}.csv`)
  }

  function downloadAssignments() {
    downloadCSV(assignments.map(a => ({
      member_id: a.members?.member_id ?? "",
      full_name: a.members?.full_name ?? "",
      branch_name: a.members?.branch_name ?? "",
      agent_code: a.agents?.agent_code ?? "",
      director_code: a.agents?.directors?.director_code ?? "",
    })), `assignments_${new Date().toISOString().split("T")[0]}.csv`)
  }

  function downloadAgentReport() {
    const rows = agents.map(a => ({
      agent_code: a.agent_code,
      full_name: a.profiles?.full_name ?? "",
      director_code: a.directors?.director_code ?? "",
      members_assigned: (a.agent_member_assignments as any)?.[0]?.count ?? 0,
      counseling_done: agentCounseling[a.agent_code]?.visited ?? 0,
      polling_voted: agentPolling[a.agent_code]?.voted ?? 0,
      our_panel: agentPolling[a.agent_code]?.ourPanel ?? 0,
    }))
    downloadCSV(rows, `agent_performance_${new Date().toISOString().split("T")[0]}.csv`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Downloads</h1>
        <p className="text-muted-foreground text-sm">Export data as CSV for analysis</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-primary">{totalMembers.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Members</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{visited.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mt-1">Counseling Done</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{voted.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mt-1">Voted (Field)</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{ourPanel.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground mt-1">Our Panel</div>
        </CardContent></Card>
      </div>

      {/* Download cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <div className="font-semibold">All Members</div>
                <div className="text-xs text-muted-foreground">{totalMembers.toLocaleString()} records · member_id, name, mobile, branch</div>
              </div>
            </div>
            <Button onClick={downloadMembers} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
              <div>
                <div className="font-semibold">Assignments Report</div>
                <div className="text-xs text-muted-foreground">{assignments.length.toLocaleString()} active · member → agent → director</div>
              </div>
            </div>
            <Button onClick={downloadAssignments} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><HandshakeIcon className="h-5 w-5 text-green-600" /></div>
              <div>
                <div className="font-semibold">Counseling Report</div>
                <div className="text-xs text-muted-foreground">{counseling.length.toLocaleString()} records · {visited} visited</div>
              </div>
            </div>
            <Button onClick={downloadCounseling} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center"><Vote className="h-5 w-5 text-amber-600" /></div>
              <div>
                <div className="font-semibold">Polling Day Report</div>
                <div className="text-xs text-muted-foreground">{polling.length.toLocaleString()} records · {voted} voted · {ourPanel} our panel</div>
              </div>
            </div>
            <Button onClick={downloadPolling} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow md:col-span-2">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><UserCog className="h-5 w-5 text-orange-600" /></div>
              <div>
                <div className="font-semibold">Agent Performance Report</div>
                <div className="text-xs text-muted-foreground">{agents.length} agents · members assigned, counseling done, votes tracked</div>
              </div>
            </div>
            <Button onClick={downloadAgentReport} size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />CSV</Button>
          </CardContent>
        </Card>
      </div>

      {/* Agent performance table */}
      {Object.keys(agentCounseling).length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Agent Performance Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 text-muted-foreground">Agent</th>
                  <th className="text-right p-3 text-muted-foreground">Members</th>
                  <th className="text-right p-3 text-muted-foreground">Counseled</th>
                  <th className="text-right p-3 text-muted-foreground">Voted</th>
                  <th className="text-right p-3 text-muted-foreground">Our Panel</th>
                  <th className="text-right p-3 text-muted-foreground">Coverage</th>
                </tr></thead>
                <tbody>
                  {agents.map(a => {
                    const assigned = (a.agent_member_assignments as any)?.[0]?.count ?? 0
                    const counseled = agentCounseling[a.agent_code]?.visited ?? 0
                    const voted_count = agentPolling[a.agent_code]?.voted ?? 0
                    const our = agentPolling[a.agent_code]?.ourPanel ?? 0
                    const pct = assigned ? Math.round((counseled / assigned) * 100) : 0
                    return (
                      <tr key={a.agent_code} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-mono font-semibold text-xs">{a.agent_code}</div>
                          <div className="text-xs text-muted-foreground">{a.profiles?.full_name}</div>
                        </td>
                        <td className="p-3 text-right tabular-nums">{assigned}</td>
                        <td className="p-3 text-right tabular-nums text-green-700">{counseled}</td>
                        <td className="p-3 text-right tabular-nums text-blue-700">{voted_count}</td>
                        <td className="p-3 text-right tabular-nums text-emerald-700">{our}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
