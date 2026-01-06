import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ListPlus } from "lucide-react";
import type { Metadata } from "next";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { ListsGrid } from "@/components/lists/ListsGrid";

export const metadata: Metadata = {
  title: "My Lists | EXA",
  description: "Manage your model lists on EXA",
};

export default async function ListsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirect=/lists");
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    redirect("/dashboard");
  }

  // Get brand profile for navbar
  const { data: brand } = await (supabase
    .from("brands") as any)
    .select("company_name, logo_url, coin_balance")
    .eq("id", actor.id)
    .single();

  // Get all lists with items
  const { data: lists } = await (supabase
    .from("brand_lists") as any)
    .select(`
      *,
      brand_list_items (
        id,
        model_id,
        added_at
      )
    `)
    .eq("brand_id", actor.id)
    .order("created_at", { ascending: false });

  // Get model details for list previews
  const allModelIds = lists?.flatMap((list: any) =>
    list.brand_list_items?.map((item: any) => item.model_id) || []
  ) || [];

  const modelsMap = new Map();
  if (allModelIds.length > 0) {
    const uniqueModelIds = [...new Set(allModelIds)];
    const { data: models } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url")
      .in("id", uniqueModelIds);

    models?.forEach((m: any) => modelsMap.set(m.id, m));
  }

  // Enrich lists with model data
  const enrichedLists = lists?.map((list: any) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    color: list.color,
    models: list.brand_list_items?.map((item: any) => modelsMap.get(item.model_id)).filter(Boolean) || [],
    item_count: list.brand_list_items?.length || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={{
          id: user.id,
          email: user.email || "",
          avatar_url: brand?.logo_url || undefined,
          name: brand?.company_name || undefined,
        }}
        actorType="brand"
        coinBalance={brand?.coin_balance ?? 0}
      />

      <main className="container px-8 md:px-16 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <ListPlus className="h-8 w-8 text-violet-500" />
              <h1 className="text-3xl font-bold">My Lists</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Organize models into lists for your campaigns and projects
            </p>
          </div>
          {enrichedLists.length > 0 && <CreateListDialog />}
        </div>

        {/* Lists Grid with Search */}
        <ListsGrid lists={enrichedLists} />
      </main>
    </div>
  );
}
