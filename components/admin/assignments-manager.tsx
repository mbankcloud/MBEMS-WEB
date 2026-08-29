// @ts-nocheck
"use client"

import { useState, useCallback } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Users, UserCheck, Upload, Trash2, AlertTriangle, X, CheckCircle2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { bulkAssignMembers, singleAssignMember, removeAssignment, removeAllAssignments } from "@/lib/actions/assignments"
import { createClient } from "@/lib/supabase/client"

export function AssignmentsManager({ directors, agents, recentAssignments, totalAssigned, totalMembers }) {
  const router = useRouter()

  // Single assign state
  const [memberSearch, setMemberSearch] = useState("")
  const [foundMembers, setFoundMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedDirector, setSelectedDirector] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [searching, setSearching] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Bulk CSV state
  const [csvFile, setCsvFile] = useState(null)
  const [csvMemberIds, setCsvMemberIds] = useState([])
  const [csvAgent, setCsvAgent] = useState("")
  const [csvDirector, setCsvDirector] = useState("")
  const [csvAssigning, setCsvAssigning] = useState(false)
  const [csvResult, setCsvResult] = useState(null)

  // Remove all state
  const [showRemoveAll, setShowRemoveAll] = useState(false)
  const [removing, setRemoving] = useState(false)

  const filteredAgents = selectedDirector ? agents.filter(a => a.director_id === selectedDirector) : agents
  const filteredAgentsCSV = csvDirector ? agents.filter(a => a.director_id === csvDirector) : agents

  async function searchMembers() {
    if (!memberSearch.trim()) return
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("members")
      .select("id, member_id, full_name, branch_name")
      .or(`member_id.ilike.%${memberSearch}%,full_name.ilike.%${memberSearch}%`)
      .eq("status", "active")
      .limit(10)
    setFoundMembers(data ?? [])
    setSearching(false)
  }

  async function handleSingleAssign() {
    if (!selectedMember || !selectedAgent) { toast.error("Select member and agent"); return }
    setAssigning(true)
    const result = await singleAssignMember(selectedMember.id, selectedAgent, selectedDirector || undefined)
    setAssigning(false)
    setShowConfirm(false)
    if (result.success) {
      toast.success(`${selectedMember.full_name} assigned successfully`)
      setSelectedMember(null); setMemberSearch(""); setFoundMembers([]); setSelectedAgent("")
      router.refresh()
    } else {
      toast.error("Assignment failed")
    }
  }

  function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    setCsvResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const buf = ev.target?.result
        const wb = XLSX.read(buf, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const ids = rows
          .map(r => String(r[0] || "").trim())
          .filter(v => v && !["member id", "memberid", "id", "member_id"].includes(v.toLowerCase()))
        setCsvMemberIds(ids)
        toast.success(`Found ${ids.length} member IDs`)
      } catch { toast.error("Failed to read file") }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ""
  }

  async function handleBulkAssign() {
    if (!csvAgent || csvMemberIds.length === 0) {
      toast.error("Upload CSV and select agent")
      return
    }
    setCsvAssigning(true)
    setCsvResult(null)
    toast.loading("Assigning members...", { id: "bulk-assign" })

    const result = await bulkAssignMembers(csvMemberIds, csvAgent, csvDirector || undefined)
    setCsvAssigning(false)
    toast.dismiss("bulk-assign")

    if (result.error) {
      toast.error(result.error)
      return
    }

    setCsvResult(result)
    toast.success(`Done: ${result.success} assigned, ${result.failed} failed`)
    router.refresh()
  }

  async function handleRemoveAssignment(id) {
    await removeAssignment(id)
    toast.success("Assignment removed")
    router.refresh()
  }

  async function handleRemoveAll() {
    setRemoving(true)
    await removeAllAssignments()
    setRemoving(false)
    setShowRemoveAll(false)
    toast.success("All assignments removed")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assignments</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-muted-foreground text-sm">
            {totalAssigned.toLocaleString()} / {totalMembers.toLocaleString()} members assigned
          </p>
          <div className="flex-1 max-w-xs h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${totalMembers ? (totalAssigned / totalMembers) * 100 : 0}%` }} />
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {totalMembers ? Math.round((totalAssigned / totalMembers) * 100) : 0}%
          </span>
        </div>
      </div>

      <Tabs defaultValue="bulk">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="bulk">Bulk CSV</TabsTrigger>
          <TabsTrigger value="single">Manual</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        {/* BULK CSV TAB - shown first as it's most used */}
        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />Bulk Assign via CSV / Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                Upload CSV or Excel with <strong>Member IDs in the first column</strong>. All those members will be assigned to the selected agent instantly.
              </div>

              {/* File upload */}
              <div className="space-y-2">
                <Label>1. Upload CSV / Excel</Label>
                <label className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {csvFile ? csvFile.name : "Click to upload CSV or Excel file"}
                    </p>
                    {csvMemberIds.length > 0 && (
                      <p className="text-xs text-green-600 font-semibold">{csvMemberIds.length} member IDs loaded ✓</p>
                    )}
                  </div>
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>

              {/* Director select */}
              <div className="space-y-2">
                <Label>2. Select Director (optional)</Label>
                <Select value={csvDirector} onValueChange={setCsvDirector}>
                  <SelectTrigger>
                    <SelectValue placeholder="No specific director" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific director</SelectItem>
                    {directors.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.director_code} — {d.profiles?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent select */}
              <div className="space-y-2">
                <Label>3. Select Agent *</Label>
                <Select value={csvAgent} onValueChange={setCsvAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent to assign to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAgentsCSV.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.agent_code} — {a.profiles?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Result */}
              {csvResult && (
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-700">{csvResult.total}</div>
                    <div className="text-xs text-blue-600">In CSV</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-700">{csvResult.found}</div>
                    <div className="text-xs text-purple-600">Found in DB</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-700">{csvResult.success}</div>
                    <div className="text-xs text-green-600">Assigned ✓</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-700">{csvResult.failed}</div>
                    <div className="text-xs text-red-600">Failed</div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleBulkAssign}
                disabled={csvAssigning || !csvAgent || csvMemberIds.length === 0}
                className="w-full h-11 text-base"
              >
                {csvAssigning ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Assigning {csvMemberIds.length} members...
                  </span>
                ) : `Assign ${csvMemberIds.length || "..."} Members to Agent`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANUAL ASSIGN TAB */}
        <TabsContent value="single" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Manual — Assign One Member</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>1. Search Member</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Member ID or Name..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchMembers()}
                  />
                  <Button onClick={searchMembers} disabled={searching} variant="outline">
                    <Search className="h-4 w-4 mr-1" />
                    {searching ? "..." : "Search"}
                  </Button>
                </div>

                {foundMembers.length > 0 && (
                  <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                    {foundMembers.map(m => (
                      <button key={m.id}
                        onClick={() => { setSelectedMember(m); setFoundMembers([]) }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary/5 flex items-center justify-between border-b last:border-0 transition-colors">
                        <span className="font-medium">{m.full_name}</span>
                        <div className="flex items-center gap-2">
                          {m.branch_name && <Badge variant="outline" className="text-xs">{m.branch_name}</Badge>}
                          <span className="font-mono text-xs text-muted-foreground">{m.member_id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedMember && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-md flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{selectedMember.full_name}</span>
                      <span className="font-mono text-xs text-muted-foreground ml-2">({selectedMember.member_id})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Selected</Badge>
                      <button onClick={() => { setSelectedMember(null); setFoundMembers([]) }}>
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>2. Select Director (optional)</Label>
                <Select value={selectedDirector} onValueChange={setSelectedDirector}>
                  <SelectTrigger><SelectValue placeholder="Any director..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No director</SelectItem>
                    {directors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.director_code} — {d.profiles?.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>3. Select Agent *</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                  <SelectContent>
                    {filteredAgents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.agent_code} — {a.profiles?.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setShowConfirm(true)}
                disabled={!selectedMember || !selectedAgent}
                className="w-full"
              >
                <UserCheck className="h-4 w-4 mr-2" />Assign Member
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECENT TAB */}
        <TabsContent value="recent" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {recentAssignments.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No assignments yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 text-muted-foreground font-semibold">Member</th>
                        <th className="text-left p-3 text-muted-foreground font-semibold">Agent</th>
                        <th className="text-left p-3 text-muted-foreground font-semibold">Status</th>
                        <th className="text-left p-3 text-muted-foreground font-semibold">Date</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAssignments.map(a => (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3">
                            <div className="font-medium">{a.members?.full_name ?? "—"}</div>
                            <div className="font-mono text-xs text-muted-foreground">{a.members?.member_id}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-xs font-semibold">{a.agents?.agent_code}</div>
                            <div className="text-xs text-muted-foreground">{a.agents?.profiles?.full_name}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant={a.is_active ? "success" : "secondary"}>
                              {a.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{formatDateTime(a.assigned_at)}</td>
                          <td className="p-3">
                            {a.is_active && (
                              <button
                                onClick={() => handleRemoveAssignment(a.id)}
                                className="text-destructive hover:text-destructive/70 transition-colors"
                                title="Remove assignment"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MANAGE TAB */}
        <TabsContent value="manage" className="mt-4">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive flex items-center gap-2">
                <Trash2 className="h-4 w-4" />Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Remove All Active Assignments</p>
                    <p className="text-sm text-red-700 mt-1">
                      This will remove all <strong>{totalAssigned.toLocaleString()}</strong> active assignments.
                      All agents and directors will lose access to their members. Cannot be undone.
                    </p>
                  </div>
                </div>
                <Button variant="destructive" onClick={() => setShowRemoveAll(true)} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />Remove All {totalAssigned.toLocaleString()} Assignments
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm single assign dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Assignment</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3 text-sm">
            <div className="p-3 bg-muted rounded-lg space-y-1.5">
              <div><span className="text-muted-foreground">Member: </span>
                <strong>{selectedMember?.full_name}</strong>
                <span className="font-mono text-xs text-muted-foreground ml-1">({selectedMember?.member_id})</span>
              </div>
              <div><span className="text-muted-foreground">Agent: </span>
                <strong>{agents.find(a => a.id === selectedAgent)?.agent_code}</strong>
                {" — "}{agents.find(a => a.id === selectedAgent)?.profiles?.full_name}
              </div>
              {selectedDirector && (
                <div><span className="text-muted-foreground">Director: </span>
                  <strong>{directors.find(d => d.id === selectedDirector)?.director_code}</strong>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Any existing active assignment for this member will be deactivated first.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleSingleAssign} disabled={assigning}>
              {assigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove all confirm dialog */}
      <Dialog open={showRemoveAll} onOpenChange={setShowRemoveAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />Remove ALL Assignments?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3 text-sm">
            <p>You are about to remove <strong>{totalAssigned.toLocaleString()} active assignments</strong>.</p>
            <p>All agents and directors will immediately lose access to their members.</p>
            <p className="font-semibold text-destructive">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveAll(false)}>
              Cancel — Keep Assignments
            </Button>
            <Button variant="destructive" onClick={handleRemoveAll} disabled={removing}>
              {removing ? "Removing..." : "Yes, Remove All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
