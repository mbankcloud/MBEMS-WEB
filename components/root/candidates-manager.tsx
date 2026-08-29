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
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, User, Pencil, Trash2, Upload, Power, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

export function CandidatesManager({ candidates: initial, elections, supportCount }) {
  const router = useRouter()
  const [candidates, setCandidates] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [form, setForm] = useState({ candidate_number: "", full_name: "", designation: "", symbol_name: "", bio: "", election_id: "" })
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [symbolFile, setSymbolFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function uploadFile(file, path) {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const fullPath = `${path}.${ext}`
    const { error } = await supabase.storage.from("candidate-photos").upload(fullPath, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from("candidate-photos").getPublicUrl(fullPath)
    return publicUrl
  }

  async function handleCreate() {
    if (!form.full_name.trim() || !form.candidate_number) { toast.error("Number and name required"); return }
    setSaving(true)
    const supabase = createClient()
    let photo_url = null, symbol_url = null

    if (photoFile) {
      try { photo_url = await uploadFile(photoFile, `candidate_${form.candidate_number}_photo`) }
      catch (e) { toast.error("Photo upload failed: " + e.message) }
    }
    if (symbolFile) {
      try { symbol_url = await uploadFile(symbolFile, `candidate_${form.candidate_number}_symbol`) }
      catch (e) { toast.error("Symbol upload failed: " + e.message) }
    }

    const { data, error } = await supabase.from("panel_candidates").insert({
      candidate_number: parseInt(form.candidate_number),
      full_name: form.full_name,
      designation: form.designation || null,
      symbol_name: form.symbol_name || null,
      bio: form.bio || null,
      election_id: form.election_id || null,
      photo_url, symbol_url,
      is_active: true, is_enabled: true,
    }).select().single()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    setCandidates(prev => [...prev, data].sort((a, b) => a.candidate_number - b.candidate_number))
    toast.success("Candidate added!")
    setShowCreate(false)
    setForm({ candidate_number: "", full_name: "", designation: "", symbol_name: "", bio: "", election_id: "" })
    setPhotoFile(null); setSymbolFile(null)
  }

  async function handleEdit() {
    if (!showEdit) return
    setSaving(true)
    const supabase = createClient()
    let photo_url = showEdit.photo_url, symbol_url = showEdit.symbol_url

    if (photoFile) {
      try { photo_url = await uploadFile(photoFile, `candidate_${showEdit.candidate_number}_photo`) }
      catch (e) { toast.error("Photo upload failed") }
    }
    if (symbolFile) {
      try { symbol_url = await uploadFile(symbolFile, `candidate_${showEdit.candidate_number}_symbol`) }
      catch (e) { toast.error("Symbol upload failed") }
    }

    const { error } = await supabase.from("panel_candidates").update({
      full_name: form.full_name || showEdit.full_name,
      designation: form.designation ?? showEdit.designation,
      symbol_name: form.symbol_name ?? showEdit.symbol_name,
      bio: form.bio ?? showEdit.bio,
      photo_url, symbol_url, updated_at: new Date().toISOString(),
    }).eq("id", showEdit.id)

    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success("Candidate updated!")
    setShowEdit(null); setPhotoFile(null); setSymbolFile(null)
    router.refresh()
  }

  async function toggleEnabled(candidate) {
    const supabase = createClient()
    const newVal = !candidate.is_enabled
    await supabase.from("panel_candidates").update({ is_enabled: newVal }).eq("id", candidate.id)
    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, is_enabled: newVal } : c))
    toast.success(`Candidate ${newVal ? "enabled" : "disabled"} for agents`)
  }

  async function handleDelete() {
    if (!showDelete) return
    const supabase = createClient()
    await supabase.from("member_candidate_support").delete().eq("candidate_id", showDelete.id)
    const { error } = await supabase.from("panel_candidates").delete().eq("id", showDelete.id)
    if (error) { toast.error(error.message); return }
    setCandidates(prev => prev.filter(c => c.id !== showDelete.id))
    setShowDelete(null)
    toast.success("Candidate deleted")
  }

  function openEdit(c) {
    setShowEdit(c)
    setForm({ full_name: c.full_name, designation: c.designation || "", symbol_name: c.symbol_name || "", bio: c.bio || "" })
    setPhotoFile(null); setSymbolFile(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Panel Candidates</h1>
          <p className="text-muted-foreground text-sm">{candidates.length} of 17 candidates added · Visible to agents for tracking</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={candidates.length >= 17}>
          <Plus className="h-4 w-4 mr-2" />Add Candidate
        </Button>
      </div>

      {candidates.length < 17 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Add all 17 panel candidates. Agents will see their photos and symbols when tracking member support.
        </div>
      )}

      <div className="grid gap-3">
        {candidates.map(c => (
          <Card key={c.id} className={!c.is_enabled ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Photo */}
                <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 border">
                  {c.photo_url
                    ? <img src={c.photo_url} alt={c.full_name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User className="h-6 w-6 text-muted-foreground/40" /></div>}
                </div>
                {/* Symbol */}
                {c.symbol_url && (
                  <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0 border">
                    <img src={c.symbol_url} alt="symbol" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs font-bold">#{c.candidate_number}</Badge>
                    <span className="font-semibold">{c.full_name}</span>
                    {!c.is_enabled && <Badge variant="secondary" className="text-xs">Hidden from agents</Badge>}
                    {c.symbol_name && <Badge variant="outline" className="text-xs">{c.symbol_name}</Badge>}
                  </div>
                  {c.designation && <div className="text-xs text-muted-foreground mt-0.5">{c.designation}</div>}
                  <div className="text-xs text-green-700 mt-0.5 font-semibold">
                    {supportCount[c.id] || 0} members supporting
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5" title={c.is_enabled ? "Visible to agents" : "Hidden from agents"}>
                    <Switch checked={c.is_enabled} onCheckedChange={() => toggleEnabled(c)} />
                  </div>
                  <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => setShowDelete(c)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit shared form */}
      {[{ open: showCreate, onClose: () => setShowCreate(false), onSave: handleCreate, title: "Add Candidate" },
        { open: !!showEdit, onClose: () => setShowEdit(null), onSave: handleEdit, title: `Edit — ${showEdit?.full_name}` }
      ].map(({ open, onClose, onSave, title }, idx) => (
        <Dialog key={idx} open={open} onOpenChange={o => !o && onClose()}>
          <DialogContent>
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
              {idx === 0 && (
                <div className="space-y-1.5">
                  <Label>Candidate Number (1–17) *</Label>
                  <Input type="number" min="1" max="17" value={form.candidate_number} onChange={e => setForm(p => ({ ...p, candidate_number: e.target.value }))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Candidate's full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Designation / Position</Label>
                <Input value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} placeholder="e.g. Businessman, Ex-Director" />
              </div>
              <div className="space-y-1.5">
                <Label>Symbol Name</Label>
                <Input value={form.symbol_name} onChange={e => setForm(p => ({ ...p, symbol_name: e.target.value }))} placeholder="e.g. Rose, Star, Bicycle" />
              </div>
              <div className="space-y-1.5">
                <Label>Candidate Photo</Label>
                <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{photoFile ? photoFile.name : (showEdit?.photo_url ? "Change photo" : "Upload photo")}</span>
                  <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0])} className="hidden" />
                </label>
                {showEdit?.photo_url && !photoFile && <img src={showEdit.photo_url} alt="" className="h-16 w-16 rounded object-cover border" />}
              </div>
              <div className="space-y-1.5">
                <Label>Election Symbol / Logo</Label>
                <label className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{symbolFile ? symbolFile.name : (showEdit?.symbol_url ? "Change symbol" : "Upload symbol image")}</span>
                  <input type="file" accept="image/*" onChange={e => setSymbolFile(e.target.files?.[0])} className="hidden" />
                </label>
                {showEdit?.symbol_url && !symbolFile && <img src={showEdit.symbol_url} alt="" className="h-16 w-16 rounded object-cover border" />}
              </div>
              <div className="space-y-1.5">
                <Label>Bio / Notes</Label>
                <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief background..." rows={2} />
              </div>
              {idx === 0 && elections.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Link to Election</Label>
                  <Select value={form.election_id} onValueChange={v => setForm(p => ({ ...p, election_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select election..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific election</SelectItem>
                      {elections.map(e => <SelectItem key={e.id} value={e.id}>{e.election_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : (idx === 0 ? "Add Candidate" : "Save Changes")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* Delete dialog */}
      <Dialog open={!!showDelete} onOpenChange={o => !o && setShowDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Delete Candidate</DialogTitle></DialogHeader>
          <div className="py-4 text-sm">
            <p>Delete <strong>#{showDelete?.candidate_number} {showDelete?.full_name}</strong>?</p>
            <p className="text-muted-foreground mt-2">All support tracking data for this candidate will also be deleted.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Candidate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
