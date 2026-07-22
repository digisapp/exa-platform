import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { batchQuery, chunk, PAGE_ROWS } from "@/lib/supabase/batch";
import { sendBlastToConversations } from "@/lib/messages/blast-send";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitAsync } from "@/lib/rate-limit";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { z } from "zod";
import { logger } from "@/lib/logger";

// POST /api/spotlight/thank-blast — one warm message from a model to this
// week's Spotlight likers, WITHOUT revealing who they are.
//
// PRIVACY IS THE CONSTRAINT: the fan-side Spotlight UI markets a plain
// right-swipe as anonymous (BoostModal), and paid Boost+Reveal is the only
// way a fan opts into being seen. So the audience here is resolved entirely
// server-side (service role) and the response returns COUNTS ONLY — no
// usernames, ids, or anything enumerable ever reaches the model.
//
// Mechanics reuse /api/messages/blast's internals: free model message
// inserts per conversation, updated_at bump, and the service-role
// increment_unread_for_conversations RPC (20260711100001). It shares the
// SAME `blast:{actorId}` rate-limit key, so thank-blasts and regular blasts
// draw from one 1-per-hour budget.

const thankBlastSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message content required")
    .max(1000, "Message is too long")
    .optional(),
});

const DEFAULT_MESSAGE =
  "Hey! I saw the Spotlight love this week — thank you for the like, it truly made my day 💖";

// Same key + budget as /api/messages/blast: 1 blast per hour per model
const BLAST_LIMIT = { limit: 1, windowSeconds: 3600 };

