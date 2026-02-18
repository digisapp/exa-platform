import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Auto-confirm a user's email address (skips email verification step)
// Accepts userId (preferred) for direct lookup, avoids unreliable listUsers pagination
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auto-confirm error:", error);
    return NextResponse.json({ success: true }); // Don't reveal errors
  }
}
