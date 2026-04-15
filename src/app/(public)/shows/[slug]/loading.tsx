export default function ShowLoading() {
  return (
    <div className="min-h-screen bg-black animate-pulse">
      {/* Hero skeleton */}
      <div className="relative h-[50vh] md:h-[60vh] bg-white/5" />

      {/* Content skeleton */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="h-10 w-2/3 bg-white/5 rounded-lg" />
        <div className="h-5 w-1/3 bg-white/5 rounded" />
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-5/6 bg-white/5 rounded" />
          <div className="h-4 w-4/6 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
