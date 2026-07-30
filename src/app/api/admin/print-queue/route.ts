import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";

export const GET = withAuth(
  async () => {
    const adminClient: any = createServiceRoleClient();
    const { data, error } = await adminClient
      .from("comp_card_print_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Print queue fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders: data });
  },
  { requireType: "admin" }
);
