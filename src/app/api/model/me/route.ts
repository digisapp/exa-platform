import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get current user's model profile
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model profile
    const { data: model, error: modelError } = await supabase
      .from("models")
      .select("id, coin_balance, is_approved, first_name, last_name, username")
      .eq("user_id", user.id)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error("[Model Me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
