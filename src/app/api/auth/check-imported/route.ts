import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Use admin client to check models table
const adminClient = createServiceRoleClient();

export async function GET(request: NextRequest) {
  try {
    // IP-based rate limit for unauthenticated endpoint
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ isImported: false });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if there's an imported model with this email (has email but no user_id)
    const { data: model } = await adminClient
      .from("models")
      .select("id")
      .eq("email", normalizedEmail)
      .is("user_id", null)
      .single();

    if (!model) {
      return NextResponse.json({ isImported: false });
    }

    // Do not return name / instagram — public endpoint, would enable PII enumeration.
    // Pre-fill happens client-side after the user authenticates and claims the account.
    return NextResponse.json({ isImported: true });

  } catch (error) {
    console.error("Check imported error:", error);
    return NextResponse.json({ isImported: false });
  }
}
