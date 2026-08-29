// @ts-nocheck
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, UserCog, Key, Power, Trash2, AlertTriangle, Pencil, Camera } from "lucide-react"
import { createAgent, toggleUserStatus, resetUserPassword } from "@/lib/actions/users"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"

export function AgentsManager({ agents: initial, directors }) {
  const router = useRouter()
  const [agents, setAgents] = useState(initial)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [showReset, setShowReset] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [showEdit, setShowEdit] = useState(null)
  const [form, setForm] = useState({ full_name: "", password: "", director_id: "", notes: "" })
  const [editForm, setEditForm] = useState({})
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)

  const filtered = agents.filter(a =>
    a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.agent_code?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!form.full_name.trim() || form.password.length < 8) { toast.error("Name required; password 8+ chars"); return }
    setSaving(true)
    const result = await createAgent({ full_name: form.full_name, password: form.password, director_id: form.director_id || undefined, notes: form.notes })
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    setCreated({ loginId: result.loginId, password: form.password })
    setForm({ full_name: "", password: "", director_id: "", notes: "" })
    router.refresh()
  }

  async function handleToggle(agent) {
    if (!agent.profiles) return
    const newVal = !agent.profiles.is_active
    const result = await toggleUserStatus(agent.profiles.id, newVal)
    if (result.error) { toast.error(result.error); return }
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, profiles: { ...a.profiles, is_active: newVal } } : a))
    toast.success(`Agent ${newVal ? "enabled" : "disabled"}`)
  }

  async function handleReset() {
    if (!showReset || newPassword.length < 8) { toast.error("Password 8+ chars"); return }
    const result = await resetUserPassword(showReset, newPassword)
    if (result.error) { toast.error(result.error); return }
    toast.success("Password reset")
    setShowReset(null); setNewPassword("")
  }

  async function handleDelete() {
    if (!showDelete) return
    const supabase = createClient()
    await supabase.from("agent_member_assignments").update({ is_active: false }).eq("agent_id", showDelete.id)
    await supabase.from("profiles").update({ is_active: false }).eq("id", showDelete.profiles?.id)
    setAgents(prev => prev.filter(a => a.id !== showDelete.id))
    setShowDelete(null)
    toast.success("Agent deactivated")
    router.refresh()
  }

  async function handleEdit() {
    if (!showEdit) return
    setSaving(true)
    const supabase = createClient()
    if (editForm.director_id !== undefined) {
      await supabase.from("agents").update({ director_id: editForm.director_id || null, notes: editForm.notes || null }).eq("id", showEdit.id)
    }
    if (editForm.full_name) {
      await supabase.from("profiles").update({ full_name: editForm.full_name }).eq("id", showEdit.profiles?.id)
    }
    setSaving(false)
    toast.success("Agent updated")
    setShowEdit(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground text-sm">{agents.length} agents</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Agent</Button>
      </div>

      <Input placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="grid gap-3">
        {filtered.map(agent => (
          <Card key={agent.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
                  {agent.profile_photo_url
                    ? <img src={agent.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    : <UserCog className="h-5 w-5 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{agent.profiles?.full_name ?? "—"}</span>
                    <Badge variant="outline" className="font-mono text-xs">{agent.agent_code}</Badge>
                    {agent.directors && <Badge variant="secondary" className="text-xs">{agent.directors.director_code}</Badge>}
                    <Badge variant={agent.profiles?.is_active ? "success" : "secondary"}>
                      {agent.profiles?.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    <span>Login: <strong className="font-mono">{agent.profiles?.login_id}</strong></span>
                    <span>{(agent.agent_member_assignments as any)?.[0]?.count ?? 0} members</span>
                    {agent.phone_number && <span>{agent.phone_number}</span>}
                    <span>Since {formatDate(agent.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setShowEdit(agent); setEditForm({ full_name: agent.profiles?.full_name, director_id: agent.director_id || "", notes: agent.notes || "" }) }}
                    className="p-1.5 hover:bg-muted rounded" title="Edit">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => { setShowReset(agent.profiles?.id); setNewPassword("") }}
                    className="p-1.5 hover:bg-muted rounded" title="Reset Password">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleToggle(agent)}
                    className={`p-1.5 hover:bg-muted rounded`} title={agent.profiles?.is_active ? "Disable" : "Enable"}>
                    <Power className={`h-4 w-4 ${agent.profiles?.is_active ? "text-amber-500" : "text-green-500"}`} />
                  </button>
                  <button onClick={() => setShowDelete(agent)}
                    className="p-1.5 hover:bg-red-50 rounded" title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { setShowCreate(o); if (!o) setCreated(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{created ? "Agent Created" : "Create New Agent"}</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-2">
                <p className="text-sm font-semibold text-green-800">Agent created successfully!</p>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Login ID: <strong className="font-mono">{created.loginId}</strong></div>
                  <div>Password: <strong className="font-mono">{created.password}</strong></div>
                </div>
                <p className="text-xs text-green-600">Share these credentials securely.</p>
              </div>
              <Button className="w-full" onClick={() => { setShowCreate(false); setCreated(null) }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Agent's full name" /></div>
                <div className="space-y-1.5"><Label>Password * (min 8 characters)</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Assign to Director (optional)</Label>
                  <Select value={form.director_id} onValueChange={v => setForm(p => ({ ...p, director_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select director..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No director</SelectItem>
                      {directors.map(d => <SelectItem key={d.id} value={d.id}>{d.director_code} — {d.profiles?.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Agent"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={o => !o && setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Agent — {showEdit?.agent_code}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Full Name</Label>
              <Input value={editForm.full_name || ""} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Assign to Director</Label>
              <Select value={editForm.director_id || ""} onValueChange={v => setEditForm(p => ({ ...p, director_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select director..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No director</SelectItem>
                  {directors.map(d => <SelectItem key={d.id} value={d.id}>{d.director_code} — {d.profiles?.full_name}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label>Notes</Label>
              <Input value={editForm.notes || ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!showReset} onOpenChange={o => !o && setShowReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>New Password (min 8 chars)</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(null)}>Cancel</Button>
            <Button onClick={handleReset}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!showDelete} onOpenChange={o => !o && setShowDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Deactivate Agent</DialogTitle></DialogHeader>
          <div className="py-4 text-sm">
            <p>Deactivate <strong>{showDelete?.profiles?.full_name}</strong> ({showDelete?.agent_code})?</p>
            <p className="text-muted-foreground mt-2">All member assignments will be removed.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Deactivate Agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
