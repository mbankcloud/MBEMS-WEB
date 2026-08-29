// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ElectionCountdown } from "@/components/elections/countdown"
import { Users, GitBranch, UserCheck, UserCog, HandshakeIcon, Vote, Activity, FileText } from "lucide-react"
import Link from "next/link"
import { formatTimeAgo } from "@/lib/utils"

export const revalidate = 30 // Cache for 30 seconds - dashboard doesn't need to be always live

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()

  // Run ALL queries in parallel
  const [
    { count: totalMembers },
    { count: totalBranches },
    { count: totalDirectors },
    { count: totalAgents },
    { count: assignedMembers },
    { count: counselingDone },
    { count: pollingVoted },
    { data: settings },
    { data: recentActivity },
  ] = await Promise.all([
    db.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("branches").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("directors").select("*", { count: "exact", head: true }),
    db.from("agents").select("*", { count: "exact", head: true }),
    db.from("agent_member_assignments").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("counseling_visits").select("*", { count: "exact", head: true }).eq("status", "VISITED"),
    db.from("polling_records").select("*", { count: "exact", head: true }).eq("polling_status", "VOTED"),
    db.from("system_settings").select("setting_key, setting_value").in("setting_key", ["election_date", "election_time", "election_name", "organization_name"]),
    db.from("agent_activity_logs").select("activity_type, created_at, agents(agent_code), members(member_id)").order("created_at", { ascending: false }).limit(6),
  ])

  const settingsMap = Object.fromEntries(settings?.map(s => [s.setting_key, s.setting_value]) || [])
  const assignmentPct = totalMembers ? Math.round(((assignedMembers ?? 0) / totalMembers) * 100) : 0

  const stats = [
    { label: "Total Members", value: totalMembers ?? 0, icon: Users, bg: "bg-blue-50", color: "text-blue-600", href: "/admin/members" },
    { label: "Active Branches", value: totalBranches ?? 0, icon: GitBranch, bg: "bg-indigo-50", color: "text-indigo-600", href: "/admin/branches" },
    { label: "Directors", value: totalDirectors ?? 0, icon: UserCheck, bg: "bg-purple-50", color: "text-purple-600", href: "/admin/directors" },
    { label: "Field Agents", value: totalAgents ?? 0, icon: UserCog, bg: "bg-orange-50", color: "text-orange-600", href: "/admin/agents" },
    { label: "Members Assigned", value: assignedMembers ?? 0, icon: FileText, bg: "bg-teal-50", color: "text-teal-600", href: "/admin/assignments" },
    { label: "Counseling Done", value: counselingDone ?? 0, icon: HandshakeIcon, bg: "bg-green-50", color: "text-green-600", href: "/admin/counseling" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{settingsMap.organization_name || "Bank Election Management System"}</p>
        </div>
        {(pollingVoted ?? 0) > 0 && (
          <Badge variant="success" className="text-sm px-3 py-1">
            <Vote className="h-3.5 w-3.5 mr-1" />{pollingVoted} Voted
          </Badge>
        )}
      </div>

      {/* Stats - all prefetchable links */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href} prefetch={true}>
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="p-4">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Assignment Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Assignment Progress</span>
            <span className="text-sm text-muted-foreground">{assignedMembers?.toLocaleString()} / {totalMembers?.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${assignmentPct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{assignmentPct}% members assigned to agents</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsMap.election_date && (
          <ElectionCountdown electionDate={settingsMap.election_date} electionTime={settingsMap.election_time} electionName={settingsMap.election_name} />
        )}

        {/* Live Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />Live Activity
              </CardTitle>
              <Link href="/admin/activity" prefetch={true} className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!recentActivity?.length ? (
              <p className="text-sm text-muted-foreground p-4">No activity yet</p>
            ) : (
              <div className="divide-y">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="font-mono text-xs font-semibold">{a.agents?.agent_code}</span>
                    <span className="text-xs text-muted-foreground">{a.activity_type?.replace(/_/g, " ")}</span>
                    {a.members && <span className="text-xs text-muted-foreground">· {a.members.member_id}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{formatTimeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
