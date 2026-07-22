import { createServiceRoleClient } from "@/lib/supabase/service";
import { chunk } from "@/lib/supabase/batch";
import { NextRequest, NextResponse } from "next/server";
import {
  sendFanWeeklyDigestEmail,
  sendModelWeeklyDigestEmail,
  sendModelGettingStartedDigestEmail,
} from "@/lib/email";
import { logger } from "@/lib/logger";

// Sending 500 emails at Resend's 2/sec limit takes ~5 min plus queries
export const maxDuration = 600;

const adminClient: any = createServiceRoleClient();

// GET /api/cron/weekly-digest — weekly re-engagement digests
//
// Fan digest ("New on EXA this week"): new approved models + new content from
// followed models + a Spotlight nudge. Sent ONLY when >= 1 new approved model
// exists this week (never an empty "nothing happened" email).
//
// Model digest ("You were seen this week"): profile views + new fans +
// Spotlight likes. Sent ONLY when at least one count is > 0.
//
// Getting-started variant: a claimed model approved <30 days ago with zero
// activity gets a short checklist digest instead of being skipped — the old
// zero-activity skip silently dropped exactly the new models who most need
// contact. Same digest_sends model-week key, so a model receives EITHER
// "you were seen" OR getting-started, never both. Suppressed when a
// day-3/day-10 lifecycle nudge (model_lifecycle_nudges_sent) fired within
// the last GETTING_STARTED_NUDGE_SUPPRESS_DAYS.
//
// Guardrails:
// - Model audience is claimed accounts only (user_id IS NOT NULL) so the
//   ~5k imported-but-unclaimed profiles are NEVER emailed.
// - Suppression: the send functions in lib/email check the "marketing"
//   unsubscribe list and every email carries a signed unsubscribe link.
// - Idempotency: a digest_sends row is claimed BEFORE each send
//   (unique on recipient_id + digest_key), so retries can't double-send.
// - ?dryRun=1 computes audiences and counts and returns JSON without
//   sending or claiming anything.
//
// Runs weekly via Vercel cron (Friday 17:00 UTC).

const SUPABASE_PAGE_SIZE = 1000;
const MAX_PAGES = 100; // hard stop at 100k rows per table sweep
// Per-audience caps: the model "you were seen" digest is activity-gated and
// high-value, so it must never be starved by the fan queue. Both are far
// above realistic weekly volume; they're runaway backstops, not rationing.
const MAX_FAN_SENDS_PER_RUN = 2000;
const MAX_MODEL_SENDS_PER_RUN = 2000;
// Getting-started is a new-model surface — volume should be tens/week, so
// 200 is a circuit breaker, not rationing (logged when hit).
const MAX_GETTING_STARTED_SENDS_PER_RUN = 200;
const SEND_BATCH_SIZE = 2; // Resend rate limit is 2 emails/second
const SEND_BATCH_DELAY_MS = 1100;
const FAN_SHOWCASE_MODELS = 4;
const FAN_FOLLOWED_DROPS = 3;
// Targeted fan audience: a fan is only worth a digest when THEY have a reason
// to come back — a model they follow dropped new content this week, or enough
// brand-new models landed to be worth a browse. Thin weeks send no fan blast.
const FAN_MIN_NEW_MODELS = 3;
// Getting-started variant: models approved within this many days with zero
// activity get the checklist digest instead of the empty-week skip.
const GETTING_STARTED_WINDOW_DAYS = 30;
// ...unless a day-3/day-10 profile reminder (stalled-new-models cron) went
// out this recently — one lifecycle touch per few days is plenty.
const GETTING_STARTED_NUDGE_SUPPRESS_DAYS = 4;
// .in() URL-limit safety uses chunk()'s BATCH_SIZE default (see
// project_postgrest_row_and_url_limits)

