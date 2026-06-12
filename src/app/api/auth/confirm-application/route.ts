import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const tokenSchema = z.string().uuid();

// Clicked from the application-received email. Marks the application's email
// as confirmed (proof of ownership) and sends the user to their status page.
// Works signed-out too — the token alone is the proof.
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";

  const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!tokenSchema.safeParse(token).success) {
    return NextResponse.redirect(`${origin}/pending-approval?emailConfirmed=invalid`);
  }

  const adminClient = createServiceRoleClient();

  // Idempotent: re-clicking an already-used link still lands on the success state
  const { data: application } = await (adminClient
    .from("model_applications") as any)
    .select("id, email_confirmed_at")
    .eq("email_confirm_token", token)
    .maybeSingle();

  if (!application) {
    return NextResponse.redirect(`${origin}/pending-approval?emailConfirmed=invalid`);
  }

  if (!application.email_confirmed_at) {
    const { error } = await (adminClient.from("model_applications") as any)
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq("id", application.id);

    if (error) {
      console.error("Error confirming application email:", error);
      return NextResponse.redirect(`${origin}/pending-approval?emailConfirmed=error`);
    }
  }

  return NextResponse.redirect(`${origin}/pending-approval?emailConfirmed=1`);
}
