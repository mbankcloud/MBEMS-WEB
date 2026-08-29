// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Download, Target, Users, TrendingUp, BarChart3, Pencil, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

const CLASS_CONFIG = {
  A: { label: "A — Confirmed", color: "bg-green-500", light: "bg-green-50 text-green-700 border-green-200", desc: "100% will vote for our panel" },
  B: { label: "B — Leaning", color: "bg-blue-500", light: "bg-blue-50 text-blue-700 border-blue-200", desc: "70% likely — needs follow-up" },
  C: { label: "C — Undecided", color: "bg-amber-500", light: "bg-amber-50 text-amber-700 border-amber-200", desc: "Could go either way — main target" },
  D: { label: "D — Opposition", color: "bg-red-500", light: "bg-red-50 text-red-700 border-red-200", desc: "Will vote against — don't waste time" },
  E: { label: "E — Unknown", color: "bg-gray-400", light: "bg-gray-50 text-gray-600 border-gray-200", desc: "Not contacted / unreachable" },
}

const BRANCH_CATEGORIES = {
  A: { label: "A — Stronghold", color: "text-green-700 bg-green-50", desc: "Maximise turnout" },
  B: { label: "B — Competitive", color: "text-blue-700 bg-blue-50", desc: "Main battlefield" },
  C: { label: "C — Opposition", color: "text-red-700 bg-red-50", desc: "Target persuadable only" },
  D: { label: "D — Low Turnout", color: "text-gray-600 bg-gray-50", desc: "Selective mobilisation" },
}

function downloadCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const csv = [headers.join(","), ...data.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

export function ElectionIntelligence({ branches, classifications, agents, dailyReports, totalMembers }) {
  const router = useRouter()
  const [editBranch, setEditBranch] = useState(null)
  const [branchForm, setBranchForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Compute classification summary
  const classCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  classifications.forEach(c => { if (classCounts[c.classification] !== undefined) classCounts[c.classification]++ })
  const totalClassified = Object.values(classCounts).reduce((a, b) => a + b, 0)

  // Branch-wise breakdown
  const branchStats = branches.map(branch => {
    const branchClassifications = classifications.filter(c =>
      c.members?.branch_name === branch.branch_name || c.members?.branch_id === branch.id
    )
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    branchClassifications.forEach(c => { if (counts[c.classification] !== undefined) counts[c.classification]++ })
    const total = branchClassifications.length
    const progress = branch.target_votes ? Math.round((counts.A / branch.target_votes) * 100) : 0
    return { ...branch, counts, total, progress }
  })

  // Agent performance
  const agentStats = agents.map(a => {
    const agentClass = classifications.filter(c => c.agent_id === a.id)
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    agentClass.forEach(c => { if (counts[c.classification] !== undefined) counts[c.classification]++ })
    return { ...a, counts, total: agentClass.length }
  }).sort((a, b) => b.counts.A - a.counts.A)

  async function saveBranch() {
    if (!editBranch) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("branches").update({
      total_shareholders: parseInt(branchForm.total_shareholders) || 0,
      target_votes: parseInt(branchForm.target_votes) || 0,
      category: branchForm.category || "B",
      notes: branchForm.notes || null,
    }).eq("id", editBranch.id)
    setSaving(false)
    toast.success("Branch targets updated")
    setEditBranch(null)
    router.refresh()
  }

  function exportReport() {
    const rows = branchStats.map(b => ({
      branch: b.branch_name,
      category: b.category || "B",
      total_shareholders: b.total_shareholders || 0,
      target_votes: b.target_votes || 0,
      classified: b.total,
      A_confirmed: b.counts.A,
      B_leaning: b.counts.B,
      C_undecided: b.counts.C,
      D_opposition: b.counts.D,
      E_unknown: b.counts.E,
      progress_pct: b.progress,
    }))
    downloadCSV(rows, `election_intelligence_${new Date().toISOString().split("T")[0]}.csv`)
  }

  const totalTarget = branches.reduce((s, b) => s + (b.target_votes || 0), 0)
  const confirmedA = classCounts.A
  const totalContacted = totalClassified

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />Election Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">A/B/C/D/E voter classification · Branch war room · GOTV tracker</p>
        </div>
        <Button variant="outline" onClick={exportReport}><Download className="h-4 w-4 mr-2" />Export Report</Button>
      </div>

      {/* War Room Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(CLASS_CONFIG).map(([key, cfg]) => (
          <Card key={key} className="border-2" style={{ borderColor: key === "A" ? "#16a34a" : key === "B" ? "#2563eb" : key === "C" ? "#d97706" : key === "D" ? "#dc2626" : "#9ca3af" }}>
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${key === "A" ? "text-green-700" : key === "B" ? "text-blue-700" : key === "C" ? "text-amber-700" : key === "D" ? "text-red-700" : "text-gray-600"}`}>
                {classCounts[key].toLocaleString()}
              </div>
              <div className="text-xs font-semibold mt-0.5">{key} — {key === "A" ? "Confirmed" : key === "B" ? "Leaning" : key === "C" ? "Undecided" : key === "D" ? "Opposition" : "Unknown"}</div>
              <div className="text-xs text-muted-foreground mt-0.5 hidden md:block">{cfg.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress to target */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="font-semibold">Campaign Progress</div>
              <div className="text-xs text-muted-foreground">Target: {totalTarget.toLocaleString()} confirmed A supporters</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-700">{confirmedA.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">of {totalTarget.toLocaleString()} target</div>
            </div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${totalTarget ? Math.min((confirmedA / totalTarget) * 100, 100) : 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Contacted: {totalContacted.toLocaleString()} / {totalMembers.toLocaleString()}</span>
            <span>{totalTarget ? Math.round((confirmedA / totalTarget) * 100) : 0}% of target achieved</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="branches">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="branches">Branches ({branches.length})</TabsTrigger>
          <TabsTrigger value="agents">Agents ({agents.length})</TabsTrigger>
          <TabsTrigger value="reports">Daily Reports</TabsTrigger>
        </TabsList>

        {/* BRANCH WAR ROOM */}
        <TabsContent value="branches" className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Click edit icon to set target votes and branch category for each branch</span>
          </div>
          {branchStats.map(branch => (
            <Card key={branch.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold">{branch.branch_name}</span>
                      {branch.category && (
                        <Badge className={`text-xs ${BRANCH_CATEGORIES[branch.category]?.color}`}>
                          {BRANCH_CATEGORIES[branch.category]?.label}
                        </Badge>
                      )}
                      {branch.total_shareholders > 0 && (
                        <span className="text-xs text-muted-foreground">{branch.total_shareholders.toLocaleString()} shareholders</span>
                      )}
                    </div>
                    {/* Classification bar */}
                    {branch.total > 0 && (
                      <div className="flex h-2.5 rounded-full overflow-hidden mb-2 gap-0.5">
                        {["A","B","C","D","E"].map(k => (
                          <div key={k} className={CLASS_CONFIG[k].color}
                            style={{ width: `${branch.total ? (branch.counts[k] / branch.total) * 100 : 0}%` }} />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 flex-wrap text-xs">
                      {["A","B","C","D","E"].map(k => (
                        <span key={k} className={`px-1.5 py-0.5 rounded border ${CLASS_CONFIG[k].light}`}>
                          {k}: {branch.counts[k]}
                        </span>
                      ))}
                    </div>
                    {branch.target_votes > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>A supporters vs target ({branch.target_votes})</span>
                          <span>{branch.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.min(branch.progress, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setEditBranch(branch); setBranchForm({ total_shareholders: branch.total_shareholders || "", target_votes: branch.target_votes || "", category: branch.category || "B", notes: branch.notes || "" }) }}
                    className="p-1.5 hover:bg-muted rounded shrink-0">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* AGENT PERFORMANCE */}
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
                    <th className="text-right p-3 text-muted-foreground font-semibold">Total</th>
                  </tr></thead>
                  <tbody>
                    {agentStats.map(a => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-mono font-semibold text-xs">{a.agent_code}</div>
                          <div className="text-xs text-muted-foreground">{a.profiles?.full_name}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-green-700 tabular-nums">{a.counts.A}</td>
                        <td className="p-3 text-right text-blue-700 tabular-nums">{a.counts.B}</td>
                        <td className="p-3 text-right text-amber-700 tabular-nums">{a.counts.C}</td>
                        <td className="p-3 text-right text-red-700 tabular-nums">{a.counts.D}</td>
                        <td className="p-3 text-right text-gray-600 tabular-nums">{a.counts.E}</td>
                        <td className="p-3 text-right font-semibold tabular-nums">{a.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td className="p-3 font-bold text-sm">TOTAL</td>
                      <td className="p-3 text-right font-bold text-green-700 tabular-nums">{classCounts.A}</td>
                      <td className="p-3 text-right font-bold text-blue-700 tabular-nums">{classCounts.B}</td>
                      <td className="p-3 text-right font-bold text-amber-700 tabular-nums">{classCounts.C}</td>
                      <td className="p-3 text-right font-bold text-red-700 tabular-nums">{classCounts.D}</td>
                      <td className="p-3 text-right font-bold text-gray-600 tabular-nums">{classCounts.E}</td>
                      <td className="p-3 text-right font-bold tabular-nums">{totalClassified}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DAILY REPORTS */}
        <TabsContent value="reports" className="mt-4">
          {!dailyReports.length ? (
            <Card><CardContent className="flex flex-col items-center py-16">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No daily reports submitted yet</p>
              <p className="text-xs text-muted-foreground mt-1">Agents submit reports from their app each evening</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-muted-foreground font-semibold">Date</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold">Agent</th>
                      <th className="text-right p-3 text-muted-foreground font-semibold">Contacted</th>
                      <th className="text-right p-3 font-semibold text-green-700">A</th>
                      <th className="text-right p-3 font-semibold text-blue-700">B</th>
                      <th className="text-right p-3 font-semibold text-amber-700">C</th>
                      <th className="text-right p-3 font-semibold text-red-700">D</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold hidden md:table-cell">Notes</th>
                    </tr></thead>
                    <tbody>
                      {dailyReports.map(r => (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs font-semibold">{r.report_date}</td>
                          <td className="p-3">
                            <div className="font-mono text-xs font-semibold">{r.agents?.agent_code}</div>
                            <div className="text-xs text-muted-foreground">{r.agents?.profiles?.full_name}</div>
                          </td>
                          <td className="p-3 text-right tabular-nums font-semibold">{r.total_contacted}</td>
                          <td className="p-3 text-right font-bold text-green-700 tabular-nums">{r.count_a}</td>
                          <td className="p-3 text-right text-blue-700 tabular-nums">{r.count_b}</td>
                          <td className="p-3 text-right text-amber-700 tabular-nums">{r.count_c}</td>
                          <td className="p-3 text-right text-red-700 tabular-nums">{r.count_d}</td>
                          <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Branch Dialog */}
      <Dialog open={!!editBranch} onOpenChange={o => !o && setEditBranch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Branch Targets — {editBranch?.branch_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Branch Category</Label>
              <Select value={branchForm.category || "B"} onValueChange={v => setBranchForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BRANCH_CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} — {v.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Total Shareholders</Label>
                <Input type="number" value={branchForm.total_shareholders || ""} onChange={e => setBranchForm(p => ({ ...p, total_shareholders: e.target.value }))} placeholder="e.g. 1400" />
              </div>
              <div className="space-y-1.5">
                <Label>Target Votes (A supporters)</Label>
                <Input type="number" value={branchForm.target_votes || ""} onChange={e => setBranchForm(p => ({ ...p, target_votes: e.target.value }))} placeholder="e.g. 450" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={branchForm.notes || ""} onChange={e => setBranchForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Key influencer: Rauf Sheikh" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBranch(null)}>Cancel</Button>
            <Button onClick={saveBranch} disabled={saving}>{saving ? "Saving..." : "Save Targets"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
