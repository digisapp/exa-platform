import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function OffersLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <StatsGridSkeleton count={3} />
      <TableSkeleton rows={5} />
    </div>
  );
}
