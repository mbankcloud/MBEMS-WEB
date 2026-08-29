// @ts-nocheck
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { LayoutDashboard, Users, HandshakeIcon, Vote, LogOut, User } from "lucide-react"

const navItems = [
  { href: "/agent", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/agent/members", label: "Members", icon: Users },
  { href: "/agent/counseling", label: "Counseling", icon: HandshakeIcon },
  { href: "/agent/polling", label: "Polling", icon: Vote },
  { href: "/agent/profile", label: "Profile", icon: User },
]

export function AgentNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 shadow-lg">
      <div className="max-w-lg mx-auto flex">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn("flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className={cn("text-[10px]", active && "font-semibold text-primary")}>{item.label}</span>
            </Link>
          )
        })}
        <button onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="text-[10px]">Logout</span>
        </button>
      </div>
    </nav>
  )
}
