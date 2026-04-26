import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardClientWrapper } from "@/components/layout/DashboardClientWrapper";
import { ActivityTracker } from "@/components/ActivityTracker";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";
import { RouteFocusManager } from "@/components/layout/RouteFocusManager";
import { I18nProvider } from "@/i18n";

// Prevent caching to ensure fresh auth state on every request
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Get actor info
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type, deactivated_at")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan"; deactivated_at: string | null } | null };

  // If account is deactivated, sign out and redirect
  if (actor?.deactivated_at) {
    await supabase.auth.signOut();
    redirect("/signin");
  }

  // Get profile info based on actor type
  let profileData: any = null;
  let coinBalance = 0;

  if (actor?.type === "model" || actor?.type === "admin") {
    // Models are linked via user_id, not actor.id
    const { data } = await supabase
      .from("models")
      .select("username, first_name, last_name, profile_photo_url, coin_balance")
      .eq("user_id", user.id)
      .single() as { data: any };
    profileData = data;
    coinBalance = data?.coin_balance ?? 0;
  } else if (actor?.type === "fan") {
    // Fans use actor.id as their id
    const { data } = await supabase
      .from("fans")
      .select("display_name, username, avatar_url, coin_balance")
      .eq("id", actor.id)
      .single() as { data: any };
    profileData = data;
    coinBalance = data?.coin_balance ?? 0;
  } else if (actor?.type === "brand") {
    // Brands use actor.id as their id
    const { data } = await (supabase
      .from("brands") as any)
      .select("company_name, logo_url, coin_balance")
      .eq("id", actor.id)
      .single() as { data: any };

    if (data) {
      profileData = data;
      coinBalance = data?.coin_balance ?? 0;
    } else {
      // Brand record doesn't exist - create it using service role to bypass RLS
      const serviceClient = createServiceRoleClient();
      const { data: newBrand } = await (serviceClient
        .from("brands") as any)
        .insert({
          id: actor.id,
          email: user.email,
          company_name: "My Brand",
          is_verified: false,
          subscription_tier: "free",
        })
        .select("company_name, logo_url, coin_balance")
        .single();

      if (newBrand) {
        profileData = newBrand;
        coinBalance = newBrand?.coin_balance ?? 0;
      }
    }
  }

  const displayName = actor?.type === "fan"
    ? profileData?.display_name || profileData?.username
    : actor?.type === "brand"
      ? profileData?.company_name
      : profileData?.first_name
        ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
        : profileData?.username || undefined;

  // Fetch unread message count for nav badges
  let unreadCount = 0;
  try {
    const { data: count } = await supabase.rpc('get_unread_message_count', {
      p_user_id: user.id,
    });
    unreadCount = count || 0;
  } catch {
    // Non-critical, default to 0
  }

  // Compute notification count per actor type (fed to navbar bell).
  // All queries wrapped in try/catch and non-blocking — bell just shows 0 on failure.
  let notificationCount = 0;
  if (actor) {
    try {
      if (actor.type === "model") {
        // Models: pending offers + pending bookings + active auctions ending in <24h
        const modelRow = (profileData as any)?.id
          ? { id: (profileData as any).id }
          : await (supabase.from("models") as any)
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle()
              .then((res: any) => res.data);

        if (modelRow?.id) {
          const endsBefore = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const [offers, bookings, auctions] = await Promise.all([
            (supabase.from("offer_responses") as any)
              .select("id", { count: "exact", head: true })
              .eq("model_id", modelRow.id)
              .eq("status", "pending"),
            (supabase.from("bookings") as any)
              .select("id", { count: "exact", head: true })
              .eq("model_id", modelRow.id)
              .in("status", ["pending", "counter"]),
            (supabase.from("auctions") as any)
              .select("id", { count: "exact", head: true })
              .eq("model_id", modelRow.id)
              .eq("status", "active")
              .gt("ends_at", new Date().toISOString())
              .lt("ends_at", endsBefore),
          ]);
          notificationCount =
            (offers.count || 0) + (bookings.count || 0) + (auctions.count || 0);
        }
      } else if (actor.type === "brand") {
        // Brands: accepted offer responses not yet confirmed + upcoming bookings in 7 days
        const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const [upcoming, acceptedResponses] = await Promise.all([
          (supabase.from("bookings") as any)
            .select("id", { count: "exact", head: true })
            .eq("client_id", actor.id)
            .in("status", ["accepted", "confirmed"])
            .gte("event_date", new Date().toISOString().split("T")[0])
            .lte("event_date", in7Days.split("T")[0]),
          // Count accepted offer responses awaiting brand confirmation
          (supabase.from("offers") as any)
            .select("offer_responses!inner(id)", { count: "exact", head: true })
            .eq("brand_id", actor.id)
            .eq("status", "open")
            .eq("offer_responses.status", "accepted"),
        ]);
        notificationCount = (upcoming.count || 0) + (acceptedResponses.count || 0);
      } else if (actor.type === "fan") {
        // Fans: outbid auctions (action needed)
        const { count } = await (supabase.from("auction_bids") as any)
          .select("id", { count: "exact", head: true })
          .eq("bidder_id", actor.id)
          .eq("status", "outbid");
        notificationCount = count || 0;
      }
    } catch {
      // Non-critical, fall through to 0
    }
  }

  return (
    <I18nProvider>
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
        <RouteFocusManager />
        <ActivityTracker />
        <Navbar
          user={{
            id: user.id,
            email: user.email || "",
            avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || profileData?.logo_url || undefined,
            name: displayName,
            username: profileData?.username || undefined,
          }}
          actorType={actor?.type || null}
          unreadCount={unreadCount}
          notificationCount={notificationCount}
        />
        <DashboardClientWrapper actorId={actor?.id || null} actorType={actor?.type || null}>
          <main className="container px-4 md:px-8 py-8 pb-24 md:pb-8">{children}</main>
        </DashboardClientWrapper>
        <BottomNav
          user={{
            avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || profileData?.logo_url || undefined,
            name: displayName,
            email: user.email || "",
          }}
          actorType={actor?.type || null}
          unreadCount={unreadCount}
          notificationCount={notificationCount}
        />
      </div>
    </CoinBalanceProvider>
    </I18nProvider>
  );
}
