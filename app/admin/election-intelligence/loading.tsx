export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded-md" />
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
      </div>
      <div className="h-12 bg-muted rounded-lg" />
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  )
}
