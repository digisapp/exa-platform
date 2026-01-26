import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CoinsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Get actor type
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single() as { data: { type: string } | null };

  // Only fans can access the coins purchase page
  // Models earn coins, brands have subscription-based coins
  if (actor?.type !== "fan") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
