"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { FileImage, Calendar, FolderDown, User } from "lucide-react";

interface DeliveryCardProps {
  delivery: {
    id: string;
    title?: string | null;
    notes?: string | null;
    status: string;
    delivered_at: string;
    fileCount: number;
    totalSize: number;
    model?: {
      id: string;
      username: string;
      first_name?: string | null;
      last_name?: string | null;
      profile_photo_url?: string | null;
    } | null;
    booking?: {
      id: string;
      booking_number: string;
      service_type: string;
      event_date: string;
    } | null;
    offer?: {
      id: string;
      title: string;
      event_date?: string | null;
    } | null;
  };
  onClick?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SERVICE_LABELS: Record<string, string> = {
  photoshoot_hourly: "Photoshoot (Hourly)",
  photoshoot_half_day: "Photoshoot (Half-Day)",
  photoshoot_full_day: "Photoshoot (Full-Day)",
  promo: "Promo",
  brand_ambassador: "Brand Ambassador",
  private_event: "Private Event",
  social_companion: "Social Companion",
  meet_greet: "Meet & Greet",
  other: "Other",
};

export function DeliveryCard({ delivery, onClick }: DeliveryCardProps) {
  const modelName = delivery.model
    ? delivery.model.first_name
      ? `${delivery.model.first_name}${delivery.model.last_name ? ` ${delivery.model.last_name}` : ""}`
      : delivery.model.username
    : "Unknown Model";

  const source = delivery.booking
    ? `${delivery.booking.booking_number} · ${SERVICE_LABELS[delivery.booking.service_type] || delivery.booking.service_type}`
    : delivery.offer
    ? delivery.offer.title
    : "Content Delivery";

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-pink-500/30 transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Model avatar & info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {delivery.model?.profile_photo_url ? (
                <Image
                  src={delivery.model.profile_photo_url}
                  alt={modelName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{modelName}</p>
              <p className="text-xs text-muted-foreground truncate">{source}</p>
            </div>
          </div>

          <DeliveryStatusBadge status={delivery.status} />
        </div>

        {/* Title */}
        {delivery.title && (
          <p className="mt-3 text-sm font-medium">{delivery.title}</p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileImage className="h-3.5 w-3.5" />
            {delivery.fileCount} file{delivery.fileCount !== 1 ? "s" : ""}
            {delivery.totalSize > 0 && ` · ${formatFileSize(delivery.totalSize)}`}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(delivery.delivered_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
