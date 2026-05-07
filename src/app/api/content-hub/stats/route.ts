import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getModelId } from "@/lib/ids";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service: any = createServiceRoleClient();
    const modelId = await getModelId(service, user.id);

    if (!modelId) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 403 });
    }

    const { data, error } = await service.rpc("get_content_hub_stats", {
      p_model_id: modelId,
    });

    if (error) {
      logger.error("Content stats RPC error", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    return NextResponse.json(
      data ?? {
        total_items: 0,
        portfolio_count: 0,
        exclusive_count: 0,
        private_count: 0,
        total_unlocks: 0,
        total_revenue: 0,
        top_items: [],
        sets_count: 0,
        scheduled_count: 0,
      },
      { headers: { "Cache-Control": "private, max-age=10" } },
    );
  } catch (error) {
    logger.error("Content stats error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
