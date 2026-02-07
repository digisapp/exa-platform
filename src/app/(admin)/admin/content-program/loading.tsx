import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function AdminContentProgramLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton count={3} />
      <TableSkeleton rows={6} />
    </div>
  );
}
