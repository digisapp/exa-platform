import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/brands/model-notes/[modelId] - Get notes for a model
export async function GET(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can access model notes" }, { status: 403 });
  }

  // Get notes for this model
  const { data: notes, error } = await (supabase
    .from("brand_model_notes") as any)
    .select("*")
    .eq("brand_id", actor.id)
    .eq("model_id", modelId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    notes: notes?.notes || "",
    tags: notes?.tags || [],
  });
}

// POST /api/brands/model-notes/[modelId] - Create or update notes for a model
export async function POST(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can manage model notes" }, { status: 403 });
  }

  const body = await request.json();
  const { notes, tags } = body;

  // Validate tags - should be an array of strings
  if (tags && !Array.isArray(tags)) {
    return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
  }

  // Clean and normalize tags
  const cleanTags = tags
    ? tags
        .map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"))
        .filter((t: string) => t.length > 0)
        .slice(0, 10) // Max 10 tags
    : [];

  // Upsert notes
  const { data, error } = await (adminClient
    .from("brand_model_notes") as any)
    .upsert({
      brand_id: actor.id,
      model_id: modelId,
      notes: notes?.trim() || null,
      tags: cleanTags,
      updated_at: new Date().toISOString(),
    }, { onConflict: "brand_id,model_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    notes: data.notes || "",
    tags: data.tags || [],
  });
}

// DELETE /api/brands/model-notes/[modelId] - Delete notes for a model
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can manage model notes" }, { status: 403 });
  }

  const { error } = await (adminClient
    .from("brand_model_notes") as any)
    .delete()
    .eq("brand_id", actor.id)
    .eq("model_id", modelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
