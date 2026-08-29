// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { GitBranch, Plus, Pencil, Search } from "lucide-react"
import { useRouter } from "next/navigation"

interface Branch {
  id: string
  branch_name: string
  branch_code: string
  status: string
  members?: { count: number }[]
}

export function BranchesManager({ branches: initial }: { branches: Branch[] }) {
  const router = useRouter()
  const [branches, setBranches] = useState(initial)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState({ branch_name: "", branch_code: "" })
  const [saving, setSaving] = useState(false)

  const filtered = branches.filter((b) =>
    b.branch_name.toLowerCase().includes(search.toLowerCase()) ||
    b.branch_code.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setEditBranch(null)
    setForm({ branch_name: "", branch_code: "" })
    setShowForm(true)
  }

  function openEdit(b: Branch) {
    setEditBranch(b)
    setForm({ branch_name: b.branch_name, branch_code: b.branch_code })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.branch_name.trim() || !form.branch_code.trim()) {
      toast.error("Branch name and code are required")
      return
    }
    setSaving(true)
    const supabase = createClient()

    if (editBranch) {
      const { error } = await supabase
        .from("branches" as any)
        .update({ branch_name: form.branch_name.trim(), branch_code: form.branch_code.trim().toUpperCase() })
        .eq("id", editBranch.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success("Branch updated")
    } else {
      const { error } = await supabase
        .from("branches" as any)
        .insert({ branch_name: form.branch_name.trim(), branch_code: form.branch_code.trim().toUpperCase() })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success("Branch created")
    }

    setSaving(false)
    setShowForm(false)
    router.refresh()
  }

  async function toggleStatus(b: Branch) {
    const supabase = createClient()
    const newStatus = b.status === "active" ? "inactive" : "active"
    const { error } = await supabase.from("branches" as any).update({ status: newStatus }).eq("id", b.id)
    if (error) { toast.error(error.message); return }
    setBranches((prev) => prev.map((x) => x.id === b.id ? { ...x, status: newStatus } : x))
    toast.success(`Branch ${newStatus === "active" ? "activated" : "deactivated"}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-muted-foreground text-sm">{branches.length} branches configured</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search branches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No branches found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-semibold text-muted-foreground">Branch Code</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Branch Name</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Members</th>
                  <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-mono font-semibold text-primary">{b.branch_code}</td>
                    <td className="p-3 font-medium">{b.branch_name}</td>
                    <td className="p-3 text-muted-foreground">
                      {(b.members as { count: number }[] | undefined)?.[0]?.count ?? 0}
                    </td>
                    <td className="p-3">
                      <Badge variant={b.status === "active" ? "success" : "secondary"}>{b.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(b)}
                        >
                          {b.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Branch Name *</Label>
              <Input
                value={form.branch_name}
                onChange={(e) => setForm((p) => ({ ...p, branch_name: e.target.value }))}
                placeholder="e.g. Main Branch"
              />
            </div>
            <div className="space-y-2">
              <Label>Branch Code *</Label>
              <Input
                value={form.branch_code}
                onChange={(e) => setForm((p) => ({ ...p, branch_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. MAIN"
                className="uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
