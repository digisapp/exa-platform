import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/page-skeleton";

export default function BidsManageLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <TableSkeleton rows={5} />
    </div>
  );
}
