import { PageHeaderSkeleton, ListItemSkeleton } from "@/components/ui/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function FollowersLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="p-0 divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
