import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { cleanMessage } from "@/lib/profanity";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const postSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(280, "Message is too long (280 char max)"),
});

/** POST - Send a live wall message */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "liveWall",
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const content = cleanMessage(validation.data.content.trim());

    // Look up actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Get display name + avatar based on actor type
    let displayName = "Anonymous";
    let avatarUrl: string | null = null;

    if (actor.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("first_name, last_name, username, profile_photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (model) {
        displayName =
          `${model.first_name || ""} ${model.last_name || ""}`.trim() ||
          model.username ||
          "Model";
        avatarUrl = model.profile_photo_url;
      }
    } else if (actor.type === "fan") {
      const { data: fan } = await supabase
        .from("fans")
        .select("display_name, username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (fan) {
        displayName = fan.display_name || fan.username || "Fan";
        avatarUrl = fan.avatar_url;
      }
    } else if (actor.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("company_name, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (brand) {
        displayName = brand.company_name || "Brand";
        avatarUrl = brand.logo_url;
      }
    } else if (actor.type === "admin") {
      displayName = "EXA Admin";
    }

    const { data: message, error } = await (adminClient as any)
      .from("live_wall_messages")
      .insert({
        actor_id: actor.id,
        actor_type: actor.type,
        display_name: displayName,
        avatar_url: avatarUrl,
        content,
        message_type: "chat",
      })
      .select()
      .single();

    if (error) {
      console.error("Live wall insert error:", error);
      return NextResponse.json(
        { error: "Failed to post message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Live wall POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** DELETE - Admin soft-delete a message */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");
    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID required" },
        { status: 400 }
      );
    }

    const { error } = await (adminClient as any)
      .from("live_wall_messages")
      .update({ is_deleted: true })
      .eq("id", messageId);

    if (error) {
      console.error("Live wall delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Live wall DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
