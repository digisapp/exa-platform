import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function AdminEventsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <TableSkeleton rows={5} />
    </div>
  );
}
