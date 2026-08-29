export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-muted rounded-md" />
      <div className="h-10 w-80 bg-muted rounded-md" />
      <div className="border rounded-lg overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/50 border-b last:border-0" style={{ opacity: 1 - i * 0.08 }} />
        ))}
      </div>
    </div>
  )
}
