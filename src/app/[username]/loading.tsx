import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-dvh">
      <div className="container px-4 md:px-8 py-8 space-y-6">
        {/* Profile header */}
        <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 w-full space-y-3 flex flex-col items-center md:items-start">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64 max-w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
        {/* Content grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
