// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentPollingView } from "@/components/agent/polling-view"

export const revalidate = 0

export default async function AgentPollingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: agent } = await db.from("agents").select("id").eq("profile_id", user.id).single()
  if (!agent) return null

  const { data: pollingPerm } = await db.from("permissions").select("default_value").eq("permission_key", "election.polling_day_module").single()
  const pollingEnabled = pollingPerm?.default_value ?? false

  if (!pollingEnabled) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Polling Day</h1>
        <div className="p-6 bg-muted rounded-lg text-center">
          <p className="text-muted-foreground font-medium">Polling module not active</p>
          <p className="text-muted-foreground text-sm mt-1">Your administrator will enable this on election day.</p>
        </div>
      </div>
    )
  }

  const { data: assignments } = await db.from("agent_member_assignments").select("member_id").eq("agent_id", agent.id).eq("is_active", true)
  const memberIds = assignments?.map(a => a.member_id) ?? []
  if (!memberIds.length) return <div className="space-y-4"><h1 className="text-xl font-bold">Polling Day</h1><p className="text-muted-foreground">No members assigned.</p></div>

  const [
    { data: members },
    { data: pollingRecords },
    { data: classifications },
  ] = await Promise.all([
    db.from("members").select("id, member_id, full_name, mobile_number").in("id", memberIds).eq("status", "active").order("full_name"),
    db.from("polling_records").select("member_id, polling_status, voted_for").eq("agent_id", agent.id),
    db.from("voter_classifications").select("member_id, classification").eq("agent_id", agent.id),
  ])

  const pollingMap = Object.fromEntries(pollingRecords?.map(r => [r.member_id, { status: r.polling_status, voted_for: r.voted_for }]) ?? [])
  const classMap = Object.fromEntries(classifications?.map(c => [c.member_id, c.classification]) ?? [])

  return <AgentPollingView members={members ?? []} agentId={agent.id} pollingMap={pollingMap} classMap={classMap} />
}
