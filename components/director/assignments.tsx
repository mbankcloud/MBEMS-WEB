// @ts-nocheck
"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Upload, UserCheck, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { bulkAssignMembers, singleAssignMember } from "@/lib/actions/assignments"

export function DirectorAssignments({ directorId, agents, totalAssigned }) {
  const router = useRouter()

  const [memberSearch, setMemberSearch] = useState("")
  const [foundMembers, setFoundMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState("")
  const [searching, setSearching] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const [csvFile, setCsvFile] = useState(null)
  const [csvIds, setCsvIds] = useState([])
  const [csvAgent, setCsvAgent] = useState("")
  const [csvBusy, setCsvBusy] = useState(false)
  const [csvResult, setCsvResult] = useState(null)

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
    const result = await singleAssignMember(selectedMember.id, selectedAgent, directorId)
    setAssigning(false)
    if (result.success) {
      toast.success(`${selectedMember.full_name} assigned!`)
      setSelectedMember(null); setMemberSearch(""); setFoundMembers([]); setSelectedAgent("")
      router.refresh()
    } else {
      toast.error("Assignment failed")
    }
  }

  function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file); setCsvResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const ids = rows
          .map(r => String(r[0] || "").trim())
          .filter(v => v && !["member id", "memberid", "id", "member_id"].includes(v.toLowerCase()))
        setCsvIds(ids)
        toast.success(`${ids.length} member IDs loaded`)
      } catch { toast.error("Failed to read file") }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ""
  }

  async function handleBulkAssign() {
    if (!csvAgent || csvIds.length === 0) { toast.error("Upload CSV and select agent"); return }
    setCsvBusy(true)
    toast.loading("Assigning...", { id: "dir-bulk" })
    const result = await bulkAssignMembers(csvIds, csvAgent, directorId)
    setCsvBusy(false)
    toast.dismiss("dir-bulk")
    if (result.error) { toast.error(result.error); return }
    setCsvResult(result)
    toast.success(`${result.success} members assigned!`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assign Members</h1>
        <p className="text-muted-foreground text-sm">{totalAssigned.toLocaleString()} members currently assigned under you</p>
      </div>

      <Tabs defaultValue="bulk">
        <TabsList>
          <TabsTrigger value="bulk">Bulk CSV</TabsTrigger>
          <TabsTrigger value="single">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />Bulk Assign via CSV</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
                Upload CSV with Member IDs in first column. Members will be assigned to your selected agent.
              </div>

              <div className="space-y-2">
                <Label>1. Upload CSV / Excel</Label>
                <label className="flex items-center gap-3 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{csvFile ? csvFile.name : "Click to upload"}</p>
                    {csvIds.length > 0 && <p className="text-xs text-green-600">{csvIds.length} member IDs loaded ✓</p>}
                  </div>
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-2">
                <Label>2. Select Agent *</Label>
                <Select value={csvAgent} onValueChange={setCsvAgent}>
                  <SelectTrigger><SelectValue placeholder="Select your agent..." /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.agent_code} — {a.profiles?.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {csvResult && (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg"><div className="text-xl font-bold text-blue-700">{csvResult.found}</div><div className="text-xs text-blue-600">Found</div></div>
                  <div className="p-3 bg-green-50 rounded-lg"><div className="text-xl font-bold text-green-700">{csvResult.success}</div><div className="text-xs text-green-600">Assigned ✓</div></div>
                  <div className="p-3 bg-red-50 rounded-lg"><div className="text-xl font-bold text-red-700">{csvResult.failed}</div><div className="text-xs text-red-600">Failed</div></div>
                </div>
              )}

              <Button onClick={handleBulkAssign} disabled={csvBusy || !csvAgent || csvIds.length === 0} className="w-full h-11">
                {csvBusy ? "Assigning..." : `Assign ${csvIds.length || "..."} Members`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Manual Assign</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>1. Search Member</Label>
                <div className="flex gap-2">
                  <Input placeholder="Member ID or Name..." value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchMembers()} />
                  <Button onClick={searchMembers} disabled={searching} variant="outline">
                    <Search className="h-4 w-4 mr-1" />{searching ? "..." : "Search"}
                  </Button>
                </div>
                {foundMembers.length > 0 && (
                  <div className="border rounded-md overflow-hidden max-h-40 overflow-y-auto">
                    {foundMembers.map(m => (
                      <button key={m.id} onClick={() => { setSelectedMember(m); setFoundMembers([]) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between border-b last:border-0">
                        <span className="font-medium">{m.full_name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{m.member_id}</span>
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
                    <button onClick={() => setSelectedMember(null)}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>2. Select Agent *</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.agent_code} — {a.profiles?.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSingleAssign} disabled={assigning || !selectedMember || !selectedAgent} className="w-full">
                <UserCheck className="h-4 w-4 mr-2" />{assigning ? "Assigning..." : "Assign Member"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
