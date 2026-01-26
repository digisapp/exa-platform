import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const search = searchParams.get("search") || "";
    const stateFilter = searchParams.get("state") || "all";
    const approvalFilter = searchParams.get("approval") || "all";
    const ratingFilter = searchParams.get("rating") || "all";
    const claimFilter = searchParams.get("claim") || "all";
    const sortField = searchParams.get("sortField") || "joined_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    // Build base query
    let query = (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, email, city, state, is_approved,
        profile_photo_url, profile_views, coin_balance, instagram_name,
        instagram_followers, admin_rating, new_face, created_at, user_id, invite_token,
        claimed_at, last_active_at
      `, { count: "exact" });

    // Apply filters
    if (search) {
      // Escape special characters for safe pattern matching (prevents SQL injection)
      const escapedSearch = search.replace(/[%_\\]/g, "\\$&");
      const words = escapedSearch.trim().split(/\s+/).filter(w => w.length > 0);

      if (words.length === 1) {
        // Single word: search all fields
        query = query.or(`username.ilike.%${words[0]}%,first_name.ilike.%${words[0]}%,last_name.ilike.%${words[0]}%,email.ilike.%${words[0]}%`);
      } else {
        // Multi-word search (e.g., "Nicole Kismet")
        const first = words[0];
        const last = words[words.length - 1];

        // Match full string in username or email
        // OR first word in first_name AND last word in last_name
        // OR vice versa (handles "Kismet Nicole" matching "Nicole Kismet")
        query = query.or(
          `username.ilike.%${escapedSearch}%,` +
          `email.ilike.%${escapedSearch}%,` +
          `and(first_name.ilike.%${first}%,last_name.ilike.%${last}%),` +
          `and(first_name.ilike.%${last}%,last_name.ilike.%${first}%)`
        );
      }
    }
    if (stateFilter !== "all") query = query.eq("state", stateFilter);
    if (approvalFilter !== "all") query = query.eq("is_approved", approvalFilter === "approved");
    if (ratingFilter !== "all") {
      if (ratingFilter === "rated") query = query.not("admin_rating", "is", null);
      else if (ratingFilter === "unrated") query = query.is("admin_rating", null);
      else query = query.gte("admin_rating", parseInt(ratingFilter));
    }
    if (claimFilter !== "all") {
      if (claimFilter === "claimed") query = query.not("user_id", "is", null);
      else if (claimFilter === "unclaimed") query = query.is("user_id", null);
    }

    // Apply sorting for DB-sortable fields
    const dbSortableFields = ["profile_views", "coin_balance", "instagram_followers", "admin_rating", "created_at"];
    if (dbSortableFields.includes(sortField)) {
      query = query.order(sortField, { ascending: sortDirection === "asc", nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: models, count, error } = await query;
    if (error) throw error;

    if (!models || models.length === 0) {
      return NextResponse.json({ models: [], total: 0 });
    }

    const modelIds = models.map((m: any) => m.id);
    const userIds = models.map((m: any) => m.user_id).filter(Boolean);

    // Run all aggregation queries in parallel
    const [
      actorsResult,
      premiumCountsResult,
      imageCountsResult,
      videoCountsResult,
      lastPremiumResult,
      lastMediaResult,
    ] = await Promise.all([
      // Get actors for user_ids
      userIds.length > 0
        ? (supabase.from("actors") as any).select("id, user_id").in("user_id", userIds)
        : { data: [] },
      // Get premium content (PPV) counts
      (supabase.from("premium_content") as any).select("model_id").in("model_id", modelIds),
      // Get image counts from media_assets (type = "photo" for images)
      (supabase.from("media_assets") as any).select("model_id").in("model_id", modelIds).eq("type", "photo"),
      // Get video counts from media_assets
      (supabase.from("media_assets") as any).select("model_id").in("model_id", modelIds).eq("type", "video"),
      // Get last premium content dates
      (supabase.from("premium_content") as any)
        .select("model_id, created_at")
        .in("model_id", modelIds)
        .order("created_at", { ascending: false }),
      // Get last media asset dates
      (supabase.from("media_assets") as any)
        .select("model_id, created_at")
        .in("model_id", modelIds)
        .order("created_at", { ascending: false }),
    ]);

    const actors = actorsResult.data || [];
    const actorToUser = new Map(actors.map((a: any) => [a.user_id, a.id]));
    const actorIds = actors.map((a: any) => a.id);

    // Run actor-dependent queries in parallel
    const [
      followCountsResult,
      earningsResult,
      conversationsResult,
      referralsResult,
    ] = await Promise.all([
      // Get follower counts
      actorIds.length > 0
        ? (supabase.from("follows") as any).select("following_id").in("following_id", actorIds)
        : { data: [] },
      // Get earnings (exclude purchases - only count actual earnings from fans)
      actorIds.length > 0
        ? (supabase.from("coin_transactions") as any)
            .select("actor_id, amount")
            .in("actor_id", actorIds)
            .gt("amount", 0)
            .neq("action", "purchase")
        : { data: [] },
      // Get conversation counts
      actorIds.length > 0
        ? (supabase.from("conversation_participants") as any)
            .select("actor_id, conversation_id")
            .in("actor_id", actorIds)
        : { data: [] },
      // Get referral counts (fans who signed up from viewing this model's profile)
      modelIds.length > 0
        ? (supabase.from("fans") as any)
            .select("referred_by_model_id")
            .in("referred_by_model_id", modelIds)
        : { data: [] },
    ]);

    // Build lookup maps
    const followerMap = new Map<string, number>();
    (followCountsResult.data || []).forEach((f: any) => {
      followerMap.set(f.following_id, (followerMap.get(f.following_id) || 0) + 1);
    });

    const earningsMap = new Map<string, number>();
    (earningsResult.data || []).forEach((tx: any) => {
      earningsMap.set(tx.actor_id, (earningsMap.get(tx.actor_id) || 0) + tx.amount);
    });

    const ppvMap = new Map<string, number>();
    (premiumCountsResult.data || []).forEach((c: any) => {
      ppvMap.set(c.model_id, (ppvMap.get(c.model_id) || 0) + 1);
    });

    const imageMap = new Map<string, number>();
    (imageCountsResult.data || []).forEach((c: any) => {
      imageMap.set(c.model_id, (imageMap.get(c.model_id) || 0) + 1);
    });

    const videoMap = new Map<string, number>();
    (videoCountsResult.data || []).forEach((c: any) => {
      videoMap.set(c.model_id, (videoMap.get(c.model_id) || 0) + 1);
    });

    const lastPostMap = new Map<string, string>();
    (lastPremiumResult.data || []).forEach((p: any) => {
      if (!lastPostMap.has(p.model_id) || new Date(p.created_at) > new Date(lastPostMap.get(p.model_id)!)) {
        lastPostMap.set(p.model_id, p.created_at);
      }
    });
    (lastMediaResult.data || []).forEach((m: any) => {
      if (!lastPostMap.has(m.model_id) || new Date(m.created_at) > new Date(lastPostMap.get(m.model_id)!)) {
        lastPostMap.set(m.model_id, m.created_at);
      }
    });

    const messageMap = new Map<string, number>();
    (conversationsResult.data || []).forEach((c: any) => {
      messageMap.set(c.actor_id, (messageMap.get(c.actor_id) || 0) + 1);
    });

    const referralMap = new Map<string, number>();
    (referralsResult.data || []).forEach((f: any) => {
      referralMap.set(f.referred_by_model_id, (referralMap.get(f.referred_by_model_id) || 0) + 1);
    });

    // Apply computed fields to models
    const enrichedModels = models.map((model: any) => {
      const actorId = actorToUser.get(model.user_id) || "";
      const imageCount = imageMap.get(model.id) || 0;
      const videoCount = videoMap.get(model.id) || 0;
      const ppvCount = ppvMap.get(model.id) || 0;
      return {
        ...model,
        followers_count: actorId ? (followerMap.get(actorId as string) || 0) : 0,
        total_earned: actorId ? (earningsMap.get(actorId as string) || 0) : 0,
        content_count: imageCount + videoCount + ppvCount,
        image_count: imageCount,
        video_count: videoCount,
        ppv_count: ppvCount,
        last_post: lastPostMap.get(model.id) || null,
        message_count: actorId ? (messageMap.get(actorId as string) || 0) : 0,
        referral_count: referralMap.get(model.id) || 0,
        last_seen: model.last_active_at || lastPostMap.get(model.id) || (model.user_id ? model.created_at : null),
        joined_at: model.claimed_at || model.created_at,
      };
    });

    // Sort by computed fields if needed
    const computedFields = ["total_earned", "content_count", "image_count", "video_count", "ppv_count", "last_post", "last_seen", "message_count", "followers_count", "joined_at", "referral_count"];
    if (computedFields.includes(sortField)) {
      enrichedModels.sort((a: any, b: any) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === "last_post" || sortField === "last_seen" || sortField === "joined_at") {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }

        aVal = aVal || 0;
        bVal = bVal || 0;

        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return NextResponse.json({ models: enrichedModels, total: count || 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch models";
    console.error("Admin models error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
