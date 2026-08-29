"use client"

import { useState, useEffect } from "react"
import { getCountdown } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

interface CountdownProps {
  electionDate: string
  electionTime?: string
  electionName?: string
  compact?: boolean
}

export function ElectionCountdown({ electionDate, electionTime, electionName, compact }: CountdownProps) {
  const [countdown, setCountdown] = useState(getCountdown(electionDate, electionTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(electionDate, electionTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [electionDate, electionTime])

  if (compact) {
    if (countdown.expired) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Election day has passed</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-primary" />
        <span className="font-mono font-semibold text-primary">
          {countdown.days}d {String(countdown.hours).padStart(2, "0")}h{" "}
          {String(countdown.minutes).padStart(2, "0")}m{" "}
          {String(countdown.seconds).padStart(2, "0")}s
        </span>
      </div>
    )
  }

  if (countdown.expired) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6 text-center">
          <p className="text-amber-800 font-semibold">Election Day Has Passed</p>
          <p className="text-amber-600 text-sm mt-1">{electionName}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-primary">
          <Clock className="h-4 w-4" />
          {electionName || "Election Countdown"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: countdown.days, label: "DAYS" },
            { value: countdown.hours, label: "HRS" },
            { value: countdown.minutes, label: "MIN" },
            { value: countdown.seconds, label: "SEC" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-primary rounded-lg p-2">
              <div className="text-2xl font-bold text-white countdown-digit font-mono leading-none">
                {String(value).padStart(2, "0")}
              </div>
              <div className="text-[10px] text-white/70 mt-1 font-medium tracking-wider">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          {new Date(`${electionDate}T${electionTime || "00:00:00"}`).toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
          })}
        </p>
      </CardContent>
    </Card>
  )
}
