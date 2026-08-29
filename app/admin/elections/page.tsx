// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { ElectionsManager } from "@/components/admin/elections-manager"

export default async function ElectionsPage() {
  const db = await createServiceClient()
  const { data: elections } = await db.from("elections").select("*, panels(*, candidates(*))").order("created_at", { ascending: false })
  return <ElectionsManager elections={elections ?? []} />
}
