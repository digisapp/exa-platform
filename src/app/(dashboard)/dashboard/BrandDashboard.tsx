import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModelCard } from "@/components/models/model-card";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { SendOfferFromDashboardDialog } from "@/components/offers/SendOfferFromDashboardDialog";
import { BRAND_SUBSCRIPTION_TIERS } from "@/lib/stripe-config";
import {
  ArrowRight,
  Clock,
  Calendar,
  Mail,
  Crown,
  CheckCircle2,
  Megaphone,
  Heart,
  AlertCircle,
} from "lucide-react";

const BRAND_SERVICE_LABELS: Record<string, string> = {
  photoshoot_hourly: "Photoshoot",
  photoshoot_half_day: "Photoshoot (Half-Day)",
  photoshoot_full_day: "Photoshoot (Full-Day)",
  promo: "Promo",
  brand_ambassador: "Brand Ambassador",
  private_event: "Private Event",
  social_companion: "Social Companion",
  meet_greet: "Meet & Greet",
  other: "Other",
};

export async function BrandDashboard({ actorId }: { actorId: string }) {
  const supabase = await createClient();

  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("*")
    .eq("id", actorId)
    .single();

  const isApproved = brand?.is_verified === true;
  const isPending = brand?.is_verified !== true;

  const [
    { data: campaignsList },
    { data: offersData },
    { data: upcomingBookings },
    { data: follows },
  ] = await Promise.all([
    (supabase.from("campaigns") as any)
      .select(`*, campaign_models(id)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false }),
    (supabase.from("offers") as any)
      .select(`*, offer_responses(id, status, model_id, responded_at)`)
      .eq("brand_id", actorId)
      .order("created_at", { ascending: false }),
    (supabase.from("bookings") as any)
      .select("id, event_date, service_type, status, model_id")
      .eq("client_id", actorId)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .neq("status", "cancelled")
      .order("event_date", { ascending: true })
      .limit(5),
    (supabase.from("follows") as any)
      .select(`
        created_at,
        following_id,
        actors!follows_following_id_fkey (
          user_id
        )
      `)
      .eq("follower_id", actorId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const coinBalance = brand?.coin_balance || 0;

  const allResponses = (offersData || []).flatMap((offer: any) =>
    (offer.offer_responses || []).map((r: any) => ({
      ...r,
      offer_title: offer.title,
      offer_id: offer.id,
    }))
  );
  const pendingResponseCount = allResponses.filter((r: any) => r.status === "pending").length;
  const upcomingEventCount = (upcomingBookings || []).length;

  const campaignOfferMap = new Map<string, { accepted: number; pending: number }>();
  (offersData || []).forEach((offer: any) => {
    if (!offer.campaign_id) return;
    const existing = campaignOfferMap.get(offer.campaign_id) || { accepted: 0, pending: 0 };
    (offer.offer_responses || []).forEach((r: any) => {
      if (r.status === "accepted" || r.status === "confirmed") existing.accepted++;
      else if (r.status === "pending") existing.pending++;
    });
    campaignOfferMap.set(offer.campaign_id, existing);
  });

  const bookingModelIds = (upcomingBookings || []).map((b: any) => b.model_id).filter(Boolean);
  let bookingModels: any[] = [];
  if (bookingModelIds.length > 0) {
    const { data } = await (supabase.from("models") as any)
      .select("id, username, first_name, last_name, profile_photo_url")
      .in("id", bookingModelIds);
    bookingModels = data || [];
  }
  const enrichMap = new Map(bookingModels.map((m: any) => [m.id, m]));

  const currentTier = (brand?.subscription_tier || "free") as keyof typeof BRAND_SUBSCRIPTION_TIERS;
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[currentTier] || BRAND_SUBSCRIPTION_TIERS.free;

  const followedUserIds = follows?.map((f: any) => f.actors?.user_id).filter(Boolean) || [];
  let favoriteModels: any[] = [];
  if (followedUserIds.length > 0) {
    const { data: followedModels } = await (supabase.from("models") as any)
      .select(`
        id, user_id, username, first_name, last_name, profile_photo_url,
        city, state, show_location,
        instagram_followers, tiktok_followers,
        height, show_measurements,
        focus_tags, reliability_score,
        is_verified, is_featured, last_active_at
      `)
      .in("user_id", followedUserIds)
      .eq("is_approved", true);

    const modelsByUserId = new Map(
      (followedModels || []).map((m: any) => [m.user_id, m])
    );
    favoriteModels = followedUserIds
      .map((userId: string) => modelsByUserId.get(userId))
      .filter(Boolean);
  }

  const displayName = brand?.company_name || "Brand";

  const dashboardCampaigns = (campaignsList || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    modelCount: c.campaign_models?.length || 0,
  }));

  const campaignById = new Map<string, { name: string; color: string | null }>(
    (campaignsList || []).map((c: any) => [c.id, { name: c.name, color: c.color }])
  );

  const totalOfferCount = (offersData || []).length;
  const recentOffers = (offersData || []).slice(0, 4).map((offer: any) => {
    const responses = offer.offer_responses || [];
    const accepted = responses.filter(
      (r: any) => r.status === "accepted" || r.status === "confirmed"
    ).length;
    const pending = responses.filter((r: any) => r.status === "pending").length;
    const declined = responses.filter((r: any) => r.status === "declined").length;
    const campaign = offer.campaign_id ? campaignById.get(offer.campaign_id) : null;
    return {
      id: offer.id,
      title: offer.title,
      campaignName: campaign?.name || null,
      campaignColor: campaign?.color || null,
      accepted,
      pending,
      declined,
      total: responses.length,
    };
  });

  const hasActionItems = isPending || pendingResponseCount > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HERO — identity */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,191,255,0.15) 0%, rgba(139,92,246,0.08) 50%, rgba(255,105,180,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />

        <div className="relative flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-violet-500 to-pink-500 blur-md opacity-60" />
            {brand?.logo_url ? (
              <Image
                src={brand.logo_url}
                alt={displayName}
                width={80}
                height={80}
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-2 ring-white/30"
              />
            ) : (
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/40 to-pink-500/40 ring-2 ring-white/30 flex items-center justify-center text-2xl font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight truncate">
              <span className="exa-gradient-text">{displayName}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/40 shadow-[0_0_10px_rgba(167,139,250,0.2)]">
                <Crown className="h-3 w-3 text-violet-300" />
                <span className="text-[11px] font-semibold text-violet-200">{tierConfig.name}</span>
              </span>
              {isApproved ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40">
                  <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                  <span className="text-[11px] font-semibold text-emerald-200">Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40">
                  <Clock className="h-3 w-3 text-amber-300" />
                  <span className="text-[11px] font-semibold text-amber-200">Pending</span>
                </span>
              )}
              <span className="text-[11px] text-white/40">·</span>
              <Link href="/coins" className="text-[11px] text-white/60 hover:text-white transition-colors">
                {coinBalance.toLocaleString()} coins
              </Link>
              {currentTier !== "enterprise" && (
                <Link href="/brands/subscription" className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 transition-colors">
                  Upgrade
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ACTION REQUIRED — only renders when something needs the brand's attention */}
      {hasActionItems && (
        <section className="space-y-3">
          {isPending && (
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="p-3 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40">
                <Clock className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">Application under review</h3>
                <p className="text-white/60 text-sm mt-1">
                  We&apos;re reviewing your brand application. You&apos;ll receive an email once approved.
                  In the meantime, feel free to browse our models!
                </p>
              </div>
            </div>
          )}
          {pendingResponseCount > 0 && (
            <Link
              href="/brands/offers"
              className="flex items-center gap-4 p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent hover:border-cyan-500/50 transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-500/40">
                <AlertCircle className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">
                  {pendingResponseCount} {pendingResponseCount === 1 ? "model is" : "models are"} reviewing your offers
                </p>
                <p className="text-xs text-white/60">Check back soon, or open the offers page to follow up.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </Link>
          )}
        </section>
      )}

      {/* CORE — Upcoming shows + Campaigns + Offers */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Upcoming shows */}
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Upcoming shows</h2>
              {upcomingEventCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                  {upcomingEventCount}
                </span>
              )}
            </div>
            {upcomingEventCount > 0 && (
              <Link href="/bookings" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </header>
          <div className="p-4">
            {(upcomingBookings || []).length > 0 ? (
              <div className="space-y-3">
                {(upcomingBookings || []).map((booking: any) => {
                  const model = enrichMap.get(booking.model_id);
                  const respName = model?.first_name
                    ? `${model.first_name} ${model.last_name || ""}`.trim()
                    : model?.username || "Model";
                  return (
                    <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <Avatar className="h-10 w-10 ring-1 ring-white/10">
                        <AvatarImage src={model?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                          {respName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {model?.username ? (
                          <Link href={`/${model.username}`} className="font-medium text-sm text-white hover:text-cyan-300 truncate block transition-colors">
                            {respName}
                          </Link>
                        ) : (
                          <p className="font-medium text-sm text-white truncate">{respName}</p>
                        )}
                        <p className="text-xs text-white/50">
                          {BRAND_SERVICE_LABELS[booking.service_type] || booking.service_type}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white">
                          {new Date(booking.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0">
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 mb-3">
                  <Calendar className="h-6 w-6 text-emerald-300" />
                </div>
                <p className="text-sm text-white/60">No upcoming shows</p>
                <p className="text-xs text-white/40 mt-1">Confirmed bookings will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active campaigns */}
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-pink-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-400" />
              <h2 className="text-base font-semibold text-white">Campaigns</h2>
              {dashboardCampaigns.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300">
                  {dashboardCampaigns.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {dashboardCampaigns.length > 0 && (
                <Link href="/campaigns" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              <CreateCampaignDialog
                triggerLabel="New"
                triggerClassName="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-[11px] font-semibold text-violet-200 transition-colors"
              />
            </div>
          </header>
          <div className="p-3">
            {dashboardCampaigns.length > 0 ? (
              <div className="space-y-2">
                {dashboardCampaigns.slice(0, 4).map((campaign: { id: string; name: string; color?: string | null; modelCount: number }) => {
                  const offerSummary = campaignOfferMap.get(campaign.id);
                  return (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-violet-500/30 transition-all group"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                        style={{ backgroundColor: campaign.color || "#ec4899", color: campaign.color || "#ec4899" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-white truncate">{campaign.name}</p>
                        <p className="text-xs text-white/50">
                          {campaign.modelCount} {campaign.modelCount === 1 ? "model" : "models"}
                          {offerSummary && (offerSummary.accepted > 0 || offerSummary.pending > 0) && (
                            <>
                              {" · "}
                              {offerSummary.accepted > 0 && (
                                <span className="text-emerald-300">{offerSummary.accepted} accepted</span>
                              )}
                              {offerSummary.accepted > 0 && offerSummary.pending > 0 && ", "}
                              {offerSummary.pending > 0 && (
                                <span className="text-amber-300">{offerSummary.pending} pending</span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/10 ring-1 ring-violet-500/30 mb-3">
                  <Megaphone className="h-6 w-6 text-violet-300" />
                </div>
                <p className="text-sm text-white/70 font-medium">Start with a campaign</p>
                <p className="text-xs text-white/50 mt-1 mb-4">
                  Group the models you want to reach, then send them offers.
                </p>
                <CreateCampaignDialog
                  triggerLabel="New Campaign"
                  triggerClassName="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-xs font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.4)] transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* Offers */}
        <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Offers</h2>
              {totalOfferCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300">
                  {totalOfferCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {recentOffers.length > 0 && (
                <Link href="/brands/offers" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              <SendOfferFromDashboardDialog
                campaigns={dashboardCampaigns}
                triggerClassName="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-[11px] font-semibold text-cyan-200 transition-colors"
              />
            </div>
          </header>
          <div className="p-3">
            {recentOffers.length > 0 ? (
              <div className="space-y-2">
                {recentOffers.map((offer: typeof recentOffers[number]) => (
                  <Link
                    key={offer.id}
                    href="/brands/offers"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-cyan-500/30 transition-all group"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-[0_0_8px_currentColor]"
                      style={{
                        backgroundColor: offer.campaignColor || "#06b6d4",
                        color: offer.campaignColor || "#06b6d4",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate">{offer.title}</p>
                      <p className="text-xs text-white/50 truncate">
                        {offer.campaignName ? <>{offer.campaignName} · </> : null}
                        {offer.total === 0 ? (
                          <span className="text-white/40">No responses yet</span>
                        ) : (
                          <>
                            {offer.accepted > 0 && (
                              <span className="text-emerald-300">{offer.accepted} accepted</span>
                            )}
                            {offer.accepted > 0 && offer.pending > 0 && ", "}
                            {offer.pending > 0 && (
                              <span className="text-amber-300">{offer.pending} pending</span>
                            )}
                            {(offer.accepted > 0 || offer.pending > 0) && offer.declined > 0 && ", "}
                            {offer.declined > 0 && (
                              <span className="text-rose-300">{offer.declined} declined</span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/30 mb-3">
                  <Mail className="h-6 w-6 text-cyan-300" />
                </div>
                <p className="text-sm text-white/70 font-medium">Send your first offer</p>
                <p className="text-xs text-white/50 mt-1 mb-4">
                  {dashboardCampaigns.length > 0
                    ? "Pick a campaign and notify every model in it at once."
                    : "Create a campaign first, then send offers to its models."}
                </p>
                <SendOfferFromDashboardDialog
                  campaigns={dashboardCampaigns}
                  triggerClassName="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-xs font-semibold text-white shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAVORITES — only renders when there's something to show */}
      {favoriteModels.length > 0 && (
        <div className="rounded-2xl border border-pink-500/25 bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-transparent overflow-hidden">
          <header className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
              <h2 className="text-base font-semibold text-white">Favorites</h2>
            </div>
            <Link href="/favorites" className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </header>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteModels.slice(0, 4).map((model: any) => (
                <ModelCard key={model.id} model={model} showFavorite={true} isFavorited={true} isLoggedIn={true} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
