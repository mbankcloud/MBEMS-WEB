// @ts-nocheck
export const revalidate = 0
import { createServiceClient } from "@/lib/supabase/server"
import { AssignmentsManager } from "@/components/admin/assignments-manager"

export default async function AssignmentsPage() {
  const db = await createServiceClient()
  const { data: directors } = await db.from("directors").select("id, director_code, profiles(full_name)").order("director_code")
  const { data: agents } = await db.from("agents").select("id, agent_code, director_id, profiles(full_name)").order("agent_code")
  const { data: recentAssignments } = await db.from("agent_member_assignments").select("id, assigned_at, is_active, members(member_id, full_name), agents(agent_code, profiles(full_name)), profiles(login_id)").order("assigned_at", { ascending: false }).limit(30)
  const { count: totalAssigned } = await db.from("agent_member_assignments").select("*", { count: "exact", head: true }).eq("is_active", true)
  const { count: totalMembers } = await db.from("members").select("*", { count: "exact", head: true }).eq("status", "active")
  return <AssignmentsManager directors={directors ?? []} agents={agents ?? []} recentAssignments={recentAssignments ?? []} totalAssigned={totalAssigned ?? 0} totalMembers={totalMembers ?? 0} />
}
