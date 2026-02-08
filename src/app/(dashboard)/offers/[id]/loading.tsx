import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function OfferDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-10 w-40" />
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
