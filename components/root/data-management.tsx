// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, AlertTriangle, Database, HandshakeIcon, Vote, Camera, Activity, BarChart3, Target } from "lucide-react"
import { useRouter } from "next/navigation"

const CONFIRM_WORD = "DELETE"

export function DataManagement({ counts }) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmInput, setConfirmInput] = useState("")
  const [deleting, setDeleting] = useState(false)

  const dataItems = [
    {
      key: "counseling",
      label: "Counseling Records",
      desc: "All visit records, feedback, contact methods",
      count: counts.counselingCount,
      icon: HandshakeIcon,
      color: "text-green-600 bg-green-50",
      table: "counseling_visits",
    },
    {
      key: "polling",
      label: "Polling Day Records",
      desc: "All voted/not voted and voted_for data",
      count: counts.pollingCount,
      icon: Vote,
      color: "text-blue-600 bg-blue-50",
      table: "polling_records",
    },
    {
      key: "classifications",
      label: "Voter Classifications (A/B/C/D/E)",
      desc: "All A/B/C/D/E voter classification data",
      count: counts.classificationCount,
      icon: Target,
      color: "text-amber-600 bg-amber-50",
      table: "voter_classifications",
    },
    {
      key: "photos",
      label: "Meeting Photos",
      desc: "All meeting photo records (storage files remain)",
      count: counts.photoCount,
      icon: Camera,
      color: "text-purple-600 bg-purple-50",
      table: "meeting_photos",
    },
    {
      key: "activity",
      label: "Activity Logs",
      desc: "All agent activity tracking records",
      count: counts.activityCount,
      icon: Activity,
      color: "text-indigo-600 bg-indigo-50",
      table: "agent_activity_logs",
    },
    {
      key: "reports",
      label: "Daily Reports",
      desc: "All daily evening reports from agents",
      count: counts.reportCount,
      icon: BarChart3,
      color: "text-orange-600 bg-orange-50",
      table: "daily_reports",
    },
  ]

  async function handleDelete() {
    if (confirmInput !== CONFIRM_WORD || !deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from(deleteTarget.table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
    setDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success(`All ${deleteTarget.label} deleted successfully`)
    setDeleteTarget(null)
    setConfirmInput("")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-muted-foreground" />Data Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Root admin only — delete campaign data. This cannot be undone.</p>
      </div>

      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-800 text-sm">Danger Zone</p>
          <p className="text-red-700 text-sm mt-1">Deletions here are permanent and cannot be recovered. Use only for data resets between campaign phases or after elections.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {dataItems.map(item => (
          <Card key={item.key} className="border-red-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color.split(" ")[1]}`}>
                    <item.icon className={`h-5 w-5 ${item.color.split(" ")[0]}`} />
                  </div>
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                    <Badge variant="outline" className="text-xs mt-1">{(item.count ?? 0).toLocaleString()} records</Badge>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { setDeleteTarget(item); setConfirmInput("") }}
                  disabled={(item.count ?? 0) === 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />Delete All
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) { setDeleteTarget(null); setConfirmInput("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Delete All {deleteTarget?.label}?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
              <p className="font-semibold text-red-800">You are about to permanently delete:</p>
              <p className="text-red-700 mt-1">{(deleteTarget?.count ?? 0).toLocaleString()} records from <strong>{deleteTarget?.label}</strong></p>
              <p className="text-red-700 mt-1 font-semibold">This action CANNOT be undone.</p>
            </div>
            <div className="space-y-2">
              <Label>Type <strong>DELETE</strong> to confirm</Label>
              <Input
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="Type DELETE here"
                className="border-red-300 focus:border-red-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setConfirmInput("") }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmInput !== CONFIRM_WORD || deleting}
            >
              {deleting ? "Deleting..." : `Delete All ${deleteTarget?.count?.toLocaleString()} Records`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
