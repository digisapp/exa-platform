import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Check if user is admin
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .single();

  // Only admins can access games (dev mode)
  if (actor?.type !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
