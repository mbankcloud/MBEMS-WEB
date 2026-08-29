// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Phone, Mail, MapPin, Key, Camera, Save } from "lucide-react"
import { useRouter } from "next/navigation"

export function AgentProfileForm({ profile, agent, userId }) {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone_number: agent?.phone_number || "",
    email_personal: agent?.email_personal || "",
    address_personal: agent?.address_personal || "",
  })
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" })
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(agent?.profile_photo_url || "")

  async function saveProfile() {
    setSaving(true)
    const supabase = createClient()

    await supabase.from("profiles").update({ full_name: form.full_name }).eq("id", userId)
    await supabase.from("agents").update({
      phone_number: form.phone_number || null,
      email_personal: form.email_personal || null,
      address_personal: form.address_personal || null,
    }).eq("profile_id", userId)

    setSaving(false)
    toast.success("Profile updated!")
    router.refresh()
  }

  async function savePassword() {
    if (passwordForm.newPassword.length < 8) { toast.error("Password must be 8+ characters"); return }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords don't match"); return }
    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
    setSavingPassword(false)
    if (error) { toast.error(error.message); return }
    toast.success("Password changed successfully!")
    setPasswordForm({ newPassword: "", confirmPassword: "" })
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return }

    setPhotoUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${userId}/profile.${ext}`

    const { error: uploadError } = await supabase.storage.from("meeting-photos").upload(path, file, { upsert: true })
    if (uploadError) { toast.error(uploadError.message); setPhotoUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from("meeting-photos").getPublicUrl(path)
    await supabase.from("agents").update({ profile_photo_url: publicUrl }).eq("profile_id", userId)
    setPhotoUrl(publicUrl)
    setPhotoUploading(false)
    toast.success("Profile photo updated!")
    router.refresh()
    e.target.value = ""
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My Profile</h1>

      {/* Photo */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" />Profile Photo</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
            {photoUrl ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <User className="h-10 w-10 text-primary/40" />}
          </div>
          <div>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span><Camera className="h-3.5 w-3.5 mr-1" />{photoUploading ? "Uploading..." : "Change Photo"}</span>
              </Button>
              <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" disabled={photoUploading} />
            </label>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG under 5MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label><Phone className="h-3.5 w-3.5 inline mr-1" />Phone Number</Label>
              <Input value={form.phone_number} onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))} placeholder="Your mobile number" type="tel" />
            </div>
            <div className="space-y-2">
              <Label><Mail className="h-3.5 w-3.5 inline mr-1" />Personal Email</Label>
              <Input value={form.email_personal} onChange={e => setForm(p => ({ ...p, email_personal: e.target.value }))} placeholder="your@email.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label><MapPin className="h-3.5 w-3.5 inline mr-1" />Address</Label>
              <Input value={form.address_personal} onChange={e => setForm(p => ({ ...p, address_personal: e.target.value }))} placeholder="Your address" />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Account Info</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Login ID</span><span className="font-mono font-semibold">{profile?.login_id}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Agent Code</span><span className="font-mono">{agent?.agent_code}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">System Email</span><span className="font-mono text-xs">{profile?.email}</span></div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" />Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New Password (min 8 characters)</Label>
            <Input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="New password" />
          </div>
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <Input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm password" />
          </div>
          <Button onClick={savePassword} disabled={savingPassword} variant="outline" className="w-full">
            <Key className="h-4 w-4 mr-2" />{savingPassword ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
