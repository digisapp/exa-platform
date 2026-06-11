import { Skeleton } from "@/components/ui/skeleton";

export default function WorkshopDetailLoading() {
  return (
    <main className="container px-4 md:px-8 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Workshop details */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="glass-card rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        {/* Checkout sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-32 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
}
