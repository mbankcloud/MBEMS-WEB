export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-md" />
      <div className="h-4 w-64 bg-muted/60 rounded-md" />
      <div className="h-96 bg-muted rounded-lg" />
    </div>
  )
}
