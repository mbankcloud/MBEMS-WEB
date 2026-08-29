// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { PermissionsManager } from "@/components/admin/permissions-manager"

export default async function PermissionsPage() {
  const db = await createServiceClient()
  const { data: permissions } = await db.from("permissions").select("*").order("applies_to, permission_key")
  return <PermissionsManager permissions={permissions ?? []} />
}
