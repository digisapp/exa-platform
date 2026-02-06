import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });
    }

    // Look up staff member by PIN
    const { data: staff, error } = await supabase
      .from("pos_staff")
      .select("id, name, role, is_active")
      .eq("pin", pin)
      .eq("is_active", true)
      .single();

    if (error || !staff) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    // Log the login
    await supabase.from("pos_staff_logs").insert({
      staff_id: staff.id,
      action: "login",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
