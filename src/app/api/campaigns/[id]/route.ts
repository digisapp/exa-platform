import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  color: z.string().optional(),
});

// GET /api/campaigns/[id] - Get single campaign with models
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    return NextResponse.json({ error: "Only brands can access campaigns" }, { status: 403 });
  }

  // Get campaign with models
  const { data: campaign, error } = await (supabase
    .from("campaigns") as any)
    .select(`
      *,
      campaign_models (
        id,
        model_id,
        notes,
        added_at
      )
    `)
    .eq("id", id)
    .eq("brand_id", actor.id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Get model details
  const modelIds = campaign.campaign_models?.map((item: any) => item.model_id) || [];
  let models: any[] = [];

  if (modelIds.length > 0) {
    const { data: modelData } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url, state, city")
      .in("id", modelIds);
    models = modelData || [];
  }

  // Merge model data with campaign models
  const modelsWithData = campaign.campaign_models?.map((item: any) => ({
    ...item,
    model: models.find(m => m.id === item.model_id),
  })) || [];

  return NextResponse.json({
    campaign: {
      ...campaign,
      campaign_models: modelsWithData,
      model_count: modelsWithData.length,
    },
  });
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    return NextResponse.json({ error: "Only brands can update campaigns" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = campaignUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { name, description, color } = parsed.data;

  const updates: any = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (color !== undefined) updates.color = color;

  // Use service role client to bypass RLS for update
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: campaign, error } = await (adminClient
    .from("campaigns") as any)
    .update(updates)
    .eq("id", id)
    .eq("brand_id", actor.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A campaign with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    return NextResponse.json({ error: "Only brands can delete campaigns" }, { status: 403 });
  }

  // Use service role client to bypass RLS for delete
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await (adminClient
    .from("campaigns") as any)
    .delete()
    .eq("id", id)
    .eq("brand_id", actor.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
