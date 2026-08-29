// @ts-nocheck
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Users, ChevronLeft, ChevronRight, ExternalLink, Pencil, Trash2, AlertTriangle } from "lucide-react"

export function MembersTable({ members, branches, totalCount, page, pageSize, searchQuery, showActions = true, basePath = "/admin/members" }) {
  const router = useRouter()
  const [search, setSearch] = useState(searchQuery || "")
  const [isPending, startTransition] = useTransition()
  const [editMember, setEditMember] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({})
  const totalPages = Math.ceil(totalCount / pageSize)

  function updateSearch(val) {
    setSearch(val)
    startTransition(() => {
      const params = new URLSearchParams()
      if (val) params.set("q", val)
      // FIXED: use basePath prop - no more window.location
      router.push(`${basePath}?${params.toString()}`)
    })
  }

  function goPage(p) {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    params.set("page", String(p))
    router.push(`${basePath}?${params.toString()}`)
  }

  function openEdit(m) {
    setEditMember(m)
    setEditForm({
      full_name: m.full_name || "",
      age: m.age || "",
      gender: m.gender || "",
      mobile_number: m.mobile_number || "",
      address: m.address || "",
    })
  }

  async function handleSave() {
    if (!editMember) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("members").update({
      full_name: editForm.full_name,
      age: editForm.age ? parseInt(editForm.age) : null,
      gender: editForm.gender || null,
      mobile_number: editForm.mobile_number || null,
      address: editForm.address || null,
    }).eq("id", editMember.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success("Member updated")
    setEditMember(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const supabase = createClient()
    await supabase.from("agent_member_assignments").update({ is_active: false }).eq("member_id", deleteTarget.id)
    await supabase.from("director_member_assignments").update({ is_active: false }).eq("member_id", deleteTarget.id)
    const { error } = await supabase.from("members").update({ status: "inactive" }).eq("id", deleteTarget.id)
    if (error) { toast.error(error.message); return }
    toast.success("Member deactivated")
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground text-sm">{totalCount.toLocaleString()} total members</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by Member ID or Name..."
          value={search} onChange={e => updateSearch(e.target.value)}
          className={`pl-9 ${isPending ? "opacity-60" : ""}`} />
      </div>

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Member ID</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Full Name</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">Age</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground hidden md:table-cell">Mobile</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Branch</th>
                    {showActions && <th className="p-3 font-semibold text-muted-foreground text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-mono font-semibold text-primary text-xs">{member.member_id}</td>
                      <td className="p-3 font-medium cursor-pointer hover:text-primary text-sm"
                        onClick={() => router.push(`/admin/members/${member.id}`)}>
                        {member.full_name}
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{member.age ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{member.mobile_number ?? "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {member.branches?.branch_name || member.branch_name || "—"}
                        </Badge>
                      </td>
                      {showActions && (
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => router.push(`/admin/members/${member.id}`)} className="p-1.5 hover:bg-muted rounded">
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => openEdit(member)} className="p-1.5 hover:bg-muted rounded">
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setDeleteTarget(member)} className="p-1.5 hover:bg-red-50 rounded">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm flex-wrap gap-2">
          <p className="text-muted-foreground text-xs">
            {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => goPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 rounded border text-xs font-mono">{page}/{totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editMember} onOpenChange={o => !o && setEditMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member — {editMember?.member_id}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Full Name</Label>
              <Input value={editForm.full_name || ""} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Age</Label>
                <Input type="number" value={editForm.age || ""} onChange={e => setEditForm(p => ({ ...p, age: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Gender</Label>
                <Select value={editForm.gender || ""} onValueChange={v => setEditForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <div className="space-y-1.5"><Label>Mobile</Label>
              <Input value={editForm.mobile_number || ""} onChange={e => setEditForm(p => ({ ...p, mobile_number: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Address</Label>
              <Input value={editForm.address || ""} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />Deactivate Member
          </DialogTitle></DialogHeader>
          <div className="py-4 text-sm">
            <p>Deactivate <strong>{deleteTarget?.full_name}</strong> ({deleteTarget?.member_id})?</p>
            <p className="text-muted-foreground mt-2">All active assignments will also be removed.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
