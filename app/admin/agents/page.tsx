// @ts-nocheck
export const revalidate = 30
import { createServiceClient } from "@/lib/supabase/server"
import { AgentsManager } from "@/components/admin/agents-manager"

export default async function AgentsPage() {
  const db = await createServiceClient()
  const { data: agents } = await db.from("agents").select("id, agent_code, notes, created_at, profiles(id, full_name, login_id, is_active), directors(id, director_code, profiles(full_name)), agent_member_assignments(count)").order("created_at", { ascending: false })
  const { data: directors } = await db.from("directors").select("id, director_code, profiles(full_name)").order("director_code")
  return <AgentsManager agents={agents ?? []} directors={directors ?? []} />
}
