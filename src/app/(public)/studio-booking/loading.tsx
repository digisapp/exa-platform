export default function StudioBookingLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <div className="h-12 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-5 bg-muted rounded w-2/3 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="h-14 bg-muted rounded-xl w-64 mx-auto" />
        </div>
      </div>
    </div>
  );
}
