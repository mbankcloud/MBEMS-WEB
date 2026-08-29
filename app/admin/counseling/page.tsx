// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatDateTime } from "@/lib/utils"
import { Camera, HandshakeIcon } from "lucide-react"

export const revalidate = 0

export default async function AdminCounselingPage() {
  const db = await createServiceClient()

  const [
    { data: visits, count },
    { data: photos },
    { data: predictions }
  ] = await Promise.all([
    db.from("counseling_visits")
      .select("*, members(member_id, full_name), agents(agent_code, profiles(full_name), directors(director_code))", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(500),
    db.from("meeting_photos")
      .select("*, agents(agent_code, profiles(full_name)), members(member_id, full_name)")
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("predictions")
      .select("*, members(member_id, full_name), agents(agent_code)")
      .order("created_at", { ascending: false })
      .limit(200)
  ])

  const statusCounts = {}
  visits?.forEach(v => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1 })

  const predCounts = {}
  predictions?.forEach(p => { predCounts[p.prediction] = (predCounts[p.prediction] || 0) + 1 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Counseling & Field Reports</h1>
        <p className="text-muted-foreground text-sm">{count?.toLocaleString()} counseling records · {photos?.length} meeting photos</p>
      </div>

      <Tabs defaultValue="visits">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="visits">Counseling ({count ?? 0})</TabsTrigger>
          <TabsTrigger value="photos">Photos ({photos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="predictions">Predictions ({predictions?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* COUNSELING TAB */}
        <TabsContent value="visits" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, cnt]) => (
              <div key={status} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm font-medium">
                <span className="font-bold">{cnt as number}</span>
                <span className="text-muted-foreground">{status.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 text-muted-foreground font-semibold">Member</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold">Agent</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold">Status</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold">Contact</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold">Feedback</th>
                      <th className="text-left p-3 text-muted-foreground font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits?.map(v => (
                      <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="font-medium">{v.members?.full_name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{v.members?.member_id}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-xs font-semibold">{v.agents?.agent_code}</div>
                          <div className="text-xs text-muted-foreground">{v.agents?.profiles?.full_name}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant={
                            v.status === "VISITED" ? "success" :
                            v.status === "REFUSED" ? "destructive" :
                            v.status === "RESCHEDULED" ? "warning" : "secondary"
                          } className="text-xs">{v.status?.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{v.contact_method || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate" title={v.feedback}>{v.feedback || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(v.updated_at || v.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos" className="mt-4">
          {!photos?.length ? (
            <Card><CardContent className="flex flex-col items-center py-16">
              <Camera className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No meeting photos uploaded yet</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={photo.photo_url}
                      alt="Meeting photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="text-white text-xs font-semibold">{photo.agents?.agent_code}</div>
                      {photo.members && (
                        <div className="text-white/80 text-xs">{photo.members.full_name}</div>
                      )}
                      <div className="text-white/60 text-xs">{formatDate(photo.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* PREDICTIONS TAB */}
        <TabsContent value="predictions" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(predCounts).map(([pred, cnt]) => (
              <div key={pred} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                pred === "WILL_VOTE_US" ? "bg-green-100 text-green-800" :
                pred === "WILL_VOTE_OTHER" ? "bg-red-100 text-red-800" :
                pred === "UNDECIDED" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
              }`}>
                <span className="font-bold">{cnt as number}</span>
                <span>{pred.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 text-muted-foreground font-semibold">Member</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Agent</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Prediction</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions?.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="font-medium">{p.members?.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{p.members?.member_id}</div>
                      </td>
                      <td className="p-3 font-mono text-xs">{p.agents?.agent_code}</td>
                      <td className="p-3">
                        <Badge variant={
                          p.prediction === "WILL_VOTE_US" ? "success" :
                          p.prediction === "WILL_VOTE_OTHER" ? "destructive" :
                          p.prediction === "UNDECIDED" ? "warning" : "secondary"
                        } className="text-xs">{p.prediction?.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
// Note: candidate support data is shown in election intelligence war room
