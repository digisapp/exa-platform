export default function SwimwearContentLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse max-w-5xl mx-auto space-y-8">
          <div className="h-10 bg-muted rounded w-1/2" />
          <div className="h-5 bg-muted rounded w-2/3" />
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="h-96 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
