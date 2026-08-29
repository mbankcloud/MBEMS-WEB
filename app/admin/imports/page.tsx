// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { MemberImporter } from "@/components/admin/member-importer"

export default async function ImportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = await createServiceClient()
  const { data: batches } = await db.from("import_batches").select("*, profiles(full_name, login_id)").order("created_at", { ascending: false }).limit(20)
  return <MemberImporter userId={user?.id ?? ""} batches={batches ?? []} />
}
