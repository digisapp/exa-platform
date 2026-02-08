"use client";

import { CallListener } from "@/components/video";
import { TipNotificationListener } from "@/components/TipNotificationListener";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface DashboardClientWrapperProps {
  actorId: string | null;
  children: React.ReactNode;
}

export function DashboardClientWrapper({
  actorId,
  children,
}: DashboardClientWrapperProps) {
  return (
    <>
      {actorId && <CallListener actorId={actorId} />}
      {actorId && <TipNotificationListener actorId={actorId} />}
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  );
}
