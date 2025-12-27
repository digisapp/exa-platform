import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  if (actor?.type === "model" || actor?.type === "admin") {
    const { data } = await supabase
      .from("models")
      .select("username, first_name, last_name, profile_photo_url, coin_balance")
      .eq("id", actor.id)
      .single() as { data: any };
    profileData = data;
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

  const displayName = actor?.type === "fan"
    ? profileData?.display_name
    : profileData?.first_name
      ? `${profileData.first_name} ${profileData.last_name || ""}`.trim()
      : profileData?.username || undefined;

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={{
          id: user.id,
          email: user.email || "",
          avatar_url: profileData?.profile_photo_url || profileData?.avatar_url || undefined,
          name: displayName,
          username: profileData?.username || undefined,
        }}
        actorType={actor?.type || null}
        coinBalance={coinBalance}
      />
      <main className="container px-4 md:px-8 py-8">{children}</main>
    </div>
  );
}
