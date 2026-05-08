"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Send, Loader2, Repeat, Mail, Megaphone } from "lucide-react";

export interface DashboardOfferCampaign {
  id: string;
  name: string;
  color?: string | null;
  modelCount: number;
}

interface Props {
  campaigns: DashboardOfferCampaign[];
  triggerClassName?: string;
}

const EMPTY_FORM = {
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
  deliverables: "",
  spots: 1,
  is_recurring: false,
  recurrence_pattern: "weekly",
  recurrence_end_date: "",
};

export function SendOfferFromDashboardDialog({ campaigns, triggerClassName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? "");
  const [formData, setFormData] = useState(EMPTY_FORM);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);
  const hasCampaigns = campaigns.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!campaignId) {
      toast.error("Please select a campaign");
      return;
    }
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
          campaign_id: campaignId,
          ...formData,
          compensation_amount:
            formData.compensation_type === "paid" ? formData.compensation_amount * 100 : 0,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_end_date:
            formData.is_recurring && formData.recurrence_end_date
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

      toast.success(
        `Offer sent to ${data.models_notified} models!${formData.is_recurring ? " (Recurring)" : ""}`
      );
      setOpen(false);
      setFormData(EMPTY_FORM);
      router.refresh();
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
        <button
          type="button"
          className={
            triggerClassName ||
            "flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs md:text-sm font-semibold text-white transition-all"
          }
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Send Offer</span>
          <span className="sm:hidden">Offer</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Offer</DialogTitle>
          <DialogDescription>
            {hasCampaigns
              ? "Pick a campaign and fill in the offer details. Every model in the campaign will be notified."
              : "Offers are sent to a campaign's model list — create a campaign first."}
          </DialogDescription>
        </DialogHeader>

        {!hasCampaigns ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-violet-500/30 bg-violet-500/5">
              <Megaphone className="h-5 w-5 text-violet-300 shrink-0 mt-0.5" />
              <p className="text-sm text-white/70">
                Campaigns group the models you want to reach. Create one (e.g.{" "}
                <em>Miami Promo</em>), add models to it, then send offers to the whole list at once.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Link
                href="/campaigns"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-violet-500 hover:bg-violet-600 text-sm font-semibold text-white transition-colors"
              >
                Go to Campaigns
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign *</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger id="campaign">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: c.color || "#ec4899" }}
                        />
                        {c.name}
                        <span className="text-white/40 text-xs">
                          · {c.modelCount} {c.modelCount === 1 ? "model" : "models"}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCampaign && selectedCampaign.modelCount === 0 && (
                <p className="text-xs text-amber-300">
                  This campaign has no models yet — add some from{" "}
                  <Link
                    href={`/campaigns/${selectedCampaign.id}`}
                    className="underline hover:text-amber-200"
                  >
                    the campaign page
                  </Link>{" "}
                  before sending an offer.
                </p>
              )}
            </div>

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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        compensation_amount: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="compensation_description">
                {formData.compensation_type === "perks" ? "What's Included" : "Additional Details"}
              </Label>
              <Input
                id="compensation_description"
                placeholder={
                  formData.compensation_type === "perks"
                    ? "e.g., Free dinner + drinks, table for you and a guest"
                    : "e.g., Payment via Venmo after event"
                }
                value={formData.compensation_description}
                onChange={(e) =>
                  setFormData({ ...formData, compensation_description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverables">
                Deliverables{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="deliverables"
                placeholder="e.g., 1 Instagram Reel + 2 Stories + 1 TikTok"
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spots">Spots Needed</Label>
              <Input
                id="spots"
                type="number"
                min="1"
                max="100"
                value={formData.spots}
                onChange={(e) =>
                  setFormData({ ...formData, spots: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_recurring: checked === true })
                  }
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
                      onValueChange={(v) =>
                        setFormData({ ...formData, recurrence_pattern: v })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, recurrence_end_date: e.target.value })
                      }
                      min={formData.event_date || undefined}
                    />
                  </div>
                </div>
              )}
            </div>

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
        )}
      </DialogContent>
    </Dialog>
  );
}
