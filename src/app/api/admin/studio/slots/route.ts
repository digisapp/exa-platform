import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const adminClient = createServiceRoleClient();

async function verifyAdmin(supabase: any): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", user.id)
    .maybeSingle();
  return actor?.type === "admin";
}

// GET - Fetch all slots for a date range (admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await verifyAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
    }

    const { data: slots, error } = await (adminClient as any)
      .from("studio_slots")
      .select("*, booking:studio_bookings(id, model_id, status, notes)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Admin studio slots error:", error);
      return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
    }

    const transformedSlots = (slots || []).map((slot: any) => ({
      ...slot,
      booking: slot.booking?.[0] || null,
    }));

    return NextResponse.json({ slots: transformedSlots });
  } catch (error) {
    console.error("Admin studio slots error:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}

const createSlotsSchema = z.object({
  date: z.string().min(1),
  slots: z.array(z.object({
    start_time: z.string().min(1),
    end_time: z.string().min(1),
  })).min(1),
});

// POST - Create availability slots for a day
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await verifyAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createSlotsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { date, slots } = validation.data;

    const slotsToInsert = slots.map((s) => ({
      date,
      start_time: s.start_time,
      end_time: s.end_time,
      is_available: true,
    }));

    // Upsert to handle re-enabling slots
    const { data, error } = await (adminClient as any)
      .from("studio_slots")
      .upsert(slotsToInsert, { onConflict: "date,start_time" })
      .select();

    if (error) {
      console.error("Admin create slots error:", error);
      return NextResponse.json({ error: "Failed to create slots" }, { status: 500 });
    }

    return NextResponse.json({ success: true, slots: data });
  } catch (error) {
    console.error("Admin create slots error:", error);
    return NextResponse.json({ error: "Failed to create slots" }, { status: 500 });
  }
}

const deleteSlotsSchema = z.object({
  date: z.string().min(1),
  slot_ids: z.array(z.string().uuid()).optional(),
});

// DELETE - Remove availability slots
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    if (!(await verifyAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validation = deleteSlotsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { date, slot_ids } = validation.data;

    if (slot_ids && slot_ids.length > 0) {
      // Delete specific slots (only if no confirmed booking)
      const { error } = await (adminClient as any)
        .from("studio_slots")
        .delete()
        .in("id", slot_ids)
        .eq("date", date);

      if (error) {
        console.error("Admin delete slots error:", error);
        return NextResponse.json({ error: "Failed to delete slots. Some may have bookings." }, { status: 500 });
      }
    } else {
      // Delete all slots for the day that don't have confirmed bookings
      // First get slots with confirmed bookings
      const { data: bookedSlots } = await (adminClient as any)
        .from("studio_bookings")
        .select("slot_id, slot:studio_slots!inner(date)")
        .eq("status", "confirmed")
        .eq("slot.date", date);

      const bookedSlotIds = (bookedSlots || []).map((b: any) => b.slot_id);

      let query = (adminClient as any)
        .from("studio_slots")
        .delete()
        .eq("date", date);

      if (bookedSlotIds.length > 0) {
        query = query.not("id", "in", `(${bookedSlotIds.join(",")})`);
      }

      const { error } = await query;

      if (error) {
        console.error("Admin delete day slots error:", error);
        return NextResponse.json({ error: "Failed to clear day" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete slots error:", error);
    return NextResponse.json({ error: "Failed to delete slots" }, { status: 500 });
  }
}
