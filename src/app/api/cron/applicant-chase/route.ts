import { createServiceRoleClient } from "@/lib/supabase/service";
import { chunk } from "@/lib/supabase/batch";
import { NextRequest, NextResponse } from "next/server";
import { sendFinishApplicationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export const maxDuration = 300;

const adminClient: any = createServiceRoleClient();

// GET /api/cron/applicant-chase — nudge pending model applicants who stalled
// before the two things approval requires: a confirmed email and a profile
// photo (both gates live in admin/model-applications/[id]/route.ts).
//
// Guardrails:
// - Positive touchpoints only — the email celebrates the application and
//   asks for the missing step; no rejection language anywhere.
// - Unclaimed imports are structurally unreachable: model_applications.user_id
//   is NOT NULL REFERENCES auth.users (00007), while the ~5k unclaimed
//   imported profiles are `models` rows with user_id IS NULL and no
//   application row at all.
// - Max 2 emails per applicant, EVER: application_nudges_sent allows only
//   nudge_type 'finish_1' | 'finish_2' (CHECK) with UNIQUE(application_id,
//   nudge_type) — a third send is structurally impossible.
// - Claim-then-send: the dedup row is inserted BEFORE the email; a 23505
//   unique-violation means another run already handled it.
// - Applications with photo_requested_at set are skipped entirely — the
//   admin's manual "Request photo" flow already emailed them ("You've Been
//   Selected"), and that path requires a confirmed email, so nothing else
//   can be missing.
// - Circuit breaker: at most MAX_SENDS_PER_RUN emails per run (logged when
//   hit); Resend-paced at 2/sec like the other email crons.
//
// Runs daily via Vercel cron (15:00 UTC ≈ mid-morning ET).

const MIN_AGE_HOURS = 48; // give the applicant 2 days before the first nudge
const SECOND_NUDGE_MIN_AGE_HOURS = 120; // finish_2 no earlier than day 5...
const NUDGE_SPACING_HOURS = 72; // ...and at least 3 days after finish_1
// Stale cutoff: don't chase applications older than this. Also bounds the
// first-ever run — without it, every historical pending application would
// qualify at once.
const MAX_APPLICATION_AGE_DAYS = 30;
const MAX_SENDS_PER_RUN = 200; // circuit breaker
const SEND_BATCH_SIZE = 2; // Resend rate limit is 2 emails/second
const SEND_BATCH_DELAY_MS = 1100;
const QUERY_LIMIT = 1000; // PostgREST max_rows — log if we ever hit it
// .in() URL-limit safety uses chunk()'s BATCH_SIZE default (see
// project_postgrest_row_and_url_limits)

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
    const minAgeCutoff = new Date(now.getTime() - MIN_AGE_HOURS * 60 * 60 * 1000);
    const staleCutoff = new Date(now.getTime() - MAX_APPLICATION_AGE_DAYS * 24 * 60 * 60 * 1000);

    // Pending applications stuck on email-confirm and/or photo. Approval
    // needs BOTH email_confirmed_at AND profile_photo_url, so anything
    // matching this filter is genuinely blocked.
    const { data: applications, error: appError } = await adminClient
      .from("model_applications")
      .select(
        "id, user_id, display_name, email, email_confirm_token, email_confirmed_at, profile_photo_url, photo_requested_at, created_at"
      )
      .eq("status", "pending")
      .lt("created_at", minAgeCutoff.toISOString())
      .gte("created_at", staleCutoff.toISOString())
      .or("email_confirmed_at.is.null,profile_photo_url.is.null")
      .is("photo_requested_at", null)
      .order("created_at", { ascending: true })
      .limit(QUERY_LIMIT);

    if (appError) throw appError;
    if ((applications?.length ?? 0) >= QUERY_LIMIT) {
      logger.warn("Applicant chase: query hit the row limit — some stalled applications not scanned", {
        limit: QUERY_LIMIT,
      });
    }
    if (!applications?.length) {
      return NextResponse.json({ message: "No stalled applications", sent: 0 });
    }

    // Prior nudges for the candidate set (chunked .in() — URL-limit safety)
    const priorByApp = new Map<string, Map<string, string>>(); // app id -> nudge_type -> created_at
    for (const ids of chunk(applications.map((a: any) => a.id))) {
      const { data: prior, error: priorError } = await adminClient
        .from("application_nudges_sent")
        .select("application_id, nudge_type, created_at")
        .in("application_id", ids);
      if (priorError) throw priorError;
      for (const row of prior || []) {
        const map = priorByApp.get(row.application_id) || new Map<string, string>();
        map.set(row.nudge_type, row.created_at);
        priorByApp.set(row.application_id, map);
      }
    }

    // Build the send list: finish_1 first; finish_2 only after day 5 AND at
    // least NUDGE_SPACING_HOURS after finish_1 (so a first-run backfill send
    // never double-emails in the same week).
    type Candidate = {
      application: any;
      nudgeType: "finish_1" | "finish_2";
      missingEmailConfirm: boolean;
      missingPhoto: boolean;
    };
    const candidates: Candidate[] = [];
    let skippedComplete = 0;
    let skippedSpacing = 0;

    for (const app of applications) {
      const prior = priorByApp.get(app.id);
      const missingEmailConfirm = !app.email_confirmed_at;
      const missingPhoto = !app.profile_photo_url;
      if (!missingEmailConfirm && !missingPhoto) {
        skippedComplete++; // raced to completion since the query
        continue;
      }

      let nudgeType: "finish_1" | "finish_2" | null = null;
      if (!prior?.has("finish_1")) {
        nudgeType = "finish_1";
      } else if (!prior.has("finish_2")) {
        const ageHours = (now.getTime() - new Date(app.created_at).getTime()) / (60 * 60 * 1000);
        const sinceFirstHours =
          (now.getTime() - new Date(prior.get("finish_1")!).getTime()) / (60 * 60 * 1000);
        if (ageHours >= SECOND_NUDGE_MIN_AGE_HOURS && sinceFirstHours >= NUDGE_SPACING_HOURS) {
          nudgeType = "finish_2";
        } else {
          skippedSpacing++;
        }
      }
      // Both nudges already sent -> done chasing this applicant forever
      if (!nudgeType) continue;

      candidates.push({ application: app, nudgeType, missingEmailConfirm, missingPhoto });
    }

    // Circuit breaker
    const cappedCount = Math.max(0, candidates.length - MAX_SENDS_PER_RUN);
    const toSend = candidates.slice(0, MAX_SENDS_PER_RUN);
    if (cappedCount > 0) {
      logger.warn("Applicant chase: send cap reached", {
        queued: candidates.length,
        cap: MAX_SENDS_PER_RUN,
        skippedCap: cappedCount,
      });
    }

    const summary = {
      dryRun,
      applicationsScanned: applications.length,
      queued: candidates.length,
      skippedComplete,
      skippedSpacing,
      skippedCap: cappedCount,
      sent: 0,
      suppressed: 0,
      alreadySent: 0,
      failed: 0,
    };

    if (dryRun) {
      return NextResponse.json({
        ...summary,
        sample: toSend.slice(0, 10).map((c) => ({
          applicationId: c.application.id,
          nudgeType: c.nudgeType,
          missingEmailConfirm: c.missingEmailConfirm,
          missingPhoto: c.missingPhoto,
        })),
      });
    }

    // Applicant language: model_applications has no language column — the
    // signup flow stores it on the fans row (fan account precedes approval).
    const languageByUserId = new Map<string, string>();
    for (const ids of chunk([...new Set(toSend.map((c) => c.application.user_id))])) {
      const { data: fanRows } = await adminClient
        .from("fans")
        .select("user_id, preferred_language")
        .in("user_id", ids);
      for (const f of fanRows || []) {
        if (f.preferred_language) languageByUserId.set(f.user_id, f.preferred_language);
      }
    }

    for (let i = 0; i < toSend.length; i += SEND_BATCH_SIZE) {
      const batch = toSend.slice(i, i + SEND_BATCH_SIZE);

      await Promise.all(
        batch.map(async (candidate) => {
          const app = candidate.application;
          // Claim-first prevents double-send races; delete-on-definite-failure
          // prevents a transient Resend outage from permanently burning the slot.
          const releaseClaim = async () => {
            try {
              const { error: releaseError } = await adminClient
                .from("application_nudges_sent")
                .delete()
                .eq("application_id", app.id)
                .eq("nudge_type", candidate.nudgeType);
              if (releaseError) {
                logger.error("Applicant chase: claim release failed", releaseError, {
                  applicationId: app.id,
                });
              }
            } catch (releaseErr) {
              logger.error("Applicant chase: claim release failed", releaseErr, {
                applicationId: app.id,
              });
            }
          };
          let claimed = false;
          try {
            // Claim BEFORE sending — 23505 means another run got here first
            const { error: claimError } = await adminClient.from("application_nudges_sent").insert({
              application_id: app.id,
              nudge_type: candidate.nudgeType,
            });

            if (claimError) {
              if (claimError.code === "23505") {
                summary.alreadySent++;
              } else {
                logger.error("Applicant chase: claim failed", claimError, {
                  applicationId: app.id,
                });
                summary.failed++;
              }
              return;
            }
            claimed = true;

            const result = await sendFinishApplicationEmail({
              to: app.email,
              applicantName: app.display_name || "there",
              language: languageByUserId.get(app.user_id) || "en",
              missingEmailConfirm: candidate.missingEmailConfirm,
              missingPhoto: candidate.missingPhoto,
              confirmToken: app.email_confirm_token,
              isSecondNudge: candidate.nudgeType === "finish_2",
            });

            if (result.success && (result as any).skipped) {
              summary.suppressed++;
            } else if (result.success) {
              summary.sent++;
            } else {
              summary.failed++;
              await releaseClaim(); // definite failure — retry next run
            }
          } catch (err) {
            logger.error("Applicant chase: send failed", err, { applicationId: app.id });
            summary.failed++;
            if (claimed) await releaseClaim();
          }
        })
      );

      if (i + SEND_BATCH_SIZE < toSend.length) {
        await new Promise((resolve) => setTimeout(resolve, SEND_BATCH_DELAY_MS));
      }
    }

    logger.info("Applicant chase run complete", summary);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Cron applicant-chase error", error);
    return NextResponse.json({ error: "Failed to process applicant chase" }, { status: 500 });
  }
}
