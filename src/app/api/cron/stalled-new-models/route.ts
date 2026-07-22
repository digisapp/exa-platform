import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendProfileCompletionReminderEmail } from "@/lib/email";
import { computeCastingReadiness, READINESS_MODEL_COLUMNS } from "@/lib/casting-readiness";
import { logger } from "@/lib/logger";

export const maxDuration = 300;

const adminClient: any = createServiceRoleClient();

// GET /api/cron/stalled-new-models — day-3 / day-10 profile-completion
// reminders for newly approved claimed models whose profile is still mostly
// empty. Wires the previously-orphaned sendProfileCompletionReminderEmail.
//
// "New" is anchored on COALESCE(claimed_at, created_at): brand-new models get
// created_at = approval time, while linked imported models keep their old
// import created_at and get claimed_at stamped at approval
// (src/lib/model-approval.ts).
//
// Incomplete = computeCastingReadiness score < READINESS_SCORE_CUTOFF, i.e.
// she has completed at most two of the merged-meter items (photo 20 / bio 15 /
// rates 20 / first content 20 / link live 25). A model who finished her
// profile before the window fires receives nothing.
//
// Guardrails:
// - Claimed models only (user_id IS NOT NULL) — the ~5k unclaimed imports
//   are never selected; deleted_at IS NULL; deactivated excluded.
// - Dedup: model_lifecycle_nudges_sent, claim-then-send (23505 = already
//   sent), UNIQUE(model_id, nudge_key) with keys 'profile_d3'/'profile_d10'
//   — each reminder fires at most once per model, ever.
// - Spacing: profile_d10 is deferred while profile_d3 went out <72h ago.
// - Positive touchpoints only; marketing-class email with unsubscribe footer.
// - Circuit breaker: at most MAX_SENDS_PER_RUN emails per run (logged when
//   hit); Resend-paced at 2/sec.
// - computeCastingReadiness costs 2 extra queries per model, so it runs ONLY
//   on the date-windowed, not-yet-nudged subset (a handful/day), never as a
//   full-table sweep.
//
// Runs daily via Vercel cron (16:00 UTC).

