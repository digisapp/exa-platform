import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { escapeIlike } from "@/lib/utils";
import { MODEL_EARNING_ACTIONS } from "@/lib/coin-config";
import { batchQuery, fetchPaged } from "@/lib/supabase/batch";

// Admin client for efficient RPC calls
const getAdminClient = () => createServiceRoleClient();

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

const MAX_COMPUTED_SORT_MODELS = 10000; // Cap for computed field sorting

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
    const statusFilter = searchParams.get("status") || "active";
    const focusFilter = searchParams.get("focus") || "all";
    const heightFilter = searchParams.get("height") || "all";
    const hairColorFilter = searchParams.get("hairColor") || "all";
    const igFollowersFilter = searchParams.get("igFollowers") || "all";
    const ttFollowersFilter = searchParams.get("ttFollowers") || "all";
    const sortField = searchParams.get("sortField") || "joined_at";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    // Follower tier → minimum value (mirrors the fan explore page)
    const followerMinMap: Record<string, number> = {
      "1k": 1_000, "10k": 10_000, "50k": 50_000,
      "100k": 100_000, "500k": 500_000, "1m": 1_000_000,
    };
    // Height range → ilike patterns against the free-text `height` column (mirrors fan explore)
    const heightPatterns: Record<string, string[]> = {
      under54:  ["4'%", "5'0%", "5'1\"", "5'1", "5'2%", "5'3%"],
      "54up":   ["5'4%", "5'5%", "5'6%", "5'7%", "5'8%", "5'9%", "5'10%", "5'11%", "6'%"],
      "57up":   ["5'7%", "5'8%", "5'9%", "5'10%", "5'11%", "6'%"],
      "510up":  ["5'10%", "5'11%", "6'%"],
    };

    // Computed fields that require fetching all models first, then sorting
    const computedFields = ["total_earned", "content_count", "image_count", "video_count", "ppv_count", "last_post", "last_seen", "message_count", "followers_count", "joined_at", "referral_count"];
    const isSortingByComputedField = computedFields.includes(sortField);

    // Helper function to apply filters to a query
    const applyFilters = (q: any) => {
      if (search) {
        const escapedSearch = escapeIlike(search);
        const words = escapedSearch.trim().split(/\s+/).filter(w => w.length > 0);

        // Each word must match at least one searchable field.
        // Chaining .or() calls ANDs them together, so all words must be present.
        for (const word of words) {
          q = q.or(
            `username.ilike.%${word}%,first_name.ilike.%${word}%,last_name.ilike.%${word}%,email.ilike.%${word}%,instagram_name.ilike.%${word}%,phone.ilike.%${word}%,city.ilike.%${word}%`
          );
        }
      }
      if (stateFilter !== "all") q = q.eq("state", stateFilter);
      if (approvalFilter !== "all") q = q.eq("is_approved", approvalFilter === "approved");
      if (ratingFilter !== "all") {
        if (ratingFilter === "rated") q = q.not("admin_rating", "is", null);
        else if (ratingFilter === "unrated") q = q.is("admin_rating", null);
        else q = q.gte("admin_rating", parseInt(ratingFilter));
      }
      if (claimFilter !== "all") {
        if (claimFilter === "claimed") q = q.not("user_id", "is", null);
        else if (claimFilter === "unclaimed") q = q.is("user_id", null);
      }
      if (statusFilter === "active") q = q.is("deleted_at", null);
      else if (statusFilter === "deleted") q = q.not("deleted_at", "is", null);
      // Attribute filters (mirror the fan explore page)
      if (focusFilter !== "all") q = q.contains("focus_tags", [focusFilter]);
      if (heightFilter !== "all") {
        const patterns = heightPatterns[heightFilter];
        if (patterns) q = q.or(patterns.map(p => `height.ilike.${p}`).join(","));
      }
      if (hairColorFilter !== "all") q = q.ilike("hair_color", `%${hairColorFilter}%`);
      if (igFollowersFilter !== "all" && followerMinMap[igFollowersFilter]) {
        q = q.gte("instagram_followers", followerMinMap[igFollowersFilter]);
      }
      if (ttFollowersFilter !== "all" && followerMinMap[ttFollowersFilter]) {
        q = q.gte("tiktok_followers", followerMinMap[ttFollowersFilter]);
      }
      return q;
    };

    let models: any[];
    let totalCount: number;
    const adminClient = getAdminClient();

    if (isSortingByComputedField) {
      // For computed field sorting: fetch ALL matching model IDs (paged past the
      // PostgREST max_rows cap; the id tiebreak keeps paging deterministic when
      // bulk-imported models share a created_at)
      const { rows: allModels, count } = await fetchPaged<any>((from, to) => {
        let q = supabase.from("models")
          .select("id, user_id, created_at, claimed_at, last_active_at", { count: "exact" });
        q = applyFilters(q);
        return q.order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, to);
      }, MAX_COMPUTED_SORT_MODELS);

      if (allModels.length === 0) {
        return NextResponse.json({ models: [], total: 0 });
      }

      totalCount = count || 0;
      const allModelIds = allModels.map((m: any) => m.id);
      const allUserIds = allModels.map((m: any) => m.user_id).filter(Boolean);

      // Get actors for user_ids (small dataset, single query is fine)
      const { data: allActors } = allUserIds.length > 0
        ? await adminClient.from("actors").select("id, user_id").in("user_id", allUserIds)
        : { data: [] };

      const allActorToUser = new Map((allActors || []).map((a: any) => [a.user_id, a.id]));
      const allActorIds = (allActors || []).map((a: any) => a.id);

      // Use batched queries for large datasets
      const [
        imageData,
        videoData,
        ppvData,
        lastPremiumData,
        lastMediaData,
        followData,
        earningsData,
        conversationData,
        referralData,
      ] = await Promise.all([
        // Image counts - batch query (content_items portfolio images)
        batchQuery(allModelIds, async (batch, from, to) =>
          (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "portfolio").eq("media_type", "image").order("id", { ascending: true }).range(from, to)
        ),
        // Video counts - batch query (content_items portfolio videos)
        batchQuery(allModelIds, async (batch, from, to) =>
          (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "portfolio").eq("media_type", "video").order("id", { ascending: true }).range(from, to)
        ),
        // PPV counts - batch query (content_items with exclusive status)
        batchQuery(allModelIds, async (batch, from, to) =>
          (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "exclusive").order("id", { ascending: true }).range(from, to)
        ),
        // Last exclusive content - batch query
        batchQuery(allModelIds, async (batch, from, to) =>
          (adminClient as any).from("content_items").select("model_id, created_at").in("model_id", batch).eq("status", "exclusive").order("id", { ascending: true }).range(from, to)
        ),
        // Last media - batch query (portfolio content)
        batchQuery(allModelIds, async (batch, from, to) =>
          (adminClient as any).from("content_items").select("model_id, created_at").in("model_id", batch).eq("status", "portfolio").order("id", { ascending: true }).range(from, to)
        ),
        // Followers - batch query on actor_ids
        allActorIds.length > 0
          ? batchQuery(allActorIds, async (batch, from, to) =>
              adminClient.from("follows").select("following_id").in("following_id", batch).order("follower_id", { ascending: true }).order("following_id", { ascending: true }).range(from, to)
            )
          : Promise.resolve([]),
        // Earnings - batch query on actor_ids (only get totals, not individual transactions)
        allActorIds.length > 0
          ? batchQuery(allActorIds, async (batch, from, to) =>
              adminClient.from("coin_transactions")
                .select("actor_id, amount")
                .in("actor_id", batch)
                .in("action", [...MODEL_EARNING_ACTIONS])
                .order("id", { ascending: true })
                .range(from, to)
            )
          : Promise.resolve([]),
        // Conversations - batch query on actor_ids
        allActorIds.length > 0
          ? batchQuery(allActorIds, async (batch, from, to) =>
              adminClient.from("conversation_participants")
                .select("actor_id, conversation_id")
                .in("actor_id", batch)
                .order("conversation_id", { ascending: true })
                .order("actor_id", { ascending: true })
                .range(from, to)
            )
          : Promise.resolve([]),
        // Referrals - batch query on model_ids
        batchQuery(allModelIds, async (batch, from, to) =>
          adminClient.from("fans").select("referred_by_model_id").in("referred_by_model_id", batch).order("id", { ascending: true }).range(from, to)
        ),
      ]);

      // Build maps for computed values
      const imageMap = new Map<string, number>();
      imageData.forEach((c: any) => {
        imageMap.set(c.model_id, (imageMap.get(c.model_id) || 0) + 1);
      });

      const videoMap = new Map<string, number>();
      videoData.forEach((c: any) => {
        videoMap.set(c.model_id, (videoMap.get(c.model_id) || 0) + 1);
      });

      const ppvMap = new Map<string, number>();
      ppvData.forEach((c: any) => {
        ppvMap.set(c.model_id, (ppvMap.get(c.model_id) || 0) + 1);
      });

      const lastPostMap = new Map<string, string>();
      lastPremiumData.forEach((p: any) => {
        if (!lastPostMap.has(p.model_id) || new Date(p.created_at) > new Date(lastPostMap.get(p.model_id)!)) {
          lastPostMap.set(p.model_id, p.created_at);
        }
      });
      lastMediaData.forEach((m: any) => {
        if (!lastPostMap.has(m.model_id) || new Date(m.created_at) > new Date(lastPostMap.get(m.model_id)!)) {
          lastPostMap.set(m.model_id, m.created_at);
        }
      });

      const followerMap = new Map<string, number>();
      followData.forEach((f: any) => {
        followerMap.set(f.following_id, (followerMap.get(f.following_id) || 0) + 1);
      });

      const earningsMap = new Map<string, number>();
      earningsData.forEach((tx: any) => {
        earningsMap.set(tx.actor_id, (earningsMap.get(tx.actor_id) || 0) + tx.amount);
      });

      const messageMap = new Map<string, number>();
      conversationData.forEach((c: any) => {
        messageMap.set(c.actor_id, (messageMap.get(c.actor_id) || 0) + 1);
      });

      const referralMap = new Map<string, number>();
      referralData.forEach((f: any) => {
        referralMap.set(f.referred_by_model_id, (referralMap.get(f.referred_by_model_id) || 0) + 1);
      });

      // Add computed values to models for sorting
      const modelsWithComputedValues = allModels.map((model: any) => {
        const actorId = allActorToUser.get(model.user_id) || "";
        const imageCount = imageMap.get(model.id) || 0;
        const videoCount = videoMap.get(model.id) || 0;
        const ppvCount = ppvMap.get(model.id) || 0;
        return {
          id: model.id,
          user_id: model.user_id,
          image_count: imageCount,
          video_count: videoCount,
          ppv_count: ppvCount,
          content_count: imageCount + videoCount + ppvCount,
          followers_count: actorId ? (followerMap.get(actorId as string) || 0) : 0,
          total_earned: actorId ? (earningsMap.get(actorId as string) || 0) : 0,
          message_count: actorId ? (messageMap.get(actorId as string) || 0) : 0,
          referral_count: referralMap.get(model.id) || 0,
          last_post: lastPostMap.get(model.id) || null,
          last_seen: model.last_active_at || lastPostMap.get(model.id) || (model.user_id ? model.created_at : null),
          joined_at: model.claimed_at || model.created_at,
        };
      });

      // Sort by the computed field
      modelsWithComputedValues.sort((a: any, b: any) => {
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

      // Paginate
      const from = (page - 1) * pageSize;
      const paginatedIds = modelsWithComputedValues.slice(from, from + pageSize).map((m: any) => m.id);

      if (paginatedIds.length === 0) {
        return NextResponse.json({ models: [], total: totalCount });
      }

      // Fetch full model data for paginated IDs
      const { data: fullModels, error: fullError } = await supabase.from("models")
        .select(`
          id, username, first_name, last_name, email, phone, city, state, is_approved,
          profile_photo_url, profile_views, coin_balance, instagram_name,
          instagram_followers, tiktok_followers, height, hair_color, dob, focus_tags,
          admin_rating, new_face, created_at, user_id, invite_token,
          claimed_at, last_active_at, deleted_at
        `)
        .in("id", paginatedIds);

      if (fullError) throw fullError;

      // Re-order to match sort order
      const idToIndex = new Map<string, number>(paginatedIds.map((id: string, idx: number) => [id, idx]));
      models = (fullModels || []).sort((a: any, b: any) => {
        const aIdx = idToIndex.get(a.id) ?? 0;
        const bIdx = idToIndex.get(b.id) ?? 0;
        return aIdx - bIdx;
      });

      // Enrich from the values already computed above — no need to re-query
      const computedById = new Map<string, any>(modelsWithComputedValues.map((m: any) => [m.id, m]));
      const enriched = models.map((model: any) => {
        const c = computedById.get(model.id);
        return {
          ...model,
          followers_count: c?.followers_count || 0,
          total_earned: c?.total_earned || 0,
          content_count: c?.content_count || 0,
          image_count: c?.image_count || 0,
          video_count: c?.video_count || 0,
          ppv_count: c?.ppv_count || 0,
          last_post: c?.last_post || null,
          message_count: c?.message_count || 0,
          referral_count: c?.referral_count || 0,
          last_seen: c?.last_seen || null,
          joined_at: c?.joined_at || model.claimed_at || model.created_at,
        };
      });

      return NextResponse.json(
        { models: enriched, total: totalCount },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
          },
        }
      );

    } else {
      // For DB-sortable fields: use standard pagination
      let query = supabase.from("models")
        .select(`
          id, username, first_name, last_name, email, phone, city, state, is_approved,
          profile_photo_url, profile_views, coin_balance, instagram_name,
          instagram_followers, tiktok_followers, height, hair_color, dob, focus_tags,
          admin_rating, new_face, created_at, user_id, invite_token,
          claimed_at, last_active_at, deleted_at
        `, { count: "exact" });

      query = applyFilters(query);

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

      const { data, count, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        return NextResponse.json({ models: [], total: 0 });
      }

      models = data;
      totalCount = count || 0;
    }

    const modelIds = models.map((m: any) => m.id);
    const userIds = models.map((m: any) => m.user_id).filter(Boolean);

    // Run all aggregation queries in parallel using admin client for consistent access
    const [
      actorsResult,
      premiumCountsData,
      imageCountsData,
      videoCountsData,
      lastPremiumData,
      lastMediaData,
    ] = await Promise.all([
      // Get actors for user_ids
      userIds.length > 0
        ? adminClient.from("actors").select("id, user_id").in("user_id", userIds)
        : { data: [] },
      // Get PPV counts (content_items with exclusive status)
      batchQuery(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "exclusive").order("id", { ascending: true }).range(from, to)
      ),
      // Get image counts from content_items (portfolio images)
      batchQuery(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "portfolio").eq("media_type", "image").order("id", { ascending: true }).range(from, to)
      ),
      // Get video counts from content_items (portfolio videos)
      batchQuery(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id").in("model_id", batch).eq("status", "portfolio").eq("media_type", "video").order("id", { ascending: true }).range(from, to)
      ),
      // Get last exclusive content dates
      batchQuery(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id, created_at").in("model_id", batch).eq("status", "exclusive").order("id", { ascending: true }).range(from, to)
      ),
      // Get last content item dates (portfolio)
      batchQuery(modelIds, async (batch, from, to) =>
        (adminClient as any).from("content_items").select("model_id, created_at").in("model_id", batch).eq("status", "portfolio").order("id", { ascending: true }).range(from, to)
      ),
    ]);

    const actors = actorsResult.data || [];
    const actorToUser = new Map(actors.map((a: any) => [a.user_id, a.id]));
    const actorIds = actors.map((a: any) => a.id);

    // Run actor-dependent queries in parallel
    const [
      followCountsData,
      earningsData,
      conversationsData,
      referralsData,
    ] = await Promise.all([
      // Get follower counts
      actorIds.length > 0
        ? batchQuery(actorIds, async (batch, from, to) =>
            adminClient.from("follows").select("following_id").in("following_id", batch).order("follower_id", { ascending: true }).order("following_id", { ascending: true }).range(from, to)
          )
        : Promise.resolve([]),
      // Get earnings (MODEL_EARNING_ACTIONS — keep in sync with detail page)
      actorIds.length > 0
        ? batchQuery(actorIds, async (batch, from, to) =>
            adminClient.from("coin_transactions")
              .select("actor_id, amount")
              .in("actor_id", batch)
              .in("action", [...MODEL_EARNING_ACTIONS])
              .order("id", { ascending: true })
              .range(from, to)
          )
        : Promise.resolve([]),
      // Get conversation counts
      actorIds.length > 0
        ? batchQuery(actorIds, async (batch, from, to) =>
            adminClient.from("conversation_participants")
              .select("actor_id, conversation_id")
              .in("actor_id", batch)
              .order("conversation_id", { ascending: true })
              .order("actor_id", { ascending: true })
              .range(from, to)
          )
        : Promise.resolve([]),
      // Get referral counts (fans who signed up from viewing this model's profile)
      modelIds.length > 0
        ? batchQuery(modelIds, async (batch, from, to) =>
            adminClient.from("fans").select("referred_by_model_id").in("referred_by_model_id", batch).order("id", { ascending: true }).range(from, to)
          )
        : Promise.resolve([]),
    ]);

    // Build lookup maps
    const followerMap = new Map<string, number>();
    (followCountsData as any[]).forEach((f: any) => {
      followerMap.set(f.following_id, (followerMap.get(f.following_id) || 0) + 1);
    });

    const earningsMap = new Map<string, number>();
    (earningsData as any[]).forEach((tx: any) => {
      earningsMap.set(tx.actor_id, (earningsMap.get(tx.actor_id) || 0) + tx.amount);
    });

    const ppvMap = new Map<string, number>();
    (premiumCountsData as any[]).forEach((c: any) => {
      ppvMap.set(c.model_id, (ppvMap.get(c.model_id) || 0) + 1);
    });

    const imageMap = new Map<string, number>();
    (imageCountsData as any[]).forEach((c: any) => {
      imageMap.set(c.model_id, (imageMap.get(c.model_id) || 0) + 1);
    });

    const videoMap = new Map<string, number>();
    (videoCountsData as any[]).forEach((c: any) => {
      videoMap.set(c.model_id, (videoMap.get(c.model_id) || 0) + 1);
    });

    const lastPostMap = new Map<string, string>();
    (lastPremiumData as any[]).forEach((p: any) => {
      if (!lastPostMap.has(p.model_id) || new Date(p.created_at) > new Date(lastPostMap.get(p.model_id)!)) {
        lastPostMap.set(p.model_id, p.created_at);
      }
    });
    (lastMediaData as any[]).forEach((m: any) => {
      if (!lastPostMap.has(m.model_id) || new Date(m.created_at) > new Date(lastPostMap.get(m.model_id)!)) {
        lastPostMap.set(m.model_id, m.created_at);
      }
    });

    const messageMap = new Map<string, number>();
    (conversationsData as any[]).forEach((c: any) => {
      messageMap.set(c.actor_id, (messageMap.get(c.actor_id) || 0) + 1);
    });

    const referralMap = new Map<string, number>();
    (referralsData as any[]).forEach((f: any) => {
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

    return NextResponse.json(
      { models: enrichedModels, total: totalCount },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch models";
    console.error("Admin models error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
