import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { z } from "zod";

// Campaigns for the admin offers page's campaign picker. campaigns has only
// brand-owner RLS policies (no admin policy), so the browser client returns
// zero rows for admins — this route reads via the service client instead.

const querySchema = z.object({
  brand_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = querySchema.safeParse({
    brand_id: request.nextUrl.searchParams.get("brand_id"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "brand_id is required" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: campaigns, error } = await (service.from("campaigns") as any)
    .select(
      `
      id,
      name,
      brand_id,
      campaign_models(count)
    `
    )
    .eq("brand_id", parsed.data.brand_id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }

  const withCount = (campaigns || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    brand_id: c.brand_id,
    model_count: c.campaign_models?.[0]?.count || 0,
  }));

  return NextResponse.json({ campaigns: withCount });
}
