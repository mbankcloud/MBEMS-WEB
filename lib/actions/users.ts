// @ts-nocheck
"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { z } from "zod"

function generateLoginId(type: string, seq: number): string {
  if (type === "DIRECTOR") return `DIR${String(seq).padStart(3, "0")}`
  if (type === "AGENT") return `AGT${String(seq).padStart(3, "0")}`
  return `SA${String(seq).padStart(3, "0")}`
}

export async function createDirector(formData: any) {
  const supabase = await createServiceClient()
  const { full_name, password, all_branches_access, notes } = formData

  if (!full_name || password?.length < 8) return { error: "Name required; password must be 8+ characters" }

  const { count } = await supabase.from("directors").select("*", { count: "exact", head: true })
  const seq = (count ?? 0) + 1
  const loginId = generateLoginId("DIRECTOR", seq)
  const email = `${loginId.toLowerCase()}@bems.internal`

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) return { error: authError?.message || "Failed to create auth user" }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    login_id: loginId,
    full_name,
    email,
    role: "DIRECTOR",
    is_active: true,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { error: profileError.message }
  }

  const { data: director, error: dirError } = await supabase.from("directors").insert({
    profile_id: authUser.user.id,
    director_code: loginId,
    all_branches_access: all_branches_access ?? false,
    notes: notes || null,
  }).select().single()

  if (dirError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { error: dirError.message }
  }

  await supabase.from("audit_logs").insert({
    action: "CREATE",
    entity_type: "director",
    entity_id: director.id,
    new_data: { login_id: loginId, full_name },
  })

  return { success: true, loginId, directorId: director.id }
}

export async function createAgent(formData: any) {
  const supabase = await createServiceClient()
  const { full_name, password, director_id, notes } = formData

  if (!full_name || password?.length < 8) return { error: "Name required; password must be 8+ characters" }

  const { count } = await supabase.from("agents").select("*", { count: "exact", head: true })
  const seq = (count ?? 0) + 1
  const loginId = generateLoginId("AGENT", seq)
  const email = `${loginId.toLowerCase()}@bems.internal`

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) return { error: authError?.message || "Failed to create auth user" }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    login_id: loginId,
    full_name,
    email,
    role: "AGENT",
    is_active: true,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { error: profileError.message }
  }

  const { data: agent, error: agentError } = await supabase.from("agents").insert({
    profile_id: authUser.user.id,
    agent_code: loginId,
    director_id: director_id || null,
    notes: notes || null,
  }).select().single()

  if (agentError) {
    await supabase.auth.admin.deleteUser(authUser.user.id)
    return { error: agentError.message }
  }

  await supabase.from("audit_logs").insert({
    action: "CREATE",
    entity_type: "agent",
    entity_id: agent.id,
    new_data: { login_id: loginId, full_name, director_id },
  })

  return { success: true, loginId, agentId: agent.id }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const supabase = await createServiceClient()

  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId)
  if (error) return { error: error.message }

  if (!isActive) {
    await supabase.auth.admin.signOut(userId)
  }

  await supabase.from("audit_logs").insert({
    action: isActive ? "ENABLE_USER" : "DISABLE_USER",
    entity_type: "profile",
    entity_id: userId,
  })

  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" }

  const supabase = await createServiceClient()
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { error: error.message }

  await supabase.from("audit_logs").insert({
    action: "UPDATE",
    entity_type: "profile",
    entity_id: userId,
    new_data: { action: "password_reset" },
  })

  return { success: true }
}

export async function createSuperAdmin({ full_name, password }: { full_name: string; password: string }) {
  const db = await createServiceClient()
  try {
    // Generate login ID: SA + 3 digits
    const { count } = await db.from("profiles").select("*", { count: "exact", head: true }).like("login_id", "SA%")
    const loginId = `SA${String((count ?? 0) + 1).padStart(3, "0")}`
    const email = `${loginId.toLowerCase()}@bems.internal`

    const { createClient: createAuthClient } = await import("@supabase/supabase-js")
    const adminClient = createAuthClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role: "SUPER_ADMIN" }
    })
    if (authError) return { error: authError.message }

    const { error: profileError } = await db.from("profiles").insert({
      id: authData.user.id, login_id: loginId, full_name, email, role: "SUPER_ADMIN", is_active: true
    })
    if (profileError) return { error: profileError.message }

    return { loginId, error: null }
  } catch (e: any) {
    return { error: e.message }
  }
}
