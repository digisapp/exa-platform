import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";

// GET - Admin dashboard for SwimCrown
export const GET = withAuth(
  async () => {
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

    // Fetch all contestants
    const { data: contestants } = await (adminClient as any)
      .from("swimcrown_contestants")
      .select(`
        id,
        competition_id,
        tier,
        full_name,
        email,
        instagram,
        phone,
        tagline,
        vote_count,
        status,
        payment_status,
        amount_cents,
        stripe_session_id,
        created_at
      `)
      .eq("competition_id", competition.id)
      .order("created_at", { ascending: false });

    // Calculate stats
    const paid = (contestants || []).filter((c: any) => c.payment_status === "paid");
    const totalRevenue = paid.reduce((sum: number, c: any) => sum + (c.amount_cents || 0), 0);

    const entriesByTier = {
      standard: paid.filter((c: any) => c.tier === "standard").length,
      full_package: paid.filter((c: any) => c.tier === "full_package").length,
    };

    const formattedContestants = (contestants || []).map((c: any) => ({
      id: c.id,
      tier: c.tier,
      fullName: c.full_name,
      email: c.email,
      instagram: c.instagram,
      phone: c.phone,
      tagline: c.tagline,
      voteCount: c.vote_count,
      status: c.status,
      paymentStatus: c.payment_status,
      amountCents: c.amount_cents,
      createdAt: c.created_at,
    }));

    return NextResponse.json({
      competition,
      stats: {
        totalContestants: paid.length,
        totalPending: (contestants || []).filter((c: any) => c.payment_status === "pending").length,
        totalRevenue,
        entriesByTier,
      },
      contestants: formattedContestants,
    });
  },
  { requireType: "admin", rateLimit: "general" }
);
