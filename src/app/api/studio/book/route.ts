import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const bookSlotSchema = z.object({
  slot_id: z.string().uuid("Invalid slot ID"),
  notes: z.string().max(500, "Notes too long").optional(),
});

// POST - Book a studio slot
export async function POST(request: NextRequest) {
  try {
    const supabase: any = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Must be a model
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Only models can book studio time" }, { status: 403 });
    }

    const body = await request.json();
    const validation = bookSlotSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { slot_id, notes } = validation.data;

    // Verify slot exists and is available
    const { data: slot } = await supabase
      .from("studio_slots")
      .select("id, date, start_time, is_available, max_bookings")
      .eq("id", slot_id)
      .eq("is_available", true)
      .single();

    if (!slot) {
      return NextResponse.json({ error: "Slot not found or not available" }, { status: 404 });
    }

    // Don't allow booking past dates
    const slotDate = new Date(slot.date + "T" + slot.start_time);
    if (slotDate < new Date()) {
      return NextResponse.json({ error: "Cannot book a slot in the past" }, { status: 400 });
    }

    // Check how many confirmed bookings exist for this slot
    const { count } = await supabase
      .from("studio_bookings")
      .select("id", { count: "exact", head: true })
      .eq("slot_id", slot_id)
      .eq("status", "confirmed");

    const maxBookings = slot.max_bookings ?? 3;
    if ((count ?? 0) >= maxBookings) {
      return NextResponse.json({ error: "This slot is fully booked" }, { status: 409 });
    }

    // Insert booking - UNIQUE(slot_id, model_id) prevents same model booking twice
    const { data: booking, error } = await supabase
      .from("studio_bookings")
      .insert({
        slot_id,
        model_id: model.id,
        notes: notes || null,
        status: "confirmed",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You have already booked this slot" }, { status: 409 });
      }
      console.error("Studio booking error:", error);
      return NextResponse.json({ error: "Failed to book slot" }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error("Studio book error:", error);
    return NextResponse.json({ error: "Failed to book slot" }, { status: 500 });
  }
}
