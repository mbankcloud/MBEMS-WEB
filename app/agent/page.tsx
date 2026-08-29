// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentDashboard } from "@/components/agent/dashboard"

export const revalidate = 0

export default async function AgentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const [
    { data: profile },
    { data: agent },
  ] = await Promise.all([
    db.from("profiles").select("full_name, login_id").eq("id", user.id).single(),
    db.from("agents").select("id, agent_code, director_id").eq("profile_id", user.id).single(),
  ])

  if (!agent) return <div className="text-muted-foreground p-4">Agent profile not found</div>

  const [
    { data: assignments },
    { data: counseling },
    { data: classifications },
    { data: settings },
    { data: todayReport },
  ] = await Promise.all([
    db.from("agent_member_assignments").select("member_id", { count: "exact" }).eq("agent_id", agent.id).eq("is_active", true),
    db.from("counseling_visits").select("status").eq("agent_id", agent.id),
    db.from("voter_classifications").select("classification").eq("agent_id", agent.id),
    db.from("system_settings").select("setting_key, setting_value").in("setting_key", ["election_date", "election_time", "election_name"]),
    db.from("daily_reports").select("*").eq("agent_id", agent.id).eq("report_date", new Date().toISOString().split("T")[0]).single(),
  ])

  const classCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  classifications?.forEach(c => { if (classCounts[c.classification] !== undefined) classCounts[c.classification]++ })

  const settingsMap = Object.fromEntries(settings?.map(s => [s.setting_key, s.setting_value]) ?? [])
  const totalAssigned = assignments?.length ?? 0
  const visited = counseling?.filter(c => c.status === "VISITED").length ?? 0
  const rescheduled = counseling?.filter(c => c.status === "RESCHEDULED").length ?? 0
  const notContacted = counseling?.filter(c => c.status === "NOT_CONTACTED").length ?? 0

  return (
    <AgentDashboard
      agentId={agent.id}
      agentCode={agent.agent_code}
      agentName={profile?.full_name}
      totalAssigned={totalAssigned}
      visited={visited}
      rescheduled={rescheduled}
      notContacted={notContacted}
      classCounts={classCounts}
      settings={settingsMap}
      todayReport={todayReport}
    />
  )
}
