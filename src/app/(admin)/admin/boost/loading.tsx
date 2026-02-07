import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function AdminBoostLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  );
}
