import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET - Fetch available studio slots for a date range
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
    }

    // Fetch slots with any existing bookings
    const { data: slots, error } = await (supabase as any)
      .from("studio_slots")
      .select("*, booking:studio_bookings(id, model_id, status, notes)")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("is_available", true)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Studio slots fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
    }

    // Return all bookings per slot for multi-booking support
    const transformedSlots = (slots || []).map((slot: any) => ({
      ...slot,
      bookings: (slot.booking || []).filter((b: any) => b.status === "confirmed"),
      booking: slot.booking?.[0] || null, // backward compat
    }));

    return NextResponse.json({ slots: transformedSlots });
  } catch (error) {
    console.error("Studio slots error:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
