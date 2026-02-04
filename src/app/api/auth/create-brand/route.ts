import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Zod schema for brand creation validation
const createBrandSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(100, "Company name is too long").trim(),
  contactName: z.string().max(100, "Contact name is too long").optional().nullable(),
  bio: z.string().max(1000, "Bio is too long").optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = createBrandSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { companyName, contactName, bio } = validationResult.data;

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user already has an actor record
    const { data: existingActor } = await (supabase
      .from("actors") as any)
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (existingActor) {
      // Check if brand profile exists
      const { data: existingBrand } = await (supabase
        .from("brands") as any)
        .select("id")
        .eq("id", existingActor.id)
        .single();

      if (existingBrand) {
        return NextResponse.json({
          success: true,
          actorId: existingActor.id,
          existing: true,
        });
      }

      // Actor exists but no brand - create brand profile
      // Generate username from company name
      let baseUsername = companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      if (baseUsername.length < 3) {
        baseUsername = baseUsername + "brand";
      }

      let finalUsername = baseUsername;
      let suffix = 1;

      // Check for username conflicts
      while (suffix < 100) {
        const { data: conflict } = await (supabase
          .from("brands") as any)
          .select("id")
          .eq("username", finalUsername)
          .maybeSingle();

        if (!conflict) break;
        finalUsername = `${baseUsername}${suffix}`;
        suffix++;
      }

      const { error: brandError } = await (supabase
        .from("brands") as any)
        .upsert({
          id: existingActor.id,
          username: finalUsername,
          company_name: companyName,
          contact_name: contactName || null,
          email: user.email,
          bio: bio || null,
          is_verified: false,
          subscription_tier: "free",
        }, { onConflict: "id" });

      if (brandError) {
        console.error("Brand upsert error:", brandError);
        return NextResponse.json(
          { error: "Failed to create brand profile" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        actorId: existingActor.id,
        existing: true,
      });
    }

    // Create actor record with type "brand"
    const { data: actor, error: actorError } = await (supabase
      .from("actors") as any)
      .upsert({
        user_id: user.id,
        type: "brand",
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (actorError) {
      console.error("Actor creation error:", actorError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const actorId = (actor as { id: string }).id;

    // Generate username from company name
    let baseUsername = companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    if (baseUsername.length < 3) {
      baseUsername = baseUsername + "brand";
    }

    let finalUsername = baseUsername;
    let suffix = 1;

    // Check for username conflicts
    while (suffix < 100) {
      const { data: conflict } = await (supabase
        .from("brands") as any)
        .select("id")
        .eq("username", finalUsername)
        .maybeSingle();

      if (!conflict) break;
      finalUsername = `${baseUsername}${suffix}`;
      suffix++;
    }

    // Create brand profile
    const { error: brandError } = await (supabase
      .from("brands") as any)
      .upsert({
        id: actorId,
        username: finalUsername,
        company_name: companyName,
        contact_name: contactName || null,
        email: user.email,
        bio: bio || null,
        is_verified: false,
        subscription_tier: "free",
      }, { onConflict: "id" });

    if (brandError) {
      console.error("Brand creation error:", brandError);
      return NextResponse.json(
        { error: "Failed to create brand profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      actorId: actorId,
    });
  } catch (error) {
    console.error("Create brand error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
