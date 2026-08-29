// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserCog, Users, Phone, Mail } from "lucide-react"
import Link from "next/link"

export const revalidate = 0

export default async function DirectorAgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: director } = await db.from("directors").select("id").eq("profile_id", user.id).single()
  if (!director) return null

  const { data: agents } = await db
    .from("agents")
    .select("id, agent_code, phone_number, email_personal, profile_photo_url, profiles(full_name, is_active), agent_member_assignments(count)")
    .eq("director_id", director.id)
    .order("agent_code")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Agents</h1>
        <p className="text-muted-foreground text-sm">{agents?.length ?? 0} agents under you</p>
      </div>

      {!agents?.length ? (
        <Card><CardContent className="flex flex-col items-center py-16">
          <UserCog className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No agents assigned to you yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {agents.map(agent => (
            <Link key={agent.id} href={`/director/agents/${agent.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {agent.profile_photo_url
                        ? <img src={agent.profile_photo_url} alt="" className="w-full h-full object-cover" />
                        : <UserCog className="h-6 w-6 text-primary/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{agent.profiles?.full_name}</span>
                        <Badge variant="outline" className="font-mono text-xs">{agent.agent_code}</Badge>
                        <Badge variant={agent.profiles?.is_active ? "success" : "secondary"}>
                          {agent.profiles?.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {(agent.agent_member_assignments as any)?.[0]?.count ?? 0} members
                        </span>
                        {agent.phone_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{agent.phone_number}</span>}
                        {agent.email_personal && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{agent.email_personal}</span>}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">View members →</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
