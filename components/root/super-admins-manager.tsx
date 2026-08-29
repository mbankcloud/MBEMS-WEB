// @ts-nocheck
"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Shield, Key, Power, Trash2, AlertTriangle, Pencil } from "lucide-react"

import { formatDate } from "@/lib/utils"

export function SuperAdminsManager({ admins: initial }) {
  // const router = useRouter()
  const [admins, setAdmins] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [showReset, setShowReset] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [showEdit, setShowEdit] = useState(null)
  const [form, setForm] = useState({ full_name: "", password: "" })
  const [editForm, setEditForm] = useState({})
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  async function handleCreate() {
    if (!form.full_name.trim() || form.password.length < 8) { toast.error("Name required + password min 8 chars"); return }
    setSaving(true)
    const { createSuperAdmin } = await import("@/lib/actions/users")
    const result = await createSuperAdmin({ full_name: form.full_name, password: form.password })
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    setCreated({ loginId: result.loginId, password: form.password })
    setForm({ full_name: "", password: "" })
    window.location.reload()
  }

  async function handleReset() {
    if (!showReset || newPassword.length < 8) { toast.error("Password min 8 chars"); return }
    const { resetUserPassword } = await import("@/lib/actions/users")
    const result = await resetUserPassword(showReset, newPassword)
    if (result.error) { toast.error(result.error); return }
    toast.success("Password reset")
    setShowReset(null); setNewPassword("")
  }

  async function handleToggle(admin) {
    const supabase = createClient()
    const newVal = !admin.is_active
    await supabase.from("profiles").update({ is_active: newVal }).eq("id", admin.id)
    setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: newVal } : a))
    toast.success(`Admin ${newVal ? "enabled" : "disabled"}`)
  }

  async function handleFullDelete() {
    if (!showDelete || deleteConfirm !== showDelete.login_id) { toast.error("Type login ID to confirm"); return }
    const supabase = createClient()
    // Fully delete from profiles (auth user will be orphaned but that's OK)
    const { error } = await supabase.from("profiles").delete().eq("id", showDelete.id)
    if (error) { toast.error(error.message); return }
    setAdmins(prev => prev.filter(a => a.id !== showDelete.id))
    setShowDelete(null); setDeleteConfirm("")
    toast.success("Super Admin fully deleted from database")
  }

  async function handleEdit() {
    if (!showEdit) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("profiles").update({ full_name: editForm.full_name }).eq("id", showEdit.id)
    setSaving(false)
    toast.success("Updated")
    setShowEdit(null)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Super Admins</h1>
          <p className="text-muted-foreground text-sm">{admins.length} super admins</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Super Admin</Button>
      </div>

      <div className="grid gap-3">
        {admins.map(admin => (
          <Card key={admin.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{admin.full_name}</span>
                    <Badge variant="outline" className="font-mono text-xs">{admin.login_id}</Badge>
                    <Badge variant={admin.is_active ? "success" : "secondary"}>{admin.is_active ? "Active" : "Disabled"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{admin.email} · Since {formatDate(admin.created_at)}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setShowEdit(admin); setEditForm({ full_name: admin.full_name }) }} className="p-1.5 hover:bg-muted rounded" title="Edit"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => { setShowReset(admin.id); setNewPassword("") }} className="p-1.5 hover:bg-muted rounded" title="Reset Password"><Key className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => handleToggle(admin)} className="p-1.5 hover:bg-muted rounded" title="Toggle"><Power className={`h-4 w-4 ${admin.is_active ? "text-amber-500" : "text-green-500"}`} /></button>
                  <button onClick={() => { setShowDelete(admin); setDeleteConfirm("") }} className="p-1.5 hover:bg-red-50 rounded" title="Full Delete"><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={o => { setShowCreate(o); if (!o) setCreated(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{created ? "Super Admin Created" : "Create Super Admin"}</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="font-semibold text-green-800 text-sm">Created!</p>
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
                <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Password * (min 8)</Label><Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} /></div>
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
          <DialogHeader><DialogTitle>Edit Super Admin</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Full Name</Label><Input value={editForm.full_name || ""} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></div>
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
          <div className="space-y-4 py-2"><div className="space-y-1.5"><Label>New Password (min 8)</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setShowReset(null)}>Cancel</Button><Button onClick={handleReset}>Reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL DELETE Dialog */}
      <Dialog open={!!showDelete} onOpenChange={o => { if (!o) { setShowDelete(null); setDeleteConfirm("") } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Permanently Delete Super Admin</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <p className="font-semibold">This will PERMANENTLY DELETE:</p>
              <p className="mt-1"><strong>{showDelete?.full_name}</strong> ({showDelete?.login_id})</p>
              <p className="mt-1">They will be completely removed from the database. This cannot be undone.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Type their Login ID <strong className="font-mono">{showDelete?.login_id}</strong> to confirm</Label>
              <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={showDelete?.login_id} className="border-red-300" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDelete(null); setDeleteConfirm("") }}>Cancel</Button>
            <Button variant="destructive" onClick={handleFullDelete} disabled={deleteConfirm !== showDelete?.login_id}>
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
