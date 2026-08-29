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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { getWhatsAppLink, getMapLink } from "@/lib/utils"
import { Phone, MessageCircle, MapPin, HandshakeIcon, Search, User, Home, ChevronRight, Camera, Upload } from "lucide-react"

const CLASS_CONFIG = {
  A: { label: "A", color: "bg-green-600 text-white", desc: "Confirmed — will vote us" },
  B: { label: "B", color: "bg-blue-600 text-white", desc: "Leaning towards us" },
  C: { label: "C", color: "bg-amber-500 text-white", desc: "Undecided" },
  D: { label: "D", color: "bg-red-600 text-white", desc: "Opposition" },
  E: { label: "E", color: "bg-gray-400 text-white", desc: "Unknown/unreachable" },
}

const COUNSELING_STATUSES = [
  { value: "VISITED", label: "Visited" },
  { value: "NOT_HOME", label: "Not Home" },
  { value: "PHONE_CONTACT", label: "Phone Contact" },
  { value: "RESCHEDULED", label: "Rescheduled" },
  { value: "REFUSED", label: "Refused" },
  { value: "NOT_CONTACTED", label: "Not Contacted" },
]

export function AgentMembersList({ members, agentId, permissions, classificationMap: initialClassMap }) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [searchType, setSearchType] = useState("both")
  const [selected, setSelected] = useState(null)
  const [showCounseling, setShowCounseling] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [showClassify, setShowClassify] = useState(false)
  const [classMap, setClassMap] = useState(initialClassMap || {})
  const [counselingForm, setCounselingForm] = useState({ status: "VISITED", feedback: "", contact_method: "in_person", follow_up_date: "" })
  const [saving, setSaving] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [meetingPhotos, setMeetingPhotos] = useState([])
  const [classNote, setClassNote] = useState("")

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    if (!q) return true
    if (searchType === "id") return m.member_id.toLowerCase().includes(q)
    if (searchType === "name") return m.full_name.toLowerCase().includes(q)
    return m.member_id.toLowerCase().includes(q) || m.full_name.toLowerCase().includes(q)
  })

  async function logActivity(memberId, type) {
    const supabase = createClient()
    await supabase.from("agent_activity_logs").insert({ agent_id: agentId, member_id: memberId, activity_type: type }).then(() => {})
  }

  function handleCall(member) {
    if (!member.mobile_number) { toast.error("No mobile number"); return }
    logActivity(member.id, "CALL_CLICKED")
    window.open(`tel:${member.mobile_number}`)
  }

  function handleWhatsApp(member) {
    if (!member.mobile_number) { toast.error("No mobile number"); return }
    logActivity(member.id, "WHATSAPP_CLICKED")
    const num = member.mobile_number.replace(/\D/g, "")
    window.open(`https://wa.me/91${num}`, "_blank")
  }

  async function saveClassification(memberId, classification) {
    const supabase = createClient()
    await supabase.from("voter_classifications").upsert(
      { agent_id: agentId, member_id: memberId, classification, notes: classNote || null, updated_at: new Date().toISOString() },
      { onConflict: "agent_id,member_id" }
    )
    setClassMap(prev => ({ ...prev, [memberId]: classification }))
    await logActivity(memberId, "VOTER_CLASSIFIED")
    toast.success(`Member classified as ${classification}`)
    setShowClassify(false)
    setClassNote("")
  }

  async function loadPhotos(memberId) {
    const supabase = createClient()
    const { data } = await supabase.from("meeting_photos").select("*").eq("agent_id", agentId).eq("member_id", memberId).order("created_at", { ascending: false })
    setMeetingPhotos(data || [])
  }

  async function uploadPhoto(e) {
    if (!selected) return
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return }
    setPhotoUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${agentId}/meetings/${selected.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("meeting-photos").upload(path, file)
    if (error) { toast.error(error.message); setPhotoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from("meeting-photos").getPublicUrl(path)
    await supabase.from("meeting_photos").insert({ agent_id: agentId, member_id: selected.id, photo_url: publicUrl })
    await logActivity(selected.id, "PHOTO_UPLOADED")
    toast.success("Photo uploaded!")
    loadPhotos(selected.id)
    setPhotoUploading(false)
    e.target.value = ""
  }

  async function saveCounseling() {
    if (!selected) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("counseling_visits").upsert({
      agent_id: agentId, member_id: selected.id,
      status: counselingForm.status, feedback: counselingForm.feedback || null,
      contact_method: counselingForm.contact_method,
      follow_up_date: counselingForm.follow_up_date || null,
      visit_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    }, { onConflict: "agent_id,member_id" })

    if (error) {
      await supabase.from("counseling_visits").delete().eq("agent_id", agentId).eq("member_id", selected.id)
      await supabase.from("counseling_visits").insert({ agent_id: agentId, member_id: selected.id, status: counselingForm.status, feedback: counselingForm.feedback || null, contact_method: counselingForm.contact_method, visit_date: new Date().toISOString().split("T")[0] })
    }

    await logActivity(selected.id, "COUNSELING_UPDATED")
    toast.success("Counseling saved!")
    setSaving(false)
    setShowCounseling(false)
    router.refresh()
  }

  const getClassBadge = (memberId) => {
    const cls = classMap[memberId]
    if (!cls) return null
    const cfg = CLASS_CONFIG[cls]
    return <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cfg.color}`}>{cls}</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Members</h1>
        <Badge variant="info">{members.length}</Badge>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={searchType} onValueChange={setSearchType}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="both">ID + Name</SelectItem>
            <SelectItem value="id">ID Only</SelectItem>
            <SelectItem value="name">Name Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {members.length} members</p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No members found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => (
            <Card key={member.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => { setSelected(member); setShowCounseling(false); setShowPhotos(false); setShowClassify(false) }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{member.full_name}</span>
                      {member.age && <span className="text-xs text-muted-foreground">· {member.age}y</span>}
                      {getClassBadge(member.id)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{member.member_id}</span>
                      {(member.branches?.branch_name || member.branch_name) && (
                        <Badge variant="outline" className="text-[10px] py-0">{member.branches?.branch_name || member.branch_name}</Badge>
                      )}
                    </div>
                    {member.mobile_number && <div className="text-xs text-muted-foreground font-mono mt-0.5">{member.mobile_number}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8 text-xs" onClick={() => handleCall(member)}>
                    <Phone className="h-3 w-3 mr-1" />Call
                  </Button>
                  <Button size="sm" className="flex-1 bg-[#25D366] hover:bg-[#20ba58] text-white h-8 text-xs" onClick={() => handleWhatsApp(member)}>
                    <MessageCircle className="h-3 w-3 mr-1" />WA
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={e => { e.stopPropagation(); setSelected(member); setShowCounseling(true) }}>
                    <HandshakeIcon className="h-3 w-3 mr-1" />Visit
                  </Button>
                  {/* A/B/C/D/E Quick Classify */}
                  <button onClick={e => { e.stopPropagation(); setSelected(member); setShowClassify(true) }}
                    className={`flex-1 h-8 text-xs font-bold rounded border transition-colors ${classMap[member.id] ? CLASS_CONFIG[classMap[member.id]]?.color : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {classMap[member.id] || "Classify"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Member Detail Dialog */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setShowCounseling(false); setShowPhotos(false); setShowClassify(false) } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />{selected.full_name}
                {classMap[selected.id] && (
                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${CLASS_CONFIG[classMap[selected.id]]?.color}`}>
                    {classMap[selected.id]}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* A/B/C/D/E Classification */}
            {showClassify && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Classify Voter — {selected.full_name}</p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(CLASS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => saveClassification(selected.id, key)}
                      className={`p-2 rounded-lg border-2 text-center transition-all ${classMap[selected.id] === key ? "border-current scale-105" : "border-transparent"} ${cfg.color}`}>
                      <div className="text-lg font-bold">{key}</div>
                      <div className="text-[9px] leading-tight mt-0.5">{cfg.desc.split("—")[0]}</div>
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input value={classNote} onChange={e => setClassNote(e.target.value)} placeholder="e.g. Will vote, waiting for final push" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground p-3 bg-muted rounded-lg">
                  {Object.entries(CLASS_CONFIG).map(([k, v]) => <div key={k}><strong>{k}</strong> — {v.desc}</div>)}
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowClassify(false)}>← Back</Button>
              </div>
            )}

            {!showCounseling && !showPhotos && !showClassify && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-muted-foreground">Member ID</div><div className="font-mono font-semibold">{selected.member_id}</div></div>
                  <div><div className="text-xs text-muted-foreground">Age/Gender</div><div>{selected.age ?? "—"} · {selected.gender ?? "—"}</div></div>
                  {selected.mobile_number && <div><div className="text-xs text-muted-foreground">Mobile</div><div className="font-mono">{selected.mobile_number}</div></div>}
                  {(selected.branches?.branch_name || selected.branch_name) && <div><div className="text-xs text-muted-foreground">Branch</div><div>{selected.branches?.branch_name || selected.branch_name}</div></div>}
                  {selected.address && <div className="col-span-2"><div className="text-xs text-muted-foreground">Address</div><div className="text-xs flex items-start gap-1"><Home className="h-3.5 w-3.5 mt-0.5 shrink-0" />{selected.address}</div></div>}
                </div>

                {/* A/B/C/D/E quick classify */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">VOTER CLASSIFICATION</p>
                  <div className="flex gap-1.5">
                    {Object.entries(CLASS_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => saveClassification(selected.id, key)}
                        className={`flex-1 py-2 rounded font-bold text-sm transition-all ${classMap[selected.id] === key ? cfg.color + " scale-105 shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {key}
                      </button>
                    ))}
                  </div>
                  {classMap[selected.id] && <p className="text-xs text-muted-foreground mt-1">{CLASS_CONFIG[classMap[selected.id]]?.desc}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleCall(selected)}><Phone className="h-4 w-4 mr-2" />Call</Button>
                  <Button className="bg-[#25D366] hover:bg-[#20ba58] text-white" onClick={() => handleWhatsApp(selected)}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button>
                  {selected.address && <Button variant="outline" onClick={() => window.open(getMapLink(selected.address), "_blank")}><MapPin className="h-4 w-4 mr-2" />Map</Button>}
                  <Button onClick={() => setShowCounseling(true)}><HandshakeIcon className="h-4 w-4 mr-2" />Counseling</Button>
                  <Button variant="outline" className="col-span-2" onClick={() => { setShowPhotos(true); loadPhotos(selected.id) }}>
                    <Camera className="h-4 w-4 mr-2" />Meeting Photos
                  </Button>
                </div>
              </div>
            )}

            {showCounseling && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setShowCounseling(false)} className="pl-0">← Back</Button>
                <p className="text-sm font-semibold">Log Visit — {selected.full_name}</p>
                <div className="space-y-2">
                  <Label className="text-xs">Visit Status</Label>
                  <Select value={counselingForm.status} onValueChange={v => setCounselingForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNSELING_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contact Method</Label>
                  <Select value={counselingForm.contact_method} onValueChange={v => setCounselingForm(p => ({ ...p, contact_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Feedback / Notes</Label>
                  <Textarea value={counselingForm.feedback} onChange={e => setCounselingForm(p => ({ ...p, feedback: e.target.value }))} placeholder="Member's response..." rows={3} />
                </div>
                {counselingForm.status === "RESCHEDULED" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Follow-up Date</Label>
                    <Input type="date" value={counselingForm.follow_up_date} onChange={e => setCounselingForm(p => ({ ...p, follow_up_date: e.target.value }))} />
                  </div>
                )}
                <Button onClick={saveCounseling} disabled={saving} className="w-full">{saving ? "Saving..." : "Save Visit Record"}</Button>
              </div>
            )}

            {showPhotos && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setShowPhotos(false)} className="pl-0">← Back</Button>
                  <span className="text-sm font-semibold">Meeting Photos</span>
                </div>
                <label className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/20">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{photoUploading ? "Uploading..." : "Upload Meeting Photo"}</span>
                  <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" disabled={photoUploading} />
                </label>
                {meetingPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No photos yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {meetingPhotos.map(p => (
                      <div key={p.id} className="aspect-square rounded-md overflow-hidden border">
                        <img src={p.photo_url} alt="Meeting" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
