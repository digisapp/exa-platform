"use client";

import { RouteErrorScreen } from "@/components/system/RouteErrorScreen";

export default function AdminError({
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
      logLabel="Admin error"
      title="Admin Panel Error"
      description="Something went wrong in the admin panel. Please try again."
      homeHref="/admin"
      homeLabel="Admin Home"
    />
  );
}
