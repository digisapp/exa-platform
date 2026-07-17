"use client";

import { RouteErrorScreen } from "@/components/system/RouteErrorScreen";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorScreen
      error={error}
      reset={reset}
      logLabel="Unhandled error"
      title="Something went wrong"
      description="An unexpected error occurred. Please try again or return to the homepage."
      homeHref="/"
      homeLabel="Go Home"
    />
  );
}
