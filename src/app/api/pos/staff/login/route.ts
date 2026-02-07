import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const supabase: any = createServiceRoleClient();

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
