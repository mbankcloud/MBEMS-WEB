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
import { Switch } from "@/components/ui/switch"
import { Plus, UserCheck, Key, Trash2, AlertTriangle, Pencil } from "lucide-react"
import { createDirector, resetUserPassword } from "@/lib/actions/users"
import { fullyDeleteDirector } from "@/lib/actions/delete-users"
import { createClient } from "@/lib/supabase/client"

import { formatDate } from "@/lib/utils"

export function RootDirectorsManager({ directors: initial }) {
  // const router = useRouter()
  const [directors, setDirectors] = useState(initial)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [showReset, setShowReset] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [showEdit, setShowEdit] = useState(null)
  const [form, setForm] = useState({ full_name: "", password: "", all_branches_access: false })
  const [editForm, setEditForm] = useState({})
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [created, setCreated] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const filtered = directors.filter(d =>
    d.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.director_code?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!form.full_name.trim() || form.password.length < 8) { toast.error("Name required; password 8+ chars"); return }
    setSaving(true)
    const result = await createDirector({ full_name: form.full_name, password: form.password, all_branches_access: form.all_branches_access })
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    setCreated({ loginId: result.loginId, password: form.password })
    setForm({ full_name: "", password: "", all_branches_access: false })
    window.location.reload()
  }

  async function handleReset() {
    if (!showReset || newPassword.length < 8) { toast.error("Min 8 chars"); return }
    const result = await resetUserPassword(showReset, newPassword)
    if (result.error) { toast.error(result.error); return }
    toast.success("Password reset"); setShowReset(null); setNewPassword("")
  }

  async function handleFullDelete() {
    if (!showDelete || deleteConfirm !== showDelete.director_code) {
      toast.error(`Type ${showDelete?.director_code} to confirm`); return
    }
    setDeleting(true)
    const result = await fullyDeleteDirector(showDelete.id)
    setDeleting(false)
    if (result.error) { toast.error(result.error); return }
    setDirectors(prev => prev.filter(d => d.id !== showDelete.id))
    setShowDelete(null); setDeleteConfirm("")
    toast.success(`Director ${showDelete.director_code} permanently deleted`)
    window.location.reload()
  }

  async function handleEdit() {
    if (!showEdit) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("directors").update({ all_branches_access: editForm.all_branches_access }).eq("id", showEdit.id)
    if (editForm.full_name) await supabase.from("profiles").update({ full_name: editForm.full_name }).eq("id", showEdit.profiles?.id)
    setSaving(false)
    toast.success("Updated"); setShowEdit(null); window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Directors</h1>
          <p className="text-muted-foreground text-sm">{directors.length} directors</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Director</Button>
      </div>

      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span><strong>Root Admin:</strong> Delete here is PERMANENT — removes director and login. Agents under them are unlinked but not deleted.</span>
      </div>

      <Input placeholder="Search directors..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      <div className="grid gap-3">
        {filtered.map(dir => (
          <Card key={dir.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{dir.profiles?.full_name ?? "—"}</span>
                    <Badge variant="outline" className="font-mono text-xs font-bold">{dir.director_code}</Badge>
                    {dir.all_branches_access && <Badge variant="info" className="text-xs">All Branches</Badge>}
                    <Badge variant={dir.profiles?.is_active ? "success" : "secondary"}>
                      {dir.profiles?.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    <span>Login: <strong className="font-mono">{dir.profiles?.login_id}</strong></span>
                    <span>{(dir.agents as any)?.[0]?.count ?? 0} agents</span>
                    <span>Since {formatDate(dir.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setShowEdit(dir); setEditForm({ full_name: dir.profiles?.full_name, all_branches_access: dir.all_branches_access }) }}
                    className="p-1.5 hover:bg-muted rounded"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => { setShowReset(dir.profiles?.id); setNewPassword("") }}
                    className="p-1.5 hover:bg-muted rounded"><Key className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => { setShowDelete(dir); setDeleteConfirm("") }}
                    className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { setShowCreate(o); if (!o) setCreated(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{created ? "Director Created" : "Create Director"}</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="font-semibold text-green-800 text-sm">Director created!</p>
                <div className="text-sm text-green-700 mt-1">
                  <div>Login ID: <strong className="font-mono">{created.loginId}</strong></div>
                  <div>Password: <strong className="font-mono">{created.password}</strong></div>
                </div>
              </div>
              <Button className="w-full" onClick={() => { setShowCreate(false); setCreated(null) }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Password * (min 8)</Label>
                  <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.all_branches_access} onCheckedChange={v => setForm(p => ({ ...p, all_branches_access: v }))} />
                  <Label>Access to All Branches</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEdit} onOpenChange={o => !o && setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Director — {showEdit?.director_code}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Full Name</Label>
              <Input value={editForm.full_name || ""} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={editForm.all_branches_access || false} onCheckedChange={v => setEditForm(p => ({ ...p, all_branches_access: v }))} />
              <Label>All Branches Access</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={!!showReset} onOpenChange={o => !o && setShowReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>New Password (min 8)</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(null)}>Cancel</Button>
            <Button onClick={handleReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PERMANENT DELETE */}
      <Dialog open={!!showDelete} onOpenChange={o => { if (!o) { setShowDelete(null); setDeleteConfirm("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />Permanently Delete Director
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 space-y-2">
              <p className="font-bold">PERMANENT DELETE:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li>Director <strong>{showDelete?.profiles?.full_name}</strong> ({showDelete?.director_code})</li>
                <li>Their login credentials</li>
                <li>All their member assignments</li>
                <li>Agents under them are unlinked (not deleted)</li>
              </ul>
              <p className="font-bold">Cannot be undone.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Type <strong className="font-mono text-red-700">{showDelete?.director_code}</strong> to confirm</Label>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={showDelete?.director_code} className="border-red-300 font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDelete(null); setDeleteConfirm("") }}>Cancel</Button>
            <Button variant="destructive" onClick={handleFullDelete}
              disabled={deleteConfirm !== showDelete?.director_code || deleting}>
              {deleting ? "Deleting..." : `Delete ${showDelete?.director_code}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
