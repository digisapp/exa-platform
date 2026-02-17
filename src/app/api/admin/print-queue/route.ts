import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

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
      .select("type")
      .eq("user_id", user.id)
      .single();
    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } catch (error) {
    console.error("Print queue error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
