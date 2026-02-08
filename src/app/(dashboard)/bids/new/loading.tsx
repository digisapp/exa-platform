import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewBidLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
