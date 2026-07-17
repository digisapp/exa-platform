"use client";

import { RouteErrorScreen } from "@/components/system/RouteErrorScreen";

export default function AuthError({
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
      logLabel="Auth error"
      title="Authentication Error"
      description="Something went wrong during authentication. Please try again."
      homeHref="/signin"
      homeLabel="Sign In"
    />
  );
}
