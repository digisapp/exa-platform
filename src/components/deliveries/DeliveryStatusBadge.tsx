"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DeliveryStatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  delivered: {
    label: "Delivered",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/50",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/10 text-green-500 border-green-500/50",
  },
  revision_requested: {
    label: "Revision Requested",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/50",
  },
};

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: "bg-gray-500/10 text-gray-500 border-gray-500/50",
  };

  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
