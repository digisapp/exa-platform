export default function AcademyLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-20">
        <div className="animate-pulse space-y-8 max-w-4xl mx-auto text-center">
          <div className="h-10 bg-muted rounded w-1/3 mx-auto" />
          <div className="h-5 bg-muted rounded w-2/3 mx-auto" />
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4 mt-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
