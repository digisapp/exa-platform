import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

// GET - Fetch all studio bookings with model info (admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = (adminClient as any)
      .from("studio_bookings")
      .select("*, slot:studio_slots(*), model:models(id, first_name, last_name, username, profile_photo_url)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    // Filter by slot date range if provided
    if (startDate) {
      query = query.gte("slot.date", startDate);
    }
    if (endDate) {
      query = query.lte("slot.date", endDate);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error("Admin studio bookings error:", error);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error("Admin studio bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
