import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ListPlus, Users, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import { DeleteListButton } from "@/components/lists/DeleteListButton";

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
    ...list,
    models: list.brand_list_items?.map((item: any) => modelsMap.get(item.model_id)).filter(Boolean) || [],
    item_count: list.brand_list_items?.length || 0,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
          <CreateListDialog />
        </div>

        {/* Lists Grid */}
        {enrichedLists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrichedLists.map((list: any) => (
              <Card key={list.id} className="group hover:border-violet-500/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color }}
                      />
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DeleteListButton listId={list.id} listName={list.name} />
                    </div>
                  </div>
                  {list.description && (
                    <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <Link href={`/lists/${list.id}`}>
                    <div className="space-y-3 cursor-pointer">
                      {/* Model Avatars Preview */}
                      <div className="flex items-center">
                        {list.models.slice(0, 5).map((model: any, idx: number) => (
                          <div
                            key={model.id}
                            className="w-10 h-10 rounded-full border-2 border-background overflow-hidden"
                            style={{ marginLeft: idx === 0 ? 0 : -12 }}
                          >
                            {model.profile_photo_url ? (
                              <Image
                                src={model.profile_photo_url}
                                alt={model.first_name || model.username}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center text-xs">
                                {(model.first_name || model.username)?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        ))}
                        {list.item_count > 5 && (
                          <div
                            className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                            style={{ marginLeft: -12 }}
                          >
                            +{list.item_count - 5}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {list.item_count} {list.item_count === 1 ? "model" : "models"}
                        </span>
                        <span className="text-violet-500 group-hover:underline">
                          View List
                        </span>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ListPlus className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No lists yet</h2>
            <p className="text-muted-foreground mb-6">
              Create lists to organize models for your campaigns and projects.
            </p>
            <CreateListDialog />
          </div>
        )}
      </main>
    </div>
  );
}
