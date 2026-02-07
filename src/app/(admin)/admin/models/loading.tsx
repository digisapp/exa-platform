import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminModelsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <Skeleton className="h-10 w-full max-w-md" />
      <TableSkeleton rows={8} />
    </div>
  );
}
