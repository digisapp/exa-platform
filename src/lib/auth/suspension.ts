import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// fans.id === actors.id, so the caller's actor id is also the fan id.
const admin = createServiceRoleClient();

/**
 * Returns a 403 response if the actor is a suspended fan, otherwise null.
 * Fans are suspended automatically while a Stripe payment dispute is open
 * (see webhooks/stripe/handlers/disputes.ts) and by admins. Spend and message
 * routes call this after resolving the caller's actor:
 *
 *   const blocked = await assertNotSuspended(actor.id);
 *   if (blocked) return blocked;
 *
 * The read uses the service-role client so RLS can't make it fail open. Coin
 * spend RPCs are service-role only, so this route-level gate cannot be bypassed
 * by calling the database directly. Non-fan actors have no fans row and pass.
 */
export async function assertNotSuspended(actorId: string): Promise<NextResponse | null> {
  const { data } = await admin
    .from("fans")
    .select("is_suspended")
    .eq("id", actorId)
    .maybeSingle();

  if (data?.is_suspended) {
    return NextResponse.json(
      {
        error:
          "Your account is temporarily restricted while a payment dispute is being reviewed. Contact support if you believe this is a mistake.",
      },
      { status: 403 }
    );
  }
  return null;
}
