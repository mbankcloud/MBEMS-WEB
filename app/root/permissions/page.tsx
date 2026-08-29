// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { PermissionsManager } from "@/components/admin/permissions-manager"
export const revalidate = 0
export default async function RootPermissionsPage() {
  const db = await createServiceClient()
  const { data: permissions } = await db.from("permissions").select("*").order("permission_key")
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Permissions</h1><p className="text-muted-foreground text-sm">Control what each role can access</p></div>
      <PermissionsManager permissions={permissions ?? []} />
    </div>
  )
}
