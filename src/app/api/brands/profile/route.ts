import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const brandProfileSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_name: z.string().nullish(),
  username: z.string().min(3).max(30).nullish(),
  bio: z.string().max(5000).nullish(),
  website: z.string().url().nullish(),
  phone: z.string().nullish(),
});

const adminClient = createServiceRoleClient();

// PUT /api/brands/profile - Update brand profile
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can update brand profile" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = brandProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { company_name, contact_name, username, bio, website, phone } = parsed.data;

  // Validate username if provided
  if (username) {

    // Check if username is taken (by another brand)
    const { data: existingBrand } = await adminClient
      .from("brands")
      .select("id")
      .eq("username", username)
      .neq("id", actor.id)
      .single();

    if (existingBrand) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    // Check if username is taken by a model
    const { data: existingModel } = await adminClient
      .from("models")
      .select("id")
      .eq("username", username)
      .single();

    if (existingModel) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }
  }

  // Update brand profile
  const { data: brand, error } = await adminClient
    .from("brands")
    .update({
      company_name: company_name.trim(),
      contact_name: contact_name?.trim() || null,
      username: username?.trim() || null,
      bio: bio?.trim() || null,
      website: website?.trim() || null,
      phone: phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", actor.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating brand profile:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brand });
}
