"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Loader2,
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
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.25)]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="outline" className="text-white/50 bg-white/5 border-white/15">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case "confirmed":
        return (
          <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const pendingOffers = offers.filter((o) => !o.my_response || o.my_response === "pending");
  const respondedOffers = offers.filter((o) => o.my_response && o.my_response !== "pending");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ───── Hero header ───── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,191,255,0.15) 0%, rgba(139,92,246,0.08) 50%, rgba(255,105,180,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Brand offers</p>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              <span className="exa-gradient-text">Offers</span>
            </h1>
            <p className="text-xs md:text-sm text-white/60 mt-1">
              Brand booking offers waiting for your response.
            </p>
          </div>
          {pendingOffers.length > 0 && (
            <div className="shrink-0 flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.3)]">
              <span className="text-2xl font-bold text-amber-300 leading-none">{pendingOffers.length}</span>
              <span className="text-[9px] uppercase tracking-wider text-amber-200/80 font-semibold mt-0.5">Pending</span>
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
        </div>
      ) : (
        <>
          {/* Pending Offers */}
          {pendingOffers.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent overflow-hidden">
              <header className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  <h2 className="text-base font-semibold text-white">Awaiting response</h2>
                  <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    {pendingOffers.length}
                  </span>
                </div>
              </header>
              <div className="p-3 space-y-2">
                {pendingOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} getStatusBadge={getStatusBadge} priority />
                ))}
              </div>
            </div>
          )}

          {/* Responded Offers */}
          {respondedOffers.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <header className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-white/40" />
                  <h2 className="text-base font-semibold text-white">Responded</h2>
                </div>
              </header>
              <div className="p-3 space-y-2">
                {respondedOffers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} getStatusBadge={getStatusBadge} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {offers.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-12 text-center">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-2xl" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-500/40 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-cyan-300" />
                </div>
              </div>
              <h3 className="font-semibold text-white text-lg mb-1">
                <span className="exa-gradient-text">No offers yet</span>
              </h3>
              <p className="text-white/50 text-sm max-w-sm mx-auto">
                When brands send you booking offers, they&apos;ll appear here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  getStatusBadge,
  priority = false,
}: {
  offer: Offer;
  getStatusBadge: (response?: string) => React.ReactNode;
  priority?: boolean;
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
      className={`group flex items-start gap-4 p-4 rounded-xl border transition-all ${
        priority
          ? "bg-white/[0.04] border-amber-500/15 hover:border-amber-500/40 hover:bg-amber-500/5 hover:shadow-[0_0_18px_rgba(245,158,11,0.2)]"
          : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={brandName}
            width={48}
            height={48}
            className="object-cover"
          />
        ) : (
          <Building2 className="h-6 w-6 text-cyan-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-white truncate group-hover:text-white">{offer.title}</p>
            <p className="text-xs text-white/60">{brandName}</p>
          </div>
          {getStatusBadge(offer.my_response)}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
          {offer.event_date && (
            <span className="flex items-center gap-1 text-white/70">
              <Calendar className="h-3 w-3 text-pink-400" />
              {new Date(offer.event_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {offer.event_time && ` at ${offer.event_time}`}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-white/70">
              <MapPin className="h-3 w-3 text-violet-400" />
              {location}
            </span>
          )}
          {compensation && (
            <span className="flex items-center gap-1 text-emerald-300 font-semibold">
              <DollarSign className="h-3 w-3" />
              {compensation}
            </span>
          )}
        </div>
        {offer.description && (
          <p className="text-sm text-white/50 mt-2 line-clamp-2">
            {offer.description}
          </p>
        )}
      </div>
      <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-pink-300 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
    </Link>
  );
}
