// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ElectionCountdown } from "@/components/elections/countdown"
import { Users, UserCog, HandshakeIcon, Vote, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export const revalidate = 0 // Always fresh

export default async function DirectorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: director } = await db.from("directors").select("id, director_code").eq("profile_id", user.id).single()
  if (!director) return <div className="text-muted-foreground">Director profile not found</div>

  // Get assigned agents
  const { data: myAgents } = await db.from("agents").select("id, agent_code, profiles(full_name), agent_member_assignments(count)").eq("director_id", director.id)

  // Get assigned members
  const { data: memberAssignments } = await db.from("director_member_assignments").select("member_id").eq("director_id", director.id).eq("is_active", true)
  const memberIds = memberAssignments?.map(a => a.member_id) ?? []

  const agentIds = myAgents?.map(a => a.id) ?? []

  // Stats
  const [
    { count: counselingDone },
    { count: counselingPending },
    { count: pollingVoted },
  ] = await Promise.all([
    agentIds.length > 0
      ? db.from("counseling_visits").select("*", { count: "exact", head: true }).in("agent_id", agentIds).eq("status", "VISITED")
      : Promise.resolve({ count: 0 }),
    agentIds.length > 0
      ? db.from("counseling_visits").select("*", { count: "exact", head: true }).in("agent_id", agentIds).eq("status", "NOT_CONTACTED")
      : Promise.resolve({ count: 0 }),
    agentIds.length > 0
      ? db.from("polling_records").select("*", { count: "exact", head: true }).in("agent_id", agentIds).eq("polling_status", "VOTED")
      : Promise.resolve({ count: 0 }),
  ])

  const { data: settings } = await db.from("system_settings").select("setting_key, setting_value").in("setting_key", ["election_date", "election_time", "election_name"])
  const settingsMap = Object.fromEntries(settings?.map(s => [s.setting_key, s.setting_value]) || [])

  // Recent agent activity
  const { data: recentActivity } = agentIds.length > 0 ? await db
    .from("agent_activity_logs")
    .select("activity_type, created_at, agents(agent_code), members(member_id, full_name)")
    .in("agent_id", agentIds)
    .order("created_at", { ascending: false })
    .limit(10) : { data: [] }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Director Dashboard</h1>
        <p className="text-muted-foreground text-sm">{director.director_code} · Live data</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/director/members">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-3"><Users className="h-5 w-5 text-blue-600" /></div>
              <div className="text-2xl font-bold">{memberIds.length}</div>
              <div className="text-xs text-muted-foreground">My Members</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/director/agents">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center mb-3"><UserCog className="h-5 w-5 text-orange-600" /></div>
              <div className="text-2xl font-bold">{myAgents?.length ?? 0}</div>
              <div className="text-xs text-muted-foreground">My Agents</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/director/counseling">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center mb-3"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
              <div className="text-2xl font-bold">{counselingDone ?? 0}</div>
              <div className="text-xs text-muted-foreground">Counseling Done</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/director/polling">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center mb-3"><Vote className="h-5 w-5 text-purple-600" /></div>
              <div className="text-2xl font-bold">{pollingVoted ?? 0}</div>
              <div className="text-xs text-muted-foreground">Voted (Field)</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* My Agents */}
      {myAgents && myAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">My Agents</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {myAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-3">
                  <div>
                    <span className="font-mono font-semibold text-sm">{agent.agent_code}</span>
                    <span className="text-muted-foreground text-sm ml-2">{agent.profiles?.full_name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {(agent.agent_member_assignments as any)?.[0]?.count ?? 0} members
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Agent Activity (Live)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="font-mono text-xs font-semibold">{a.agents?.agent_code}</span>
                  <span className="text-xs text-muted-foreground">{a.activity_type?.replace(/_/g, " ")}</span>
                  {a.members && <span className="text-xs text-muted-foreground">· {a.members.member_id}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(a.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {settingsMap.election_date && (
        <div className="max-w-sm">
          <ElectionCountdown electionDate={settingsMap.election_date} electionTime={settingsMap.election_time} electionName={settingsMap.election_name} />
        </div>
      )}
    </div>
  )
}
