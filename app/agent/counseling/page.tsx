// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentCounselingView } from "@/components/agent/counseling-view"

export const revalidate = 0

export default async function AgentCounselingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: agent } = await db.from("agents").select("id").eq("profile_id", user.id).single()
  if (!agent) return null

  const { data: assignments } = await db.from("agent_member_assignments").select("member_id").eq("agent_id", agent.id).eq("is_active", true)
  const memberIds = assignments?.map(a => a.member_id) ?? []

  const [
    { data: visits },
    { data: candidates },
    { data: supportData },
  ] = await Promise.all([
    memberIds.length > 0
      ? db.from("counseling_visits").select("*, members(member_id, full_name, mobile_number)").eq("agent_id", agent.id).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    db.from("panel_candidates").select("id, candidate_number, full_name, designation, photo_url, symbol_url, symbol_name").eq("is_enabled", true).order("candidate_number"),
    memberIds.length > 0
      ? db.from("member_candidate_support").select("member_id, candidate_id, support_level").eq("agent_id", agent.id)
      : Promise.resolve({ data: [] }),
  ])

  // Build support map: { memberId: { candidateId: support_level } }
  const supportMap = {}
  supportData?.forEach(s => {
    if (!supportMap[s.member_id]) supportMap[s.member_id] = {}
    supportMap[s.member_id][s.candidate_id] = s.support_level
  })

  return <AgentCounselingView
    visits={visits ?? []}
    agentId={agent.id}
    candidates={candidates ?? []}
    supportMap={supportMap}
  />
}
