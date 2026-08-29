// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HandshakeIcon, User, Users, ChevronRight, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"

const STATUS_COLORS = {
  VISITED: "bg-green-100 text-green-800",
  NOT_HOME: "bg-amber-100 text-amber-800",
  PHONE_CONTACT: "bg-blue-100 text-blue-800",
  RESCHEDULED: "bg-purple-100 text-purple-800",
  REFUSED: "bg-red-100 text-red-800",
  NOT_CONTACTED: "bg-gray-100 text-gray-800",
}

export function AgentCounselingView({ visits, agentId, candidates, supportMap: initialSupportMap }) {
  const router = useRouter()
  const [selectedVisit, setSelectedVisit] = useState(null)
  const [showCandidates, setShowCandidates] = useState(false)
  const [supportMap, setSupportMap] = useState(initialSupportMap)
  const [saving, setSaving] = useState(null)

  const statusCounts = {}
  visits.forEach(v => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1 })

  async function toggleCandidateSupport(memberId, candidateId, currentLevel) {
    setSaving(candidateId)
    const supabase = createClient()
    const newLevel = currentLevel === "YES" ? "NO" : "YES"

    await supabase.from("member_candidate_support").upsert(
      { agent_id: agentId, member_id: memberId, candidate_id: candidateId, support_level: newLevel, noted_at: new Date().toISOString() },
      { onConflict: "agent_id,member_id,candidate_id" }
    )

    setSupportMap(prev => ({
      ...prev,
      [memberId]: { ...prev[memberId], [candidateId]: newLevel }
    }))
    setSaving(null)
  }

  const getMemberCandidateSupport = (memberId) => supportMap[memberId] || {}
  const getSupportCount = (memberId) => Object.values(getMemberCandidateSupport(memberId)).filter(v => v === "YES").length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Counseling Records</h1>
        <p className="text-muted-foreground text-sm">{visits.length} total visits</p>
      </div>

      {/* Status summary */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}`}>
            <span>{count}</span><span>{status.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>

      {/* Candidates panel preview */}
      {candidates.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Our Panel — {candidates.length} Candidates</span>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCandidates(true)}>
                View All
              </Button>
            </div>
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {candidates.slice(0, 6).map(c => (
                <div key={c.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-white shadow">
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><User className="h-4 w-4 text-muted-foreground/40" /></div>}
                  </div>
                  <div className="text-[10px] text-center leading-tight max-w-[40px] truncate">{c.full_name.split(" ")[0]}</div>
                </div>
              ))}
              {candidates.length > 6 && <div className="flex items-center text-xs text-muted-foreground px-2">+{candidates.length - 6} more</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {visits.length === 0 ? (
        <div className="text-center py-12">
          <HandshakeIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No counseling records yet</p>
          <p className="text-xs text-muted-foreground mt-1">Visit members from the Members tab</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visits.map(visit => (
            <Card key={visit.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedVisit(visit)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{visit.members?.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[visit.status] || "bg-gray-100 text-gray-700"}`}>
                        {visit.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                      <span className="font-mono">{visit.members?.member_id}</span>
                      <span>{formatDate(visit.updated_at || visit.created_at)}</span>
                      {candidates.length > 0 && (
                        <span className="text-primary font-semibold">
                          {getSupportCount(visit.member_id)}/{candidates.length} candidates ✓
                        </span>
                      )}
                    </div>
                    {visit.feedback && <p className="text-xs text-muted-foreground mt-1 truncate">{visit.feedback}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Visit detail + candidate tracking */}
      {selectedVisit && (
        <Dialog open={!!selectedVisit} onOpenChange={o => !o && setSelectedVisit(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedVisit.members?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Status</div>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[selectedVisit.status]}`}>
                    {selectedVisit.status?.replace(/_/g, " ")}
                  </span>
                </div>
                <div><div className="text-xs text-muted-foreground">Member ID</div><div className="font-mono text-xs">{selectedVisit.members?.member_id}</div></div>
                <div><div className="text-xs text-muted-foreground">Contact Method</div><div className="text-sm">{selectedVisit.contact_method || "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Visit Date</div><div className="text-sm">{formatDate(selectedVisit.updated_at)}</div></div>
                {selectedVisit.feedback && <div className="col-span-2"><div className="text-xs text-muted-foreground">Feedback</div><p className="text-sm mt-0.5">{selectedVisit.feedback}</p></div>}
              </div>

              {/* Candidate support tracking */}
              {candidates.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Which candidates will they vote for?</p>
                    <Badge variant="outline" className="text-xs">
                      {getSupportCount(selectedVisit.member_id)}/{candidates.length} selected
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {candidates.map(c => {
                      const memberSupport = getMemberCandidateSupport(selectedVisit.member_id)
                      const isSupporting = memberSupport[c.id] === "YES"
                      return (
                        <button key={c.id}
                          onClick={() => toggleCandidateSupport(selectedVisit.member_id, c.id, memberSupport[c.id])}
                          disabled={saving === c.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left ${
                            isSupporting
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          } ${saving === c.id ? "opacity-50" : ""}`}>
                          <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 border">
                            {c.photo_url
                              ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                              : <User className="h-4 w-4 m-2 text-muted-foreground/40" />}
                          </div>
                          {c.symbol_url && (
                            <div className="w-7 h-7 rounded bg-white overflow-hidden shrink-0 border">
                              <img src={c.symbol_url} alt="symbol" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold flex items-center gap-1">
                              <span className="font-mono text-xs text-muted-foreground">#{c.candidate_number}</span>
                              <span className="truncate">{c.full_name}</span>
                            </div>
                            {c.symbol_name && <div className="text-xs text-muted-foreground">{c.symbol_name}</div>}
                          </div>
                          {isSupporting && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Tap a candidate to toggle support. Green = will vote for them.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* All candidates view dialog */}
      <Dialog open={showCandidates} onOpenChange={setShowCandidates}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Our Panel — {candidates.length} Candidates</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {candidates.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 border-2 border-white shadow">
                  {c.photo_url
                    ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User className="h-5 w-5 text-muted-foreground/40" /></div>}
                </div>
                {c.symbol_url && (
                  <div className="w-10 h-10 rounded bg-white overflow-hidden shrink-0 border shadow">
                    <img src={c.symbol_url} alt="symbol" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">#{c.candidate_number}</Badge>
                    <span className="font-semibold text-sm">{c.full_name}</span>
                  </div>
                  {c.designation && <div className="text-xs text-muted-foreground">{c.designation}</div>}
                  {c.symbol_name && <div className="text-xs text-muted-foreground">Symbol: {c.symbol_name}</div>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
