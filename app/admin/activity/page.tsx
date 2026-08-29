// @ts-nocheck
export const revalidate = 0
import { createServiceClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { Activity } from "lucide-react"

export default async function ActivityPage() {
  const db = await createServiceClient()
  const { data: activity } = await db.from("agent_activity_logs").select("*, agents(agent_code, profiles(full_name)), members(member_id, full_name)").order("created_at", { ascending: false }).limit(100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Activity</h1>
          <p className="text-muted-foreground text-sm">Real-time field agent activity feed</p>
        </div>
        <Badge variant="info" className="text-xs">Live</Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          {!activity?.length ? (
            <div className="flex flex-col items-center py-16">
              <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-muted/20">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold">{a.agents?.agent_code ?? "—"}</span>
                      <Badge variant="outline" className="text-xs">{a.activity_type?.replace(/_/g, " ")}</Badge>
                      {a.members && <span className="text-sm text-muted-foreground">→ {a.members.member_id} {a.members.full_name}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
