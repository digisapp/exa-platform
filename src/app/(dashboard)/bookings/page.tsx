import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookingsClient } from "./bookings-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: actor } = await (supabase.from("actors") as any)
    .select("id, type")
    .eq("user_id", user.id)
    .maybeSingle();

  const isModel = actor?.type === "model";

  let username: string | null = null;
  if (isModel) {
    const { data: model } = await (supabase.from("models") as any)
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();
    username = model?.username ?? null;
  }

  return <BookingsClient userRole={isModel ? "model" : "client"} username={username} />;
}
