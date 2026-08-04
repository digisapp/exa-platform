import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { vipTierOf, vipTierByKey } from "@/lib/vip-config";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

/**
 * POST — celebrate a fan's VIP tier-up, exactly once per tier.
 *
 * The client pings this when it notices the viewer's tier looks new; the
 * route is fully authoritative and idempotent: the tier is recomputed from
 * fans.lifetime_spend_coins, compared against fans.celebrated_vip_tier, and
 * claimed with a conditional update so concurrent tabs can't double-post.
 * On a genuine tier-up it tells the caller to show the personal
 * congratulations. Deliberately NO public Live Wall post — the wall is for
 * model posts and model/show updates only, not fan milestones.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "liveWall",
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "fan") {
      return NextResponse.json({ celebrated: null });
    }

    const { data: fan } = await (adminClient as any)
      .from("fans")
      .select("lifetime_spend_coins, celebrated_vip_tier")
      .eq("id", actor.id)
      .maybeSingle();

    const tier = vipTierOf(fan?.lifetime_spend_coins);
    if (!fan || !tier) {
      return NextResponse.json({ celebrated: null });
    }

    // Only ever celebrate upgrades — an escrow refund can drop the counter
    // below an already-celebrated threshold and must not re-announce later.
    const alreadyCelebrated = vipTierByKey(fan.celebrated_vip_tier);
    if (alreadyCelebrated && alreadyCelebrated.minSpend >= tier.minSpend) {
      return NextResponse.json({ celebrated: null });
    }

    // Suspended fans get no public moment; mark the tier as handled so the
    // announcement doesn't fire later if they're reinstated.
    const suspended = await assertNotSuspended(actor.id);
    if (suspended) {
      await (adminClient as any)
        .from("fans")
        .update({ celebrated_vip_tier: tier.key })
        .eq("id", actor.id);
      return NextResponse.json({ celebrated: null });
    }

    // Claim the celebration: conditional update on the previous value so a
    // concurrent request loses the race and posts nothing.
    let claim = (adminClient as any)
      .from("fans")
      .update({ celebrated_vip_tier: tier.key })
      .eq("id", actor.id);
    claim = fan.celebrated_vip_tier
      ? claim.eq("celebrated_vip_tier", fan.celebrated_vip_tier)
      : claim.is("celebrated_vip_tier", null);
    const { data: claimed, error: claimError } = await claim.select("id");

    if (claimError || !claimed?.length) {
      if (claimError) logger.error("VIP celebrate claim error", claimError);
      return NextResponse.json({ celebrated: null });
    }

    return NextResponse.json({ celebrated: tier.key });
  } catch (error) {
    logger.error("VIP celebrate error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
