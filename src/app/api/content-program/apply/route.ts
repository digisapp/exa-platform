import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendContentProgramApplicationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Bounded field lengths so this public, anon-reachable form can't be used to
// store oversized payloads.
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable();

const applySchema = z.object({
  brand_name: z.string().trim().min(1, "Brand name is required").max(200),
  contact_name: z.string().trim().min(1, "Contact name is required").max(200),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  phone: optionalText(40),
  website_url: optionalText(500),
  instagram_handle: optionalText(100),
  tiktok_handle: optionalText(100),
  collection_name: optionalText(200),
  collection_description: optionalText(5000),
  collection_pieces_count: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
});

// Service role client: this is a public (anon-capable) application form, and
// content_program_applications has no anon policies and no longer has a broad
// authenticated SELECT policy. Inputs are validated server-side and the
// endpoint is rate limited.
const adminClient = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    // Rate limit - use auth tier since this is a sensitive public endpoint
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createClient();

    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const {
      brand_name,
      contact_name,
      email,
      phone,
      website_url,
      instagram_handle,
      tiktok_handle,
      collection_name,
      collection_description,
      collection_pieces_count,
    } = parsed.data;

    // Check for existing pending application by email
    const { data: existing } = await adminClient
      .from("content_program_applications")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        existing: true,
        status: existing.status,
      });
    }

    // Get user_id if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Insert application
    const { data: application, error } = await adminClient
      .from("content_program_applications")
      .insert({
        brand_name: brand_name.trim(),
        contact_name: contact_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        website_url: website_url?.trim() || null,
        instagram_handle: instagram_handle?.trim() || null,
        tiktok_handle: tiktok_handle?.trim() || null,
        collection_name: collection_name?.trim() || null,
        collection_description: collection_description?.trim() || null,
        collection_pieces_count: collection_pieces_count || null,
        user_id: user?.id || null,
        source: "website",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      logger.error("Content program application insert error", error);
      throw error;
    }

    // Send confirmation email (don't fail the request if email fails)
    try {
      await sendContentProgramApplicationEmail({
        to: email.trim().toLowerCase(),
        brandName: brand_name.trim(),
        contactName: contact_name.trim(),
      });
    } catch (emailError) {
      logger.error("Failed to send content program application email", emailError);
    }

    return NextResponse.json({
      success: true,
      application_id: application?.id,
    });
  } catch (error) {
    logger.error("Content program apply error", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
