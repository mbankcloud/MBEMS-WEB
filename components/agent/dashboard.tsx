// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Users, HandshakeIcon, Clock, CheckCircle2, Target, Send, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const CLASS_COLORS = { A: "text-green-700 bg-green-50", B: "text-blue-700 bg-blue-50", C: "text-amber-700 bg-amber-50", D: "text-red-700 bg-red-50", E: "text-gray-600 bg-gray-50" }

export function AgentDashboard({ agentId, agentCode, agentName, totalAssigned, visited, rescheduled, notContacted, classCounts, settings, todayReport }) {
  const router = useRouter()
  const [showReport, setShowReport] = useState(false)
  const [reportForm, setReportForm] = useState({
    total_contacted: todayReport?.total_contacted || classCounts.A + classCounts.B + classCounts.C + classCounts.D || 0,
    count_a: todayReport?.count_a || classCounts.A || 0,
    count_b: todayReport?.count_b || classCounts.B || 0,
    count_c: todayReport?.count_c || classCounts.C || 0,
    count_d: todayReport?.count_d || classCounts.D || 0,
    count_e: todayReport?.count_e || classCounts.E || 0,
    notes: todayReport?.notes || "",
  })
  const [submitting, setSubmitting] = useState(false)

  const totalClassified = Object.values(classCounts).reduce((a, b) => a + b, 0)

  async function submitDailyReport() {
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from("daily_reports").upsert({
      agent_id: agentId,
      report_date: new Date().toISOString().split("T")[0],
      ...reportForm,
      submitted_at: new Date().toISOString(),
    }, { onConflict: "agent_id,report_date" })
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    toast.success("Daily report submitted!")
    setShowReport(false)
    router.refresh()
  }

  // Election countdown
  let countdown = null
  if (settings?.election_date) {
    const electionDate = new Date(`${settings.election_date}T${settings.election_time || "08:00"}:00`)
    const now = new Date()
    const diff = electionDate - now
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      countdown = days
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{agentName}</h1>
          <Badge variant="outline" className="font-mono text-xs mt-0.5">{agentCode}</Badge>
        </div>
        {countdown !== null && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{countdown}</div>
            <div className="text-xs text-muted-foreground">days to election</div>
          </div>
        )}
      </div>

      {settings?.election_name && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm font-medium text-primary">
          📅 {settings.election_name} — {settings.election_date}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/agent/members">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">My Members</span></div>
              <div className="text-2xl font-bold">{totalAssigned}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/agent/counseling">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Visited</span></div>
              <div className="text-2xl font-bold text-green-700">{visited}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/agent/counseling">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Follow-up</span></div>
              <div className="text-2xl font-bold text-amber-700">{rescheduled}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/agent/members">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><HandshakeIcon className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Not Contacted</span></div>
              <div className="text-2xl font-bold text-muted-foreground">{notContacted}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* A/B/C/D/E Classification Summary */}
      {totalClassified > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" />Voter Classification</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              {Object.entries(classCounts).map(([k, v]) => (
                <div key={k} className={`flex-1 text-center p-2 rounded ${CLASS_COLORS[k]}`}>
                  <div className="text-lg font-bold">{v}</div>
                  <div className="text-xs font-semibold">{k}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-center">{totalClassified} of {totalAssigned} classified</div>
          </CardContent>
        </Card>
      )}

      {/* Daily Report */}
      <Card className={`border-2 ${todayReport ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Daily Report</div>
              <div className="text-xs text-muted-foreground">
                {todayReport ? `✓ Submitted today — ${todayReport.count_a} confirmed, ${todayReport.count_b} leaning` : "Not submitted yet — submit by end of day"}
              </div>
            </div>
            <Button size="sm" variant={todayReport ? "outline" : "default"} onClick={() => setShowReport(true)}>
              <Send className="h-3.5 w-3.5 mr-1" />{todayReport ? "Update" : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Evening Report — {new Date().toLocaleDateString("en-IN")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              Report your day's field work. This goes to your director and the central war room.
            </div>
            <div className="space-y-1.5">
              <Label>Total Members Contacted Today</Label>
              <Input type="number" value={reportForm.total_contacted} onChange={e => setReportForm(p => ({ ...p, total_contacted: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[["A","Confirmed","green"],["B","Leaning","blue"],["C","Undecided","amber"],["D","Opposition","red"],["E","Unknown","gray"]].map(([k, label, color]) => (
                <div key={k} className="space-y-1">
                  <Label className={`text-xs font-bold text-${color}-700`}>{k} — {label}</Label>
                  <Input type="number" value={reportForm[`count_${k.toLowerCase()}`]}
                    onChange={e => setReportForm(p => ({ ...p, [`count_${k.toLowerCase()}`]: parseInt(e.target.value) || 0 }))}
                    className="text-center" />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Notes / Observations</Label>
              <Textarea value={reportForm.notes} onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any important feedback from the field..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
            <Button onClick={submitDailyReport} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />{submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
