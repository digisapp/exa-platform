import { PageHeaderSkeleton, ListItemSkeleton } from "@/components/ui/page-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <>
      {/* Mobile: full page skeleton */}
      <div className="lg:hidden max-w-4xl mx-auto space-y-6">
        <PageHeaderSkeleton hasButton />
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardContent className="p-0 divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Desktop: right panel skeleton */}
      <div className="hidden lg:flex flex-col items-center justify-center h-full">
        <Skeleton className="h-16 w-16 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </>
  );
}
