import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BidDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-40" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <PageHeaderSkeleton />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
