// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { AuditLogsView } from "@/components/root/audit-logs"
export const revalidate = 0

export default async function RootAuditPage() {
  const db = await createServiceClient()

  const { data: logs } = await db
    .from("audit_logs")
    .select("id, user_id, user_login_id, action, entity_type, entity_id, old_data, new_data, created_at")
    .order("created_at", { ascending: false })
    .limit(1000)

  // Get user names for logs
  const userIds = [...new Set(logs?.map(l => l.user_id).filter(Boolean))]
  let profileMap = {}
  if (userIds.length > 0) {
    const { data: profiles } = await db.from("profiles").select("id, full_name, login_id, role").in("id", userIds)
    profileMap = Object.fromEntries(profiles?.map(p => [p.id, p]) ?? [])
  }

  const enrichedLogs = logs?.map(l => ({
    ...l,
    profile: l.user_id ? profileMap[l.user_id] : null
  })) ?? []

  return <AuditLogsView logs={enrichedLogs} />
}
