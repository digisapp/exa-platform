export default function CompCardCreatorLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-8 max-w-3xl mx-auto">
          <div className="h-10 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
          <div className="flex gap-2 justify-center">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="aspect-[3/4] bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
