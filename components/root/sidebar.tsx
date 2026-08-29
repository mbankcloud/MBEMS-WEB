// @ts-nocheck
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard, Shield, UserCheck, UserCog, Key,
  ScrollText, Settings, LogOut, Landmark, Menu, X,
  Database, Users, Vote
} from "lucide-react"

const navItems = [
  { href: "/root", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/root/super-admins", label: "Super Admins", icon: Shield },
  { href: "/root/directors", label: "Directors", icon: UserCheck },
  { href: "/root/agents", label: "Agents", icon: UserCog },
  { href: "/root/candidates", label: "Panel Candidates", icon: Vote },
  { href: "/root/permissions", label: "Permissions", icon: Key },
  { href: "/root/audit", label: "Audit Logs", icon: ScrollText },
  { href: "/root/data-management", label: "Data Management", icon: Database },
  { href: "/root/settings", label: "Settings", icon: Settings },
]

export function RootSidebar({ userName }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">BEMS</div>
            <div className="text-red-300 text-xs font-semibold">Root Admin</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                active ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                item.label === "Data Management" && "border border-red-400/30 text-red-300 hover:text-red-200")}>
              <item.icon className="h-4 w-4 shrink-0" />{item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <div className="text-white/80 text-xs font-medium truncate">{userName}</div>
          <div className="text-red-300 text-xs font-semibold">Root Administrator</div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all">
          <LogOut className="h-4 w-4" />Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3 bg-primary shadow-md">
        <button onClick={() => setOpen(true)} className="text-white p-1"><Menu className="h-6 w-6" /></button>
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-white" />
          <span className="text-white font-bold text-sm">BEMS Root Admin</span>
        </div>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-72 h-full bg-primary shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/70 hover:text-white p-1"><X className="h-5 w-5" /></button>
            <SidebarContent />
          </div>
        </div>
      )}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-primary flex-col shadow-xl z-40">
        <SidebarContent />
      </aside>
    </>
  )
}
