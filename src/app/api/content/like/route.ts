import { createClient } from "@/lib/supabase/server";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const likeSchema = z.object({
  contentId: z.string().uuid(),
});

// POST - Toggle a heart on a content item. Returns the new liked state + count.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Same generous bucket as Spotlight swipes — hearts are a rapid-fire action
    const rateLimitResponse = await checkEndpointRateLimit(request, "game", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = likeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { contentId } = parsed.data;

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    const suspended = await assertNotSuspended(actor.id);
    if (suspended) return suspended;

    // content_likes writes are service-role-only (RLS): auth/suspension are
    // enforced above, so this route is the single write path.
    const service = createServiceRoleClient();

    const { data: item } = await (service as any)
      .from("content_items")
      .select("id, model_id, status, publish_at")
      .eq("id", contentId)
      .single();

    const published =
      item &&
      ["portfolio", "exclusive"].includes(item.status) &&
      (!item.publish_at || new Date(item.publish_at) <= new Date());

    if (!published) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    if (item.model_id === actor.id) {
      return NextResponse.json({ error: "Cannot like your own content" }, { status: 400 });
    }

    const { data: existing } = await (service as any)
      .from("content_likes")
      .select("content_id")
      .eq("content_id", contentId)
      .eq("actor_id", actor.id)
      .maybeSingle();

    let liked: boolean;
    if (existing) {
      const { error } = await (service as any)
        .from("content_likes")
        .delete()
        .eq("content_id", contentId)
        .eq("actor_id", actor.id);
      if (error) throw error;
      liked = false;
    } else {
      const { error } = await (service as any)
        .from("content_likes")
        .upsert(
          { content_id: contentId, actor_id: actor.id },
          { onConflict: "content_id,actor_id", ignoreDuplicates: true }
        );
      if (error) throw error;
      liked = true;
    }

    // Trigger-maintained count; read back for an authoritative value
    const { data: updated } = await (service as any)
      .from("content_items")
      .select("like_count")
      .eq("id", contentId)
      .single();

    return NextResponse.json({
      success: true,
      liked,
      likeCount: updated?.like_count ?? 0,
    });
  } catch (error) {
    logger.error("Content like error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
