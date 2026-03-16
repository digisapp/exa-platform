import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompCardLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Comp card preview */}
        <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
        </div>

        {/* Photo slots */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
