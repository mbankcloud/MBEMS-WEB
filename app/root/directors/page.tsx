// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { RootDirectorsManager } from "@/components/root/directors-manager"
export const revalidate = 0
export default async function RootDirectorsPage() {
  const db = await createServiceClient()
  const { data: directors } = await db
    .from("directors")
    .select("id, director_code, all_branches_access, created_at, profile_id, profiles(id, full_name, login_id, is_active), agents(count), director_member_assignments(count)")
    .order("created_at", { ascending: false })
  return <RootDirectorsManager directors={directors ?? []} />
}
