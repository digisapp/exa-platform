export default function AdminRateLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="aspect-[3/4] max-w-sm mx-auto bg-muted rounded-2xl" />
        <div className="flex justify-center gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-10 bg-muted rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
