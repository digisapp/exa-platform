export const revalidate = 60;

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { ArrowLeft, Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";
import { TicketPageContent } from "./ticket-page-content";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ day?: string; ref?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("name, description, cover_image_url")
    .eq("slug", slug)
    .single() as { data: any };

  if (!data) {
    return { title: "Tickets | EXA" };
  }

  const title = `Tickets — ${data.name} | EXA Models`;
  const description = `Get your tickets for ${data.name}. Presented by EXA Models.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.examodels.com/shows/${slug}/tickets`,
    },
    openGraph: {
      title,
      description,
      url: `https://www.examodels.com/shows/${slug}/tickets`,
      type: "website",
      siteName: "EXA Models",
      images: data.cover_image_url
        ? [{ url: data.cover_image_url, width: 1200, height: 630, alt: data.name }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: data.cover_image_url ? [data.cover_image_url] : [],
    },
  };
}

export default async function TicketsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { day, ref: rawRef } = await searchParams;
  const ref = rawRef?.replace(/[^a-zA-Z0-9_-]/g, "") || undefined;
  const supabase = await createClient();

  // Get event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .single() as { data: any };

  if (!event) {
    notFound();
  }

  // Fetch ticket tiers
  let ticketTiers: any[] = [];
  if (event.tickets_enabled) {
    const now = new Date();
    const { data: tiers } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    ticketTiers = (tiers || []).map((tier: any) => {
      const available =
        tier.quantity_available === null
          ? null
          : Math.max(0, tier.quantity_available - tier.quantity_sold);

      const isSaleActive =
        (!tier.sale_starts_at || new Date(tier.sale_starts_at) <= now) &&
        (!tier.sale_ends_at || new Date(tier.sale_ends_at) >= now);

      return {
        ...tier,
        available,
        isSoldOut: available === 0,
        isSaleActive,
      };
    });
  }

  const hasInternalTickets = event.tickets_enabled && ticketTiers.length > 0;

  // Resolve referring model for affiliate tracking
  let referringModelName: string | undefined;
  if (ref) {
    const { data: model } = await supabase
      .from("models")
      .select("first_name, username")
      .eq("affiliate_code", ref)
      .single() as { data: any };

    if (model) {
      referringModelName = model.first_name || model.username;
    }
  }

  // Get current user info for navbar
  const { data: { user } } = await supabase.auth.getUser();
  let actorType: "model" | "fan" | "brand" | "admin" | null = null;
  let profileData: any = null;
  let coinBalance = 0;

  if (user) {
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

    actorType = actor?.type || null;

    if (actor?.type === "model" || actor?.type === "admin") {
      const { data: model } = await supabase
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url, coin_balance")
        .eq("user_id", user.id)
        .single() as { data: any };
      profileData = model;
      coinBalance = model?.coin_balance ?? 0;
    } else if (actor?.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("display_name, avatar_url, coin_balance")
        .eq("id", actor.id)
        .single() as { data: any };
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    }
  }

  const displayName =
    actorType === "fan"
      ? profileData?.display_name
      : profileData?.first_name
        ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
        : profileData?.username || undefined;

  // Format dates
  const startDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const dateDisplay =
    startDate && endDate
      ? `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`
      : startDate
        ? format(startDate, "MMMM d, yyyy")
        : "TBA";

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
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

        <main className="container px-4 md:px-8 py-8 max-w-2xl mx-auto">
          {/* Back to show */}
          <Link
            href={`/shows/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {event.name}
          </Link>

          {/* Event header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600 via-violet-600 to-purple-700 p-6 md:p-8 mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Ticket className="h-5 w-5 text-white/80" />
                <span className="text-xs uppercase tracking-[0.2em] text-white/70 font-bold">
                  Tickets
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {event.name}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-white/80">
                {(event.location_city || event.location_state) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-pink-200" />
                    <span>
                      {event.location_city && event.location_state
                        ? `${event.location_city}, ${event.location_state}`
                        : event.location_city || event.location_state}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-cyan-200" />
                  <span>{dateDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket checkout content */}
          {hasInternalTickets ? (
            <TicketPageContent
              tiers={ticketTiers}
              eventName={event.name}
              referringModelName={referringModelName}
              initialDay={day || null}
            />
          ) : (
            <div className="text-center py-16">
              <Ticket className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-lg font-semibold text-white/60">
                Tickets coming soon
              </p>
              <p className="text-sm text-white/40 mt-2">
                Check back later for ticket availability.
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="relative mt-16 border-t border-violet-500/15 bg-gradient-to-b from-transparent to-[#0a0014]/60 backdrop-blur-sm py-8 text-center">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
          <div className="container px-8 md:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={80}
                height={32}
                className="h-8 w-auto"
              />
              <span className="text-sm text-white/50">
                One Platform. Models Worldwide.
              </span>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-6">
            &copy; {new Date().getFullYear()} EXA Models. All rights reserved.
          </p>
        </footer>

        {/* Affiliate Tracking */}
        {ref && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  fetch('/api/affiliate/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                      affiliateCode: ${JSON.stringify(ref)},
                      eventId: ${JSON.stringify(event.id)},
                      source: 'ticket_page'
                    })
                  });
                })();
              `,
            }}
          />
        )}
      </div>
    </CoinBalanceProvider>
  );
}
