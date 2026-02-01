import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// GET - Fetch available slots (public)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const onlyAvailable = searchParams.get("only_available") !== "false";

    let query = (supabase as any)
      .from("availability_slots")
      .select("id, date, start_time, end_time, is_available, notes")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    if (onlyAvailable) {
      query = query.eq("is_available", true);
    }

    const { data: slots, error } = await query;

    if (error) {
      console.error("Fetch availability error:", error);
      return NextResponse.json(
        { error: "Failed to fetch availability" },
        { status: 500 }
      );
    }

    return NextResponse.json({ slots: slots || [] });
  } catch (error) {
    console.error("Availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

// POST - Create new slot(s) (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { slots } = body;

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: "Slots array is required" },
        { status: 400 }
      );
    }

    // Validate each slot
    for (const slot of slots) {
      if (!slot.date || !slot.start_time) {
        return NextResponse.json(
          { error: "Each slot requires date and start_time" },
          { status: 400 }
        );
      }
    }

    // Prepare slots for insertion (15 min duration)
    const slotsToInsert = slots.map((slot: any) => ({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time || addMinutes(slot.start_time, 15),
      is_available: true,
      notes: slot.notes || null,
    }));

    const { data, error } = await (supabase as any)
      .from("availability_slots")
      .upsert(slotsToInsert, { onConflict: "date,start_time" })
      .select();

    if (error) {
      console.error("Create slots error:", error);
      return NextResponse.json(
        { error: "Failed to create slots" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      slots: data,
      message: `Created ${data.length} slot(s)`,
    });
  } catch (error) {
    console.error("Create slots error:", error);
    return NextResponse.json(
      { error: "Failed to create slots" },
      { status: 500 }
    );
  }
}

// DELETE - Remove slot(s) (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get("id");
    const date = searchParams.get("date");

    if (!slotId && !date) {
      return NextResponse.json(
        { error: "Either slot id or date is required" },
        { status: 400 }
      );
    }

    let query = (supabase as any).from("availability_slots").delete();

    if (slotId) {
      query = query.eq("id", slotId);
    } else if (date) {
      query = query.eq("date", date);
    }

    const { error } = await query;

    if (error) {
      console.error("Delete slots error:", error);
      return NextResponse.json(
        { error: "Failed to delete slots" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: slotId ? "Slot deleted" : `Slots for ${date} deleted`,
    });
  } catch (error) {
    console.error("Delete slots error:", error);
    return NextResponse.json(
      { error: "Failed to delete slots" },
      { status: 500 }
    );
  }
}

// Helper to add minutes to time string
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
}
