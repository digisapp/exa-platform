import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function AdminShopLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <StatsGridSkeleton count={3} />
      <TableSkeleton rows={6} />
    </div>
  );
}
