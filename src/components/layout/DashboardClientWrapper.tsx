"use client";

import { CallListener } from "@/components/video";
import { TipNotificationListener } from "@/components/TipNotificationListener";
import { ModelOnlineNotifier } from "@/components/ModelOnlineNotifier";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface DashboardClientWrapperProps {
  actorId: string | null;
  actorType: string | null;
  children: React.ReactNode;
}

export function DashboardClientWrapper({
  actorId,
  actorType,
  children,
}: DashboardClientWrapperProps) {
  return (
    <>
      {actorId && <CallListener actorId={actorId} />}
      {actorId && <TipNotificationListener actorId={actorId} />}
      {actorId && actorType === "fan" && (
        <ModelOnlineNotifier actorId={actorId} />
      )}
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  );
}
