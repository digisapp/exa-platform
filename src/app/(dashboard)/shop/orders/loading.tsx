import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function ShopOrdersLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={5} />
    </div>
  );
}
