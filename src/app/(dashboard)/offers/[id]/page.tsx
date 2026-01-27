"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  MapPin,
  DollarSign,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  MessageCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface Offer {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  event_time?: string;
  location_name?: string;
  location_city?: string;
  location_state?: string;
  compensation_type: string;
  compensation_amount?: number;
  compensation_description?: string;
  spots: number;
  spots_filled: number;
  status: string;
  created_at: string;
  brand?: {
    id: string;
    brands?: {
      id: string;
      company_name?: string;
      logo_url?: string;
    };
  };
}

interface MyResponse {
  id: string;
  status: string;
  notes?: string;
  responded_at?: string;
}

export default function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [myResponse, setMyResponse] = useState<MyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchOffer();
  }, [id]);

  const fetchOffer = async () => {
    try {
      const res = await fetch(`/api/offers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOffer(data.offer);
        setMyResponse(data.my_response);
        setNotes(data.my_response?.notes || "");
      }
    } catch (error) {
      console.error("Error fetching offer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (status: "accepted" | "declined") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offers/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (res.ok) {
        await fetchOffer();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to respond");
      }
    } catch (error) {
      console.error("Error responding:", error);
      alert("Failed to respond to offer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-muted-foreground">Offer not found</p>
              <Button asChild className="mt-4">
                <Link href="/offers">Back to Offers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const brandName = offer.brand?.brands?.company_name || "Brand";
  const logoUrl = offer.brand?.brands?.logo_url;
  const location = [offer.location_name, offer.location_city, offer.location_state]
    .filter(Boolean)
    .join(", ");

  let compensation = "";
  if (offer.compensation_type === "paid" && offer.compensation_amount) {
    compensation = `$${offer.compensation_amount}`;
  } else if (offer.compensation_description) {
    compensation = offer.compensation_description;
  }

  const isPending = !myResponse || myResponse.status === "pending";
  const isAccepted = myResponse?.status === "accepted" || myResponse?.status === "confirmed";
  const isDeclined = myResponse?.status === "declined";
  const spotsAvailable = offer.spots - offer.spots_filled;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        backHref="/offers"
        backLabel="Back to Offers"
        title="Offer Details"
      />

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={brandName}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl">{offer.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{brandName}</p>
              <div className="flex items-center gap-2 mt-2">
                {isPending && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    Awaiting Response
                  </Badge>
                )}
                {isAccepted && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {myResponse?.status === "confirmed" ? "Confirmed" : "Accepted"}
                  </Badge>
                )}
                {isDeclined && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Declined
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {offer.event_date && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date & Time</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(offer.event_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                    {offer.event_time && ` at ${offer.event_time}`}
                  </p>
                </div>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MapPin className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{location}</p>
                </div>
              </div>
            )}
            {compensation && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Compensation</p>
                  <p className="text-sm text-muted-foreground">{compensation}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Spots</p>
                <p className="text-sm text-muted-foreground">
                  {spotsAvailable > 0
                    ? `${spotsAvailable} of ${offer.spots} available`
                    : "All spots filled"}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {offer.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Description</p>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {offer.description}
              </p>
            </div>
          )}

          {/* Response Section */}
          {isPending && offer.status === "open" && (
            <div className="border-t pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Add a note (optional)</p>
                </div>
                <Textarea
                  placeholder="Any message for the brand..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleRespond("accepted")}
                  disabled={submitting || spotsAvailable === 0}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Offer
                </Button>
                <Button
                  onClick={() => handleRespond("declined")}
                  disabled={submitting}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
              {spotsAvailable === 0 && (
                <p className="text-sm text-amber-600 text-center">
                  All spots have been filled for this offer
                </p>
              )}
            </div>
          )}

          {/* Already Responded */}
          {!isPending && (
            <div className="border-t pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isAccepted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                      You accepted this offer
                      {myResponse?.responded_at &&
                        ` on ${new Date(myResponse.responded_at).toLocaleDateString()}`}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span>
                      You declined this offer
                      {myResponse?.responded_at &&
                        ` on ${new Date(myResponse.responded_at).toLocaleDateString()}`}
                    </span>
                  </>
                )}
              </div>
              {myResponse?.notes && (
                <p className="text-sm text-muted-foreground mt-2 pl-6">
                  Your note: &quot;{myResponse.notes}&quot;
                </p>
              )}
            </div>
          )}

          {offer.status !== "open" && isPending && (
            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground text-center">
                This offer is no longer accepting responses
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