// ISO-8601 week key, e.g. "2026-W28"
function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Supabase caps responses at 1000 rows — page through with .range()
async function fetchAllRows<T>(
  buildQuery: () => any,
  label: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * SUPABASE_PAGE_SIZE;
    const { data, error } = await buildQuery().range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(`${label} query failed: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) break;
  }
  return rows;
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (same scheme as the other cron routes)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoIso = weekAgo.toISOString();
    const weekKey = isoWeekKey(now);
    const fanDigestKey = `fan-${weekKey}`;
    const modelDigestKey = `model-${weekKey}`;

    // ------------------------------------------------------------------
    // 1. Shared data: claimed, approved, live models
    //    (user_id IS NOT NULL excludes ~5k imported unclaimed profiles)
    // ------------------------------------------------------------------
    const claimedModels = (
      await fetchAllRows<any>(
        () =>
          adminClient
            .from("models")
            .select(
              "id, user_id, username, email, profile_photo_url, created_at, claimed_at, deactivated, bio, message_rate, video_call_rate, voice_call_rate"
            )
            .not("user_id", "is", null)
            .eq("is_approved", true)
            .is("deleted_at", null),
        "claimed models"
      )
    ).filter((m: any) => m.deactivated !== true && m.username);

    const modelById = new Map<string, any>(claimedModels.map((m: any) => [m.id, m]));
    const modelByUserId = new Map<string, any>(claimedModels.map((m: any) => [m.user_id, m]));

    // follows.follower_id / following_id are actors.id — map model actors to
    // model rows via user_id (models.id is not guaranteed to equal actors.id)
    const modelActors = await fetchAllRows<any>(
      () => adminClient.from("actors").select("id, user_id").eq("type", "model"),
      "model actors"
    );
    const actorIdToModel = new Map<string, any>();
    for (const actor of modelActors) {
      const model = modelByUserId.get(actor.user_id);
      if (model) actorIdToModel.set(actor.id, model);
    }

    // New models this week (fan showcase): approved + claimed + has a photo
    const newModelsThisWeek = claimedModels
      .filter((m: any) => m.created_at >= weekAgoIso && m.profile_photo_url)
      .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
    const showcaseModels = newModelsThisWeek.slice(0, FAN_SHOWCASE_MODELS).map((m: any) => ({
      username: m.username as string,
      profilePhotoUrl: m.profile_photo_url as string,
    }));

    // ------------------------------------------------------------------
    // 2. This week's activity, fetched once globally (no per-recipient N+1)
    // ------------------------------------------------------------------
    const [weekViews, weekLikes, weekFollows, allFollows, weekContent] = await Promise.all([
      // Profile views: page_views.model_id is only set for model profile pages
      fetchAllRows<any>(
        () =>
          adminClient
            .from("page_views")
            .select("model_id")
            .not("model_id", "is", null)
            .gte("created_at", weekAgoIso),
        "week page_views"
      ),
      // Spotlight right-swipes
      fetchAllRows<any>(
        () =>
          adminClient
            .from("top_model_votes")
            .select("model_id")
            .eq("vote_type", "like")
            .gte("created_at", weekAgoIso),
        "week spotlight likes"
      ),
      // New followers this week (model digest)
      fetchAllRows<any>(
        () =>
          adminClient
            .from("follows")
            .select("follower_id, following_id")
            .gte("created_at", weekAgoIso),
        "week follows"
      ),
      // All follows (fan digest: which models does each fan follow)
      fetchAllRows<any>(
        () => adminClient.from("follows").select("follower_id, following_id"),
        "all follows"
      ),
      // New public content this week (portfolio or exclusive, already published)
      fetchAllRows<any>(
        () =>
          adminClient
            .from("content_items")
            .select("model_id, publish_at")
            .in("status", ["portfolio", "exclusive"])
            .gte("created_at", weekAgoIso),
        "week content"
      ),
    ]);

    const nowIso = now.toISOString();
    const viewsByModelId = new Map<string, number>();
    for (const v of weekViews) increment(viewsByModelId, v.model_id);

    const likesByModelId = new Map<string, number>();
    for (const l of weekLikes) {
      if (modelById.has(l.model_id)) increment(likesByModelId, l.model_id);
    }

    const newFansByModelId = new Map<string, number>();
    for (const f of weekFollows) {
      const model = actorIdToModel.get(f.following_id);
      if (model) increment(newFansByModelId, model.id);
    }

    const contentCountByModelId = new Map<string, number>();
    for (const c of weekContent) {
      if (c.publish_at && c.publish_at > nowIso) continue; // scheduled, not live yet
      if (modelById.has(c.model_id)) increment(contentCountByModelId, c.model_id);
    }

    // fan actor id -> model ids they follow (fans.id == actors.id)
    const followedModelIdsByFan = new Map<string, string[]>();
    for (const f of allFollows) {
      const model = actorIdToModel.get(f.following_id);
      if (!model) continue;
      const list = followedModelIdsByFan.get(f.follower_id) || [];
      list.push(model.id);
      followedModelIdsByFan.set(f.follower_id, list);
    }

    // ------------------------------------------------------------------
    // 3. Audiences
    // ------------------------------------------------------------------
    // Fans: not deleted, not suspended, has an email
    const fans = (
      await fetchAllRows<any>(
        () =>
          adminClient
            .from("fans")
            .select("id, email, display_name, username, is_suspended")
            .is("deleted_at", null),
        "fans"
      )
    ).filter((f: any) => f.is_suspended !== true && f.email);

    // Models: claimed + approved + live (already filtered) + has an email
    const audienceModels = claimedModels.filter((m: any) => m.email);

    // Already-sent prefetch (idempotency fast path)
    const priorSends = await fetchAllRows<any>(
      () =>
        adminClient
          .from("digest_sends")
          .select("recipient_id, digest_key")
          .in("digest_key", [fanDigestKey, modelDigestKey]),
      "prior digest sends"
    );
    const alreadySentFans = new Set(
      priorSends.filter((s: any) => s.digest_key === fanDigestKey).map((s: any) => s.recipient_id)
    );
    const alreadySentModels = new Set(
      priorSends.filter((s: any) => s.digest_key === modelDigestKey).map((s: any) => s.recipient_id)
    );

    // ------------------------------------------------------------------
    // 4. Build send jobs
    // ------------------------------------------------------------------
    const summary = {
      dryRun,
      digestKeys: { fan: fanDigestKey, model: modelDigestKey },
      windowStart: weekAgoIso,
      newModelsThisWeek: newModelsThisWeek.length,
      fansConsidered: fans.length,
      fansSent: 0,
      fansSkippedEmpty: 0,
      fansSuppressed: 0,
      fansAlreadySent: 0,
      fansSkippedCap: 0,
      fansFailed: 0,
      modelsConsidered: audienceModels.length,
      modelsSent: 0,
      modelsSkippedEmpty: 0,
      modelsSuppressed: 0,
      modelsAlreadySent: 0,
      modelsSkippedCap: 0,
      modelsFailed: 0,
      gettingStartedConsidered: 0,
      gettingStartedSent: 0,
      gettingStartedSuppressed: 0,
      gettingStartedAlreadySent: 0,
      gettingStartedSkippedRecentNudge: 0,
      gettingStartedSkippedCap: 0,
      gettingStartedFailed: 0,
    };

    type SendJob =
      | {
          kind: "fan";
          recipientId: string;
          email: string;
          fanName: string;
          followedDrops: { username: string; newItems: number }[];
        }
      | {
          kind: "model";
          recipientId: string;
          email: string;
          username: string;
          profileViews: number;
          newFans: number;
          spotlightLikes: number;
        }
      | {
          kind: "getting_started";
          recipientId: string;
          email: string;
          username: string;
          checklist: { hasPhotoAndBio: boolean; hasRates: boolean; hasContent: boolean };
        };

    const jobs: SendJob[] = [];

    // Targeted fan audience (deliberate, not a blast): a fan qualifies only
    // when they personally have a reason to return —
    //   (a) a model they FOLLOW dropped new content this week, or
    //   (b) enough brand-new models landed to be worth a browse
    //       (>= FAN_MIN_NEW_MODELS), which carries the showcase on its own.
    // A fan with neither is skipped (fansSkippedEmpty) — thin weeks send no
    // near-blast to the whole list, protecting deliverability on a small list.
    const enoughNewModels = newModelsThisWeek.length >= FAN_MIN_NEW_MODELS;
    for (const fan of fans) {
      if (alreadySentFans.has(fan.id)) {
        summary.fansAlreadySent++;
        continue;
      }
      const followedDrops = (followedModelIdsByFan.get(fan.id) || [])
        .map((modelId) => ({ modelId, newItems: contentCountByModelId.get(modelId) || 0 }))
        .filter((d) => d.newItems > 0)
        .sort((a, b) => b.newItems - a.newItems)
        .slice(0, FAN_FOLLOWED_DROPS)
        .map((d) => ({
          username: modelById.get(d.modelId)!.username as string,
          newItems: d.newItems,
        }));

      // Skip unless this fan has a personal drop or the week is showcase-worthy
      if (followedDrops.length === 0 && !enoughNewModels) {
        summary.fansSkippedEmpty++;
        continue;
      }

      jobs.push({
        kind: "fan",
        recipientId: fan.id,
        email: fan.email,
        fanName: fan.display_name || fan.username || "there",
        followedDrops,
      });
    }

    // Zero-activity NEW models (approved <30d, anchored on
    // COALESCE(claimed_at, created_at) — linked imports date from approval)
    // become getting-started candidates instead of empty-week skips.
    const gettingStartedCandidates: any[] = [];
    const gettingStartedCutoffMs = GETTING_STARTED_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    for (const model of audienceModels) {
      if (alreadySentModels.has(model.id)) {
        summary.modelsAlreadySent++;
        continue;
      }
      const profileViews = viewsByModelId.get(model.id) || 0;
      const newFans = newFansByModelId.get(model.id) || 0;
      const spotlightLikes = likesByModelId.get(model.id) || 0;

      if (profileViews <= 0 && newFans <= 0 && spotlightLikes <= 0) {
        const anchor = new Date(model.claimed_at || model.created_at).getTime();
        if (now.getTime() - anchor < gettingStartedCutoffMs) {
          gettingStartedCandidates.push(model);
        } else {
          summary.modelsSkippedEmpty++;
        }
        continue;
      }

      jobs.push({
        kind: "model",
        recipientId: model.id,
        email: model.email,
        username: model.username,
        profileViews,
        newFans,
        spotlightLikes,
      });
    }

    // Getting-started checklist state + suppression, batched and scoped to
    // the (small) new-model candidate subset only — never a full table scan.
    summary.gettingStartedConsidered = gettingStartedCandidates.length;
    if (gettingStartedCandidates.length > 0) {
      const candidateIds = gettingStartedCandidates.map((m: any) => m.id);

      // Has she ever posted anything? (any status counts as a first step)
      const modelsWithContent = new Set<string>();
      for (const ids of chunk(candidateIds)) {
        const contentRows = await fetchAllRows<any>(
          () =>
            adminClient
              .from("content_items")
              .select("model_id")
              .in("model_id", ids)
              .order("id"),
          "getting-started content"
        );
        for (const row of contentRows) modelsWithContent.add(row.model_id);
      }

      // Suppress when a day-3/day-10 lifecycle nudge just went out
      const nudgeCutoffIso = new Date(
        now.getTime() - GETTING_STARTED_NUDGE_SUPPRESS_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      const recentlyNudged = new Set<string>();
      for (const ids of chunk(candidateIds)) {
        const { data: nudges, error: nudgeError } = await adminClient
          .from("model_lifecycle_nudges_sent")
          .select("model_id")
          .in("model_id", ids)
          .gte("created_at", nudgeCutoffIso);
        if (nudgeError) throw new Error(`lifecycle nudges query failed: ${nudgeError.message}`);
        for (const n of nudges || []) recentlyNudged.add(n.model_id);
      }

      for (const model of gettingStartedCandidates) {
        if (recentlyNudged.has(model.id)) {
          summary.gettingStartedSkippedRecentNudge++;
          continue;
        }
        jobs.push({
          kind: "getting_started",
          recipientId: model.id,
          email: model.email,
          username: model.username,
          checklist: {
            hasPhotoAndBio:
              Boolean(model.profile_photo_url) &&
              typeof model.bio === "string" &&
              model.bio.trim().length > 0,
            hasRates:
              (model.message_rate ?? 0) > 0 ||
              (model.video_call_rate ?? 0) > 0 ||
              (model.voice_call_rate ?? 0) > 0,
            hasContent: modelsWithContent.has(model.id),
          },
        });
      }
    }

    // Per-audience caps: the two digests are capped independently so a large
    // fan queue can never starve the activity-gated model digests (the single
    // global cap did exactly that — models fell to 0). Caps are runaway
    // backstops well above realistic weekly volume, not rationing.
    const fanJobs = jobs.filter((j) => j.kind === "fan");
    const modelJobs = jobs.filter((j) => j.kind === "model");
    const gettingStartedJobs = jobs.filter((j) => j.kind === "getting_started");
    summary.fansSkippedCap = Math.max(0, fanJobs.length - MAX_FAN_SENDS_PER_RUN);
    summary.modelsSkippedCap = Math.max(0, modelJobs.length - MAX_MODEL_SENDS_PER_RUN);
    summary.gettingStartedSkippedCap = Math.max(
      0,
      gettingStartedJobs.length - MAX_GETTING_STARTED_SENDS_PER_RUN
    );
    const cappedJobs = [
      ...fanJobs.slice(0, MAX_FAN_SENDS_PER_RUN),
      ...modelJobs.slice(0, MAX_MODEL_SENDS_PER_RUN),
      ...gettingStartedJobs.slice(0, MAX_GETTING_STARTED_SENDS_PER_RUN),
    ];
    if (
      summary.fansSkippedCap > 0 ||
      summary.modelsSkippedCap > 0 ||
      summary.gettingStartedSkippedCap > 0
    ) {
      logger.warn("Weekly digest: send cap reached", {
        fanQueued: fanJobs.length,
        modelQueued: modelJobs.length,
        gettingStartedQueued: gettingStartedJobs.length,
        fanCap: MAX_FAN_SENDS_PER_RUN,
        modelCap: MAX_MODEL_SENDS_PER_RUN,
        gettingStartedCap: MAX_GETTING_STARTED_SENDS_PER_RUN,
        fansSkippedCap: summary.fansSkippedCap,
        modelsSkippedCap: summary.modelsSkippedCap,
        gettingStartedSkippedCap: summary.gettingStartedSkippedCap,
      });
    }

    // ------------------------------------------------------------------
    // 5. Dry run: report what would happen, send nothing, claim nothing
    // ------------------------------------------------------------------
    if (dryRun) {
      return NextResponse.json({
        ...summary,
        fansWouldSend: cappedJobs.filter((j) => j.kind === "fan").length,
        modelsWouldSend: cappedJobs.filter((j) => j.kind === "model").length,
        gettingStartedWouldSend: cappedJobs.filter((j) => j.kind === "getting_started").length,
        showcase: showcaseModels.map((m) => m.username),
        sampleModelDigests: cappedJobs
          .filter((j): j is Extract<SendJob, { kind: "model" }> => j.kind === "model")
          .slice(0, 10)
          .map((j) => ({
            username: j.username,
            profileViews: j.profileViews,
            newFans: j.newFans,
            spotlightLikes: j.spotlightLikes,
          })),
        sampleGettingStarted: cappedJobs
          .filter(
            (j): j is Extract<SendJob, { kind: "getting_started" }> =>
              j.kind === "getting_started"
          )
          .slice(0, 10)
          .map((j) => ({ username: j.username, checklist: j.checklist })),
      });
    }

    // ------------------------------------------------------------------
    // 6. Send in rate-limited batches (claim-then-send)
    // ------------------------------------------------------------------
    for (let i = 0; i < cappedJobs.length; i += SEND_BATCH_SIZE) {
      const batch = cappedJobs.slice(i, i + SEND_BATCH_SIZE);

      await Promise.all(
        batch.map(async (job) => {
          const isFan = job.kind === "fan";
          const counterPrefix =
            job.kind === "fan" ? "fans" : job.kind === "model" ? "models" : "gettingStarted";
          const bump = (what: "Sent" | "Suppressed" | "AlreadySent" | "Failed") => {
            (summary as any)[`${counterPrefix}${what}`]++;
          };
          try {
            // Claim BEFORE sending — a unique violation means another run
            // (or a retry) already handled this recipient this week.
            // getting_started shares the model recipient_type AND the same
            // model-week digest_key, so it is mutually exclusive with
            // "you were seen this week" for the same model.
            const { error: claimError } = await adminClient.from("digest_sends").insert({
              recipient_type: isFan ? "fan" : "model",
              recipient_id: job.recipientId,
              digest_key: isFan ? fanDigestKey : modelDigestKey,
            });

            if (claimError) {
              if (claimError.code === "23505") {
                bump("AlreadySent");
              } else {
                logger.error("Weekly digest: claim failed", claimError, {
                  recipientId: job.recipientId,
                });
                bump("Failed");
              }
              return;
            }

            const result =
              job.kind === "fan"
                ? await sendFanWeeklyDigestEmail({
                    to: job.email,
                    fanName: job.fanName,
                    newModels: showcaseModels,
                    totalNewModels: newModelsThisWeek.length,
                    followedDrops: job.followedDrops,
                  })
                : job.kind === "model"
                  ? await sendModelWeeklyDigestEmail({
                      to: job.email,
                      username: job.username,
                      profileViews: job.profileViews,
                      newFans: job.newFans,
                      spotlightLikes: job.spotlightLikes,
                    })
                  : await sendModelGettingStartedDigestEmail({
                      to: job.email,
                      username: job.username,
                      checklist: job.checklist,
                    });

            if (result.success && (result as any).skipped) {
              bump("Suppressed");
            } else if (result.success) {
              bump("Sent");
            } else {
              bump("Failed");
            }
          } catch (err) {
            logger.error("Weekly digest: send failed", err, { recipientId: job.recipientId });
            bump("Failed");
          }
        })
      );

      // Respect Resend's rate limit between batches
      if (i + SEND_BATCH_SIZE < cappedJobs.length) {
        await new Promise((resolve) => setTimeout(resolve, SEND_BATCH_DELAY_MS));
      }
    }

    logger.info("Weekly digest run complete", summary);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Cron weekly-digest error", error);
    return NextResponse.json({ error: "Failed to process weekly digest" }, { status: 500 });
  }
}
