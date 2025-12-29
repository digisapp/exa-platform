import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendModelInviteEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

// Warmup schedule - gradual increase to protect domain reputation
// Day 1-3: 100/day, Day 4-7: 300/day, Day 8-14: 500/day, Day 15+: 1000/day
const WARMUP_SCHEDULE = [
  { day: 1, limit: 100 },
  { day: 4, limit: 300 },
  { day: 8, limit: 500 },
  { day: 15, limit: 1000 },
];

// Get the daily limit based on warmup day
function getDailyLimit(warmupDay: number): number {
  let limit = 100; // Default minimum
  for (const schedule of WARMUP_SCHEDULE) {
    if (warmupDay >= schedule.day) {
      limit = schedule.limit;
    }
  }
  return limit;
}

// Get warmup start date from environment or default
function getWarmupStartDate(): Date | null {
  const startDateStr = process.env.EMAIL_WARMUP_START_DATE;
  if (startDateStr) {
    return new Date(startDateStr);
  }
  return null; // Warmup not started yet
}

// Calculate which day of warmup we're on
function getWarmupDay(startDate: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

// Send invite emails to models
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check warmup status
    const warmupStart = getWarmupStartDate();
    if (!warmupStart) {
      return NextResponse.json({
        success: false,
        error: "Email warmup not started. Set EMAIL_WARMUP_START_DATE in environment variables to begin.",
        warmupNotStarted: true,
      }, { status: 400 });
    }

    const warmupDay = getWarmupDay(warmupStart);
    const dailyLimit = getDailyLimit(warmupDay);

    // Count emails sent today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: sentTodayCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("invite_sent_at", "is", null)
      .gte("invite_sent_at", todayStart.toISOString());

    const sentToday = sentTodayCount || 0;
    const remainingToday = Math.max(0, dailyLimit - sentToday);

    if (remainingToday === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: `Daily limit reached (${dailyLimit} emails). Try again tomorrow.`,
        dailyLimit,
        sentToday,
        remainingToday: 0,
        warmupDay,
      });
    }

    const body = await request.json();
    const { modelIds, sendAll } = body;

    let modelsToInvite: { id: string; email: string; first_name: string; invite_token: string }[] = [];

    // Limit query to remaining daily quota
    const batchLimit = Math.min(50, remainingToday); // Max 50 per request for safety

    if (sendAll) {
      // Get models with invite tokens who haven't been invited yet and haven't claimed
      const { data: models, error } = await (supabase
        .from("models") as any)
        .select("id, email, first_name, invite_token")
        .not("invite_token", "is", null)
        .is("user_id", null)
        .is("invite_sent_at", null)
        .not("email", "is", null)
        .limit(batchLimit);

      if (error) throw error;
      modelsToInvite = models || [];
    } else if (modelIds && Array.isArray(modelIds)) {
      // Get specific models (still respect daily limit)
      const limitedIds = modelIds.slice(0, batchLimit);
      const { data: models, error } = await (supabase
        .from("models") as any)
        .select("id, email, first_name, invite_token")
        .in("id", limitedIds)
        .not("invite_token", "is", null)
        .is("user_id", null);

      if (error) throw error;
      modelsToInvite = models || [];
    } else {
      return NextResponse.json(
        { error: "Must provide modelIds array or sendAll: true" },
        { status: 400 }
      );
    }

    if (modelsToInvite.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No models to invite",
        dailyLimit,
        sentToday,
        remainingToday,
        warmupDay,
      });
    }

    // Filter out models without valid emails (not placeholder emails)
    modelsToInvite = modelsToInvite.filter(m =>
      m.email &&
      m.email.includes("@") &&
      !m.email.includes("roster-import.examodels.com") && // Skip placeholder emails
      m.invite_token
    );

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails with delay between each to avoid rate limits
    for (const model of modelsToInvite) {
      // Double-check we haven't exceeded daily limit
      if (sentToday + sent >= dailyLimit) {
        break;
      }

      const claimUrl = `${BASE_URL}/claim/${model.invite_token}`;

      const result = await sendModelInviteEmail({
        to: model.email,
        modelName: model.first_name || "Model",
        claimUrl,
      });

      if (result.success) {
        // Update invite_sent_at
        await (supabase.from("models") as any)
          .update({ invite_sent_at: new Date().toISOString() })
          .eq("id", model.id);
        sent++;
      } else {
        failed++;
        errors.push(`${model.email}: ${result.error}`);
      }

      // 200ms delay between emails (5/sec max, well under Resend's 10/sec limit)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Check if there are more models to send
    const { count: remainingPending } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("invite_token", "is", null)
      .is("user_id", null)
      .is("invite_sent_at", null)
      .not("email", "is", null);

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: modelsToInvite.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
      dailyLimit,
      sentToday: sentToday + sent,
      remainingToday: Math.max(0, dailyLimit - sentToday - sent),
      warmupDay,
      hasMore: (remainingPending || 0) > 0 && (sentToday + sent) < dailyLimit,
      pendingTotal: remainingPending || 0,
    });
  } catch (error) {
    console.error("Send invites error:", error);
    return NextResponse.json(
      { error: "Failed to send invites" },
      { status: 500 }
    );
  }
}

// Get count of models pending invite + warmup status
export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Count models that can be invited (excluding placeholder emails)
    const { count: pendingCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("invite_token", "is", null)
      .is("user_id", null)
      .is("invite_sent_at", null)
      .not("email", "is", null)
      .not("email", "ilike", "%roster-import.examodels.com%");

    // Count models that have been invited but not claimed
    const { count: invitedCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("invite_token", "is", null)
      .is("user_id", null)
      .not("invite_sent_at", "is", null);

    // Count models that have claimed
    const { count: claimedCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("user_id", "is", null);

    // Warmup status
    const warmupStart = getWarmupStartDate();
    let warmupDay = 0;
    let dailyLimit = 0;
    let sentToday = 0;
    let remainingToday = 0;

    if (warmupStart) {
      warmupDay = getWarmupDay(warmupStart);
      dailyLimit = getDailyLimit(warmupDay);

      // Count emails sent today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: sentTodayCount } = await (supabase
        .from("models") as any)
        .select("id", { count: "exact", head: true })
        .not("invite_sent_at", "is", null)
        .gte("invite_sent_at", todayStart.toISOString());

      sentToday = sentTodayCount || 0;
      remainingToday = Math.max(0, dailyLimit - sentToday);
    }

    return NextResponse.json({
      pending: pendingCount || 0,
      invited: invitedCount || 0,
      claimed: claimedCount || 0,
      warmup: {
        started: !!warmupStart,
        startDate: warmupStart?.toISOString() || null,
        day: warmupDay,
        dailyLimit,
        sentToday,
        remainingToday,
        schedule: WARMUP_SCHEDULE,
      },
    });
  } catch (error) {
    console.error("Get invite stats error:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
