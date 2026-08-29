// @ts-nocheck
"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Target, RefreshCw, Users, HandshakeIcon, Vote, User } from "lucide-react"

const CLASS_CONFIG = {
  A: { color: "bg-green-600", light: "bg-green-50 text-green-800", label: "Confirmed" },
  B: { color: "bg-blue-600", light: "bg-blue-50 text-blue-800", label: "Leaning" },
  C: { color: "bg-amber-500", light: "bg-amber-50 text-amber-800", label: "Undecided" },
  D: { color: "bg-red-600", light: "bg-red-50 text-red-800", label: "Opposition" },
  E: { color: "bg-gray-400", light: "bg-gray-50 text-gray-700", label: "Unknown" },
}

export function AdminWarRoom({ classifications, counseling, polling, candidates, candidateSupport, dailyReports, agents, branches }) {
  const router = useRouter()

  // A/B/C/D/E totals
  const classCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  classifications.forEach(c => { if (classCounts[c.classification] !== undefined) classCounts[c.classification]++ })

  // Counseling totals
  const counselingCounts = {}
  counseling.forEach(c => { counselingCounts[c.status] = (counselingCounts[c.status] || 0) + 1 })

  // Polling totals
  const voted = polling.filter(p => p.polling_status === "VOTED").length
  const notVoted = polling.filter(p => p.polling_status === "NOT_VOTED").length
  const ourPanel = polling.filter(p => p.voted_for === "OUR_PANEL").length
  const opposition = polling.filter(p => p.voted_for === "OPPOSITION").length

  // Candidate support counts
  const candSupportCount = {}
  candidateSupport.filter(s => s.support_level === "YES").forEach(s => {
    candSupportCount[s.candidate_id] = (candSupportCount[s.candidate_id] || 0) + 1
  })

  // Agent-wise classification
  const agentClassMap = {}
  agents.forEach(a => { agentClassMap[a.id] = { code: a.agent_code, name: a.profiles?.full_name, A: 0, B: 0, C: 0, D: 0, E: 0 } })
  classifications.forEach(c => {
    if (agentClassMap[c.agent_id]) {
      agentClassMap[c.agent_id][c.classification] = (agentClassMap[c.agent_id][c.classification] || 0) + 1
    }
  })
  const agentStats = Object.values(agentClassMap)
    .map(a => ({ ...a, total: a.A + a.B + a.C + a.D + a.E }))
    .sort((a, b) => b.A - a.A)

  // Agent counseling
  const agentCounseling = {}
  counseling.forEach(c => {
    if (!agentCounseling[c.agents?.agent_code]) agentCounseling[c.agents?.agent_code] = { visited: 0, total: 0 }
    agentCounseling[c.agents?.agent_code].total++
    if (c.status === "VISITED") agentCounseling[c.agents?.agent_code].visited++
  })

  const totalClassified = Object.values(classCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />Live War Room
          </h1>
          <p className="text-muted-foreground text-sm">Real-time election intelligence · All data from agents</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(CLASS_CONFIG).map(([k, cfg]) => (
          <Card key={k} className={`border-2 ${k==="A"?"border-green-400":k==="B"?"border-blue-400":k==="C"?"border-amber-400":k==="D"?"border-red-400":"border-gray-300"}`}>
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${k==="A"?"text-green-700":k==="B"?"text-blue-700":k==="C"?"text-amber-700":k==="D"?"text-red-700":"text-gray-600"}`}>
                {classCounts[k].toLocaleString()}
              </div>
              <div className="text-xs font-bold">{k}</div>
              <div className="text-xs text-muted-foreground">{cfg.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="reports">Today</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Classification breakdown */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" />Voter Classification ({totalClassified})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(CLASS_CONFIG).map(([k, cfg]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${cfg.light} w-20 text-center`}>{k} — {cfg.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${cfg.color} rounded-full`}
                        style={{ width: `${totalClassified ? (classCounts[k]/totalClassified)*100 : 0}%` }} />
                    </div>
                    <span className="text-sm font-bold tabular-nums w-12 text-right">{classCounts[k].toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Counseling breakdown */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><HandshakeIcon className="h-4 w-4" />Counseling ({counseling.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(counselingCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${counseling.length ? ((count as number)/counseling.length)*100 : 0}%` }} />
                      </div>
                      <span className="font-bold tabular-nums w-10 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Polling summary */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Vote className="h-4 w-4" />Polling Day ({polling.length} records)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-green-50 rounded-lg"><div className="text-xl font-bold text-green-700">{voted}</div><div className="text-xs text-green-600">Voted</div></div>
                  <div className="p-3 bg-red-50 rounded-lg"><div className="text-xl font-bold text-red-700">{notVoted}</div><div className="text-xs text-red-600">Not Voted</div></div>
                  <div className="p-3 bg-blue-50 rounded-lg"><div className="text-xl font-bold text-blue-700">{ourPanel}</div><div className="text-xs text-blue-600">Our Panel</div></div>
                  <div className="p-3 bg-orange-50 rounded-lg"><div className="text-xl font-bold text-orange-700">{opposition}</div><div className="text-xs text-orange-600">Opposition</div></div>
                </div>
              </CardContent>
            </Card>

            {/* Today's reports summary */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Today's Field Reports</CardTitle></CardHeader>
              <CardContent>
                {dailyReports.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No reports submitted yet today</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-1 text-center text-xs">
                      {["A","B","C","D","E"].map(k => (
                        <div key={k} className={`p-2 rounded ${CLASS_CONFIG[k].light}`}>
                          <div className="font-bold">{dailyReports.reduce((s,r) => s+(r[`count_${k.toLowerCase()}`]||0), 0)}</div>
                          <div>{k}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{dailyReports.length} of {agents.length} agents reported today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CANDIDATES TAB */}
        <TabsContent value="candidates" className="mt-4">
          {candidates.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No candidates added yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add candidates in Root Admin → Panel Candidates</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Member-wise candidate support as tracked by agents in the field</p>
              <div className="grid gap-2">
                {candidates.map(c => {
                  const count = candSupportCount[c.id] || 0
                  const maxCount = Math.max(...Object.values(candSupportCount), 1)
                  return (
                    <Card key={c.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 border">
                            {c.photo_url
                              ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                              : <User className="h-5 w-5 m-2.5 text-muted-foreground/40" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">#{c.candidate_number}</Badge>
                              <span className="font-semibold text-sm">{c.full_name}</span>
                              {c.symbol_name && <span className="text-xs text-muted-foreground">{c.symbol_name}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-600 rounded-full transition-all"
                                  style={{ width: `${(count/maxCount)*100}%` }} />
                              </div>
                              <span className="text-sm font-bold text-green-700 tabular-nums w-12 text-right">{count} support</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* AGENTS TAB */}
        <TabsContent value="agents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 text-muted-foreground font-semibold">Agent</th>
                    <th className="text-right p-3 font-semibold text-green-700">A</th>
                    <th className="text-right p-3 font-semibold text-blue-700">B</th>
                    <th className="text-right p-3 font-semibold text-amber-700">C</th>
                    <th className="text-right p-3 font-semibold text-red-700">D</th>
                    <th className="text-right p-3 font-semibold text-gray-600">E</th>
                    <th className="text-right p-3 text-muted-foreground font-semibold">Visited</th>
                  </tr></thead>
                  <tbody>
                    {agentStats.map((a: any) => (
                      <tr key={a.code} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-mono font-bold text-xs">{a.code}</div>
                          <div className="text-xs text-muted-foreground">{a.name}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-green-700 tabular-nums">{a.A}</td>
                        <td className="p-3 text-right text-blue-700 tabular-nums">{a.B}</td>
                        <td className="p-3 text-right text-amber-700 tabular-nums">{a.C}</td>
                        <td className="p-3 text-right text-red-700 tabular-nums">{a.D}</td>
                        <td className="p-3 text-right text-gray-600 tabular-nums">{a.E}</td>
                        <td className="p-3 text-right text-green-700 tabular-nums font-semibold">
                          {agentCounseling[a.code]?.visited ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-bold">
                      <td className="p-3 text-sm">TOTAL</td>
                      <td className="p-3 text-right text-green-700 tabular-nums">{classCounts.A}</td>
                      <td className="p-3 text-right text-blue-700 tabular-nums">{classCounts.B}</td>
                      <td className="p-3 text-right text-amber-700 tabular-nums">{classCounts.C}</td>
                      <td className="p-3 text-right text-red-700 tabular-nums">{classCounts.D}</td>
                      <td className="p-3 text-right text-gray-600 tabular-nums">{classCounts.E}</td>
                      <td className="p-3 text-right text-green-700 tabular-nums">{counselingCounts["VISITED"] ?? 0}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TODAY'S REPORTS TAB */}
        <TabsContent value="reports" className="mt-4">
          {dailyReports.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground">
              No reports submitted today yet
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="text-left p-3 text-muted-foreground">Agent</th>
                    <th className="text-right p-3 text-muted-foreground">Contacted</th>
                    <th className="text-right p-3 font-semibold text-green-700">A</th>
                    <th className="text-right p-3 font-semibold text-blue-700">B</th>
                    <th className="text-right p-3 font-semibold text-amber-700">C</th>
                    <th className="text-right p-3 font-semibold text-red-700">D</th>
                    <th className="text-left p-3 text-muted-foreground hidden md:table-cell">Notes</th>
                  </tr></thead>
                  <tbody>
                    {dailyReports.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-mono font-bold text-xs">{r.agents?.agent_code}</div>
                          <div className="text-xs text-muted-foreground">{r.agents?.profiles?.full_name}</div>
                        </td>
                        <td className="p-3 text-right font-bold tabular-nums">{r.total_contacted}</td>
                        <td className="p-3 text-right font-bold text-green-700 tabular-nums">{r.count_a}</td>
                        <td className="p-3 text-right text-blue-700 tabular-nums">{r.count_b}</td>
                        <td className="p-3 text-right text-amber-700 tabular-nums">{r.count_c}</td>
                        <td className="p-3 text-right text-red-700 tabular-nums">{r.count_d}</td>
                        <td className="p-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
