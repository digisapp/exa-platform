import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

const patchSchema = z.object({
  status: z
    .enum(["upcoming", "accepting_entries", "voting", "finale", "completed"])
    .optional(),
  title: z.string().min(1).max(200).optional(),
  dates: z.record(z.string(), z.string()).optional(),
  prizes: z.any().optional(),
});

// GET - Admin dashboard for SwimCrown
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

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
        { error: "No competition found" },
        { status: 404 }
      );
    }

    // Fetch stats and contestants in parallel
    const [
      { count: totalContestants },
      { data: allVotes },
      { data: paidContestants },
      { data: contestants },
    ] = await Promise.all([
      // Total contestants (any status)
      (adminClient as any)
        .from("swimcrown_contestants")
        .select("*", { count: "exact", head: true })
        .eq("competition_id", competition.id),
      // Total votes
      (adminClient as any)
        .from("swimcrown_votes")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competition.id),
      // Paid contestants for revenue calc and tier breakdown
      (adminClient as any)
        .from("swimcrown_contestants")
        .select("amount_cents, tier")
        .eq("competition_id", competition.id)
        .eq("payment_status", "paid"),
      // All contestants with model data (include pending for admin)
      (adminClient as any)
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
          status,
          payment_status,
          amount_cents,
          stripe_session_id,
          created_at,
          models!inner (
            id,
            first_name,
            username,
            profile_photo_url,
            city,
            state,
            is_verified
          )
        `)
        .eq("competition_id", competition.id)
        .order("vote_count", { ascending: false }),
    ]);

    // Calculate revenue
    const totalRevenue = (paidContestants || []).reduce(
      (sum: number, c: any) => sum + (c.amount_cents || 0),
      0
    );

    // Entries by tier
    const entriesByTier = {
      standard: (paidContestants || []).filter((c: any) => c.tier === "standard").length,
      full_package: (paidContestants || []).filter((c: any) => c.tier === "full_package").length,
      // Legacy tiers (existing entries before pricing update)
      vip: (paidContestants || []).filter((c: any) => c.tier === "vip").length,
      crown: (paidContestants || []).filter((c: any) => c.tier === "crown").length,
      elite: (paidContestants || []).filter((c: any) => c.tier === "elite").length,
    };

    // Format contestants
    const formattedContestants = (contestants || []).map((c: any) => ({
      id: c.id,
      competitionId: c.competition_id,
      modelId: c.model_id,
      tier: c.tier,
      tagline: c.tagline,
      voteCount: c.vote_count,
      placement: c.placement,
      title: c.title,
      status: c.status,
      paymentStatus: c.payment_status,
      amountCents: c.amount_cents,
      createdAt: c.created_at,
      model: c.models
        ? {
            id: c.models.id,
            firstName: c.models.first_name,
            username: c.models.username,
            profilePhotoUrl: c.models.profile_photo_url,
            city: c.models.city,
            state: c.models.state,
            isVerified: c.models.is_verified,
          }
        : null,
    }));

    return NextResponse.json({
      competition,
      stats: {
        totalContestants: totalContestants || 0,
        totalVotes: allVotes?.length ?? 0,
        totalRevenue,
        entriesByTier,
      },
      contestants: formattedContestants,
    });
  } catch (error) {
    console.error("Admin SwimCrown GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SwimCrown data" },
      { status: 500 }
    );
  }
}

// PATCH - Update competition status/dates
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    const validationResult = patchSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const adminClient = createServiceRoleClient();

    // Get current competition
    const { data: competition } = await (adminClient as any)
      .from("swimcrown_competitions")
      .select("id")
      .order("year", { ascending: false })
      .limit(1)
      .single();

    if (!competition) {
      return NextResponse.json(
        { error: "No competition found" },
        { status: 404 }
      );
    }

    const { data: updated, error: updateError } = await (adminClient as any)
      .from("swimcrown_competitions")
      .update(updates)
      .eq("id", competition.id)
      .select()
      .single();

    if (updateError) {
      console.error("Admin SwimCrown PATCH error:", updateError);
      return NextResponse.json(
        { error: "Failed to update competition" },
        { status: 500 }
      );
    }

    return NextResponse.json({ competition: updated });
  } catch (error) {
    console.error("Admin SwimCrown PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update competition" },
      { status: 500 }
    );
  }
}
