import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use admin client to check models table
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ isImported: false });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if there's an imported model with this email (has email but no user_id)
    const { data: model } = await (adminClient
      .from("models") as any)
      .select("id, first_name, last_name, instagram_name, user_id")
      .eq("email", normalizedEmail)
      .is("user_id", null)
      .single();

    if (!model) {
      return NextResponse.json({ isImported: false });
    }

    // Found an imported model
    const fullName = [model.first_name, model.last_name].filter(Boolean).join(" ");

    return NextResponse.json({
      isImported: true,
      name: fullName || null,
      instagram: model.instagram_name || null,
    });

  } catch (error) {
    console.error("Check imported error:", error);
    return NextResponse.json({ isImported: false });
  }
}
