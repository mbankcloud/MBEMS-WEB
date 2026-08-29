// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { MembersTable } from "@/components/admin/members-table"

export const revalidate = 60

export default async function AdminMembersPage({ searchParams }) {
  const sp = await searchParams
  const page = parseInt(sp?.page || "1")
  const pageSize = 50
  const from = (page - 1) * pageSize
  const db = await createServiceClient()

  let query = db.from("members")
    .select("id, member_id, full_name, age, gender, mobile_number, branch_name, status, branches(branch_name)", { count: "exact" })
    .eq("status", "active")
  if (sp?.q) query = query.or(`member_id.ilike.%${sp.q}%,full_name.ilike.%${sp.q}%`)
  const { data: members, count } = await query.order("member_id").range(from, from + pageSize - 1)
  const { data: branches } = await db.from("branches").select("id, branch_name").eq("status", "active")

  return (
    <MembersTable members={members ?? []} branches={branches ?? []}
      totalCount={count ?? 0} page={page} pageSize={pageSize}
      searchQuery={sp?.q} showActions={true} />
  )
}
