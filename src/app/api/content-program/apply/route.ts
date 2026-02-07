import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendContentProgramApplicationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    // Rate limit - use auth tier since this is a sensitive public endpoint
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createClient();
    const body = await request.json();

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
    } = body;

    // Validation
    if (!brand_name || !contact_name || !email) {
      return NextResponse.json(
        { error: "Brand name, contact name, and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check for existing pending application by email
    const { data: existing } = await (supabase as any)
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
    const { data: application, error } = await (supabase as any)
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
      console.error("Content program application insert error:", error);
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
      console.error("Failed to send content program application email:", emailError);
    }

    return NextResponse.json({
      success: true,
      application_id: application?.id,
    });
  } catch (error) {
    console.error("Content program apply error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
