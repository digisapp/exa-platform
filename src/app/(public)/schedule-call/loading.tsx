export default function ScheduleCallLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-xl mx-auto space-y-6">
          <div className="h-10 bg-muted rounded w-2/3 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          <div className="space-y-4 mt-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="h-14 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  );
}
