// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { SystemSettingsForm } from "@/components/admin/system-settings-form"

export default async function SettingsPage() {
  const db = await createServiceClient()
  const { data: settings } = await db.from("system_settings").select("*")
  const settingsMap = Object.fromEntries(settings?.map((s) => [s.setting_key, s.setting_value]) || [])
  return <SystemSettingsForm settings={settingsMap} />
}
