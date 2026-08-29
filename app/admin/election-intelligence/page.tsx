// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { ElectionIntelligence } from "@/components/admin/election-intelligence"

export const revalidate = 0

export default async function ElectionIntelligencePage() {
  const db = await createServiceClient()

  const [
    { data: branches },
    { data: classifications },
    { data: agents },
    { data: dailyReports },
    { data: members },
  ] = await Promise.all([
    db.from("branches").select("id, branch_name, branch_code, total_shareholders, target_votes, category").eq("status", "active").order("branch_name"),
    db.from("voter_classifications").select("classification, agent_id, member_id, members(branch_name, branch_id)"),
    db.from("agents").select("id, agent_code, profiles(full_name), director_id, directors(director_code)"),
    db.from("daily_reports").select("*, agents(agent_code, profiles(full_name))").order("report_date", { ascending: false }).limit(200),
    db.from("members").select("id, branch_name, branch_id", { count: "exact" }).eq("status", "active"),
  ])

  return <ElectionIntelligence
    branches={branches ?? []}
    classifications={classifications ?? []}
    agents={agents ?? []}
    dailyReports={dailyReports ?? []}
    totalMembers={members?.length ?? 0}
  />
}
// candidate support data pulled in election intelligence component
