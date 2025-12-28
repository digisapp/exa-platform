import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const REPORT_REASONS = [
  "harassment",
  "spam",
  "inappropriate_content",
  "fake_profile",
  "scam",
  "other"
];

// POST - Create a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get reporter's actor ID
    const { data: reporterActor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!reporterActor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Only models can report (for now)
    if (reporterActor.type !== "model" && reporterActor.type !== "admin") {
      return NextResponse.json({ error: "Only models can submit reports" }, { status: 403 });
    }

    const { reportedActorId, reason, details } = await request.json();

    if (!reportedActorId) {
      return NextResponse.json({ error: "reportedActorId required" }, { status: 400 });
    }

    if (!reason || !REPORT_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Valid reason required" }, { status: 400 });
    }

    // Check if reported user exists
    const { data: reportedActor } = await supabase
      .from("actors")
      .select("id")
      .eq("id", reportedActorId)
      .single();

    if (!reportedActor) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent self-report
    if (reporterActor.id === reportedActorId) {
      return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
    }

    // Check for duplicate recent report (within 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingReport } = await (supabase
      .from("reports") as any)
      .select("id")
      .eq("reporter_id", reporterActor.id)
      .eq("reported_user_id", reportedActorId)
      .gte("created_at", oneDayAgo)
      .single();

    if (existingReport) {
      return NextResponse.json({ error: "You already reported this user recently" }, { status: 400 });
    }

    // Create the report
    const { error: insertError } = await (supabase
      .from("reports") as any)
      .insert({
        reporter_id: reporterActor.id,
        reported_user_id: reportedActorId,
        reason,
        details: details || null,
      });

    if (insertError) {
      console.error("Report insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true, message: "Report submitted" });
  } catch (error) {
    console.error("Report error:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

// GET - Get reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single() as { data: { type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const reportedUserId = searchParams.get("reportedUserId");

    let query = (supabase.from("reports") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (reportedUserId) {
      query = query.eq("reported_user_id", reportedUserId);
    }

    const { data: reports, error } = await query.limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json(
      { error: "Failed to get reports" },
      { status: 500 }
    );
  }
}
