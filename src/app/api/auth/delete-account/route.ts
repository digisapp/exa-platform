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

    const serviceClient = createServiceRoleClient();
    const now = new Date().toISOString();

    // Parse optional reason from request body
    let reason: string | null = null;
    try {
      const body = await request.json();
      reason = body?.reason || null;
    } catch {
      // No body or invalid JSON — that's fine
    }

    if (actor.type === "model") {
      // Soft delete: mark as deleted, hide from public, but preserve data
      // 30-day recovery window, 90-day auto-purge of personal data
      const { error: modelError } = await (serviceClient
        .from("models") as any)
        .update({
          deleted_at: now,
          deleted_reason: reason,
          is_approved: false,
        })
        .eq("user_id", user.id);

      if (modelError) throw new Error(`Failed to deactivate model: ${modelError.message}`);

      // Deactivate actor (prevents dashboard access)
      await (serviceClient
        .from("actors") as any)
        .update({ deactivated_at: now })
        .eq("id", actor.id);

      // Sign the user out
      await supabase.auth.signOut();

      return NextResponse.json({
        success: true,
        message: "Account deactivated. You have 30 days to contact support to recover your account.",
      });
    } else if (actor.type === "fan") {
      // Hard delete fans (no recovery needed)
      const { error } = await serviceClient.from("fans").delete().eq("id", actor.id);
      if (error) throw new Error(`Failed to delete fan record: ${error.message}`);

      const { error: actorError } = await serviceClient.from("actors").delete().eq("id", actor.id);
      if (actorError) throw new Error(`Failed to delete actor record: ${actorError.message}`);

      const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id);
      if (authError) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "Account partially deleted. Please contact support." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else if (actor.type === "brand") {
      // Hard delete brands
      const { error } = await serviceClient.from("brands").delete().eq("id", actor.id);
      if (error) throw new Error(`Failed to delete brand record: ${error.message}`);

      const { error: actorError } = await serviceClient.from("actors").delete().eq("id", actor.id);
      if (actorError) throw new Error(`Failed to delete actor record: ${actorError.message}`);

      const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id);
      if (authError) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: "Account partially deleted. Please contact support." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown account type" }, { status: 400 });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
