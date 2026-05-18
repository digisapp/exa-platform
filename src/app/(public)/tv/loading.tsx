export default function TvLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-violet-950 via-black to-pink-950 pt-16 pb-10 md:pt-20 md:pb-14">
        <div className="container px-4 md:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 bg-white/10 rounded-full" />
            <div className="h-12 md:h-16 w-64 bg-white/10 rounded" />
            <div className="h-5 w-96 max-w-full bg-white/10 rounded" />
          </div>
        </div>
      </div>
      <main className="container px-4 md:px-8 py-10">
        <div className="animate-pulse">
          <div className="flex flex-wrap gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-full bg-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
