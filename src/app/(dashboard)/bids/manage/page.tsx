import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Auction } from "@/types/auctions";
import { ManageBidsClient } from "./ManageBidsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ManageBidsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: model } = await (supabase.from("models") as any)
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/dashboard");

  const { data: auctions, error } = await (supabase.from("auctions") as any)
    .select("*")
    .eq("model_id", model.id)
    .order("created_at", { ascending: false });

  return (
    <ManageBidsClient
      initialAuctions={(auctions as Auction[] | null) ?? []}
      loadError={!!error}
    />
  );
}
