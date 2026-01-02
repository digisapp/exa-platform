"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Calendar, Loader2, MapPin, DollarSign } from "lucide-react";

interface ModelRates {
  photoshoot_hourly_rate?: number;
  photoshoot_half_day_rate?: number;
  photoshoot_full_day_rate?: number;
  promo_hourly_rate?: number;
  brand_ambassador_daily_rate?: number;
  private_event_hourly_rate?: number;
  social_companion_hourly_rate?: number;
  meet_greet_rate?: number;
}

interface BookingRequestModalProps {
  modelId: string;
  modelName: string;
  modelRates: ModelRates;
  trigger?: React.ReactNode;
}

const SERVICE_OPTIONS = [
  { value: "photoshoot_hourly", label: "Photoshoot (Hourly)", rateField: "photoshoot_hourly_rate", unit: "hr" },
  { value: "photoshoot_half_day", label: "Photoshoot (Half-Day)", rateField: "photoshoot_half_day_rate", unit: "flat" },
  { value: "photoshoot_full_day", label: "Photoshoot (Full-Day)", rateField: "photoshoot_full_day_rate", unit: "flat" },
  { value: "promo", label: "Promo Modeling", rateField: "promo_hourly_rate", unit: "hr" },
  { value: "brand_ambassador", label: "Brand Ambassador", rateField: "brand_ambassador_daily_rate", unit: "day" },
  { value: "private_event", label: "Private Event", rateField: "private_event_hourly_rate", unit: "hr" },
  { value: "social_companion", label: "Social Companion", rateField: "social_companion_hourly_rate", unit: "hr" },
  { value: "meet_greet", label: "Meet & Greet", rateField: "meet_greet_rate", unit: "flat" },
  { value: "other", label: "Other (Describe Below)", rateField: null, unit: null },
];

export function BookingRequestModal({ modelId, modelName, modelRates, trigger }: BookingRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    serviceType: "",
    serviceDescription: "",
    eventDate: "",
    startTime: "",
    durationHours: 1,
    locationName: "",
    locationAddress: "",
    locationCity: "",
    locationState: "",
    isRemote: false,
    clientNotes: "",
  });

  // Get available services based on model's rates
  const availableServices = SERVICE_OPTIONS.filter((service) => {
    if (service.value === "other") return true;
    if (!service.rateField) return false;
    const rate = modelRates[service.rateField as keyof ModelRates];
    return rate && rate > 0;
  });

  // Get current service rate
  const selectedService = SERVICE_OPTIONS.find((s) => s.value === formData.serviceType);
  const currentRate = selectedService?.rateField
    ? modelRates[selectedService.rateField as keyof ModelRates] || 0
    : 0;

  // Calculate estimated total
  const calculateTotal = () => {
    if (!currentRate) return 0;
    if (selectedService?.unit === "hr") {
      return currentRate * formData.durationHours;
    }
    return currentRate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit booking");
      }

      toast.success("Booking request sent!", {
        description: `Reference: ${data.booking.booking_number}`,
      });
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit booking request");
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
            <Calendar className="h-4 w-4 mr-2" />
            Request Booking
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {modelName}</DialogTitle>
          <DialogDescription>
            Fill out the details below to request a booking. {modelName} will review and respond to your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service Type *</Label>
            <Select
              value={formData.serviceType}
              onValueChange={(v) => setFormData({ ...formData, serviceType: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {availableServices.map((service) => {
                  const rate = service.rateField
                    ? modelRates[service.rateField as keyof ModelRates]
                    : null;
                  return (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                      {rate ? ` - $${rate}${service.unit === "hr" ? "/hr" : service.unit === "day" ? "/day" : ""}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Duration (for hourly services) */}
          {selectedService?.unit === "hr" && (
            <div className="space-y-2">
              <Label>Duration (hours) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({ ...formData, durationHours: parseFloat(e.target.value) || 1 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </div>
          )}

          {/* Service Description */}
          {formData.serviceType === "other" && (
            <div className="space-y-2">
              <Label>Describe the Service *</Label>
              <Textarea
                placeholder="Please describe what you're looking for..."
                value={formData.serviceDescription}
                onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                required
              />
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Input
                type="date"
                min={minDateStr}
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
          </div>

          {/* Remote Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label>Remote/Virtual</Label>
              <p className="text-sm text-muted-foreground">This is a virtual booking</p>
            </div>
            <Switch
              checked={formData.isRemote}
              onCheckedChange={(v) => setFormData({ ...formData, isRemote: v })}
            />
          </div>

          {/* Location (if not remote) */}
          {!formData.isRemote && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Location Details
              </div>
              <div className="space-y-2">
                <Label>Venue/Location Name</Label>
                <Input
                  placeholder="e.g., Studio XYZ, Private Residence"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={formData.locationAddress}
                  onChange={(e) => setFormData({ ...formData, locationAddress: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={formData.locationCity}
                    onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={formData.locationState}
                    onChange={(e) => setFormData({ ...formData, locationState: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional details or requirements..."
              value={formData.clientNotes}
              onChange={(e) => setFormData({ ...formData, clientNotes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Estimated Total */}
          {currentRate > 0 && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-pink-500" />
                  <span className="font-medium">Estimated Total</span>
                </div>
                <span className="text-2xl font-bold text-pink-500">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Final amount may vary. Model will confirm pricing.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.serviceType || !formData.eventDate}
              className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
