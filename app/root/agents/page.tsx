// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { RootAgentsManager } from "@/components/root/agents-manager"
export const revalidate = 0
export default async function RootAgentsPage() {
  const db = await createServiceClient()
  const [{ data: agents }, { data: directors }] = await Promise.all([
    db.from("agents").select("id, agent_code, created_at, director_id, profile_photo_url, profiles(id, full_name, login_id, is_active), directors(director_code), agent_member_assignments(count)").order("created_at", { ascending: false }),
    db.from("directors").select("id, director_code, profiles(full_name)").order("director_code")
  ])
  return <RootAgentsManager agents={agents ?? []} directors={directors ?? []} />
}
