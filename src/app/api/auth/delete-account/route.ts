import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { rateLimitAsync, getClientIP } from "@/lib/rate-limit";

export async function DELETE(request: Request) {
  try {
    // Rate limit: 5 requests per 5 minutes per IP (account deletion is sensitive)
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimitAsync(`delete-account:${clientIP}`, {
      limit: 5,
      windowSeconds: 300,
    });

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

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
      .single() as { data: { id: string; type: string } | null };

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

    // Delete type-specific record
    if (actor.type === "fan") {
      await supabase.from("fans").delete().eq("id", actor.id);
    } else if (actor.type === "model") {
      await supabase.from("models").delete().eq("user_id", user.id);
    } else if (actor.type === "brand") {
      await supabase.from("brands").delete().eq("id", actor.id);
    }

    // Delete actor record
    await supabase.from("actors").delete().eq("id", actor.id);

    // Delete auth user using admin API (requires service role key)
    const serviceClient = createServiceRoleClient();
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);

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
