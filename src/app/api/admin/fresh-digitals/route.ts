import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

const adminClient = createServiceRoleClient();

export const GET = withAuth(
  async () => {
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
  },
  { requireType: "admin" }
);
