// @ts-nocheck
export const revalidate = 60
import { createServiceClient } from "@/lib/supabase/server"
import { BranchesManager } from "@/components/admin/branches-manager"

export default async function BranchesPage() {
  const db = await createServiceClient()
  const { data: branches } = await db.from("branches").select("*, members(count)").order("branch_name")
  return <BranchesManager branches={branches ?? []} />
}
