// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Vote, Search, Target, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

const VOTED_FOR = [
  { value: "OUR_PANEL", label: "Our Panel", cls: "bg-green-600 text-white" },
  { value: "OPPOSITION", label: "Opposition", cls: "bg-red-600 text-white" },
  { value: "NOT_CONFIRMED", label: "Not Confirmed", cls: "bg-gray-500 text-white" },
]

const CLASS_BADGE = {
  A: "bg-green-600 text-white",
  B: "bg-blue-600 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-red-600 text-white",
  E: "bg-gray-400 text-white",
}

export function AgentPollingView({ members, agentId, pollingMap: initialMap, classMap }) {
  const router = useRouter()
  const [pollingMap, setPollingMap] = useState(initialMap)
  const [saving, setSaving] = useState(null)
  const [search, setSearch] = useState("")
  const [showAOnly, setShowAOnly] = useState(false)

  // Filter members
  const filtered = members.filter(m => {
    const matchSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.member_id.toLowerCase().includes(search.toLowerCase())
    const matchClass = !showAOnly || classMap[m.id] === "A"
    return matchSearch && matchClass
  })

  const voted = Object.values(pollingMap).filter(v => v?.status === "VOTED").length
  const notVoted = Object.values(pollingMap).filter(v => v?.status === "NOT_VOTED").length
  const aTotal = Object.values(classMap).filter(v => v === "A").length
  const aVoted = members.filter(m => classMap[m.id] === "A" && pollingMap[m.id]?.status === "VOTED").length

  async function updateStatus(memberId, status, votedFor = null) {
    setSaving(memberId)
    const supabase = createClient()
    await supabase.from("polling_records").delete().eq("agent_id", agentId).eq("member_id", memberId)
    const { error } = await supabase.from("polling_records").insert({
      agent_id: agentId, member_id: memberId,
      polling_status: status, voted_for: votedFor,
      updated_at: new Date().toISOString(),
    })
    if (!error) {
      setPollingMap(prev => ({ ...prev, [memberId]: { status, voted_for: votedFor } }))
      await supabase.from("agent_activity_logs").insert({ agent_id: agentId, member_id: memberId, activity_type: "POLLING_UPDATED" })
    } else {
      toast.error(error.message)
    }
    setSaving(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Polling Day</h1>
        <Badge variant="warning" className="text-xs"><Vote className="h-3 w-3 mr-1" />LIVE</Badge>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
        <strong>Field observation only.</strong> Not official ballot data. Only mark when you have confirmed the member has voted.
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 bg-green-50 rounded-lg"><div className="text-xl font-bold text-green-700">{voted}</div><div className="text-xs text-green-600">Voted</div></div>
        <div className="p-2 bg-red-50 rounded-lg"><div className="text-xl font-bold text-red-700">{notVoted}</div><div className="text-xs text-red-600">Not Voted</div></div>
        <div className="p-2 bg-blue-50 rounded-lg"><div className="text-xl font-bold text-blue-700">{aVoted}/{aTotal}</div><div className="text-xs text-blue-600">A Voted</div></div>
        <div className="p-2 bg-muted rounded-lg"><div className="text-xl font-bold">{members.length - voted - notVoted}</div><div className="text-xs text-muted-foreground">Pending</div></div>
      </div>

      {/* GOTV mode toggle - show only A-category who haven't voted */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant={showAOnly ? "default" : "outline"} size="sm" onClick={() => setShowAOnly(!showAOnly)} className="shrink-0">
          <Target className="h-4 w-4 mr-1" />A Only
        </Button>
      </div>

      {showAOnly && (
        <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-1">
          <Target className="h-3.5 w-3.5" /><strong>GOTV Mode:</strong> Showing only confirmed (A) supporters — {aTotal - aVoted} still haven't voted
        </div>
      )}

      <p className="text-xs text-muted-foreground">{filtered.length} members shown</p>

      <div className="space-y-3">
        {filtered.map(member => {
          const current = pollingMap[member.id]
          const currentStatus = current?.status || "PENDING"
          const currentVotedFor = current?.voted_for || null
          const memberClass = classMap[member.id]

          return (
            <Card key={member.id} className={currentStatus === "VOTED" ? "border-green-200 bg-green-50/30" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm truncate">{member.full_name}</span>
                      {memberClass && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${CLASS_BADGE[memberClass]}`}>{memberClass}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{member.member_id}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {["VOTED","NOT_VOTED","UNKNOWN"].map(status => (
                      <button key={status} disabled={saving === member.id} onClick={() => updateStatus(member.id, status)}
                        className={`px-2 py-1 rounded text-xs font-semibold border transition-all ${
                          currentStatus === status
                            ? status === "VOTED" ? "bg-green-600 text-white border-green-600"
                              : status === "NOT_VOTED" ? "bg-red-600 text-white border-red-600"
                              : "bg-gray-500 text-white border-gray-500"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        } ${saving === member.id ? "opacity-50" : ""}`}>
                        {status === "VOTED" ? "✓ Voted" : status === "NOT_VOTED" ? "✗ Not" : "?"}
                      </button>
                    ))}
                  </div>
                </div>

                {currentStatus === "VOTED" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Voted for:</span>
                    {VOTED_FOR.map(opt => (
                      <button key={opt.value} disabled={saving === member.id} onClick={() => updateStatus(member.id, "VOTED", opt.value)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${currentVotedFor === opt.value ? opt.cls : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
