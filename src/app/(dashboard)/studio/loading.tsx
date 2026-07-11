import { PageHeaderSkeleton, ContentGridSkeleton } from "@/components/ui/page-skeleton";

export default function ContentLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />
      <ContentGridSkeleton count={6} />
    </div>
  );
}
