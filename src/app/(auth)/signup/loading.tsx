import { Skeleton } from "@/components/ui/skeleton";

export default function SignupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="flex justify-center">
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-7 w-40 mx-auto" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
