// @ts-nocheck
export const revalidate = 30
import { createServiceClient } from "@/lib/supabase/server"
import { DirectorsManager } from "@/components/admin/directors-manager"

export default async function DirectorsPage() {
  const db = await createServiceClient()
  const { data: directors } = await db.from("directors").select("id, director_code, all_branches_access, notes, created_at, profiles(id, full_name, login_id, is_active), agents(count), director_member_assignments(count)").order("created_at", { ascending: false })
  const { data: branches } = await db.from("branches").select("id, branch_name, branch_code").eq("status", "active").order("branch_name")
  return <DirectorsManager directors={directors ?? []} branches={branches ?? []} />
}
