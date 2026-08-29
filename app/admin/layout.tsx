// @ts-nocheck
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const db = await createServiceClient()
  const { data: profile } = await db.from("profiles").select("full_name, role, is_active").eq("id", user.id).single()

  if (!profile || profile.role !== "SUPER_ADMIN" || !profile.is_active) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar userName={profile.full_name} />
      {/* pt-14 on mobile for top bar, ml-64 on desktop for sidebar */}
      <main className="pt-14 lg:pt-0 lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
