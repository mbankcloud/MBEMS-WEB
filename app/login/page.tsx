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
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(agent?.profile_photo_url || "")

  async function saveProfile() {
    setSaving(true)
    const supabase = createClient()

    const [profileRes, agentRes] = await Promise.all([
      supabase.from("profiles").update({ full_name: form.full_name }).eq("id", userId),
      supabase.from("agents").update({
        phone_number: form.phone_number || null,
        email_personal: form.email_personal || null,
        address_personal: form.address_personal || null,
      }).eq("profile_id", userId),
    ])

    setSaving(false)

    if (profileRes.error || agentRes.error) {
      toast.error("Failed to save profile")
      return
    }

    toast.success("Profile updated!")
    router.refresh()
  }

  async function savePassword() {
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setSavingPassword(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    })
    setSavingPassword(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Password changed successfully!")
    setPasswordForm({ newPassword: "", confirmPassword: "" })
  }

  async function uploadPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB")
      return
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG or WebP allowed")
      return
    }

    setPhotoUploading(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `profiles/${userId}/profile.${ext}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("meeting-photos")
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message)
      setPhotoUploading(false)
      e.target.value = ""
      return
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("meeting-photos")
      .getPublicUrl(path)

    // Save URL to agents table
    const { error: updateError } = await supabase
      .from("agents")
      .update({ profile_photo_url: publicUrl })
      .eq("profile_id", userId)

    if (updateError) {
      toast.error("Photo uploaded but failed to save: " + updateError.message)
      setPhotoUploading(false)
      e.target.value = ""
      return
    }

    setPhotoUrl(publicUrl)
    setPhotoUploading(false)
    toast.success("Profile photo updated!")
    router.refresh()
    e.target.value = ""
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My Profile</h1>

      {/* Profile Photo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {/* Photo preview */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setPhotoUrl("")}
              />
            ) : (
              <User className="h-10 w-10 text-primary/40" />
            )}
          </div>

          {/* Upload button */}
          <div>
            <label className="cursor-pointer">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors
                ${photoUploading
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-background hover:bg-muted border-input"}`}>
                <Camera className="h-3.5 w-3.5" />
                {photoUploading ? "Uploading..." : "Change Photo"}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadPhoto}
                className="hidden"
                disabled={photoUploading}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or WebP — max 5MB</p>
            {photoUrl && (
              <p className="text-xs text-green-600 mt-0.5">✓ Photo saved</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />Phone Number
            </Label>
            <Input
              value={form.phone_number}
              onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
              placeholder="Your mobile number"
              type="tel"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />Personal Email
            </Label>
            <Input
              value={form.email_personal}
              onChange={e => setForm(p => ({ ...p, email_personal: e.target.value }))}
              placeholder="your@email.com"
              type="email"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />Address
            </Label>
            <Input
              value={form.address_personal}
              onChange={e => setForm(p => ({ ...p, address_personal: e.target.value }))}
              placeholder="Your address"
            />
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Login ID</span>
            <span className="font-mono font-semibold">{profile?.login_id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Agent Code</span>
            <span className="font-mono">{agent?.agent_code}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">System Email</span>
            <span className="font-mono text-xs">{profile?.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Password */}
          <div className="space-y-2">
            <Label>New Password (min 8 characters)</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label>Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password match indicator */}
          {passwordForm.confirmPassword && (
            <p className={`text-xs ${passwordForm.newPassword === passwordForm.confirmPassword ? "text-green-600" : "text-red-500"}`}>
              {passwordForm.newPassword === passwordForm.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
            </p>
          )}

          <Button
            onClick={savePassword}
            disabled={savingPassword}
            variant="outline"
            className="w-full"
          >
            <Key className="h-4 w-4 mr-2" />
            {savingPassword ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
