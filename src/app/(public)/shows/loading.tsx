import { PageHeaderSkeleton, ContentGridSkeleton } from "@/components/ui/page-skeleton";

export default function EventsLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <ContentGridSkeleton count={6} />
    </div>
  );
}
