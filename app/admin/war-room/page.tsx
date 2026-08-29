// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { AdminWarRoom } from "@/components/admin/war-room"
export const revalidate = 0
export default async function AdminWarRoomPage() {
  const db = await createServiceClient()
  const [
    { data: classifications },
    { data: counseling },
    { data: polling },
    { data: candidates },
    { data: candidateSupport },
    { data: dailyReports },
    { data: agents },
    { data: branches },
  ] = await Promise.all([
    db.from("voter_classifications").select("classification, agent_id, member_id, members(branch_name), agents(agent_code)"),
    db.from("counseling_visits").select("status, agent_id, agents(agent_code)"),
    db.from("polling_records").select("polling_status, voted_for, agent_id, agents(agent_code)"),
    db.from("panel_candidates").select("id, candidate_number, full_name, photo_url, symbol_name").eq("is_enabled", true).order("candidate_number"),
    db.from("member_candidate_support").select("candidate_id, support_level, agent_id"),
    db.from("daily_reports").select("*, agents(agent_code, profiles(full_name))").eq("report_date", new Date().toISOString().split("T")[0]).order("submitted_at", { ascending: false }),
    db.from("agents").select("id, agent_code, profiles(full_name)"),
    db.from("branches").select("branch_name, total_shareholders, target_votes, category").eq("status", "active"),
  ])
  return <AdminWarRoom
    classifications={classifications ?? []} counseling={counseling ?? []} polling={polling ?? []}
    candidates={candidates ?? []} candidateSupport={candidateSupport ?? []} dailyReports={dailyReports ?? []}
    agents={agents ?? []} branches={branches ?? []}
  />
}
