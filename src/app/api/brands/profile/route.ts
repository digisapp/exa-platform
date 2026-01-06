import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT /api/brands/profile - Update brand profile
export async function PUT(request: Request) {
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
    return NextResponse.json({ error: "Only brands can update brand profile" }, { status: 403 });
  }

  const body = await request.json();
  const { company_name, contact_name, username, bio, website, phone } = body;

  // Validate required fields
  if (!company_name || company_name.trim().length === 0) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  // Validate username if provided
  if (username) {
    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (username.length > 30) {
      return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400 });
    }

    // Check if username is taken (by another brand)
    const { data: existingBrand } = await (adminClient
      .from("brands") as any)
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
  const { data: brand, error } = await (adminClient
    .from("brands") as any)
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
