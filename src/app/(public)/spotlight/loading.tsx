export default function BoostLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse space-y-6 w-full max-w-md mx-auto px-4">
        <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
        <div className="aspect-[3/4] bg-muted rounded-2xl" />
        <div className="flex justify-center gap-4">
          <div className="h-14 w-14 bg-muted rounded-full" />
          <div className="h-14 w-14 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}
