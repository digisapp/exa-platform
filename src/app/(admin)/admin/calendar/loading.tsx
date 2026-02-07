import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCalendarLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
  );
}
