// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const revalidate = 0

export default async function AdminPollingPage() {
  const db = await createServiceClient()
  const { data: records } = await db
    .from("polling_records")
    .select("*, members(member_id, full_name), agents(agent_code)")
    .order("updated_at", { ascending: false })

  const voted = records?.filter(r => r.polling_status === "VOTED").length ?? 0
  const notVoted = records?.filter(r => r.polling_status === "NOT_VOTED").length ?? 0
  const ourPanel = records?.filter(r => r.voted_for === "OUR_PANEL").length ?? 0
  const opposition = records?.filter(r => r.voted_for === "OPPOSITION").length ?? 0
  const notConfirmed = records?.filter(r => r.voted_for === "NOT_CONFIRMED").length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Polling Day — All Records</h1>
        <p className="text-muted-foreground text-sm">{records?.length ?? 0} polling records</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-700">{voted}</div><div className="text-xs text-muted-foreground">Voted</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-700">{notVoted}</div><div className="text-xs text-muted-foreground">Not Voted</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-700">{ourPanel}</div><div className="text-xs text-muted-foreground">Our Panel</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-orange-700">{opposition}</div><div className="text-xs text-muted-foreground">Opposition</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-gray-700">{notConfirmed}</div><div className="text-xs text-muted-foreground">Not Confirmed</div></CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="text-left p-3 text-muted-foreground">Member</th>
                <th className="text-left p-3 text-muted-foreground">Agent</th>
                <th className="text-left p-3 text-muted-foreground">Status</th>
                <th className="text-left p-3 text-muted-foreground">Voted For</th>
              </tr></thead>
              <tbody>
                {records?.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3"><div className="font-medium">{r.members?.full_name}</div><div className="font-mono text-xs text-muted-foreground">{r.members?.member_id}</div></td>
                    <td className="p-3 font-mono text-xs">{r.agents?.agent_code}</td>
                    <td className="p-3"><Badge variant={r.polling_status === "VOTED" ? "success" : "secondary"} className="text-xs">{r.polling_status}</Badge></td>
                    <td className="p-3"><Badge variant={r.voted_for === "OUR_PANEL" ? "success" : r.voted_for === "OPPOSITION" ? "destructive" : "secondary"} className="text-xs">{r.voted_for || "—"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
