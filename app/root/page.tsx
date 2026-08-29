// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, Users, UserCheck, UserCog, ScrollText, Key } from "lucide-react"
import Link from "next/link"

export const revalidate = 30

export default async function RootDashboard() {
  const db = await createServiceClient()
  const [
    { count: superAdmins },
    { count: directors },
    { count: agents },
    { count: members },
    { count: auditLogs },
  ] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "SUPER_ADMIN"),
    db.from("directors").select("*", { count: "exact", head: true }),
    db.from("agents").select("*", { count: "exact", head: true }),
    db.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("audit_logs").select("*", { count: "exact", head: true }),
  ])

  const stats = [
    { label: "Super Admins", value: superAdmins ?? 0, icon: Shield, href: "/root/super-admins", color: "bg-red-50 text-red-600" },
    { label: "Directors", value: directors ?? 0, icon: UserCheck, href: "/root/directors", color: "bg-blue-50 text-blue-600" },
    { label: "Agents", value: agents ?? 0, icon: UserCog, href: "/root/agents", color: "bg-orange-50 text-orange-600" },
    { label: "Members", value: members ?? 0, icon: Users, href: "/admin/members", color: "bg-green-50 text-green-600" },
    { label: "Audit Logs", value: auditLogs ?? 0, icon: ScrollText, href: "/root/audit", color: "bg-purple-50 text-purple-600" },
    { label: "Permissions", value: "Manage", icon: Key, href: "/root/permissions", color: "bg-amber-50 text-amber-600" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Root Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Full system control — developer access</p>
      </div>
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <span><strong>Root Admin Access.</strong> You have unrestricted access to all system functions. Changes here affect all users immediately.</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color.split(" ")[0]}`}>
                  <s.icon className={`h-5 w-5 ${s.color.split(" ")[1]}`} />
                </div>
                <div className="text-2xl font-bold tabular-nums">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
