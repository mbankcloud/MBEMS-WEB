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
import { Plus, UserCog, Key, Trash2, AlertTriangle, Pencil } from "lucide-react"
import { createAgent, resetUserPassword } from "@/lib/actions/users"
import { fullyDeleteAgent } from "@/lib/actions/delete-users"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"

export function RootAgentsManager({ agents: initial, directors }) {
  const [agents, setAgents] = useState(initial)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [showReset, setShowReset] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [showEdit, setShowEdit] = useState(null)
  const [form, setForm] = useState({ full_name: "", password: "", director_id: "" })
  const [editForm, setEditForm] = useState({})
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [created, setCreated] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const filtered = agents.filter(a =>
    a.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.agent_code?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!form.full_name.trim() || form.password.length < 8) {
      toast.error("Name required; password 8+ chars"); return
    }
    setSaving(true)
    const result = await createAgent({
      full_name: form.full_name,
      password: form.password,
      director_id: form.director_id || undefined
    })
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    setCreated({ loginId: result.loginId, password: form.password })
    setForm({ full_name: "", password: "", director_id: "" })
    // Hard reload to show new agent
    window.location.reload()
  }

  async function handleReset() {
    if (!showReset || newPassword.length < 8) { toast.error("Password 8+ chars"); return }
    const result = await resetUserPassword(showReset, newPassword)
    if (result.error) { toast.error(result.error); return }
    toast.success("Password reset")
    setShowReset(null); setNewPassword("")
  }

  async function handleFullDelete() {
    if (!showDelete || deleteConfirm !== showDelete.agent_code) {
      toast.error(`Type ${showDelete?.agent_code} to confirm`); return
    }
    setDeleting(true)
    const agentCode = showDelete.agent_code
    const agentId = showDelete.id

    const result = await fullyDeleteAgent(agentId)
    setDeleting(false)

    if (result.error) {
      toast.error(result.error); return
    }

    // Remove from local state immediately
    setAgents(prev => prev.filter(a => a.id !== agentId))
    setShowDelete(null)
    setDeleteConfirm("")
    toast.success(`Agent ${agentCode} permanently deleted`)

    // Hard reload to ensure server state is fresh
    setTimeout(() => { window.location.reload() }, 500)
  }

  async function handleEdit() {
    if (!showEdit) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("agents")
      .update({ director_id: editForm.director_id || null })
      .eq("id", showEdit.id)
    if (editForm.full_name) {
      await supabase.from("profiles")
        .update({ full_name: editForm.full_name })
        .eq("id", showEdit.profiles?.id)
    }
    setSaving(false)
    toast.success("Agent updated")
    setShowEdit(null)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground text-sm">{agents.length} agents total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Agent
        </Button>
      </div>

      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <strong>Root Admin — Permanent Delete:</strong> Removes agent, login, all assignments,
          counseling, polling, classifications and activity data from the database permanently.
        </span>
      </div>

      <Input
        placeholder="Search by name or agent code..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <UserCog className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No agents found</p>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(agent => (
          <Card key={agent.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {agent.profile_photo_url
                    ? <img src={agent.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    : <UserCog className="h-5 w-5 text-orange-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{agent.profiles?.full_name ?? "—"}</span>
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                      {agent.agent_code}
                    </Badge>
                    {agent.directors && (
                      <Badge variant="secondary" className="text-xs">
                        {agent.directors.director_code}
                      </Badge>
                    )}
                    <Badge variant={agent.profiles?.is_active ? "success" : "secondary"}>
                      {agent.profiles?.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    <span>Login: <strong className="font-mono">{agent.profiles?.login_id}</strong></span>
                    <span>{(agent.agent_member_assignments as any)?.[0]?.count ?? 0} members</span>
                    <span>Since {formatDate(agent.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setShowEdit(agent)
                      setEditForm({
                        full_name: agent.profiles?.full_name,
                        director_id: agent.director_id || ""
                      })
                    }}
                    className="p-1.5 hover:bg-muted rounded" title="Edit">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { setShowReset(agent.profiles?.id); setNewPassword("") }}
                    className="p-1.5 hover:bg-muted rounded" title="Reset Password">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => { setShowDelete(agent); setDeleteConfirm("") }}
                    className="p-1.5 hover:bg-red-50 rounded" title="Permanently Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { if (!o) { setShowCreate(false); setCreated(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{created ? "Agent Created!" : "Create New Agent"}</DialogTitle>
          </DialogHeader>
          {created ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-2">
                <p className="font-semibold text-green-800 text-sm">Agent created successfully!</p>
                <div className="text-sm text-green-700 space-y-1">
                  <div>Login ID: <strong className="font-mono text-base">{created.loginId}</strong></div>
                  <div>Password: <strong className="font-mono text-base">{created.password}</strong></div>
                </div>
                <p className="text-xs text-green-600">Share these credentials with the agent securely.</p>
              </div>
              <Button className="w-full" onClick={() => { setShowCreate(false); setCreated(null) }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    placeholder="Agent's full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Password * (minimum 8 characters)</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Assign to Director (optional)</Label>
                  <Select value={form.director_id} onValueChange={v => setForm(p => ({ ...p, director_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="No director" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No director</SelectItem>
                      {directors.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.director_code} — {d.profiles?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Creating..." : "Create Agent"}
                </Button>
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
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name || ""}
                onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assign to Director</Label>
              <Select value={editForm.director_id || ""} onValueChange={v => setEditForm(p => ({ ...p, director_id: v }))}>
                <SelectTrigger><SelectValue placeholder="No director" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No director</SelectItem>
                  {directors.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.director_code} — {d.profiles?.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!showReset} onOpenChange={o => !o && setShowReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New Password (minimum 8 characters)</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(null)}>Cancel</Button>
            <Button onClick={handleReset}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PERMANENT DELETE */}
      <Dialog open={!!showDelete} onOpenChange={o => { if (!o) { setShowDelete(null); setDeleteConfirm("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />Permanently Delete Agent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-2">
              <p className="font-bold">This will PERMANENTLY DELETE from the database:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li><strong>{showDelete?.profiles?.full_name}</strong> ({showDelete?.agent_code})</li>
                <li>Login credentials (cannot log in again)</li>
                <li>All {(showDelete?.agent_member_assignments as any)?.[0]?.count ?? 0} member assignments</li>
                <li>All counseling records, polling records</li>
                <li>All voter classifications (A/B/C/D/E)</li>
                <li>All meeting photos and daily reports</li>
              </ul>
              <p className="font-bold mt-2">This CANNOT be undone.</p>
            </div>
            <div className="space-y-1.5">
              <Label>
                Type agent code{" "}
                <strong className="font-mono text-red-700">{showDelete?.agent_code}</strong>{" "}
                to confirm
              </Label>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={showDelete?.agent_code}
                className="border-red-300 font-mono"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDelete(null); setDeleteConfirm("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleFullDelete}
              disabled={deleteConfirm !== showDelete?.agent_code || deleting}
            >
              {deleting ? "Deleting..." : `Delete ${showDelete?.agent_code} Permanently`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
