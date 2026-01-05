import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ModelCard } from "@/components/models/model-card";
import { RemoveFromListButton } from "@/components/lists/RemoveFromListButton";

export const metadata: Metadata = {
  title: "List | EXA",
  description: "View your model list on EXA",
};

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Get list with items
  const { data: list, error } = await (supabase
    .from("brand_lists") as any)
    .select(`
      *,
      brand_list_items (
        id,
        model_id,
        notes,
        added_at
      )
    `)
    .eq("id", id)
    .eq("brand_id", actor.id)
    .single();

  if (error || !list) {
    notFound();
  }

  // Get model details
  const modelIds = list.brand_list_items?.map((item: any) => item.model_id) || [];
  let models: any[] = [];

  if (modelIds.length > 0) {
    const { data: modelData } = await supabase
      .from("models")
      .select("*")
      .in("id", modelIds);
    models = modelData || [];
  }

  // Create a map for quick lookup
  const modelsMap = new Map(models.map(m => [m.id, m]));

  // Merge with list items to preserve order and get notes
  const orderedModels = list.brand_list_items
    ?.map((item: any) => ({
      ...modelsMap.get(item.model_id),
      listItemId: item.id,
      notes: item.notes,
      addedAt: item.added_at,
    }))
    .filter((m: any) => m.id) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-8 md:px-16 py-8">
        {/* Back Link */}
        <Link
          href="/lists"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: list.color }}
            />
            <h1 className="text-3xl font-bold">{list.name}</h1>
          </div>
          {list.description && (
            <p className="text-muted-foreground">{list.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {orderedModels.length} {orderedModels.length === 1 ? "model" : "models"}
          </p>
        </div>

        {/* Models Grid */}
        {orderedModels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {orderedModels.map((model: any) => (
              <div key={model.id} className="relative group">
                <ModelCard
                  model={model}
                  showFavorite={false}
                  isLoggedIn={true}
                />
                <RemoveFromListButton
                  listId={id}
                  modelId={model.id}
                  modelName={model.first_name || model.username}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No models in this list</h2>
            <p className="text-muted-foreground mb-6">
              Browse models and add them to this list using the list icon.
            </p>
            <Button asChild>
              <Link href="/models">Browse Models</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
