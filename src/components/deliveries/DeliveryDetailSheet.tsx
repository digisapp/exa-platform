"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import { DeliveryFileGrid } from "./DeliveryFileGrid";
import {
  Loader2,
  Download,
  CheckCircle2,
  RotateCcw,
  User,
  Calendar,
  FileImage,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface DeliveryDetail {
  id: string;
  model_id: string;
  booking_id?: string | null;
  offer_id?: string | null;
  recipient_actor_id: string;
  title?: string | null;
  notes?: string | null;
  status: string;
  revision_notes?: string | null;
  delivered_at: string;
  approved_at?: string | null;
  revision_requested_at?: string | null;
  files: any[];
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
    status: string;
  } | null;
  offer?: {
    id: string;
    title: string;
    event_date?: string | null;
  } | null;
}

interface DeliveryDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string | null;
  role: "brand" | "model";
  onStatusChange?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeliveryDetailSheet({
  open,
  onOpenChange,
  deliveryId,
  role,
  onStatusChange,
}: DeliveryDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && deliveryId) {
      loadDelivery();
    } else {
      setDelivery(null);
      setShowRevisionForm(false);
      setRevisionNotes("");
    }
  }, [open, deliveryId]);

  const loadDelivery = async () => {
    if (!deliveryId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`);
      if (res.ok) {
        const data = await res.json();
        setDelivery(data.delivery);
      }
    } catch (error) {
      console.error("Failed to load delivery:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!deliveryId) return;
    setActionLoading("approve");
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (res.ok) {
        toast.success("Content approved!");
        loadDelivery();
        onStatusChange?.();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to approve");
      }
    } catch (error) {
      toast.error("Failed to approve delivery");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestRevision = async () => {
    if (!deliveryId || !revisionNotes.trim()) {
      toast.error("Please provide revision notes");
      return;
    }

    setActionLoading("revision");
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_revision",
          revisionNotes: revisionNotes.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Revision requested");
        setShowRevisionForm(false);
        setRevisionNotes("");
        loadDelivery();
        onStatusChange?.();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to request revision");
      }
    } catch (error) {
      toast.error("Failed to request revision");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!deliveryId) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/download`, {
        method: "POST",
      });

      if (!res.ok) {
        toast.error("Failed to generate download links");
        return;
      }

      const { downloads } = await res.json();

      // Trigger downloads sequentially with small delay
      for (const dl of downloads) {
        if (dl.downloadUrl) {
          const a = document.createElement("a");
          a.href = dl.downloadUrl;
          a.download = dl.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Small delay between downloads
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      toast.success(`Downloading ${downloads.length} file${downloads.length !== 1 ? "s" : ""}`);
    } catch (error) {
      toast.error("Failed to download files");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingle = async (file: any) => {
    if (!deliveryId) return;

    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/download`, {
        method: "POST",
      });

      if (!res.ok) return;
      const { downloads } = await res.json();
      const dl = downloads.find((d: any) => d.fileId === file.id);

      if (dl?.downloadUrl) {
        const a = document.createElement("a");
        a.href = dl.downloadUrl;
        a.download = dl.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const modelName = delivery?.model
    ? delivery.model.first_name
      ? `${delivery.model.first_name}${delivery.model.last_name ? ` ${delivery.model.last_name}` : ""}`
      : delivery.model.username
    : "Unknown";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !delivery ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Delivery not found</p>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{delivery.title || "Content Delivery"}</SheetTitle>
              <SheetDescription>
                {delivery.booking
                  ? `Booking ${delivery.booking.booking_number}`
                  : delivery.offer
                  ? delivery.offer.title
                  : "Content Delivery"}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Status & Model Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted">
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
                  <div>
                    <p className="font-medium text-sm">{modelName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(delivery.delivered_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <DeliveryStatusBadge status={delivery.status} />
              </div>

              {/* Notes */}
              {delivery.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Model Notes</p>
                  <p className="text-sm">{delivery.notes}</p>
                </div>
              )}

              {/* Revision Notes */}
              {delivery.revision_notes && delivery.status === "revision_requested" && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-500 mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Revision Requested
                  </p>
                  <p className="text-sm">{delivery.revision_notes}</p>
                </div>
              )}

              {/* Files */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Files ({delivery.files.length})
                  </p>
                  {delivery.files.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadAll}
                      disabled={downloading}
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      Download All
                    </Button>
                  )}
                </div>

                <DeliveryFileGrid
                  files={delivery.files}
                  canDelete={false}
                  onDownload={handleDownloadSingle}
                />
              </div>

              {/* Brand Actions */}
              {role === "brand" && delivery.status === "delivered" && (
                <div className="space-y-3 pt-2 border-t">
                  {!showRevisionForm ? (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={handleApprove}
                        disabled={actionLoading !== null}
                      >
                        {actionLoading === "approve" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => setShowRevisionForm(true)}
                        disabled={actionLoading !== null}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Request Revision
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>What needs to be revised?</Label>
                        <Textarea
                          placeholder="Describe what changes you need..."
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                          maxLength={2000}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowRevisionForm(false);
                            setRevisionNotes("");
                          }}
                          disabled={actionLoading !== null}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-amber-500 hover:bg-amber-600"
                          onClick={handleRequestRevision}
                          disabled={actionLoading !== null || !revisionNotes.trim()}
                        >
                          {actionLoading === "revision" ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-2" />
                          )}
                          Send Revision Request
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Approved confirmation */}
              {delivery.status === "approved" && delivery.approved_at && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-500">Content Approved</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(delivery.approved_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
