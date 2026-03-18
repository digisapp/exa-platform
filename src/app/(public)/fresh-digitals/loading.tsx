export default function FreshDigitalsLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="h-10 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="space-y-3 mt-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg" />
                ))}
              </div>
            </div>
            <div className="h-96 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
