// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Vote, ChevronDown, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

interface Candidate { id: string; candidate_name: string; position?: string | null; sort_order: number }
interface Panel { id: string; panel_name: string; panel_color: string | null; sort_order: number; candidates: Candidate[] }
interface Election {
  id: string; election_name: string; election_date: string; election_time: string
  timezone: string; num_seats: number; status: string; is_active: boolean
  panels: Panel[]
}

export function ElectionsManager({ elections: initial }: { elections: Election[] }) {
  const router = useRouter()
  const [elections, setElections] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showElection, setShowElection] = useState(false)
  const [showPanel, setShowPanel] = useState<string | null>(null)
  const [showCandidate, setShowCandidate] = useState<{ electionId: string; panelId: string } | null>(null)
  const [elForm, setElForm] = useState({ election_name: "", election_date: "2026-12-01", election_time: "08:00", timezone: "Asia/Kolkata", num_seats: 7, status: "upcoming" })
  const [panelForm, setPanelForm] = useState({ panel_name: "", panel_color: "#1e40af" })
  const [candidateForm, setCandidateForm] = useState({ candidate_name: "", position: "" })
  const [saving, setSaving] = useState(false)

  async function createElection() {
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from("elections" as any).insert({
      ...elForm,
      num_seats: Number(elForm.num_seats),
      is_active: true,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setElections((prev) => [{ ...data, panels: [] }, ...prev])
    setShowElection(false)
    toast.success("Election created")
    router.refresh()
  }

  async function createPanel(electionId: string) {
    if (!panelForm.panel_name.trim()) { toast.error("Panel name required"); return }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from("panels" as any).insert({
      election_id: electionId,
      panel_name: panelForm.panel_name,
      panel_color: panelForm.panel_color,
      sort_order: (elections.find((e) => e.id === electionId)?.panels.length ?? 0),
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setElections((prev) => prev.map((e) => e.id === electionId ? { ...e, panels: [...e.panels, { ...data, candidates: [] }] } : e))
    setShowPanel(null)
    setPanelForm({ panel_name: "", panel_color: "#1e40af" })
    toast.success("Panel created")
  }

  async function createCandidate(electionId: string, panelId: string) {
    if (!candidateForm.candidate_name.trim()) { toast.error("Candidate name required"); return }
    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from("candidates" as any).insert({
      election_id: electionId,
      panel_id: panelId,
      candidate_name: candidateForm.candidate_name,
      position: candidateForm.position || null,
      sort_order: 0,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setElections((prev) => prev.map((e) => e.id === electionId ? {
      ...e,
      panels: e.panels.map((p) => p.id === panelId ? { ...p, candidates: [...p.candidates, data] } : p)
    } : e))
    setShowCandidate(null)
    setCandidateForm({ candidate_name: "", position: "" })
    toast.success("Candidate added")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Elections</h1>
          <p className="text-muted-foreground text-sm">{elections.length} elections configured</p>
        </div>
        <Button onClick={() => setShowElection(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Election
        </Button>
      </div>

      {elections.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16">
          <Vote className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No elections yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {elections.map((el) => (
            <Card key={el.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setExpanded(expanded === el.id ? null : el.id)}>
                      {expanded === el.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <div>
                      <CardTitle className="text-base">{el.election_name}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(el.election_date)} · {el.num_seats} seats · {el.panels.length} panels · {el.panels.reduce((a, p) => a + p.candidates.length, 0)} candidates
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={el.status === "active" ? "success" : el.status === "completed" ? "secondary" : "info"}>
                      {el.status}
                    </Badge>
                    {el.is_active && <Badge variant="success" className="text-xs">Active</Badge>}
                  </div>
                </div>
              </CardHeader>
              {expanded === el.id && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Panels & Candidates</h3>
                      <Button size="sm" variant="outline" onClick={() => setShowPanel(el.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Panel
                      </Button>
                    </div>
                    {el.panels.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No panels yet. Add a panel to get started.</p>
                    ) : (
                      <div className="grid gap-3">
                        {el.panels.map((panel) => (
                          <div key={panel.id} className="border rounded-md p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: panel.panel_color ?? "#1e40af" }} />
                                <span className="font-medium text-sm">{panel.panel_name}</span>
                                <Badge variant="outline" className="text-xs">{panel.candidates.length} candidates</Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowCandidate({ electionId: el.id, panelId: panel.id })}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Candidate
                              </Button>
                            </div>
                            {panel.candidates.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                {panel.candidates.map((c) => (
                                  <div key={c.id} className="text-sm p-2 bg-muted/30 rounded">
                                    <div className="font-medium">{c.candidate_name}</div>
                                    {c.position && <div className="text-xs text-muted-foreground">{c.position}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Election Dialog */}
      <Dialog open={showElection} onOpenChange={setShowElection}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Election</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Election Name</Label>
              <Input value={elForm.election_name} onChange={(e) => setElForm((p) => ({ ...p, election_name: e.target.value }))} placeholder="Board Election 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label>
                <Input type="date" value={elForm.election_date} onChange={(e) => setElForm((p) => ({ ...p, election_date: e.target.value }))} />
              </div>
              <div className="space-y-2"><Label>Time</Label>
                <Input type="time" value={elForm.election_time} onChange={(e) => setElForm((p) => ({ ...p, election_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Number of Seats</Label>
                <Input type="number" min="1" value={elForm.num_seats} onChange={(e) => setElForm((p) => ({ ...p, num_seats: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={elForm.status} onValueChange={(v) => setElForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowElection(false)}>Cancel</Button>
            <Button onClick={createElection} disabled={saving}>{saving ? "Creating..." : "Create Election"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Panel Dialog */}
      <Dialog open={!!showPanel} onOpenChange={(o) => { if (!o) setShowPanel(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Panel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Panel Name</Label>
              <Input value={panelForm.panel_name} onChange={(e) => setPanelForm((p) => ({ ...p, panel_name: e.target.value }))} placeholder="Panel A" />
            </div>
            <div className="space-y-2"><Label>Panel Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={panelForm.panel_color} onChange={(e) => setPanelForm((p) => ({ ...p, panel_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer" />
                <span className="font-mono text-sm">{panelForm.panel_color}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPanel(null)}>Cancel</Button>
            <Button onClick={() => showPanel && createPanel(showPanel)} disabled={saving}>{saving ? "Saving..." : "Add Panel"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog open={!!showCandidate} onOpenChange={(o) => { if (!o) setShowCandidate(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Candidate Name</Label>
              <Input value={candidateForm.candidate_name} onChange={(e) => setCandidateForm((p) => ({ ...p, candidate_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="space-y-2"><Label>Position (optional)</Label>
              <Input value={candidateForm.position} onChange={(e) => setCandidateForm((p) => ({ ...p, position: e.target.value }))} placeholder="e.g. Chairperson" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCandidate(null)}>Cancel</Button>
            <Button onClick={() => showCandidate && createCandidate(showCandidate.electionId, showCandidate.panelId)} disabled={saving}>{saving ? "Saving..." : "Add Candidate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
