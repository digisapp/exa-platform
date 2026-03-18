export default function TvLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-muted rounded w-1/4" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-video bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
