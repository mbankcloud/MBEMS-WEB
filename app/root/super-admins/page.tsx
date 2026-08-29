// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { SuperAdminsManager } from "@/components/root/super-admins-manager"
export const revalidate = 0
export default async function SuperAdminsPage() {
  const db = await createServiceClient()
  const { data: admins } = await db.from("profiles")
    .select("id, login_id, full_name, email, is_active, created_at")
    .eq("role", "SUPER_ADMIN")
    .order("created_at", { ascending: false })
  return <SuperAdminsManager admins={admins ?? []} />
}
