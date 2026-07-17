import { Skeleton } from "@/components/ui/skeleton";

export default function GigDetailLoading() {
  return (
    <div className="container px-4 md:px-8 py-8 space-y-6 max-w-4xl">
      {/* Hero */}
      <Skeleton className="h-48 md:h-64 w-full rounded-2xl" />
      {/* Title + meta */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
      {/* Body */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-12 w-full sm:w-48 rounded-xl" />
    </div>
  );
}
