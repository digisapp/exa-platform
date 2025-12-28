import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function EarningsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton count={3} />
      <TableSkeleton rows={5} />
    </div>
  );
}
