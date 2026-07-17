import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// POST — model confirms their accepted spot on a travel trip.
// Needs the service role: the model self-update RLS policy on
// gig_applications is deliberately pending-only (20260716000001), so this
// route validates ownership + state and then writes confirmed_at.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimited) return rateLimited;

    const parsed = z.object({ applicationId: z.string().uuid() }).safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Application id required" }, { status: 400 });
    }

    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    const adminClient = createServiceRoleClient();
    const { data: application } = await (adminClient.from("gig_applications") as any)
      .select("id, model_id, status, confirmed_at, gig:gigs(id, type, title, status)")
      .eq("id", parsed.data.applicationId)
      .single();

    if (!application || application.model_id !== model.id) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (application.gig?.type !== "travel") {
      return NextResponse.json({ error: "Only travel trips can be confirmed" }, { status: 400 });
    }
    if (application.status !== "accepted") {
      return NextResponse.json({ error: "Only accepted spots can be confirmed" }, { status: 400 });
    }
    if (application.confirmed_at) {
      return NextResponse.json({ success: true, confirmed_at: application.confirmed_at });
    }
    if (application.gig?.status === "cancelled") {
      return NextResponse.json({ error: "This trip has been cancelled" }, { status: 400 });
    }

    const confirmedAt = new Date().toISOString();
    const { error } = await (adminClient.from("gig_applications") as any)
      .update({ confirmed_at: confirmedAt })
      .eq("id", application.id)
      .eq("status", "accepted"); // compare-and-set vs concurrent admin decision

    if (error) {
      logger.error("Trip confirm failed", error, { applicationId: application.id });
      return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
    }

    return NextResponse.json({ success: true, confirmed_at: confirmedAt });
  } catch (error) {
    logger.error("Trip confirm error", error);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }
}
