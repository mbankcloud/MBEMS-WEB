// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { ReportsPage } from "@/components/admin/reports"

export const revalidate = 0

export default async function AdminReportsPage() {
  const db = await createServiceClient()

  const [
    { data: members, count: totalMembers },
    { data: agents },
    { data: directors },
    { data: counseling },
    { data: polling },
    { data: assignments },
  ] = await Promise.all([
    db.from("members").select("member_id, full_name, age, gender, mobile_number, branch_name, status", { count: "exact" }).eq("status", "active").limit(25000),
    db.from("agents").select("agent_code, profiles(full_name), agent_member_assignments(count), directors(director_code)"),
    db.from("directors").select("director_code, profiles(full_name), director_member_assignments(count)"),
    db.from("counseling_visits").select("status, agents(agent_code), members(member_id, full_name)").limit(25000),
    db.from("polling_records").select("polling_status, voted_for, agents(agent_code), members(member_id, full_name)").limit(25000),
    db.from("agent_member_assignments").select("agents(agent_code, directors(director_code)), members(member_id, full_name, branch_name)").eq("is_active", true).limit(25000),
  ])

  return (
    <ReportsPage
      members={members ?? []}
      totalMembers={totalMembers ?? 0}
      agents={agents ?? []}
      directors={directors ?? []}
      counseling={counseling ?? []}
      polling={polling ?? []}
      assignments={assignments ?? []}
    />
  )
}
