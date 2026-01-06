"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Calendar,
  MapPin,
  DollarSign,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
  my_response?: string;
  brand?: {
    id: string;
    brands?: {
      company_name?: string;
      logo_url?: string;
    };
  };
  campaign?: {
    id: string;
    name: string;
  };
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/offers");
      if (res.ok) {
        const data = await res.json();
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (response?: string) => {
    switch (response) {
      case "accepted":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const pendingOffers = offers.filter((o) => !o.my_response || o.my_response === "pending");
  const respondedOffers = offers.filter((o) => o.my_response && o.my_response !== "pending");

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">Offers</h1>
        </div>
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-bold">Offers</h1>
      </div>

      {/* Pending Offers */}
      {pendingOffers.length > 0 && (
        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              Awaiting Response
              <Badge className="bg-blue-500 text-white ml-2">{pendingOffers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} getStatusBadge={getStatusBadge} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responded Offers */}
      {respondedOffers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              Responded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {respondedOffers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} getStatusBadge={getStatusBadge} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {offers.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="p-4 rounded-full bg-blue-500/10 inline-block mb-4">
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="font-semibold mb-2">No offers yet</h3>
              <p className="text-muted-foreground text-sm">
                When brands send you offers, they&apos;ll appear here
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  getStatusBadge,
}: {
  offer: Offer;
  getStatusBadge: (response?: string) => React.ReactNode;
}) {
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

  return (
    <Link
      href={`/offers/${offer.id}`}
      className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-muted/50 hover:bg-white dark:hover:bg-muted transition-colors border border-transparent hover:border-blue-500/30"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={brandName}
            width={48}
            height={48}
            className="object-cover"
          />
        ) : (
          <Building2 className="h-6 w-6 text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{offer.title}</p>
            <p className="text-sm text-muted-foreground">{brandName}</p>
          </div>
          {getStatusBadge(offer.my_response)}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          {offer.event_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(offer.event_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {offer.event_time && ` at ${offer.event_time}`}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
          {compensation && (
            <span className="flex items-center gap-1 text-green-600">
              <DollarSign className="h-3 w-3" />
              {compensation}
            </span>
          )}
        </div>
        {offer.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {offer.description}
          </p>
        )}
      </div>
      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
    </Link>
  );
}
