import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const supabase: any = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    const { staff_id, staff_name, opening_cash, terminal_id = "default" } = await request.json();

    if (opening_cash === undefined || opening_cash < 0) {
      return NextResponse.json({ error: "Invalid opening cash amount" }, { status: 400 });
    }

    // Check for existing open session on this terminal
    const { data: existingSession } = await supabase
      .from("pos_drawer_sessions")
      .select("id")
      .eq("terminal_id", terminal_id)
      .eq("status", "open")
      .single();

    if (existingSession) {
      return NextResponse.json(
        { error: "A drawer session is already open on this terminal" },
        { status: 400 }
      );
    }

    // Create new session
    const { data: session, error } = await supabase
      .from("pos_drawer_sessions")
      .insert({
        terminal_id,
        staff_id,
        staff_name,
        opening_cash,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Error opening drawer:", error);
      return NextResponse.json({ error: "Failed to open drawer" }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        opened_at: session.opened_at,
        opening_cash: session.opening_cash,
        total_cash_sales: 0,
        total_card_sales: 0,
        total_transactions: 0,
        expected_cash: session.opening_cash,
      },
    });
  } catch (error) {
    console.error("Drawer open error:", error);
    return NextResponse.json({ error: "Failed to open drawer" }, { status: 500 });
  }
}
