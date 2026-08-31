// @ts-nocheck
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Landmark, Lock, User, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

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
      if (profileError || !profile) {
        setError("Invalid Login ID or password.")
        setLoading(false)
        return
      }
      if (!profile.is_active) {
        setError("Your account has been disabled. Contact your administrator.")
        setLoading(false)
        return
      }
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      })
      if (authError || !authData?.session) {
        setError("Invalid Login ID or password.")
        setLoading(false)
        return
      }
      if (profile.role === "ROOT_ADMIN") window.location.href = "/root"
      else if (profile.role === "SUPER_ADMIN") window.location.href = "/admin"
      else if (profile.role === "DIRECTOR") window.location.href = "/director"
      else if (profile.role === "AGENT") window.location.href = "/agent"
      else window.location.href = "/admin"
    } catch {
      setError("An unexpected error occurred.")
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #fffbf0 100%)" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: "hsl(220, 90%, 25%)" }}
            >
              <Landmark className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <div className="text-xl font-bold" style={{ color: "hsl(220, 90%, 25%)" }}>
                TAIN ElectAi
              </div>
              <div className="text-xs text-gray-500">Election Management System</div>
            </div>
          </div>
        </div>

        {/* Card */}
        <Card className="shadow-xl border border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your Login ID and password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Login ID */}
              <div className="space-y-2">
                <Label htmlFor="loginId">Login ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="loginId"
                    type="text"
                    placeholder="Enter your Login ID"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value.toUpperCase())}
                    className="pl-10"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password with eye toggle */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      /* Eye Off */
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                      </svg>
                    ) : (
                      /* Eye On */
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-md border border-red-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold text-white rounded-md transition-colors"
                style={{
                  backgroundColor: loading ? "#94a3b8" : "hsl(220, 90%, 25%)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-500 text-center">
                Credentials are provided by your system administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
