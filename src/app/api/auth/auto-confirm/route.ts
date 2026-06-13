import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const autoConfirmSchema = z.object({
  userId: z.string().uuid(),
});

// Unauthenticated by design: called immediately after signUp(), before the
// user has a session. The guards below limit it to brand-new, unconfirmed
// fan signups so it can't be used to confirm arbitrary accounts.
const MAX_ACCOUNT_AGE_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json().catch(() => null);
    const parsed = autoConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    const { data: userData, error: userError } =
      await adminClient.auth.admin.getUserById(parsed.data.userId);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userData.user;

    // Already confirmed — idempotent success
    if (user.email_confirmed_at) {
      return NextResponse.json({ success: true });
    }

    if (user.user_metadata?.signup_type !== "fan") {
      return NextResponse.json({ error: "Not eligible" }, { status: 403 });
    }

    const accountAge = Date.now() - new Date(user.created_at).getTime();
    if (accountAge > MAX_ACCOUNT_AGE_MS) {
      return NextResponse.json({ error: "Not eligible" }, { status: 403 });
    }

    const { error: confirmError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error("Auto-confirm failed:", confirmError);
      return NextResponse.json(
        { error: "Failed to confirm email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auto-confirm error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
