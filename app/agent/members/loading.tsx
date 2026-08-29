export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse max-w-lg mx-auto px-4">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (<div key={i} className="h-20 bg-muted rounded-lg" />))}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (<div key={i} className="h-24 bg-muted rounded-lg" />))}
      </div>
    </div>
  )
}
