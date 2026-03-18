export default function RunwayWorkshopLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-4xl mx-auto space-y-8">
          <div className="h-10 bg-muted rounded w-1/2" />
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="space-y-2 mt-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
            <div className="h-80 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
