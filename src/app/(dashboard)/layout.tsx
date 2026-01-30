import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { DashboardClientWrapper } from "@/components/layout/DashboardClientWrapper";
import { ActivityTracker } from "@/components/ActivityTracker";
import { CoinBalanceProvider } from "@/contexts/CoinBalanceContext";

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
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: "admin" | "model" | "brand" | "fan" } | null };

  // Get profile info based on actor type
  let profileData: any = null;
  let coinBalance = 0;
  let gemBalance = 0;

  if (actor?.type === "model" || actor?.type === "admin") {
    // Models are linked via user_id, not actor.id
    const { data } = await supabase
      .from("models")
      .select("username, first_name, last_name, profile_photo_url, coin_balance, points_cached")
      .eq("user_id", user.id)
      .single() as { data: any };
    profileData = data;
    coinBalance = data?.coin_balance ?? 0;
    gemBalance = data?.points_cached ?? 0;
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
      // Brand record doesn't exist - create it
      const { data: newBrand } = await (supabase
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

  return (
    <CoinBalanceProvider initialBalance={coinBalance}>
      <div className="min-h-screen bg-background">
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
          gemBalance={gemBalance}
        />
        <DashboardClientWrapper actorId={actor?.id || null}>
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
        />
      </div>
    </CoinBalanceProvider>
  );
}
