import { PageHeaderSkeleton, ListItemSkeleton } from "@/components/ui/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeaderSkeleton hasButton />

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full" />

      <Card>
        <CardContent className="p-0 divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
