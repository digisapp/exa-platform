import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const tripInterestSchema = z.object({
  gigId: z.string().uuid(),
  modelId: z.string().uuid(),
  tripNumber: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = tripInterestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { gigId, modelId, tripNumber } = parsed.data;

    // Verify model belongs to user
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Check for existing application
    const { data: existingApp } = await supabase
      .from("gig_applications")
      .select("id, status, payment_status")
      .eq("gig_id", gigId)
      .eq("model_id", modelId)
      .single() as { data: { id: string; status: string; payment_status: string | null } | null };

    if (existingApp) {
      if (existingApp.payment_status === "paid") {
        return NextResponse.json(
          { error: "You have already paid for this trip" },
          { status: 400 }
        );
      }
      if (existingApp.status === "approved" || existingApp.status === "accepted") {
        return NextResponse.json(
          { error: "You have already been approved for this trip" },
          { status: 400 }
        );
      }
      // Update existing application to show interest
      await (supabase
        .from("gig_applications") as any)
        .update({
          trip_number: tripNumber || null,
          spot_type: "paid",
          payment_status: "interested",
          status: "pending",
        })
        .eq("id", existingApp.id);
    } else {
      // Create new application with interested status
      await (supabase
        .from("gig_applications") as any)
        .insert({
          gig_id: gigId,
          model_id: modelId,
          trip_number: tripNumber || null,
          spot_type: "paid",
          payment_status: "interested",
          status: "pending",
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Trip interest error:", error);
    return NextResponse.json(
      { error: "Failed to submit interest" },
      { status: 500 }
    );
  }
}
