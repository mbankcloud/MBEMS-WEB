// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentProfileForm } from "@/components/agent/profile-form"

export default async function AgentProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single()
  const { data: agent } = await db.from("agents").select("*").eq("profile_id", user.id).single()

  return <AgentProfileForm profile={profile} agent={agent} userId={user.id} />
}
