export default function TravelLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
