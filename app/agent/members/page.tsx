// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentMembersList } from "@/components/agent/members-list"

export const revalidate = 0

export default async function AgentMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: agent } = await db.from("agents").select("id").eq("profile_id", user.id).single()
  if (!agent) return null

  const { data: assignments } = await db
    .from("agent_member_assignments")
    .select("member_id")
    .eq("agent_id", agent.id)
    .eq("is_active", true)

  const memberIds = assignments?.map(a => a.member_id) ?? []

  if (!memberIds.length) return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Members</h1>
      <p className="text-muted-foreground">No members assigned to you yet.</p>
    </div>
  )

  const [
    { data: members },
    { data: classifications },
    { data: permissions }
  ] = await Promise.all([
    db.from("members")
      .select("id, member_id, full_name, age, gender, address, mobile_number, branch_name, branches(branch_name)")
      .in("id", memberIds)
      .eq("status", "active")
      .order("full_name"),
    db.from("voter_classifications")
      .select("member_id, classification")
      .eq("agent_id", agent.id),
    db.from("permissions").select("permission_key, default_value"),
  ])

  const classificationMap = Object.fromEntries(
    classifications?.map(c => [c.member_id, c.classification]) ?? []
  )

  const permMap = Object.fromEntries(
    permissions?.map(p => [p.permission_key, p.default_value]) ?? []
  )

  return (
    <AgentMembersList
      members={members ?? []}
      agentId={agent.id}
      permissions={permMap}
      classificationMap={classificationMap}
    />
  )
}
