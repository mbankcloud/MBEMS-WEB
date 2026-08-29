// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DirectorAssignments } from "@/components/director/assignments"

export const revalidate = 0

export default async function DirectorAssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: director } = await db.from("directors").select("id, director_code").eq("profile_id", user.id).single()
  if (!director) return null

  // Check if director has assignment permission
  const { data: perm } = await db
    .from("permissions")
    .select("default_value")
    .eq("permission_key", "director.assign_members")
    .single()

  const { data: override } = await db
    .from("user_permissions")
    .select("value")
    .eq("user_id", user.id)
    .eq("permission_key", "director.assign_members")
    .single()

  const canAssign = override?.value ?? perm?.default_value ?? false

  if (!canAssign) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <div className="p-6 bg-muted rounded-lg text-center">
          <p className="text-muted-foreground font-medium">Assignment permission not enabled</p>
          <p className="text-muted-foreground text-sm mt-1">
            Ask your administrator to enable &quot;director.assign_members&quot; permission.
          </p>
        </div>
      </div>
    )
  }

  // Get director's agents
  const { data: agents } = await db
    .from("agents")
    .select("id, agent_code, profiles(full_name)")
    .eq("director_id", director.id)
    .order("agent_code")

  // Get director's current member assignments
  const { data: myMemberIds } = await db
    .from("director_member_assignments")
    .select("member_id")
    .eq("director_id", director.id)
    .eq("is_active", true)

  const totalAssigned = myMemberIds?.length ?? 0

  return (
    <DirectorAssignments
      directorId={director.id}
      agents={agents ?? []}
      totalAssigned={totalAssigned}
    />
  )
}
