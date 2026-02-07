import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // IP-based rate limit for unauthenticated endpoint
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ hasProfile: false });
    }

    // Check for actor record
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (actor) {
      return NextResponse.json({
        hasProfile: true,
        type: (actor as { type: string }).type,
        actorId: (actor as { id: string }).id,
      });
    }

    // Legacy check for model record without actor
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (model) {
      return NextResponse.json({
        hasProfile: true,
        type: "model",
        actorId: (model as { id: string }).id,
      });
    }

    return NextResponse.json({ hasProfile: false });
  } catch (error) {
    console.error("Check profile error:", error);
    return NextResponse.json({ hasProfile: false });
  }
}
