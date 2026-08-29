// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Save, Calendar, Building, Globe } from "lucide-react"

interface SystemSettingsFormProps {
  settings: Record<string, string>
}

export function SystemSettingsForm({ settings }: SystemSettingsFormProps) {
  const [values, setValues] = useState({ ...settings })
  const [saving, setSaving] = useState(false)

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function saveSettings() {
    setSaving(true)
    const supabase = createClient()

    const updates = Object.entries(values).map(([key, value]) =>
      supabase
        .from("system_settings")
        .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" })
    )

    const results = await Promise.all(updates)
    const hasError = results.some((r) => r.error)

    if (hasError) {
      toast.error("Failed to save some settings")
    } else {
      toast.success("Settings saved successfully")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure organization, election, and system-wide settings.
          Changes take effect immediately.
        </p>
      </div>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input
              value={values.organization_name || ""}
              onChange={(e) => update("organization_name", e.target.value)}
              placeholder="e.g. The Muslim Co-Operative Bank Ltd."
            />
          </div>
          <div className="space-y-2">
            <Label>System Name</Label>
            <Input
              value={values.system_name || ""}
              onChange={(e) => update("system_name", e.target.value)}
              placeholder="e.g. Bank Election Management System"
            />
          </div>
        </CardContent>
      </Card>

      {/* Election */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Election Configuration
          </CardTitle>
          <CardDescription>
            These settings drive the election countdown and polling module activation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Election Name</Label>
            <Input
              value={values.election_name || ""}
              onChange={(e) => update("election_name", e.target.value)}
              placeholder="e.g. Board Election 2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Election Date</Label>
              <Input
                type="date"
                value={values.election_date || ""}
                onChange={(e) => update("election_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Election Time</Label>
              <Input
                type="time"
                value={values.election_time || ""}
                onChange={(e) => update("election_time", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input
              value={values.election_timezone || ""}
              onChange={(e) => update("election_timezone", e.target.value)}
              placeholder="Asia/Kolkata"
            />
            <p className="text-xs text-muted-foreground">e.g. Asia/Kolkata, UTC, America/New_York</p>
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            System Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pagination Size</Label>
              <Input
                type="number"
                min="10"
                max="100"
                value={values.pagination_size || "25"}
                onChange={(e) => update("pagination_size", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Upload Size (MB)</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={values.max_upload_size_mb || "10"}
                onChange={(e) => update("max_upload_size_mb", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  )
}
