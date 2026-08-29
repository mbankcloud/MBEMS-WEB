// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DirectorSidebar } from "@/components/director/sidebar"

export default async function DirectorLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: profile } = await db.from("profiles").select("full_name, role, is_active").eq("id", user.id).single()
  if (!profile || profile.role !== "DIRECTOR" || !profile.is_active) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      <DirectorSidebar userName={profile.full_name} />
      <main className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
