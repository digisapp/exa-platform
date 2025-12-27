"use client";

import { CallListener } from "@/components/video";

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
      {children}
    </>
  );
}
