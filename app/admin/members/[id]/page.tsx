// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, User, Phone, MapPin, GitBranch, UserCog, HandshakeIcon } from "lucide-react"

export default async function MemberDetailPage({ params }) {
  const { id } = await params
  const db = await createServiceClient()

  const { data: member } = await db
    .from("members")
    .select("*, branches(branch_name, branch_code)")
    .eq("id", id)
    .single()

  if (!member) notFound()

  const { data: assignment } = await db
    .from("agent_member_assignments")
    .select("*, agents(agent_code, profiles(full_name))")
    .eq("member_id", id)
    .eq("is_active", true)
    .single()

  const { data: counseling } = await db
    .from("counseling_visits")
    .select("*, agents(agent_code)")
    .eq("member_id", id)
    .order("updated_at", { ascending: false })
    .limit(5)

  const { data: polling } = await db
    .from("polling_records")
    .select("*, agents(agent_code)")
    .eq("member_id", id)
    .single()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/members" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{member.full_name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{member.member_id}</p>
        </div>
        <Badge variant={member.status === "active" ? "success" : "secondary"} className="ml-auto">
          {member.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Member ID</span><span className="font-mono font-semibold">{member.member_id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Full Name</span><span className="font-medium">{member.full_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Age</span><span>{member.age ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span>{member.gender ?? "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Mobile</span><span className="font-mono">{member.mobile_number ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span>{member.branches?.branch_name ?? member.branch_name ?? "—"}</span></div>
            <div><span className="text-muted-foreground block mb-1">Address</span><span className="text-xs">{member.address ?? "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4" />Assignment</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {assignment ? (
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-mono font-semibold">{assignment.agents?.agent_code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Agent Name</span><span>{assignment.agents?.profiles?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned</span><span>{formatDate(assignment.assigned_at)}</span></div>
              </div>
            ) : <p className="text-muted-foreground">Not assigned to any agent</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><HandshakeIcon className="h-4 w-4" />Counseling Status</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {counseling?.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Latest Status</span><Badge variant="outline">{counseling[0].status?.replace(/_/g, " ")}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-mono">{counseling[0].agents?.agent_code}</span></div>
                {counseling[0].feedback && <div><span className="text-muted-foreground block">Feedback</span><p className="text-xs mt-1">{counseling[0].feedback}</p></div>}
              </div>
            ) : <p className="text-muted-foreground">No counseling records yet</p>}
          </CardContent>
        </Card>
      </div>

      {polling && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Polling Status</CardTitle></CardHeader>
          <CardContent className="text-sm flex gap-6">
            <div><span className="text-muted-foreground block">Status</span><Badge variant={polling.polling_status === "VOTED" ? "success" : "secondary"}>{polling.polling_status}</Badge></div>
            {polling.voted_for && <div><span className="text-muted-foreground block">Voted For</span><span>{polling.voted_for}</span></div>}
            <div><span className="text-muted-foreground block">Agent</span><span className="font-mono">{polling.agents?.agent_code}</span></div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
