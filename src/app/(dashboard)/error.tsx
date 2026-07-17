"use client";

import { RouteErrorScreen } from "@/components/system/RouteErrorScreen";

export default function DashboardError({
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
      logLabel="Dashboard error"
      title="Dashboard Error"
      description="Something went wrong loading your dashboard. Please try again."
      homeHref="/dashboard"
      homeLabel="Dashboard"
    />
  );
}
