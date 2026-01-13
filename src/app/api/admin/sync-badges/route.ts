import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { gigId } = await request.json();

    if (!gigId) {
      return NextResponse.json({ error: "Missing gigId" }, { status: 400 });
    }

    // Use service role client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the gig with event info
    const { data: gig } = await adminClient
      .from("gigs")
      .select("id, title, event_id")
      .eq("id", gigId)
      .single();

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    if (!gig.event_id) {
      return NextResponse.json({ error: "Gig is not linked to an event" }, { status: 400 });
    }

    // Get the badge for this event
    const { data: badge } = await adminClient
      .from("badges")
      .select("id, name")
      .eq("event_id", gig.event_id)
      .eq("badge_type", "event")
      .eq("is_active", true)
      .single();

    if (!badge) {
      return NextResponse.json({ error: "No badge found for this event" }, { status: 404 });
    }

    // Get all accepted applications for this gig
    const { data: apps } = await adminClient
      .from("gig_applications")
      .select("model_id")
      .eq("gig_id", gigId)
      .eq("status", "accepted");

    if (!apps || apps.length === 0) {
      return NextResponse.json({ awarded: 0, message: "No accepted applications" });
    }

    // Get existing badges
    const modelIds = apps.map(a => a.model_id);
    const { data: existingBadges } = await adminClient
      .from("model_badges")
      .select("model_id")
      .eq("badge_id", badge.id)
      .in("model_id", modelIds);

    const existingSet = new Set(existingBadges?.map(b => b.model_id) || []);
    const missingBadges = modelIds.filter(id => !existingSet.has(id));

    if (missingBadges.length === 0) {
      return NextResponse.json({ awarded: 0, message: "All badges already awarded" });
    }

    // Award missing badges
    const { error: insertError } = await adminClient
      .from("model_badges")
      .insert(
        missingBadges.map(model_id => ({
          model_id,
          badge_id: badge.id,
          earned_at: new Date().toISOString(),
        }))
      );

    if (insertError) {
      console.error("Badge insert error:", insertError);
      return NextResponse.json({ error: "Failed to award badges" }, { status: 500 });
    }

    console.log(`Synced ${missingBadges.length} badges for gig ${gig.title}`);

    return NextResponse.json({
      awarded: missingBadges.length,
      total: modelIds.length,
      badge: badge.name,
    });
  } catch (error) {
    console.error("Sync badges error:", error);
    return NextResponse.json({ error: "Failed to sync badges" }, { status: 500 });
  }
}
