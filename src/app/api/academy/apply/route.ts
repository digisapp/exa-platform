import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServiceRoleClient();
    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const {
      name,
      email,
      phone,
      instagram,
      city,
      state,
      cohort,
      experienceLevel,
      motivation,
    } = await request.json();

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!cohort || !["miami-swim-week", "nyfw", "art-basel"].includes(cohort)) {
      return NextResponse.json({ error: "Valid cohort selection is required" }, { status: 400 });
    }
    if (!experienceLevel || !["beginner", "intermediate", "advanced", "professional"].includes(experienceLevel)) {
      return NextResponse.json({ error: "Experience level is required" }, { status: 400 });
    }

    // Check for existing application for same cohort/year
    const currentYear = new Date().getFullYear();
    const { data: existing } = await (adminClient as any)
      .from("academy_applications")
      .select("id, status")
      .eq("applicant_email", email.trim().toLowerCase())
      .eq("cohort", cohort)
      .eq("cohort_year", currentYear)
      .in("status", ["applied", "enrolled"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active application for this cohort" },
        { status: 400 }
      );
    }

    // Create application
    const { data: application, error: insertError } = await (adminClient as any)
      .from("academy_applications")
      .insert({
        cohort,
        cohort_year: currentYear,
        applicant_name: name.trim(),
        applicant_email: email.trim().toLowerCase(),
        applicant_phone: phone || null,
        applicant_instagram: instagram || null,
        applicant_city: city || null,
        applicant_state: state || null,
        experience_level: experienceLevel,
        motivation: motivation || null,
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating academy application:", insertError);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
    });
  } catch (error) {
    console.error("Academy apply error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}
