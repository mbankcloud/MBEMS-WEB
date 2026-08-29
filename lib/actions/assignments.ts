// @ts-nocheck
"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function bulkAssignMembers(memberIds: string[], agentId: string, directorId?: string) {
  const db = await createServiceClient()

  if (!memberIds?.length || !agentId) return { error: "Missing required fields", found: 0, success: 0, failed: 0 }

  // Remove duplicates from input
  const uniqueIds = [...new Set(memberIds.map(id => id.trim()).filter(Boolean))]

  // Find members by member_id
  const { data: members, error: fetchError } = await db
    .from("members")
    .select("id, member_id, full_name")
    .in("member_id", uniqueIds)
    .eq("status", "active")

  if (fetchError) return { error: fetchError.message, found: 0, success: 0, failed: 0 }
  if (!members?.length) return { error: "No matching members found in database", found: 0, total: uniqueIds.length, success: 0, failed: 0 }

  let success = 0
  let failed = 0
  const errors = []

  // Process in batches of 100 for speed
  const BATCH = 100
  for (let i = 0; i < members.length; i += BATCH) {
    const chunk = members.slice(i, i + BATCH)

    // Deactivate existing agent assignments for these members
    await db.from("agent_member_assignments")
      .update({ is_active: false })
      .in("member_id", chunk.map(m => m.id))
      .eq("is_active", true)
      .neq("agent_id", agentId) // Don't deactivate if same agent

    // Build insert records (deduplicated)
    const agentInserts = chunk.map(m => ({
      agent_id: agentId,
      member_id: m.id,
      is_active: true,
    }))

    // Upsert agent assignments
    const { error: agentError } = await db
      .from("agent_member_assignments")
      .upsert(agentInserts, {
        onConflict: "agent_id,member_id",
        ignoreDuplicates: false
      })

    if (agentError) {
      errors.push(agentError.message)
      failed += chunk.length
    } else {
      success += chunk.length

      // Also assign to director if provided
      if (directorId) {
        const directorInserts = chunk.map(m => ({
          director_id: directorId,
          member_id: m.id,
          is_active: true,
        }))

        await db
          .from("director_member_assignments")
          .upsert(directorInserts, {
            onConflict: "director_id,member_id",
            ignoreDuplicates: false
          })
      }
    }
  }

  revalidatePath("/admin/assignments")
  revalidatePath("/admin")
  revalidatePath("/director")
  revalidatePath("/director/members")
  revalidatePath("/agent")
  revalidatePath("/agent/members")

  return {
    error: null,
    found: members.length,
    total: uniqueIds.length,
    success,
    failed,
    errors: errors.slice(0, 5)
  }
}

export async function singleAssignMember(memberId: string, agentId: string, directorId?: string) {
  const db = await createServiceClient()

  // Deactivate existing assignment for this member (but not if same agent)
  await db.from("agent_member_assignments")
    .update({ is_active: false })
    .eq("member_id", memberId)
    .eq("is_active", true)
    .neq("agent_id", agentId)

  // Upsert agent assignment
  const { error } = await db.from("agent_member_assignments")
    .upsert(
      { agent_id: agentId, member_id: memberId, is_active: true },
      { onConflict: "agent_id,member_id" }
    )

  if (error) return { success: false, error: error.message }

  // Assign to director
  if (directorId) {
    await db.from("director_member_assignments")
      .upsert(
        { director_id: directorId, member_id: memberId, is_active: true },
        { onConflict: "director_id,member_id" }
      )
  }

  revalidatePath("/admin/assignments")
  revalidatePath("/director")
  revalidatePath("/director/members")
  revalidatePath("/agent")
  revalidatePath("/agent/members")

  return { success: true }
}

export async function removeAssignment(assignmentId: string) {
  const db = await createServiceClient()
  await db.from("agent_member_assignments")
    .update({ is_active: false })
    .eq("id", assignmentId)

  revalidatePath("/admin/assignments")
  revalidatePath("/director")
  revalidatePath("/agent")
  return { success: true }
}

export async function removeAllAssignments() {
  const db = await createServiceClient()

  await db.from("agent_member_assignments")
    .update({ is_active: false })
    .eq("is_active", true)

  await db.from("director_member_assignments")
    .update({ is_active: false })
    .eq("is_active", true)

  revalidatePath("/admin/assignments")
  revalidatePath("/director")
  revalidatePath("/agent")
  return { success: true }
}
