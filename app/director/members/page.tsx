// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MembersTable } from "@/components/admin/members-table"

export const revalidate = 0

export default async function DirectorMembersPage({ searchParams }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: director } = await db.from("directors").select("id, director_code").eq("profile_id", user.id).single()
  if (!director) return null

  const { data: myAgents } = await db.from("agents").select("id").eq("director_id", director.id)
  const agentIds = myAgents?.map(a => a.id) ?? []

  // Collect all member IDs from both sources
  const memberIdSet = new Set()
  const { data: directAssign } = await db.from("director_member_assignments").select("member_id").eq("director_id", director.id).eq("is_active", true)
  directAssign?.forEach(a => memberIdSet.add(a.member_id))
  if (agentIds.length > 0) {
    const { data: agentAssign } = await db.from("agent_member_assignments").select("member_id").in("agent_id", agentIds).eq("is_active", true)
    agentAssign?.forEach(a => memberIdSet.add(a.member_id))
  }

  const allMemberIds = [...memberIdSet]
  if (allMemberIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Members</h1>
        <p className="text-muted-foreground">No members assigned yet.</p>
      </div>
    )
  }

  const page = parseInt(sp?.page || "1")
  const pageSize = 50
  const from = (page - 1) * pageSize

  let query = db.from("members")
    .select("id, member_id, full_name, age, gender, mobile_number, branch_name, status, branches(branch_name)", { count: "exact" })
    .in("id", allMemberIds)
    .eq("status", "active")

  if (sp?.q) query = query.or(`member_id.ilike.%${sp.q}%,full_name.ilike.%${sp.q}%`)

  const { data: members, count } = await query.order("member_id").range(from, from + pageSize - 1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Members</h1>
        <p className="text-muted-foreground text-sm">{allMemberIds.length.toLocaleString()} total across your agents</p>
      </div>
      {/* Pass basePath so search works correctly - FIXED BUG */}
      <MembersTable
        members={members ?? []}
        branches={[]}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
        searchQuery={sp?.q}
        showActions={false}
        basePath="/director/members"
      />
    </div>
  )
}
