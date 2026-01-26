"use client";

import { CallListener } from "@/components/video";
import { TipNotificationListener } from "@/components/TipNotificationListener";

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
      {children}
    </>
  );
}
