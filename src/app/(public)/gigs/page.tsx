import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Gigs",
  robots: { index: false, follow: false },
};

// Cache page for 2 minutes - gig availability changes more frequently
export const revalidate = 120;

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Plane,
  Camera,
  Star,
  Clock,
  PartyPopper,
  Sparkles,
  ClipboardList,
  CheckCircle,
  XCircle,
  Loader2,
  Ban,
  Gift,
  Building2,
} from "lucide-react";
import { WithdrawApplicationButton } from "@/components/gigs/WithdrawApplicationButton";
import { OfferResponseButtons } from "@/components/offers/OfferResponseButtons";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, any> = {
  show: Star,
  photoshoot: Camera,
  travel: Plane,
  campaign: Camera,
  content: Camera,
  hosting: Users,
  fun: PartyPopper,
  other: Sparkles,
};

const typeColors: Record<string, string> = {
  show: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  photoshoot: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  travel: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  campaign: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  content: "bg-green-500/10 text-green-500 border-green-500/20",
  hosting: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  fun: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default async function GigsPage() {
  const supabase = await createClient();

  // Check if user is logged in and is a model
  const { data: { user } } = await supabase.auth.getUser();
  let model: any = null;
  let myApplications: any[] = [];
  let myOffers: any[] = [];
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

  if (user) {
    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;

    // Get profile info based on actor type
    if (actor?.type === "model" || actor?.type === "admin") {
      const { data } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = data;
      model = data;
      coinBalance = data?.coin_balance ?? 0;
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }

    if (model) {
      // Get model's applications with gig details
      const { data: applications } = await (supabase
        .from("gig_applications") as any)
        .select(`
          id,
          status,
          applied_at,
          gig:gigs (
            id,
            slug,
            title,
            type,
            description,
            location_city,
            location_state,
            start_at,
            compensation_type,
            compensation_amount,
            spots,
            spots_filled,
            cover_image_url
          )
        `)
        .eq("model_id", model.id)
        .order("applied_at", { ascending: false });
      myApplications = applications || [];

      // Get lists the model is in
      const { data: listItems } = await (supabase as any)
        .from("brand_list_items")
        .select("list_id")
        .eq("model_id", model.id);

      const listIds = listItems?.map((item: any) => item.list_id) || [];

      if (listIds.length > 0) {
        // Get offers for those lists with brand info
        const { data: offers } = await (supabase
          .from("offers") as any)
          .select(`
            *,
            brand:actors!brand_id(
              id,
              brands:brands(id, company_name, logo_url)
            ),
            list:brand_lists(id, name)
          `)
          .in("list_id", listIds)
          .eq("status", "open")
          .order("created_at", { ascending: false });

        // Get model's responses
        const offerIds = offers?.map((o: any) => o.id) || [];
        let responses: any[] = [];
        if (offerIds.length > 0) {
          const { data: respData } = await (supabase
            .from("offer_responses") as any)
            .select("offer_id, status")
            .eq("model_id", model.id)
            .in("offer_id", offerIds);
          responses = respData || [];
        }

        // Attach response status to each offer
        myOffers = (offers || []).map((offer: any) => {
          const response = responses.find((r: any) => r.offer_id === offer.id);
          return {
            ...offer,
            my_response: response?.status || "pending",
          };
        });
      }
    }
  }

  // Get open gigs
  const { data: gigs } = await supabase
    .from("gigs")
    .select("*")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("start_at", { ascending: true }) as { data: any[] | null };

  // Group by type
  const shows = gigs?.filter((o) => o.type === "show") || [];
  const photoshoots = gigs?.filter((o) => o.type === "photoshoot") || [];
  const travel = gigs?.filter((o) => o.type === "travel") || [];
  const campaigns = gigs?.filter((o) => ["campaign", "content"].includes(o.type)) || [];
  const fun = gigs?.filter((o) => o.type === "fun") || [];

  const displayName = actorType === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={user ? {
          id: user.id,
          email: user.email || "",
          avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || undefined,
          name: displayName,
          username: profileData?.username || undefined,
        } : undefined}
        actorType={actorType}
      />

      <main className="container px-8 md:px-16 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gigs</h1>
          <p className="text-muted-foreground">
            Apply to fashion shows, travel experiences, and brand campaigns
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={myOffers.length > 0 ? "for-you" : "all"} className="space-y-6">
          <TabsList className="flex-wrap">
            {model && myOffers.length > 0 && (
              <TabsTrigger value="for-you" className="gap-1 bg-gradient-to-r from-pink-500/10 to-violet-500/10 data-[state=active]:from-pink-500 data-[state=active]:to-violet-500 data-[state=active]:text-white">
                <Gift className="h-4 w-4" />
                For You ({myOffers.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="all">All ({gigs?.length || 0})</TabsTrigger>
            <TabsTrigger value="shows">Shows ({shows.length})</TabsTrigger>
            <TabsTrigger value="photoshoots">Photoshoots ({photoshoots.length})</TabsTrigger>
            <TabsTrigger value="travel">Travel ({travel.length})</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
            <TabsTrigger value="fun">Fun ({fun.length})</TabsTrigger>
            {model && (
              <TabsTrigger value="my-applications" className="gap-1">
                <ClipboardList className="h-4 w-4" />
                My Applications ({myApplications.length})
              </TabsTrigger>
            )}
          </TabsList>

          {model && myOffers.length > 0 && (
            <TabsContent value="for-you" className="space-y-6">
              <OffersGrid offers={myOffers} />
            </TabsContent>
          )}

          <TabsContent value="all" className="space-y-6">
            <GigGrid gigs={gigs || []} />
          </TabsContent>

          <TabsContent value="shows" className="space-y-6">
            <GigGrid gigs={shows} />
          </TabsContent>

          <TabsContent value="photoshoots" className="space-y-6">
            <GigGrid gigs={photoshoots} />
          </TabsContent>

          <TabsContent value="travel" className="space-y-6">
            <GigGrid gigs={travel} />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <GigGrid gigs={campaigns} />
          </TabsContent>

          <TabsContent value="fun" className="space-y-6">
            <GigGrid gigs={fun} />
          </TabsContent>

          {model && (
            <TabsContent value="my-applications" className="space-y-6">
              <MyApplicationsGrid applications={myApplications} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function GigGrid({ gigs }: { gigs: any[] }) {
  if (gigs.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No gigs available</h3>
        <p className="text-muted-foreground">Check back soon for new gigs!</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {gigs.map((gig) => (
        <GigCard key={gig.id} gig={gig} />
      ))}
    </div>
  );
}

function GigCard({ gig }: { gig: any }) {
  const Icon = typeIcons[gig.type] || Sparkles;
  const spotsLeft = gig.spots ? gig.spots - (gig.spots_filled || 0) : null;
  const isUrgent = spotsLeft !== null && spotsLeft <= 5;

  return (
    <Link href={`/gigs/${gig.slug}`}>
      <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
        {/* Portrait Image with Overlay */}
        <div className="aspect-[3/4] relative bg-gradient-to-br from-pink-500/20 to-violet-500/20 overflow-hidden">
          {gig.cover_image_url ? (
            <Image
              src={gig.cover_image_url}
              alt={gig.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}

          {/* Type Badge */}
          <Badge className={`absolute top-3 left-3 capitalize ${typeColors[gig.type]}`}>
            <Icon className="h-3 w-3 mr-1" />
            {gig.type}
          </Badge>

          {/* Urgency Badge */}
          {isUrgent && (
            <Badge variant="destructive" className="absolute top-3 right-3">
              {spotsLeft} spots left!
            </Badge>
          )}

          {/* Bottom Title Bar - Always Visible */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
            <h3 className="font-semibold text-white text-lg line-clamp-2">{gig.title}</h3>
            {(gig.location_city || gig.location_state) && (
              <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-pink-400" />
                {gig.location_city && gig.location_state
                  ? `${gig.location_city}, ${gig.location_state}`
                  : gig.location_city || gig.location_state}
              </p>
            )}
          </div>

          {/* Hover Overlay with Full Details */}
          <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xl">{gig.title}</h3>

              {gig.description && (
                <p className="text-sm text-white/80 line-clamp-3">
                  {gig.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {(gig.location_city || gig.location_state) && (
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="h-4 w-4 text-pink-400" />
                    {gig.location_city && gig.location_state
                      ? `${gig.location_city}, ${gig.location_state}`
                      : gig.location_city || gig.location_state}
                  </div>
                )}

                {gig.start_at && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Calendar className="h-4 w-4 text-violet-400" />
                    {new Date(gig.start_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}

                {gig.compensation_type && (
                  <div className="flex items-center gap-2 text-white/90">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    {gig.compensation_type === "paid" && gig.compensation_amount > 0 ? (
                      <span className="font-medium text-green-400">
                        ${(gig.compensation_amount / 100).toFixed(0)}
                      </span>
                    ) : (
                      <span className="capitalize">{gig.compensation_type}</span>
                    )}
                  </div>
                )}

                {spotsLeft !== null && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Users className="h-4 w-4 text-cyan-400" />
                    {spotsLeft} of {gig.spots} spots available
                  </div>
                )}
              </div>

              {/* View Details Button */}
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-medium">
                  View Details
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

const statusConfig: Record<string, { icon: any; label: string; className: string }> = {
  pending: {
    icon: Loader2,
    label: "Pending Review",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  accepted: {
    icon: CheckCircle,
    label: "Accepted",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  rejected: {
    icon: XCircle,
    label: "Not Selected",
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  },
  cancelled: {
    icon: Ban,
    label: "Cancelled",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

function MyApplicationsGrid({ applications }: { applications: any[] }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-16">
        <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No applications yet</h3>
        <p className="text-muted-foreground mb-4">Browse gigs and apply to get started!</p>
        <Button asChild>
          <Link href="/gigs">Browse Gigs</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}

function ApplicationCard({ application }: { application: any }) {
  const gig = application.gig;
  if (!gig) return null;

  const Icon = typeIcons[gig.type] || Sparkles;
  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
      {/* Portrait Image with Overlay */}
      <div className="aspect-[3/4] relative bg-gradient-to-br from-pink-500/20 to-violet-500/20 overflow-hidden">
        {gig.cover_image_url ? (
          <img
            src={gig.cover_image_url}
            alt={gig.title}
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}

        {/* Type Badge */}
        <Badge className={`absolute top-3 left-3 capitalize ${typeColors[gig.type]}`}>
          <Icon className="h-3 w-3 mr-1" />
          {gig.type}
        </Badge>

        {/* Status Badge */}
        <Badge className={`absolute top-3 right-3 ${status.className}`}>
          <StatusIcon className={`h-3 w-3 mr-1 ${application.status === "pending" ? "animate-spin" : ""}`} />
          {status.label}
        </Badge>

        {/* Bottom Info Bar - Always Visible */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
          <h3 className="font-semibold text-white text-lg line-clamp-2">{gig.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-sm font-medium ${
              application.status === "accepted" ? "text-green-400" :
              application.status === "pending" ? "text-amber-400" :
              application.status === "cancelled" ? "text-red-400" :
              "text-white/70"
            }`}>
              {application.status === "accepted" && "You're in!"}
              {application.status === "pending" && "Awaiting response"}
              {application.status === "rejected" && "Not selected"}
              {application.status === "cancelled" && "Cancelled"}
            </span>
          </div>
        </div>

        {/* Hover Overlay with Full Details */}
        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
          <div className="space-y-3">
            <h3 className="font-bold text-white text-xl">{gig.title}</h3>

            <div className="space-y-2 text-sm">
              {(gig.location_city || gig.location_state) && (
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  {gig.location_city && gig.location_state
                    ? `${gig.location_city}, ${gig.location_state}`
                    : gig.location_city || gig.location_state}
                </div>
              )}

              {gig.start_at && (
                <div className="flex items-center gap-2 text-white/90">
                  <Calendar className="h-4 w-4 text-violet-400" />
                  {new Date(gig.start_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}

              {gig.compensation_amount && (
                <div className="flex items-center gap-2 text-white/90">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-green-400">
                    ${(gig.compensation_amount / 100).toFixed(0)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-white/90">
                <Clock className="h-4 w-4 text-cyan-400" />
                Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {application.status === "pending" && (
                <WithdrawApplicationButton
                  applicationId={application.id}
                  gigTitle={gig.title}
                />
              )}
              <Button variant="outline" size="sm" asChild className="border-white/30 text-white hover:bg-white/10">
                <Link href={`/gigs/${gig.slug}`}>View Details</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Offers Grid for "For You" tab
function OffersGrid({ offers }: { offers: any[] }) {
  if (offers.length === 0) {
    return (
      <div className="text-center py-16">
        <Gift className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No offers yet</h3>
        <p className="text-muted-foreground">When brands send you offers, they&apos;ll appear here!</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

const offerResponseConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Respond Now",
    className: "text-amber-500",
  },
  accepted: {
    label: "Accepted",
    className: "text-green-500",
  },
  declined: {
    label: "Declined",
    className: "text-gray-500",
  },
  confirmed: {
    label: "Confirmed",
    className: "text-green-500",
  },
};

function OfferCard({ offer }: { offer: any }) {
  const brandName = offer.brand?.brands?.company_name || "Brand";
  const brandLogo = offer.brand?.brands?.logo_url;
  const spotsLeft = offer.spots ? offer.spots - (offer.spots_filled || 0) : null;
  const responseStatus = offerResponseConfig[offer.my_response] || offerResponseConfig.pending;

  return (
    <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
      <div className="aspect-[3/4] relative bg-gradient-to-br from-pink-500/20 to-violet-500/20 overflow-hidden">
        {/* Brand Logo or Gradient Background */}
        <div className="absolute inset-0 flex items-center justify-center">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="w-24 h-24 object-contain opacity-30"
            />
          ) : (
            <Building2 className="h-20 w-20 text-muted-foreground/30" />
          )}
        </div>

        {/* Offer Badge */}
        <Badge className="absolute top-3 left-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white border-0">
          <Gift className="h-3 w-3 mr-1" />
          Offer
        </Badge>

        {/* Response Status Badge */}
        {offer.my_response !== "pending" && (
          <Badge className={`absolute top-3 right-3 ${
            offer.my_response === "accepted" ? "bg-green-500/10 text-green-500 border-green-500/20" :
            "bg-gray-500/10 text-gray-500 border-gray-500/20"
          }`}>
            {offer.my_response === "accepted" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
            {responseStatus.label}
          </Badge>
        )}

        {/* Bottom Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
          <p className="text-sm text-pink-400 font-medium">{brandName}</p>
          <h3 className="font-semibold text-white text-lg line-clamp-2">{offer.title}</h3>
          {(offer.location_city || offer.location_name) && (
            <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 text-pink-400" />
              {offer.location_name || `${offer.location_city}, ${offer.location_state}`}
            </p>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
          <div className="space-y-3">
            <p className="text-sm text-pink-400 font-medium">{brandName}</p>
            <h3 className="font-bold text-white text-xl">{offer.title}</h3>

            {offer.description && (
              <p className="text-sm text-white/80 line-clamp-3">{offer.description}</p>
            )}

            <div className="space-y-2 text-sm">
              {offer.location_name && (
                <div className="flex items-center gap-2 text-white/90">
                  <Building2 className="h-4 w-4 text-pink-400" />
                  {offer.location_name}
                </div>
              )}

              {(offer.location_city || offer.location_state) && (
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  {offer.location_city && offer.location_state
                    ? `${offer.location_city}, ${offer.location_state}`
                    : offer.location_city || offer.location_state}
                </div>
              )}

              {offer.event_date && (
                <div className="flex items-center gap-2 text-white/90">
                  <Calendar className="h-4 w-4 text-violet-400" />
                  {new Date(offer.event_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {offer.event_time && ` at ${offer.event_time}`}
                </div>
              )}

              {offer.compensation_type && (
                <div className="flex items-center gap-2 text-white/90">
                  <DollarSign className="h-4 w-4 text-green-400" />
                  {offer.compensation_type === "paid" && offer.compensation_amount > 0 ? (
                    <span className="font-medium text-green-400">
                      ${(offer.compensation_amount / 100).toFixed(0)}
                    </span>
                  ) : offer.compensation_description ? (
                    <span>{offer.compensation_description}</span>
                  ) : (
                    <span className="capitalize">{offer.compensation_type}</span>
                  )}
                </div>
              )}

              {spotsLeft !== null && (
                <div className="flex items-center gap-2 text-white/90">
                  <Users className="h-4 w-4 text-cyan-400" />
                  {spotsLeft} of {offer.spots} spots available
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <OfferResponseButtons
                offerId={offer.id}
                currentStatus={offer.my_response}
                offerTitle={offer.title}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