const DAY_MS = 24 * 60 * 60 * 1000;
// Day-3 window: [3d, 8d). Day-10 window: [10d, 13d). The upper bounds are
// hard cutoffs so the first-ever run doesn't email months-old models, and
// the gap before day 10 keeps the two reminders from stacking up.
const D3_MIN_DAYS = 3;
const D3_MAX_DAYS = 8;
const D10_MIN_DAYS = 10;
const D10_MAX_DAYS = 13;
const NUDGE_SPACING_HOURS = 72;
const READINESS_SCORE_CUTOFF = 50;
const MAX_SENDS_PER_RUN = 200; // circuit breaker
const SEND_BATCH_SIZE = 2; // Resend rate limit is 2 emails/second
const SEND_BATCH_DELAY_MS = 1100;
const READINESS_CONCURRENCY = 5;
const IN_CHUNK_SIZE = 200; // .in() URL-limit safety

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
    const now = new Date();
    const oldestAnchorIso = new Date(now.getTime() - D10_MAX_DAYS * DAY_MS).toISOString();

    // Recently approved claimed models. The .or() catches both anchor kinds:
    // fresh signups via created_at, linked imports via claimed_at. The exact
    // COALESCE windowing happens in JS below.
    const { data: models, error: modelError } = await adminClient
      .from("models")
      .select(`${READINESS_MODEL_COLUMNS}, user_id, username, email, created_at, claimed_at, deactivated`)
      .not("user_id", "is", null)
      .eq("is_approved", true)
      .is("deleted_at", null)
      .or(`created_at.gte.${oldestAnchorIso},claimed_at.gte.${oldestAnchorIso}`)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (modelError) throw modelError;
    if ((models?.length ?? 0) >= 1000) {
      // PostgREST caps responses at 1000 rows — realistic new-model volume is
      // tens/week, so hitting this means something is very wrong upstream.
      logger.warn("Stalled new models: query hit the row limit — some models not scanned");
    }

    type Candidate = { model: any; nudgeKey: "profile_d3" | "profile_d10"; anchorAgeDays: number };
    const windowed: Candidate[] = [];
    for (const model of models || []) {
      if (model.deactivated === true || !model.username || !model.email) continue;
      const anchor = new Date(model.claimed_at || model.created_at).getTime();
      const ageDays = (now.getTime() - anchor) / DAY_MS;
      if (ageDays >= D3_MIN_DAYS && ageDays < D3_MAX_DAYS) {
        windowed.push({ model, nudgeKey: "profile_d3", anchorAgeDays: ageDays });
      } else if (ageDays >= D10_MIN_DAYS && ageDays < D10_MAX_DAYS) {
        windowed.push({ model, nudgeKey: "profile_d10", anchorAgeDays: ageDays });
      }
    }

    if (windowed.length === 0) {
      return NextResponse.json({ message: "No models in the day-3/day-10 windows", sent: 0 });
    }

    // Prior lifecycle nudges for the windowed set (chunked .in())
    const priorByModel = new Map<string, Map<string, string>>(); // model id -> nudge_key -> created_at
    for (const ids of chunk(windowed.map((c) => c.model.id), IN_CHUNK_SIZE)) {
      const { data: prior, error: priorError } = await adminClient
        .from("model_lifecycle_nudges_sent")
        .select("model_id, nudge_key, created_at")
        .in("model_id", ids);
      if (priorError) throw priorError;
      for (const row of prior || []) {
        const map = priorByModel.get(row.model_id) || new Map<string, string>();
        map.set(row.nudge_key, row.created_at);
        priorByModel.set(row.model_id, map);
      }
    }

    let alreadyNudged = 0;
    let skippedSpacing = 0;
    const pending: Candidate[] = [];
    for (const candidate of windowed) {
      const prior = priorByModel.get(candidate.model.id);
      if (prior?.has(candidate.nudgeKey)) {
        alreadyNudged++;
        continue;
      }
      if (candidate.nudgeKey === "profile_d10" && prior?.has("profile_d3")) {
        const sinceD3Hours =
          (now.getTime() - new Date(prior.get("profile_d3")!).getTime()) / (60 * 60 * 1000);
        if (sinceD3Hours < NUDGE_SPACING_HOURS) {
          skippedSpacing++; // fires on a later run once spacing has passed
          continue;
        }
      }
      pending.push(candidate);
    }

    // Readiness check gates the send: complete-enough models get nothing.
    // Runs only on this small pending subset (2 queries per model).
    type SendItem = Candidate & {
      score: number;
      checklist: { profileBasics: boolean; ratesSet: boolean; freshContent: boolean };
    };
    const toSend: SendItem[] = [];
    let skippedComplete = 0;
    for (const group of chunk(pending, READINESS_CONCURRENCY)) {
      const results = await Promise.all(
        group.map(async (candidate) => {
          const readiness = await computeCastingReadiness(
            adminClient,
            candidate.model.id,
            candidate.model
          );
          return { candidate, readiness };
        })
      );
      for (const { candidate, readiness } of results) {
        if (readiness.score >= READINESS_SCORE_CUTOFF) {
          skippedComplete++;
          continue;
        }
        const done = (key: string) => readiness.items.find((i) => i.key === key)?.done === true;
        toSend.push({
          ...candidate,
          score: readiness.score,
          // Email checklist shape predates the merged meter: photo+bio map
          // onto its combined "profile basics" line, first_content onto the
          // "post your first photos" line.
          checklist: {
            profileBasics: done("photo") && done("bio"),
            ratesSet: done("rates_set"),
            freshContent: done("first_content"),
          },
        });
      }
    }

    // Circuit breaker
    const cappedCount = Math.max(0, toSend.length - MAX_SENDS_PER_RUN);
    const capped = toSend.slice(0, MAX_SENDS_PER_RUN);
    if (cappedCount > 0) {
      logger.warn("Stalled new models: send cap reached", {
        queued: toSend.length,
        cap: MAX_SENDS_PER_RUN,
        skippedCap: cappedCount,
      });
    }

    const summary = {
      dryRun,
      modelsInWindow: windowed.length,
      alreadyNudged,
      skippedSpacing,
      skippedComplete,
      queued: toSend.length,
      skippedCap: cappedCount,
      sent: 0,
      suppressed: 0,
      alreadySent: 0,
      failed: 0,
    };

    if (dryRun) {
      return NextResponse.json({
        ...summary,
        sample: capped.slice(0, 10).map((c) => ({
          username: c.model.username,
          nudgeKey: c.nudgeKey,
          ageDays: Math.floor(c.anchorAgeDays),
          score: c.score,
          checklist: c.checklist,
        })),
      });
    }

    for (let i = 0; i < capped.length; i += SEND_BATCH_SIZE) {
      const batch = capped.slice(i, i + SEND_BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Claim BEFORE sending — 23505 means another run got here first
            const { error: claimError } = await adminClient
              .from("model_lifecycle_nudges_sent")
              .insert({ model_id: item.model.id, nudge_key: item.nudgeKey });

            if (claimError) {
              if (claimError.code === "23505") {
                summary.alreadySent++;
              } else {
                logger.error("Stalled new models: claim failed", claimError, {
                  modelId: item.model.id,
                });
                summary.failed++;
              }
              return;
            }

            const result = await sendProfileCompletionReminderEmail({
              to: item.model.email,
              username: item.model.username,
              dayNumber: item.nudgeKey === "profile_d10" ? 10 : 3,
              checklist: item.checklist,
            });

            if (result.success && (result as any).skipped) {
              summary.suppressed++;
            } else if (result.success) {
              summary.sent++;
            } else {
              summary.failed++;
            }
          } catch (err) {
            logger.error("Stalled new models: send failed", err, { modelId: item.model.id });
            summary.failed++;
          }
        })
      );

      if (i + SEND_BATCH_SIZE < capped.length) {
        await new Promise((resolve) => setTimeout(resolve, SEND_BATCH_DELAY_MS));
      }
    }

    logger.info("Stalled new models run complete", summary);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Cron stalled-new-models error", error);
    return NextResponse.json({ error: "Failed to process stalled new models" }, { status: 500 });
  }
}
