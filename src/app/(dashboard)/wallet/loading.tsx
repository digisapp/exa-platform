import { PageHeaderSkeleton, StatsGridSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function WalletLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <StatsGridSkeleton count={2} />
      <TableSkeleton rows={5} />
    </div>
  );
}
