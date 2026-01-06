"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Send, Loader2, Repeat } from "lucide-react";

interface SendOfferDialogProps {
  listId: string;
  listName: string;
  modelCount: number;
}

export function SendOfferDialog({ listId, listName, modelCount }: SendOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location_name: "",
    location_city: "",
    location_state: "",
    event_date: "",
    event_time: "",
    compensation_type: "perks",
    compensation_amount: 0,
    compensation_description: "",
    spots: 1,
    // Recurring offer fields
    is_recurring: false,
    recurrence_pattern: "weekly",
    recurrence_end_date: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title for your offer");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list_id: listId,
          ...formData,
          compensation_amount: formData.compensation_type === "paid"
            ? formData.compensation_amount * 100
            : 0,
          // Only include recurring fields if is_recurring is true
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_end_date: formData.is_recurring && formData.recurrence_end_date
            ? formData.recurrence_end_date
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "SUBSCRIPTION_REQUIRED") {
          toast.error("Active subscription required to send offers");
        } else {
          toast.error(data.error || "Failed to send offer");
        }
        return;
      }

      toast.success(`Offer sent to ${data.models_notified} models!${formData.is_recurring ? " (Recurring)" : ""}`);
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        location_name: "",
        location_city: "",
        location_state: "",
        event_date: "",
        event_time: "",
        compensation_type: "perks",
        compensation_amount: 0,
        compensation_description: "",
        spots: 1,
        is_recurring: false,
        recurrence_pattern: "weekly",
        recurrence_end_date: "",
      });
    } catch (error) {
      console.error("Error sending offer:", error);
      toast.error("Failed to send offer");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
          <Send className="h-4 w-4 mr-2" />
          Send Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Offer to &quot;{listName}&quot;</DialogTitle>
          <DialogDescription>
            This offer will be sent to {modelCount} {modelCount === 1 ? "model" : "models"} in this list.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Dinner Models Needed Thursday"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Details about the opportunity..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-3">
              <Label htmlFor="location_name">Venue Name</Label>
              <Input
                id="location_name"
                placeholder="e.g., Mila Restaurant"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="location_city">City</Label>
              <Input
                id="location_city"
                placeholder="Miami"
                value={formData.location_city}
                onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location_state">State</Label>
              <Input
                id="location_state"
                placeholder="FL"
                value={formData.location_state}
                onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event_date">Date</Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_time">Time</Label>
              <Input
                id="event_time"
                placeholder="8:00 PM"
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="compensation_type">Compensation</Label>
              <Select
                value={formData.compensation_type}
                onValueChange={(v) => setFormData({ ...formData, compensation_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="perks">Perks</SelectItem>
                  <SelectItem value="tfp">TFP</SelectItem>
                  <SelectItem value="exposure">Exposure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.compensation_type === "paid" && (
              <div className="space-y-2">
                <Label htmlFor="compensation_amount">Amount ($)</Label>
                <Input
                  id="compensation_amount"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={formData.compensation_amount || ""}
                  onChange={(e) => setFormData({ ...formData, compensation_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          {/* Compensation Description */}
          <div className="space-y-2">
            <Label htmlFor="compensation_description">
              {formData.compensation_type === "perks" ? "What's Included" : "Additional Details"}
            </Label>
            <Input
              id="compensation_description"
              placeholder={formData.compensation_type === "perks"
                ? "e.g., Free dinner + drinks, table for you and a guest"
                : "e.g., Payment via Venmo after event"
              }
              value={formData.compensation_description}
              onChange={(e) => setFormData({ ...formData, compensation_description: e.target.value })}
            />
          </div>

          {/* Spots */}
          <div className="space-y-2">
            <Label htmlFor="spots">Spots Needed</Label>
            <Input
              id="spots"
              type="number"
              min="1"
              max="100"
              value={formData.spots}
              onChange={(e) => setFormData({ ...formData, spots: parseInt(e.target.value) || 1 })}
            />
          </div>

          {/* Recurring Options */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked === true })}
              />
              <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4 text-violet-400" />
                Make this a recurring offer
              </Label>
            </div>

            {formData.is_recurring && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern">Repeat</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_date">Until (optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                    min={formData.event_date || undefined}
                  />
                </div>
                <p className="col-span-2 text-xs text-zinc-500">
                  A new offer will be automatically created for the next {formData.recurrence_pattern === "weekly" ? "week" : formData.recurrence_pattern === "biweekly" ? "two weeks" : "month"} after each event.
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Offer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
