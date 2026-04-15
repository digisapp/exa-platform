import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// GET - Fetch approved, paid contestants for current competition (public)
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "votes";
    const search = searchParams.get("search") || "";

    const adminClient = createServiceRoleClient();

    // Get current competition (latest year)
    const { data: competition, error: compError } = await (adminClient as any)
      .from("swimcrown_competitions")
      .select("*")
      .order("year", { ascending: false })
      .limit(1)
      .single();

    if (compError || !competition) {
      return NextResponse.json(
        { error: "No active competition found" },
        { status: 404 }
      );
    }

    // Fetch approved + paid contestants with model data
    let query = (adminClient as any)
      .from("swimcrown_contestants")
      .select(`
        id,
        competition_id,
        model_id,
        tier,
        tagline,
        vote_count,
        placement,
        title,
        created_at,
        models!inner (
          id,
          first_name,
          last_name,
          username,
          profile_photo_url,
          city,
          state,
          focus_tags,
          is_verified
        )
      `)
      .eq("competition_id", competition.id)
      .eq("status", "approved")
      .eq("payment_status", "paid");

    // Apply search filter
    if (search) {
      query = query.or(
        `tagline.ilike.%${search}%,models.first_name.ilike.%${search}%,models.username.ilike.%${search}%`
      );
    }

    // Apply sort
    if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    } else {
      // Default: sort by votes descending
      query = query.order("vote_count", { ascending: false });
    }

    const { data: contestants, error: contestantsError } = await query;

    if (contestantsError) {
      logger.error("Contestants fetch error", contestantsError);
      return NextResponse.json(
        { error: "Failed to fetch contestants" },
        { status: 500 }
      );
    }

    // Format with rank
    const ranked = (contestants || []).map((c: any, index: number) => ({
      id: c.id,
      competitionId: c.competition_id,
      modelId: c.model_id,
      tier: c.tier,
      tagline: c.tagline,
      voteCount: c.vote_count,
      placement: c.placement,
      title: c.title,
      rank: sort === "votes" ? index + 1 : null,
      model: c.models
        ? {
            id: c.models.id,
            firstName: c.models.first_name,
            lastName: c.models.last_name || "",
            username: c.models.username,
            profilePhotoUrl: c.models.profile_photo_url,
            city: c.models.city,
            state: c.models.state,
            focusTags: c.models.focus_tags,
            isVerified: c.models.is_verified,
          }
        : null,
    }));

    return NextResponse.json(
      {
        competition: {
          id: competition.id,
          year: competition.year,
          title: competition.title,
          status: competition.status,
          prizes: competition.prizes,
        },
        contestants: ranked,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    logger.error("SwimCrown contestants error", error);
    return NextResponse.json(
      { error: "Failed to fetch contestants" },
      { status: 500 }
    );
  }
}
