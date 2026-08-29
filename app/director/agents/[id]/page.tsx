// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCog, Users, ArrowLeft, Phone, Mail } from "lucide-react"
import Link from "next/link"

export const revalidate = 0

export default async function DirectorAgentDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: director } = await db.from("directors").select("id").eq("profile_id", user.id).single()
  if (!director) return null

  // Verify this agent belongs to this director
  const { data: agent } = await db
    .from("agents")
    .select("id, agent_code, phone_number, email_personal, profile_photo_url, profiles(full_name, is_active)")
    .eq("id", id)
    .eq("director_id", director.id)
    .single()

  if (!agent) notFound()

  // Get all members assigned to this agent
  const { data: assignments } = await db
    .from("agent_member_assignments")
    .select("member_id")
    .eq("agent_id", agent.id)
    .eq("is_active", true)

  const memberIds = assignments?.map(a => a.member_id) ?? []

  const { data: members } = memberIds.length > 0
    ? await db
        .from("members")
        .select("id, member_id, full_name, age, mobile_number, branch_name, branches(branch_name)")
        .in("id", memberIds)
        .eq("status", "active")
        .order("member_id")
    : { data: [] }

  // Get counseling summary for this agent's members
  const { data: counseling } = await db
    .from("counseling_visits")
    .select("status")
    .eq("agent_id", agent.id)

  const counselingCounts = {}
  counseling?.forEach(c => { counselingCounts[c.status] = (counselingCounts[c.status] || 0) + 1 })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/director/agents" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {agent.profile_photo_url
              ? <img src={agent.profile_photo_url} alt="" className="w-full h-full object-cover" />
              : <UserCog className="h-6 w-6 text-primary/40" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.profiles?.full_name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{agent.agent_code}</Badge>
              <Badge variant={agent.profiles?.is_active ? "success" : "secondary"}>
                {agent.profiles?.is_active ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Agent stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-primary">{memberIds.length}</div>
          <div className="text-xs text-muted-foreground">Members</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-green-600">{counselingCounts["VISITED"] ?? 0}</div>
          <div className="text-xs text-muted-foreground">Visited</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{counselingCounts["RESCHEDULED"] ?? 0}</div>
          <div className="text-xs text-muted-foreground">Follow-up</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-xl font-bold text-muted-foreground">{counselingCounts["NOT_CONTACTED"] ?? 0}</div>
          <div className="text-xs text-muted-foreground">Not Contacted</div>
        </CardContent></Card>
      </div>

      {/* Contact info */}
      {(agent.phone_number || agent.email_personal) && (
        <Card>
          <CardContent className="p-4 flex gap-6 text-sm">
            {agent.phone_number && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{agent.phone_number}</span>
              </div>
            )}
            {agent.email_personal && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{agent.email_personal}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />Assigned Members ({memberIds.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!members?.length ? (
            <div className="flex flex-col items-center py-8">
              <p className="text-muted-foreground text-sm">No members assigned to this agent</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-semibold text-muted-foreground">Member ID</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Mobile</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-mono font-semibold text-primary">{m.member_id}</td>
                      <td className="p-3 font-medium">{m.full_name}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{m.mobile_number ?? "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {m.branches?.branch_name || m.branch_name || "—"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
