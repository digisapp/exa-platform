import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    let balance = 0;
    // Model-only payout fields (caller's own row) consumed by the wallet page
    let modelExtras: { withheldBalance: number; zelleInfo: string | null; countryCode: string | null } | null = null;

    if (actor.type === "model") {
      // Service client: coin_balance/withheld_balance/zelle_info/country_code not column-granted to client roles (Phase B2 lockdown)
      const { data } = await createServiceRoleClient()
        .from("models")
        .select("coin_balance, withheld_balance, zelle_info, country_code")
        .eq("user_id", user.id)
        .single() as { data: { coin_balance: number; withheld_balance: number | null; zelle_info: string | null; country_code: string | null } | null };
      balance = data?.coin_balance ?? 0;
      modelExtras = {
        withheldBalance: data?.withheld_balance ?? 0,
        zelleInfo: data?.zelle_info ?? null,
        countryCode: data?.country_code ?? null,
      };
    } else if (actor.type === "fan") {
      const { data } = await supabase
        .from("fans")
        .select("coin_balance")
        .eq("id", actor.id)
        .single() as { data: { coin_balance: number } | null };
      balance = data?.coin_balance ?? 0;
    } else if (actor.type === "brand") {
      const { data } = await supabase
        .from("brands")
        .select("coin_balance")
        .eq("id", actor.id)
        .single() as { data: { coin_balance: number } | null };
      balance = data?.coin_balance ?? 0;
    }

    return NextResponse.json({ balance, ...(modelExtras ?? {}) });
  } catch (error) {
    logger.error("Balance fetch error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
