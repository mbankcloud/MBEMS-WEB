import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function generateLoginId(role: "SUPER_ADMIN" | "DIRECTOR" | "AGENT", seq: number): string {
  const prefix = role === "SUPER_ADMIN" ? "SA" : role === "DIRECTOR" ? "DIR" : "AGT"
  return `${prefix}${String(seq).padStart(3, "0")}`
}

export function maskMobile(mobile: string | null | undefined): string {
  if (!mobile) return "—"
  if (mobile.length < 6) return mobile
  return mobile.slice(0, 2) + "XXXX" + mobile.slice(-4)
}

export function getWhatsAppLink(mobile: string, message?: string): string {
  const clean = mobile.replace(/\D/g, "")
  const number = clean.startsWith("91") ? clean : `91${clean}`
  const text = message ? encodeURIComponent(message) : ""
  return `https://wa.me/${number}${text ? `?text=${text}` : ""}`
}

export function getMapLink(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}`
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","))
  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getCountdown(targetDate: string, targetTime?: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
} {
  const target = new Date(`${targetDate}T${targetTime || "00:00:00"}`)
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}
