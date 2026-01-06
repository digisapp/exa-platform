"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Gift,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  Check,
  X,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  event_date: string | null;
  event_time: string | null;
  compensation_type: string;
  compensation_amount: number;
  compensation_description: string | null;
  spots: number;
  spots_filled: number;
  status: string;
  created_at: string;
  responses: Response[];
}

interface Response {
  id: string;
  model_id: string;
  status: string;
  notes: string | null;
  responded_at: string | null;
  created_at: string;
  checked_in_at: string | null;
  no_show: boolean;
  model: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
    city: string | null;
    state: string | null;
    reliability_score: number | null;
  } | null;
}

interface CampaignOffersProps {
  campaignId: string;
}

export function CampaignOffers({ campaignId }: CampaignOffersProps) {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
  }, [campaignId]);

  async function fetchOffers() {
    try {
      const res = await fetch(`/api/offers?campaignId=${campaignId}`);
      if (!res.ok) throw new Error("Failed to fetch offers");
      const data = await res.json();
      setOffers(data.offers || []);
      // Auto-expand first offer if exists
      if (data.offers?.length > 0) {
        setExpandedOffer(data.offers[0].id);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin(offerId: string, responseId: string, action: "checkin" | "noshow") {
    try {
      const res = await fetch(`/api/offers/${offerId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: responseId, action }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(action === "checkin" ? "Marked as checked in!" : "Marked as no-show");
      fetchOffers();
    } catch (error) {
      toast.error("Failed to update check-in status");
    }
  }

  async function updateResponseStatus(offerId: string, responseId: string, status: string) {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          update_response: { id: responseId, status }
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(status === "confirmed" ? "Model confirmed!" : "Status updated");
      fetchOffers();
    } catch (error) {
      toast.error("Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (offers.length === 0) {
    return null; // Don't show section if no offers
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Gift className="h-5 w-5 text-pink-500" />
        Offers Sent ({offers.length})
      </h2>

      <div className="space-y-3">
        {offers.map((offer) => {
          const isExpanded = expandedOffer === offer.id;
          const accepted = offer.responses?.filter(r => r.status === "accepted" || r.status === "confirmed").length || 0;
          const pending = offer.responses?.filter(r => r.status === "pending").length || 0;

          return (
            <Card key={offer.id} className="overflow-hidden">
              {/* Offer Header - Always visible */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedOffer(isExpanded ? null : offer.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{offer.title}</h3>
                      <Badge
                        variant={offer.status === "open" ? "default" : "secondary"}
                        className={offer.status === "open" ? "bg-green-500" : ""}
                      >
                        {offer.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {offer.event_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(offer.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="h-3 w-3" />
                        {accepted} accepted
                      </span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        {pending} pending
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="border-t pt-4">
                  {/* Offer Details */}
                  <div className="flex flex-wrap gap-3 mb-4 text-sm">
                    {offer.location_name && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {offer.location_name}
                      </span>
                    )}
                    {offer.compensation_type && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        {offer.compensation_type === "paid" && offer.compensation_amount > 0
                          ? `$${(offer.compensation_amount / 100).toFixed(0)}`
                          : offer.compensation_description || offer.compensation_type}
                      </span>
                    )}
                  </div>

                  {/* Responses */}
                  <div className="space-y-2">
                    {offer.responses?.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        No responses yet
                      </p>
                    ) : (
                      offer.responses
                        ?.sort((a, b) => {
                          const order: Record<string, number> = { confirmed: 0, accepted: 1, pending: 2, declined: 3 };
                          return (order[a.status] || 4) - (order[b.status] || 4);
                        })
                        .map((response) => {
                          const eventPassed = offer.event_date
                            ? new Date(offer.event_date) < new Date()
                            : false;
                          const canCheckIn = eventPassed && ["accepted", "confirmed"].includes(response.status);
                          const isCheckedIn = response.checked_in_at && !response.no_show;
                          const isNoShow = response.no_show;

                          return (
                            <div
                              key={response.id}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={response.model?.profile_photo_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {response.model?.first_name?.[0] || response.model?.username?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/${response.model?.username}`}
                                    className="font-medium text-sm hover:text-pink-500 truncate"
                                  >
                                    {response.model?.first_name
                                      ? `${response.model.first_name} ${response.model.last_name || ""}`.trim()
                                      : `@${response.model?.username}`}
                                  </Link>
                                  {response.model?.reliability_score != null && (
                                    <span
                                      className={`text-xs flex items-center gap-0.5 ${
                                        response.model.reliability_score >= 90 ? "text-green-500" :
                                        response.model.reliability_score >= 70 ? "text-amber-500" :
                                        "text-red-500"
                                      }`}
                                    >
                                      <Star className="h-3 w-3" />
                                      {response.model.reliability_score}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Check-in buttons */}
                                {canCheckIn && !isCheckedIn && !isNoShow && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-green-500 hover:bg-green-500/10"
                                      onClick={() => handleCheckin(offer.id, response.id, "checkin")}
                                      title="Mark as showed up"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/10"
                                      onClick={() => handleCheckin(offer.id, response.id, "noshow")}
                                      title="Mark as no-show"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}

                                {/* Status badges */}
                                {isCheckedIn && (
                                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                    Showed
                                  </Badge>
                                )}
                                {isNoShow && (
                                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                    No-show
                                  </Badge>
                                )}
                                {!isCheckedIn && !isNoShow && (
                                  <>
                                    {response.status === "accepted" && !eventPassed && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-blue-500 hover:bg-blue-500/10"
                                        onClick={() => updateResponseStatus(offer.id, response.id, "confirmed")}
                                      >
                                        Confirm
                                      </Button>
                                    )}
                                    <Badge
                                      className={`text-xs ${
                                        response.status === "accepted" ? "bg-green-500/10 text-green-500" :
                                        response.status === "confirmed" ? "bg-blue-500/10 text-blue-500" :
                                        response.status === "declined" ? "bg-red-500/10 text-red-500" :
                                        "bg-amber-500/10 text-amber-500"
                                      }`}
                                    >
                                      {response.status}
                                    </Badge>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  asChild
                                >
                                  <Link href={`/chats?model=${response.model?.username}`}>
                                    <MessageCircle className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
