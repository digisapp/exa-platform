"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Gift,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  DollarSign,
  ChevronRight,
  Send,
  UserCheck,
  UserX,
  MoreHorizontal,
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
  list: {
    id: string;
    name: string;
  } | null;
  responses: Response[];
}

interface Response {
  id: string;
  model_id: string;
  status: string;
  notes: string | null;
  responded_at: string | null;
  created_at: string;
  model: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

export default function BrandOffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    fetchOffers();
  }, []);

  async function fetchOffers() {
    try {
      const res = await fetch("/api/offers");
      if (!res.ok) throw new Error("Failed to fetch offers");
      const data = await res.json();
      setOffers(data.offers || []);
      // Auto-select first offer if exists
      if (data.offers?.length > 0 && !selectedOffer) {
        setSelectedOffer(data.offers[0].id);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  async function updateOfferStatus(offerId: string, status: string) {
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update offer");
      toast.success(`Offer ${status === "closed" ? "closed" : "reopened"}`);
      fetchOffers();
    } catch (error) {
      toast.error("Failed to update offer");
    }
  }

  async function updateResponseStatus(offerId: string, responseId: string, modelId: string, status: string) {
    try {
      // We need to use the offer response endpoint - let me create a simple update
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

  const filteredOffers = offers.filter(offer => {
    if (filter === "open") return offer.status === "open";
    if (filter === "closed") return ["closed", "completed"].includes(offer.status);
    return true;
  });

  const currentOffer = offers.find(o => o.id === selectedOffer);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Offers</h1>
          <p className="text-muted-foreground">Manage offers sent to your model lists</p>
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Offers</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {offers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Gift className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No offers yet</h2>
            <p className="text-muted-foreground mb-6 text-center">
              Create a list of models and send them an offer to get started
            </p>
            <Button asChild>
              <Link href="/lists">Go to Lists</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Offers List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Sent Offers ({filteredOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredOffers.map((offer) => {
                const accepted = offer.responses?.filter(r => r.status === "accepted" || r.status === "confirmed").length || 0;
                const pending = offer.responses?.filter(r => r.status === "pending").length || 0;
                const total = offer.responses?.length || 0;

                return (
                  <div
                    key={offer.id}
                    onClick={() => setSelectedOffer(offer.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedOffer === offer.id
                        ? "border-pink-500 bg-pink-500/10"
                        : "hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{offer.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {offer.list?.name || "Unknown list"}
                        </p>
                      </div>
                      <Badge
                        variant={offer.status === "open" ? "default" : "secondary"}
                        className={offer.status === "open" ? "bg-green-500" : ""}
                      >
                        {offer.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1 text-green-500">
                        <CheckCircle className="h-3 w-3" />
                        {accepted}
                      </span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <Clock className="h-3 w-3" />
                        {pending}
                      </span>
                      <span className="text-muted-foreground">
                        / {total} sent
                      </span>
                    </div>

                    {offer.event_date && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(offer.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                        {offer.event_time && ` at ${offer.event_time}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Offer Details & Responses */}
          <Card className="lg:col-span-2">
            {currentOffer ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{currentOffer.title}</CardTitle>
                      <CardDescription className="mt-1">
                        Sent to {currentOffer.list?.name || "list"}
                        {" · "}
                        {formatDistanceToNow(new Date(currentOffer.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateOfferStatus(
                        currentOffer.id,
                        currentOffer.status === "open" ? "closed" : "open"
                      )}
                    >
                      {currentOffer.status === "open" ? "Close Offer" : "Reopen"}
                    </Button>
                  </div>

                  {/* Offer Details */}
                  <div className="flex flex-wrap gap-3 mt-3 text-sm">
                    {currentOffer.location_name && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {currentOffer.location_name}
                      </span>
                    )}
                    {currentOffer.event_date && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(currentOffer.event_date).toLocaleDateString()}
                        {currentOffer.event_time && ` at ${currentOffer.event_time}`}
                      </span>
                    )}
                    {currentOffer.compensation_type && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        {currentOffer.compensation_type === "paid" && currentOffer.compensation_amount > 0
                          ? `$${(currentOffer.compensation_amount / 100).toFixed(0)}`
                          : currentOffer.compensation_description || currentOffer.compensation_type}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {currentOffer.spots_filled}/{currentOffer.spots} spots filled
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Response Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Accepted", status: "accepted", color: "text-green-500 bg-green-500/10", icon: UserCheck },
                      { label: "Confirmed", status: "confirmed", color: "text-blue-500 bg-blue-500/10", icon: CheckCircle },
                      { label: "Declined", status: "declined", color: "text-red-500 bg-red-500/10", icon: UserX },
                      { label: "Pending", status: "pending", color: "text-amber-500 bg-amber-500/10", icon: Clock },
                    ].map(({ label, status, color, icon: Icon }) => {
                      const count = currentOffer.responses?.filter(r => r.status === status).length || 0;
                      return (
                        <div key={status} className={`p-3 rounded-lg ${color.split(" ")[1]}`}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color.split(" ")[0]}`} />
                            <span className={`text-2xl font-bold ${color.split(" ")[0]}`}>{count}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Responses List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Responses ({currentOffer.responses?.length || 0})
                    </h3>

                    {(!currentOffer.responses || currentOffer.responses.length === 0) ? (
                      <p className="text-muted-foreground text-sm py-8 text-center">
                        No responses yet
                      </p>
                    ) : (
                      currentOffer.responses
                        .sort((a, b) => {
                          // Sort: accepted/confirmed first, then pending, then declined
                          const order: Record<string, number> = { confirmed: 0, accepted: 1, pending: 2, declined: 3 };
                          return (order[a.status] || 4) - (order[b.status] || 4);
                        })
                        .map((response) => (
                          <div
                            key={response.id}
                            className="flex items-center gap-3 p-3 rounded-lg border"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={response.model?.profile_photo_url || undefined} />
                              <AvatarFallback>
                                {response.model?.first_name?.[0] || response.model?.username?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/${response.model?.username}`}
                                className="font-medium hover:text-pink-500 truncate block"
                              >
                                {response.model?.first_name
                                  ? `${response.model.first_name} ${response.model.last_name || ""}`.trim()
                                  : `@${response.model?.username}`}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {response.model?.city && response.model?.state
                                  ? `${response.model.city}, ${response.model.state}`
                                  : `@${response.model?.username}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {response.status === "accepted" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
                                  onClick={() => updateResponseStatus(
                                    currentOffer.id,
                                    response.id,
                                    response.model_id,
                                    "confirmed"
                                  )}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirm
                                </Button>
                              )}

                              <Badge
                                className={
                                  response.status === "accepted" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                  response.status === "confirmed" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                  response.status === "declined" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                  "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                }
                              >
                                {response.status === "accepted" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {response.status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {response.status === "declined" && <XCircle className="h-3 w-3 mr-1" />}
                                {response.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                {response.status}
                              </Badge>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                asChild
                              >
                                <Link href={`/chats?model=${response.model?.username}`}>
                                  <MessageCircle className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ChevronRight className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Select an offer to view responses</p>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
