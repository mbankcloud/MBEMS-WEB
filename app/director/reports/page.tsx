// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DirectorReports } from "@/components/director/reports"

export const revalidate = 0

export default async function DirectorReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: director } = await db.from("directors").select("id").eq("profile_id", user.id).single()
  if (!director) return null

  const { data: agents } = await db.from("agents").select("id, agent_code, profiles(full_name), agent_member_assignments(count)").eq("director_id", director.id)
  const agentIds = agents?.map(a => a.id) ?? []

  const [
    { data: counseling },
    { data: polling },
    { data: members },
  ] = await Promise.all([
    agentIds.length > 0
      ? db.from("counseling_visits").select("status, agents(agent_code), members(member_id, full_name)").in("agent_id", agentIds)
      : Promise.resolve({ data: [] }),
    agentIds.length > 0
      ? db.from("polling_records").select("polling_status, voted_for, agents(agent_code), members(member_id, full_name)").in("agent_id", agentIds)
      : Promise.resolve({ data: [] }),
    agentIds.length > 0
      ? db.from("agent_member_assignments").select("members(member_id, full_name, branch_name), agents(agent_code)").in("agent_id", agentIds).eq("is_active", true)
      : Promise.resolve({ data: [] }),
  ])

  return <DirectorReports agents={agents ?? []} counseling={counseling ?? []} polling={polling ?? []} members={members ?? []} />
}
