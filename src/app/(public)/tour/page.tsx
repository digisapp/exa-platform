import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { Badge } from "@/components/ui/badge";
import { TourStopActions } from "@/components/tour/TourStopActions";
import { MediaInquiryDialog } from "@/components/auth/MediaInquiryDialog";
import { MapPin, Calendar, Users, Mic2, Camera } from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Tour Dates — EXA Models",
  description:
    "The EXA Models live tour schedule. Models, designers, and media — apply to join us at an upcoming show.",
  alternates: {
    canonical: "https://www.examodels.com/tour",
  },
  openGraph: {
    title: "Tour Dates — EXA Models",
    description:
      "The EXA Models live tour schedule. Models, designers, and media — apply to join us at an upcoming show.",
    url: "https://www.examodels.com/tour",
    type: "website",
    siteName: "EXA Models",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tour Dates — EXA Models",
    description:
      "The EXA Models live tour schedule. Models, designers, and media — apply to join us at an upcoming show.",
  },
  robots: { index: true, follow: true },
};

export const revalidate = 120;

export default async function TourPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;
  let myApplications: any[] = [];

  if (user) {
    const { data: actor } = (await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single()) as {
      data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null;
    };

    actorType = actor?.type || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      const { data } = (await supabase
        .from("models")
        .select("id, username, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single()) as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;

      if (data?.id) {
        const { data: applications } = await (
          supabase.from("gig_applications") as any
        )
          .select("id, status, gig_id")
          .eq("model_id", data.id);
        myApplications = applications || [];
      }
    } else if (actor?.type === "fan") {
      const { data } = (await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single()) as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const { data: tourStops } = (await supabase
    .from("gigs")
    .select("*")
    .eq("type", "tour")
    .eq("visibility", "public")
    .in("status", ["open", "upcoming", "closed", "completed"])
    .order("start_at", { ascending: true })) as { data: any[] | null };

  const displayName =
    profileData?.display_name || profileData?.username || undefined;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const upcoming = (tourStops || []).filter(
    (s) =>
      s.start_at &&
      new Date(s.end_at || s.start_at) >= todayStart &&
      ["open", "upcoming"].includes(s.status)
  );
  const past = (tourStops || [])
    .filter((s) => !upcoming.includes(s))
    .reverse(); // most recent past show first

  // Group upcoming stops by year — "continuous" schedule with year dividers
  const byYear = new Map<number, any[]>();
  for (const stop of upcoming) {
    const year = new Date(stop.start_at).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(stop);
  }

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-dvh bg-background">
        <Navbar
          user={
            user
              ? {
                  id: user.id,
                  email: user.email || "",
                  avatar_url:
                    profileData?.profile_photo_url ||
                    profileData?.avatar_url ||
                    undefined,
                  name: displayName,
                  username: profileData?.username || undefined,
                }
              : undefined
          }
          actorType={actorType}
        />

        {/* ═══════════════════════════════════════════ */}
        {/* HERO */}
        {/* ═══════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_60%)] pointer-events-none" />
          <div className="container px-6 md:px-16 pt-16 md:pt-24 pb-10 md:pb-14 relative">
            <p className="text-pink-400 font-semibold text-sm tracking-[0.3em] uppercase mb-4 flex items-center gap-2">
              <Mic2 className="h-4 w-4" />
              EXA Models Live
            </p>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 text-transparent bg-clip-text mb-4">
              Tour Dates
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Runway shows and live events across the country. Models, designers,
              and media — pick a date and apply to join us.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* SCHEDULE */}
        {/* ═══════════════════════════════════════════ */}
        <section className="pb-12 md:pb-20">
          <div className="container px-4 md:px-16">
            {upcoming.length === 0 ? (
              <div className="text-center py-20 border border-white/5 rounded-3xl">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                <h2 className="text-xl font-semibold mb-2">New dates coming soon</h2>
                <p className="text-zinc-400 max-w-md mx-auto">
                  We&apos;re locking in the next run of shows. Media and press can
                  join the list below to hear about dates first.
                </p>
              </div>
            ) : (
              [...byYear.entries()].map(([year, stops]) => (
                <div key={year} className="mb-10">
                  {/* Year divider */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-2xl font-black text-white/90">{year}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-pink-500/40 via-violet-500/20 to-transparent" />
                  </div>

                  <div className="space-y-4">
                    {stops.map((stop: any) => {
                      const myApp = myApplications.find((a) => a.gig_id === stop.id);
                      const spotsLeft =
                        stop.spots != null ? stop.spots - (stop.spots_filled || 0) : null;
                      const start = new Date(stop.start_at);
                      return (
                        <div
                          key={stop.id}
                          className="group relative rounded-2xl border border-white/10 bg-zinc-900/40 hover:border-pink-500/30 transition-colors overflow-hidden"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5">
                            {/* Date block */}
                            <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0 sm:w-20 shrink-0 text-center">
                              <span className="text-xs font-bold tracking-widest text-pink-400 uppercase">
                                {format(start, "MMM")}
                              </span>
                              <span className="text-3xl font-black text-white leading-none">
                                {format(start, "d")}
                              </span>
                              {stop.end_at && new Date(stop.end_at).getDate() !== start.getDate() && (
                                <span className="text-[10px] text-zinc-500 sm:mt-1">
                                  – {format(new Date(stop.end_at), "MMM d")}
                                </span>
                              )}
                            </div>

                            {/* Cover */}
                            <div className="hidden sm:block w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                              {stop.cover_image_url ? (
                                <Image
                                  src={stop.cover_image_url}
                                  alt={stop.title}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Mic2 className="h-7 w-7 text-white/20" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-lg text-white">{stop.title}</h3>
                                {stop.status === "open" ? (
                                  <Badge className="bg-green-500/15 text-green-400 border border-green-500/30">
                                    Now Casting
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                    Announced
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-zinc-400">
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-pink-400" />
                                  {[stop.location_name, stop.location_city, stop.location_state]
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                                {spotsLeft != null && stop.status === "open" && (
                                  <span className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                                    {spotsLeft > 0
                                      ? `${spotsLeft} model ${spotsLeft === 1 ? "spot" : "spots"} left`
                                      : "Model spots full"}
                                  </span>
                                )}
                              </div>
                              {stop.description && (
                                <p className="text-sm text-zinc-500 mt-1 line-clamp-1">
                                  {stop.description}
                                </p>
                              )}
                            </div>

                            {/* Apply buttons */}
                            <div className="shrink-0">
                              <TourStopActions
                                gigId={stop.id}
                                showTitle={stop.title}
                                slug={stop.slug}
                                status={stop.status}
                                hasApplied={!!myApp}
                                applicationStatus={myApp?.status}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Past shows */}
            {past.length > 0 && (
              <div className="mt-14">
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-sm font-semibold tracking-widest uppercase text-zinc-500">
                    Past Shows
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                <div className="space-y-2">
                  {past.map((stop: any) => (
                    <div
                      key={stop.id}
                      className="flex items-center gap-4 rounded-xl border border-white/5 bg-zinc-900/20 px-4 py-3 opacity-60"
                    >
                      <span className="text-xs font-semibold text-zinc-500 w-24 shrink-0">
                        {format(new Date(stop.start_at), "MMM d, yyyy")}
                      </span>
                      <span className="font-medium text-sm text-zinc-300 truncate">
                        {stop.title}
                      </span>
                      <span className="text-xs text-zinc-500 truncate hidden sm:block">
                        {[stop.location_city, stop.location_state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════ */}
        {/* MEDIA LIST CTA */}
        {/* ═══════════════════════════════════════════ */}
        <section className="pb-16 md:pb-24">
          <div className="container px-6 md:px-16">
            <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <p className="text-cyan-400 font-semibold text-xs tracking-[0.25em] uppercase mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Press &amp; Media
                </p>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Cover the whole tour
                </h2>
                <p className="text-zinc-400 max-w-xl">
                  Photographers, videographers, and press — join our media list to
                  get show announcements and credential info first.
                </p>
              </div>
              <MediaInquiryDialog>
                <button className="shrink-0 inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600 text-white font-semibold transition-colors">
                  Join the Media List
                </button>
              </MediaInquiryDialog>
            </div>
          </div>
        </section>
      </div>
    </CoinBalanceProvider>
  );
}
