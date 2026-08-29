// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentNav } from "@/components/agent/nav"

export default async function AgentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: profile } = await db.from("profiles").select("full_name, role, is_active").eq("id", user.id).single()
  if (!profile || profile.role !== "AGENT" || !profile.is_active) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      {/* Agent uses bottom nav - content has bottom padding for nav bar */}
      <main className="pb-20 max-w-lg mx-auto">
        <div className="p-4">
          {children}
        </div>
      </main>
      <AgentNav />
    </div>
  )
}
