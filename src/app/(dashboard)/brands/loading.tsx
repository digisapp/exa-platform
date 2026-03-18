import { PageHeaderSkeleton, StatsGridSkeleton } from "@/components/ui/page-skeleton";

export default function BrandsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <StatsGridSkeleton count={4} />
    </div>
  );
}
