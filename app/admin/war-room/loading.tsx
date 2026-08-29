export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded-md" />
      <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_,i)=><div key={i} className="h-24 bg-muted rounded-lg"/>)}</div>
      <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="h-48 bg-muted rounded-lg"/>)}</div>
    </div>
  )
}
