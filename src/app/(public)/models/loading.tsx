import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { ModelsGridSkeleton } from "@/components/models/model-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ModelsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <ModelsGridSkeleton count={10} />
    </div>
  );
}
