"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ModelCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full">
      {/* Image skeleton */}
      <div className="aspect-[3/4] relative">
        <Skeleton className="absolute inset-0" />
      </div>

      <div className="p-4 space-y-3">
        {/* Name and username */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Location */}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function ModelsGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ModelCardSkeleton key={i} />
      ))}
    </div>
  );
}
