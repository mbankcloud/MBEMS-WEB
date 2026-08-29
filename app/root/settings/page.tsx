// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { SystemSettingsForm } from "@/components/admin/system-settings-form"
export const revalidate = 0
export default async function RootSettingsPage() {
  const db = await createServiceClient()
  const { data: settings } = await db.from("system_settings").select("*")
  const settingsMap = Object.fromEntries(settings?.map(s => [s.setting_key, s.setting_value]) || [])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">System Settings</h1>
      <SystemSettingsForm settings={settingsMap} />
    </div>
  )
}
