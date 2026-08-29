// @ts-nocheck
"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { createClient as createAuthClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

function getAdminClient() {
  return createAuthClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function fullyDeleteAgent(agentId: string) {
  const db = await createServiceClient()
  const admin = getAdminClient()

  try {
    const { data: agent } = await db
      .from("agents")
      .select("profile_id")
      .eq("id", agentId)
      .single()

    if (!agent) return { error: "Agent not found" }

    // Delete all related data explicitly
    await db.from("member_candidate_support").delete().eq("agent_id", agentId)
    await db.from("voter_classifications").delete().eq("agent_id", agentId)
    await db.from("daily_reports").delete().eq("agent_id", agentId)
    await db.from("meeting_photos").delete().eq("agent_id", agentId)
    await db.from("agent_activity_logs").delete().eq("agent_id", agentId)
    await db.from("polling_records").delete().eq("agent_id", agentId)
    await db.from("counseling_visits").delete().eq("agent_id", agentId)
    await db.from("agent_member_assignments").delete().eq("agent_id", agentId)
    await db.from("agents").delete().eq("id", agentId)

    // Delete auth user + profile
    if (agent.profile_id) {
      try { await admin.auth.admin.deleteUser(agent.profile_id) } catch {}
      await db.from("profiles").delete().eq("id", agent.profile_id)
    }

    // Force full cache invalidation
    revalidatePath("/root/agents", "page")
    revalidatePath("/root", "page")
    revalidatePath("/admin/agents", "page")

    return { error: null }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function fullyDeleteDirector(directorId: string) {
  const db = await createServiceClient()
  const admin = getAdminClient()

  try {
    const { data: director } = await db
      .from("directors")
      .select("profile_id")
      .eq("id", directorId)
      .single()

    if (!director) return { error: "Director not found" }

    // Unlink agents from this director (don't delete agents)
    await db.from("agents").update({ director_id: null }).eq("director_id", directorId)
    await db.from("director_member_assignments").delete().eq("director_id", directorId)
    await db.from("directors").delete().eq("id", directorId)

    if (director.profile_id) {
      try { await admin.auth.admin.deleteUser(director.profile_id) } catch {}
      await db.from("profiles").delete().eq("id", director.profile_id)
    }

    revalidatePath("/root/directors", "page")
    revalidatePath("/root", "page")
    revalidatePath("/admin/directors", "page")

    return { error: null }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function fullyDeleteSuperAdmin(profileId: string) {
  const db = await createServiceClient()
  const admin = getAdminClient()

  try {
    try { await admin.auth.admin.deleteUser(profileId) } catch {}
    await db.from("profiles").delete().eq("id", profileId)

    revalidatePath("/root/super-admins", "page")
    revalidatePath("/root", "page")

    return { error: null }
  } catch (e: any) {
    return { error: e.message }
  }
}
