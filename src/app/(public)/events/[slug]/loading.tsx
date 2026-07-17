export default function EventLandingLoading() {
  return (
    <div className="min-h-dvh bg-background animate-pulse">
      {/* Hero skeleton */}
      <div className="container px-4 md:px-8 pt-12 md:pt-20 pb-10 space-y-4">
        <div className="h-6 w-24 bg-white/5 rounded-full" />
        <div className="h-10 md:h-14 w-3/4 bg-white/5 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-8 w-40 bg-white/5 rounded-full" />
          <div className="h-8 w-32 bg-white/5 rounded-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container px-4 md:px-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 bg-white/5 rounded-2xl" />
          <div className="h-64 bg-white/5 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="h-28 bg-white/5 rounded-2xl" />
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-12 bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
