"use client";

import { RouteErrorScreen } from "@/components/system/RouteErrorScreen";

export default function PublicError({
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
      logLabel="Page error"
      title="Something went wrong"
      description="We couldn't load this page. Please try again."
      homeHref="/"
      homeLabel="Go Home"
    />
  );
}