// Runaway backstop — weekly likers per model are realistically tiny
const MAX_RECIPIENTS = 500;
// .in() URL-limit safety uses chunk()'s BATCH_SIZE default

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }
    if (actor.type !== "model") {
      return NextResponse.json(
        { error: "Only models can thank their likers" },
        { status: 403 }
      );
    }

    const suspended = await assertNotSuspended(actor.id);
    if (suspended) return suspended;

    // Validate body BEFORE consuming the rate-limit token. The card may
    // POST with no body at all — treat that as "use the default message".
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = thankBlastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const message = parsed.data.message || DEFAULT_MESSAGE;

    const serviceClient = createServiceRoleClient();

    // ------------------------------------------------------------------
    // Resolve the audience server-side: distinct signed-in fan likers of
    // the last 7 days. models.id IS the actor id (models.id references
    // actors.id), so actor.id doubles as top_model_votes.model_id.
    // Anonymous likes (voter_id NULL — plain swipes can be cast logged
    // out) have no inbox and are skipped.
    // ------------------------------------------------------------------
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: votes, error: votesError } = await (serviceClient
      .from("top_model_votes") as any)
      .select("voter_id")
      .eq("model_id", actor.id)
      .eq("vote_type", "like")
      .not("voter_id", "is", null)
      .gte("created_at", weekAgoIso)
      // PostgREST max_rows truncates at 1000 regardless of .limit() — order
      // newest-first so truncation (absurd volume) keeps the freshest likers
      .order("created_at", { ascending: false })
      .limit(5000);

    if (votesError) {
      logger.error("Thank-blast vote lookup failed", votesError);
      return NextResponse.json({ error: "Failed to load likers" }, { status: 500 });
    }

    const voterIds = [...new Set((votes || []).map((v: any) => v.voter_id as string))]
      .slice(0, MAX_RECIPIENTS);

    // Claimed FAN actors only (a brand or a model could theoretically hold
    // a vote row — fans are the audience this message is written for)
    const fanActorIds: string[] = [];
    for (const ids of chunk(voterIds)) {
      const { data: fanActors } = await (serviceClient.from("actors") as any)
        .select("id")
        .in("id", ids)
        .eq("type", "fan")
        .not("user_id", "is", null);
      for (const a of fanActors || []) fanActorIds.push(a.id);
    }

    // Live fans only (not deleted, not suspended). fans.id == actors.id.
    const eligibleFanIds: string[] = [];
    for (const ids of chunk(fanActorIds)) {
      const { data: fans } = await (serviceClient.from("fans") as any)
        .select("id, is_suspended")
        .in("id", ids)
        .is("deleted_at", null);
      for (const f of fans || []) {
        if (f.is_suspended !== true) eligibleFanIds.push(f.id);
      }
    }

    // Respect blocks in BOTH directions (two small queries scoped to the
    // model — avoids a giant .or() that would blow the 16KB URL limit)
    const blockedPair = new Set<string>();
    const [{ data: blockedByModel }, { data: blockingModel }] = await Promise.all([
      (serviceClient.from("user_blocks") as any)
        .select("blocked_id")
        .eq("blocker_id", actor.id),
      (serviceClient.from("user_blocks") as any)
        .select("blocker_id")
        .eq("blocked_id", actor.id),
    ]);
    for (const b of blockedByModel || []) blockedPair.add(b.blocked_id);
    for (const b of blockingModel || []) blockedPair.add(b.blocker_id);

    const targets = eligibleFanIds.filter((id) => !blockedPair.has(id));

    if (targets.length === 0) {
      // Nothing to send (all likers anonymous, blocked, or gone) — no
      // rate-limit token was consumed, so the model can try again later.
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: "Your likers this week were anonymous browsers — nothing to send yet.",
      });
    }

    // Rate limit LAST before any writes so a zero-audience attempt never
    // burns the shared hourly blast budget.
    const rateLimitResult = await rateLimitAsync(`blast:${actor.id}`, BLAST_LIMIT);
    if (!rateLimitResult.success) {
      const minutesRemaining = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `You can send another blast in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}`,
          resetAt: rateLimitResult.resetAt,
        },
        { status: 429 }
      );
    }

    // ------------------------------------------------------------------
    // Map likers to existing conversations (one message per fan, never a
    // duplicate thread). batchQuery pages past the .in()/max_rows limits.
    // ------------------------------------------------------------------
    // ALL of the model's conversation ids — a .limit(5000) still silently
    // truncates at PostgREST max_rows (1000), and any conversation missed
    // here would get a duplicate thread created below. Paged by
    // conversation_id (the composite-PK column that varies once actor_id is
    // fixed) until a short page.
    const modelConversationIds: string[] = [];
    for (let from = 0; ; from += PAGE_ROWS) {
      const { data: page, error: pageError } = await (serviceClient
        .from("conversation_participants") as any)
        .select("conversation_id")
        .eq("actor_id", actor.id)
        .order("conversation_id", { ascending: true })
        .range(from, from + PAGE_ROWS - 1);
      if (pageError) {
        // Bail rather than proceed with a partial map — a silent partial
        // page is exactly the duplicate-thread bug this paging prevents.
        logger.error("Thank-blast conversation lookup failed", pageError);
        return NextResponse.json(
          { error: "Failed to load conversations" },
          { status: 500 }
        );
      }
      for (const p of page || []) modelConversationIds.push(p.conversation_id as string);
      if (!page || page.length < PAGE_ROWS) break;
    }

    const fanToConversation = new Map<string, string>();
    if (modelConversationIds.length > 0) {
      const counterparts: any[] = await batchQuery(modelConversationIds, async (batch, from, to) =>
        (serviceClient as any)
          .from("conversation_participants")
          .select("conversation_id, actor_id")
          .in("conversation_id", batch)
          .neq("actor_id", actor.id)
          .order("conversation_id", { ascending: true })
          .order("actor_id", { ascending: true })
          .range(from, to)
      );
      for (const p of counterparts) {
        if (!fanToConversation.has(p.actor_id)) {
          fanToConversation.set(p.actor_id, p.conversation_id);
        }
      }
    }

    // ------------------------------------------------------------------
    // Send: resolve each fan to an existing conversation or create one
    // (same shape as /api/messages/send's create path), then hand the
    // message inserts + updated_at bumps + unread-counter RPC to the
    // shared blast sender (blast-send.ts) — mirroring the blast route.
    // ------------------------------------------------------------------
    const batchSize = 10;
    let failedCount = 0;
    const conversationIds: string[] = [];

    for (const batch of chunk(targets, batchSize)) {
      const results = await Promise.allSettled(
        batch.map(async (fanId) => {
          const existingId = fanToConversation.get(fanId);
          if (existingId) return existingId;

          const { data: newConv, error: convError } = await (serviceClient
            .from("conversations") as any)
            .insert({ type: "direct", title: null })
            .select()
            .single();
          if (convError || !newConv) throw convError || new Error("conversation create failed");

          const { error: partError } = await (serviceClient
            .from("conversation_participants") as any)
            .insert([
              { conversation_id: newConv.id, actor_id: actor.id },
              { conversation_id: newConv.id, actor_id: fanId },
            ]);
          if (partError) {
            await (serviceClient.from("conversations") as any).delete().eq("id", newConv.id);
            throw partError;
          }
          return newConv.id as string;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          conversationIds.push(result.value);
        } else {
          failedCount++;
        }
      }
    }

    // Free model messages, exactly like the blast route's inserts, plus the
    // unread-counter bump for the inserts that landed.
    const blastResult = await sendBlastToConversations(
      serviceClient,
      actor.id,
      message,
      conversationIds
    );
    const sentCount = blastResult.sent;
    failedCount += blastResult.failed;

    if (failedCount > 0) {
      logger.error("Thank-blast partial failure", undefined, {
        actorId: actor.id,
        sentCount,
        failedCount,
      });
    }

    // Counts only — never identities
    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    logger.error("Thank-blast error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
