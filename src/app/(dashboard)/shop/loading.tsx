import { PageHeaderSkeleton, ContentGridSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-full max-w-md" />
      <ContentGridSkeleton count={8} />
    </div>
  );
}
