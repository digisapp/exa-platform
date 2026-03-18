"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Users,
  Eye,
  X,
  Send,
  Sparkles,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  name: string;
  short_name: string;
  year: number;
}

interface GigPreviewFormData {
  title: string;
  type: string;
  description: string;
  cover_image_url: string;
  gallery_images: string[];
  location_city: string;
  location_state: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  compensation_type: string;
  compensation_amount: number;
  spots: number;
  event_id: string;
}

interface GigPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: GigPreviewFormData;
  events: Event[];
}

export default function GigPreviewModal({
  open,
  onOpenChange,
  formData,
  events,
}: GigPreviewModalProps) {
  const [previewExpandedImage, setPreviewExpandedImage] = useState<string | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) setPreviewExpandedImage(null);
  };

  return (
    <>
      {/* Gig Preview Modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Gig Preview
            </DialogTitle>
            <DialogDescription>
              This is how the gig will appear to models
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Cover Image */}
            {formData.cover_image_url && (
              <div
                className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewExpandedImage(formData.cover_image_url)}
              >
                <Image
                  src={formData.cover_image_url}
                  alt={formData.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Gallery Images - Larger Grid */}
            {formData.gallery_images.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {formData.gallery_images.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-muted"
                      onClick={() => setPreviewExpandedImage(url)}
                    >
                      <Image
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header */}
            <div>
              <Badge className="mb-3 capitalize">{formData.type}</Badge>
              <h1 className="text-2xl font-bold mb-2">{formData.title || "Untitled Gig"}</h1>
              {(formData.location_city || formData.location_state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {formData.location_city}{formData.location_city && formData.location_state && ", "}{formData.location_state}
                </div>
              )}
            </div>

            {/* Description */}
            {formData.description && (
              <div>
                <h2 className="font-semibold mb-2">About This Gig</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {formData.description}
                </p>
              </div>
            )}

            {/* Details Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {formData.start_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {format(new Date(formData.start_date), "MMM d, yyyy")}
                          {formData.end_date && formData.end_date !== formData.start_date && (
                            <> - {format(new Date(formData.end_date), "MMM d, yyyy")}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {(formData.start_time || formData.end_time) && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {formData.start_time && format(new Date(`2000-01-01T${formData.start_time}`), "h:mm a")}
                          {formData.start_time && formData.end_time && " - "}
                          {formData.end_time && format(new Date(`2000-01-01T${formData.end_time}`), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Spots Available</p>
                      <p className="font-medium">{formData.spots}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="font-medium capitalize">
                        {formData.compensation_type === "paid" && formData.compensation_amount > 0 ? (
                          <span className="text-green-500">${formData.compensation_amount}</span>
                        ) : (
                          formData.compensation_type
                        )}
                      </p>
                    </div>
                  </div>
                  {formData.event_id && (
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-pink-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-medium">
                          {events.find(e => e.id === formData.event_id)?.name || "Linked Event"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Apply Button Mockup */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600" disabled>
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This is how models will see the apply button
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status Notice */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Preview Mode</p>
                <p>This gig will be saved as a draft. You can publish it after saving.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Modal */}
      <Dialog open={!!previewExpandedImage} onOpenChange={(open) => !open && setPreviewExpandedImage(null)}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none">
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 border-none text-white"
              onClick={() => setPreviewExpandedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {previewExpandedImage && (
              <Image
                src={previewExpandedImage}
                alt="Expanded view"
                width={1200}
                height={900}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
