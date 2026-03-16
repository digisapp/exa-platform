import { PageHeaderSkeleton, StatsGridSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton count={4} />

      {/* QR Code + Daily Chart */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 flex flex-col items-center gap-4">
          <Skeleton className="h-5 w-32 self-start" />
          <Skeleton className="h-40 w-40 rounded-xl" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-black/40 p-6">
          <Skeleton className="h-5 w-36 mb-6" />
          <div className="flex items-end gap-[3px] h-28">
            {Array.from({ length: 30 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${Math.random() * 60 + 10}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
