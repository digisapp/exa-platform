import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get actor to check type
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Don't allow admins to delete their account this way
    if (actor.type === "admin") {
      return NextResponse.json(
        { error: "Admin accounts cannot be deleted this way" },
        { status: 403 }
      );
    }

    // Delete fan record if exists
    if (actor.type === "fan") {
      await supabase.from("fans").delete().eq("id", actor.id);
    }

    // Delete model record if exists
    if (actor.type === "model") {
      await supabase.from("models").delete().eq("user_id", user.id);
    }

    // Delete actor record
    await supabase.from("actors").delete().eq("id", actor.id);

    // Delete auth user using admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      // If admin delete fails, try signing out at least
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account partially deleted. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
