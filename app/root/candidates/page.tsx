// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { CandidatesManager } from "@/components/root/candidates-manager"
export const revalidate = 0

export default async function CandidatesPage() {
  const db = await createServiceClient()
  const [
    { data: candidates },
    { data: elections },
    { data: support },
  ] = await Promise.all([
    db.from("panel_candidates").select("*").order("candidate_number"),
    db.from("elections").select("id, election_name, status").order("created_at", { ascending: false }).limit(5),
    db.from("member_candidate_support")
      .select("candidate_id, support_level")
      .eq("support_level", "YES"),
  ])

  // Count support per candidate
  const supportCount = {}
  support?.forEach(s => { supportCount[s.candidate_id] = (supportCount[s.candidate_id] || 0) + 1 })

  return <CandidatesManager candidates={candidates ?? []} elections={elections ?? []} supportCount={supportCount} />
}
