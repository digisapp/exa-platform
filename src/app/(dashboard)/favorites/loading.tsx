import { PageHeaderSkeleton } from "@/components/ui/page-skeleton";
import { ModelsGridSkeleton } from "@/components/models/model-card-skeleton";

export default function FavoritesLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <ModelsGridSkeleton count={8} />
    </div>
  );
}
