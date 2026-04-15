import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: bookings, error } = await (adminClient as any)
      .from("miami_digitals_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Summary stats
    const all = bookings || [];
    const paid = all.filter((b: any) => b.status === "paid");
    const pending = all.filter((b: any) => b.status === "pending");
    const digisCreators = all.filter((b: any) => b.is_digis_creator);
    const totalRevenue = paid
      .filter((b: any) => !b.is_digis_creator)
      .reduce((sum: number, b: any) => sum + (b.amount_cents || 0), 0);

    return NextResponse.json({
      bookings: all,
      stats: {
        total: all.length,
        paid: paid.length,
        pending: pending.length,
        digisCreators: digisCreators.length,
        totalRevenue: totalRevenue / 100,
      },
    });
  } catch (error) {
    logger.error("Admin miami digitals error", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
