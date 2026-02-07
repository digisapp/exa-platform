import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function AdminBrandOutreachLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <StatsGridSkeleton count={4} />
      <TableSkeleton rows={6} />
    </div>
  );
}
