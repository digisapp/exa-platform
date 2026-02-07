import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function AdminTransactionsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton count={4} />
      <TableSkeleton rows={8} />
    </div>
  );
}
