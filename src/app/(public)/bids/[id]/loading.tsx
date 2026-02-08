import { Skeleton } from "@/components/ui/skeleton";

export default function AuctionDetailLoading() {
  return (
    <div className="container px-4 md:px-8 lg:px-16 py-8 space-y-6">
      <Skeleton className="h-10 w-40" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-16 w-48 rounded-xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
