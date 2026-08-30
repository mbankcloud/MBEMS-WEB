// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Landmark, Lock, User, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const supabase = createClient()
      const cleanId = loginId.trim().toUpperCase()
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, is_active, role")
        .eq("login_id", cleanId)
        .single()
      if (profileError || !profile) { setError("Invalid Login ID or password."); setLoading(false); return }
      if (!profile.is_active) { setError("Your account has been disabled. Contact your administrator."); setLoading(false); return }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: profile.email, password })
      if (authError || !authData?.session) { setError("Invalid Login ID or password."); setLoading(false); return }
      // Route based on role
      if (profile.role === "ROOT_ADMIN") window.location.href = "/root"
      else if (profile.role === "SUPER_ADMIN") window.location.href = "/admin"
      else if (profile.role === "DIRECTOR") window.location.href = "/director"
      else if (profile.role === "AGENT") window.location.href = "/agent"
      else window.location.href = "/admin"
    } catch { setError("An unexpected error occurred."); setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #fffbf0 100%)" }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: "hsl(220, 90%, 25%)" }}>
              <Landmark className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xl font-bold" style={{ color: "hsl(220, 90%, 25%)" }}>TAIN ElectAI</div>
              <div className="text-xs text-gray-500">Bank Election Management System</div>
            </div>
          </div>
        </div>
        <Card className="shadow-xl border border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Enter your Login ID and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginId">Login ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="loginId" type="text" placeholder="Enter your Login ID"
                    value={loginId} onChange={e => setLoginId(e.target.value.toUpperCase())}
                    className="pl-10" required disabled={loading} autoFocus />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input id="password" type="password" placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="pl-10" required disabled={loading} />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-md border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full h-11 text-base font-semibold text-white rounded-md transition-colors"
                style={{ backgroundColor: loading ? "#94a3b8" : "hsl(220, 90%, 25%)", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500 text-center">Credentials are provided by your system administrator.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
