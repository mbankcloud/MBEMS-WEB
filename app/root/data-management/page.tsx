// @ts-nocheck
import { createServiceClient } from "@/lib/supabase/server"
import { DataManagement } from "@/components/root/data-management"
export const revalidate = 0

export default async function DataManagementPage() {
  const db = await createServiceClient()
  const [
    { count: counselingCount },
    { count: pollingCount },
    { count: classificationCount },
    { count: photoCount },
    { count: activityCount },
    { count: reportCount },
  ] = await Promise.all([
    db.from("counseling_visits").select("*", { count: "exact", head: true }),
    db.from("polling_records").select("*", { count: "exact", head: true }),
    db.from("voter_classifications").select("*", { count: "exact", head: true }),
    db.from("meeting_photos").select("*", { count: "exact", head: true }),
    db.from("agent_activity_logs").select("*", { count: "exact", head: true }),
    db.from("daily_reports").select("*", { count: "exact", head: true }),
  ])

  return <DataManagement
    counts={{ counselingCount, pollingCount, classificationCount, photoCount, activityCount, reportCount }}
  />
}
