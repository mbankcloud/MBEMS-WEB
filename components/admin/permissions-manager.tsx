"use client"

import { useState, useTransition } from "react"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Permission } from "@/types/database"

interface Director {
  id: string
  director_code: string
  profiles: { full_name: string } | null
}

interface Agent {
  id: string
  agent_code: string
  profiles: { full_name: string } | null
}

interface PermissionsManagerProps {
  permissions: Permission[]
  directors: Director[]
  agents: Agent[]
}

export function PermissionsManager({ permissions, directors, agents }: PermissionsManagerProps) {
  const [defaults, setDefaults] = useState<Record<string, boolean>>(
    Object.fromEntries(permissions.map((p) => [p.permission_key, p.default_value]))
  )
  const [, startTransition] = useTransition()

  const directorPerms = permissions.filter((p) => p.applies_to === "DIRECTOR")
  const agentPerms = permissions.filter((p) => p.applies_to === "AGENT")
  const electionPerms = permissions.filter((p) => (p.applies_to as string) === "ELECTION")

  async function handleToggle(key: string, value: boolean) {
    const supabase = createClient()
    setDefaults((prev) => ({ ...prev, [key]: value }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("permissions")
      .update({ default_value: value })
      .eq("permission_key", key)

    if (error) {
      toast.error(`Failed to update permission: ${error.message}`)
      setDefaults((prev) => ({ ...prev, [key]: !value }))
    } else {
      toast.success(`Permission updated: ${key}`)
    }
  }

  const renderPermSection = (perms: Permission[], title: string, description: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {perms.map((perm) => (
            <div
              key={perm.permission_key}
              className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
            >
              <div className="flex-1 pr-4">
                <div className="text-sm font-medium">{perm.description}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{perm.permission_key}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={defaults[perm.permission_key] ? "success" : "secondary"} className="text-xs">
                  {defaults[perm.permission_key] ? "ON" : "OFF"}
                </Badge>
                <Switch
                  checked={defaults[perm.permission_key] ?? false}
                  onCheckedChange={(v) => handleToggle(perm.permission_key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Permissions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure default permissions for Directors, Agents, and Election modules.
          Changes take effect immediately for all users without that permission overridden.
        </p>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
        <strong>Note:</strong> These are default permissions applied to all users of each role.
        You can set individual overrides per Director or Agent in their profile pages.
        Server-side authorization enforces all permissions — disabling hides UI AND blocks API access.
      </div>

      <Tabs defaultValue="director">
        <TabsList>
          <TabsTrigger value="director">Director ({directorPerms.length})</TabsTrigger>
          <TabsTrigger value="agent">Agent ({agentPerms.length})</TabsTrigger>
          <TabsTrigger value="election">Election ({electionPerms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="director" className="mt-4">
          {renderPermSection(directorPerms, "Director Default Permissions", "These permissions apply to all Directors unless individually overridden.")}
        </TabsContent>

        <TabsContent value="agent" className="mt-4">
          {renderPermSection(agentPerms, "Agent Default Permissions", "These permissions apply to all Agents unless individually overridden.")}
        </TabsContent>

        <TabsContent value="election" className="mt-4">
          {renderPermSection(electionPerms, "Election Module Settings", "Control election-related features system-wide.")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
