import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendOfferReminderEmail, sendOfferExpiryReminderEmail } from "@/lib/email";
import { sendPushToActor } from "@/lib/push";
import { logger } from "@/lib/logger";
import { listUserEmailsByIds } from "@/lib/auth/list-user-emails";

const adminClient = createServiceRoleClient();

// Expiry-nudge windows (pass 2). Dated offers: nudge when event_date is
// 24-48h out — reuses the same in24Hours/in48Hours window as the confirmed
// reminder, and the twice-daily schedule guarantees at least one run lands
// inside it. Undated offers never hard-expire (they stay actionable while
// open), so their nudge is a "the brand is waiting on you" at 5-6 days old —
// the implied one-week shelf life is 24-48h away.
const UNDATED_NUDGE_MIN_AGE_DAYS = 5;
const UNDATED_NUDGE_MAX_AGE_DAYS = 6;

// GET /api/cron/offer-reminders - two passes over offer_responses:
//   1. Event reminders to CONFIRMED/ACCEPTED models 24-48h before event_date
//      (dedup: reminder_sent_at)
//   2. Respond-nudges for UNANSWERED (pending) offers about to lapse
//      (dedup: expiry_reminder_sent_at — separate column so an accept after
//      the nudge still gets the pass-1 event reminder later)
// Runs twice daily (8 AM and 6 PM) via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel cron jobs) - REQUIRED
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      logger.error("Cron authentication failed - CRON_SECRET missing or invalid");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find confirmed responses for events in 24-48 hours that haven't received a reminder
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Get confirmed/accepted responses with upcoming events
    const { data: responses, error } = await adminClient
      .from("offer_responses")
      .select(`
        id,
        model_id,
        reminder_sent_at,
        offer:offers(
          id,
          title,
          status,
          event_date,
          event_time,
          location_name,
          location_city,
          location_state,
          brand_id
        )
      `)
      .in("status", ["confirmed", "accepted"])
      .is("reminder_sent_at", null);

    if (error) throw error;

    // Filter to events in 24-48 hour window
    // Note: Supabase returns offer as single object (not array) for FK relationships
    const upcomingResponses = (responses || []).filter((r: any) => {
      const offer = r.offer as Record<string, any>;
      if (!offer?.event_date) return false;
      // Don't remind models about events the brand cancelled
      if (offer.status === "cancelled") return false;
      const eventDate = new Date(offer.event_date);
      return eventDate >= in24Hours && eventDate <= in48Hours;
    });

    // Pass 2 runs even when pass 1 has nothing to do
    const expirySummary = await sendExpiryNudges(now, in24Hours, in48Hours);

    if (upcomingResponses.length === 0) {
      return NextResponse.json({
        message: "No event reminders to send",
        sent: 0,
        expiryNudges: expirySummary,
      });
    }

    // Get unique brand IDs for company names
    const brandIds = [...new Set(upcomingResponses.map((r: any) => (r.offer as Record<string, any>).brand_id))];
    const { data: brands } = await adminClient
      .from("brands")
      .select("id, company_name, contact_email, contact_phone")
      .in("id", brandIds);

    const brandMap = new Map(brands?.map((b: any) => [b.id, b]) || []);

    // Get model details
    const modelIds = [...new Set(upcomingResponses.map((r: any) => r.model_id))];
    const { data: models } = await adminClient
      .from("models")
      .select("id, first_name, username, user_id")
      .in("id", modelIds);

    const modelMap = new Map(models?.map((m: any) => [m.id, m]) || []);

    // Get user emails (paginated — listUsers defaults to 50/page and silently
    // truncates without explicit pagination)
    const userIds: string[] = (models?.map((m: any) => m.user_id) || []).filter(Boolean);
    const userEmails = await listUserEmailsByIds(adminClient as any, userIds);

    let sentCount = 0;
    const errors: string[] = [];

    // Send reminders
    for (const response of upcomingResponses) {
      const offer = response.offer as Record<string, any>;
      const model = modelMap.get(response.model_id);
      const brand = brandMap.get(offer.brand_id);
      const email = model ? userEmails.get(model.user_id) : null;

      if (!email || !model) continue;

      // Build location string
      const locationParts = [
        offer.location_name,
        offer.location_city,
        offer.location_state
      ].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(", ") : undefined;

      // Build brand contact
      const brandContact = brand?.contact_phone || brand?.contact_email || undefined;

      try {
        await sendOfferReminderEmail({
          to: email,
          modelName: model.first_name || model.username,
          offerTitle: offer.title,
          eventDate: new Date(offer.event_date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          eventTime: offer.event_time,
          location,
          brandName: brand?.company_name || "The brand",
          brandContact,
        });

        // Mark reminder as sent
        await adminClient
          .from("offer_responses")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", response.id);

        sentCount++;
      } catch (err) {
        logger.error("Failed to send reminder", err, { email });
        errors.push(`Failed for model ${model.id}`);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reminders`,
      sent: sentCount,
      total: upcomingResponses.length,
      errors: errors.length > 0 ? errors : undefined,
      expiryNudges: expirySummary,
    });
  } catch (error) {
    logger.error("Cron offer-reminders error", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// PASS 2 — respond-nudges for UNANSWERED offers about to lapse
//
// A pending offer_responses row is an invitation the model never answered.
// Once event_date passes, the offer silently vanishes from both the
// dashboard and /api/offers' actionable list — the model never learns money
// was on the table. This pass sends exactly ONE nudge per response:
// email + web push ('offers' preference key) + a bell row
// (notifications.type 'offer_expiring', added in 20260722000850).
//
// Guardrails:
// - Dedup via expiry_reminder_sent_at only. NEVER reminder_sent_at (owned
//   by the pass-1 confirmed-event reminder) and never status/responded_at
//   (valid_response_timestamp CHECK requires pending => responded_at NULL).
// - Claimed models only (models.user_id NOT NULL) — the ~5k unclaimed
//   imports are never contacted.
// - Skips offers that are no longer open (cancelled / filled / closed).
// - Positive respond-nudge copy; @username only, no real names.
// ------------------------------------------------------------------
async function sendExpiryNudges(
  now: Date,
  in24Hours: Date,
  in48Hours: Date
): Promise<{ sent: number; considered: number; errors?: string[] }> {
  try {
    const { data: pendingResponses, error } = await adminClient
      .from("offer_responses")
      .select(`
        id,
        model_id,
        offer:offers(
          id,
          title,
          status,
          event_date,
          event_time,
          location_name,
          location_city,
          location_state,
          compensation_type,
          compensation_amount,
          compensation_description,
          brand_id,
          created_at
        )
      `)
      .eq("status", "pending")
      .is("expiry_reminder_sent_at", null)
      .limit(1000);

    if (error) throw error;

    const dayMs = 24 * 60 * 60 * 1000;
    const nudgeTargets = (pendingResponses || []).filter((r: any) => {
      const offer = r.offer as Record<string, any>;
      // Only offers still worth answering
      if (!offer || offer.status !== "open") return false;
      if (offer.event_date) {
        // Same window + Date-comparison style as pass 1 (event_date is a
        // DATE — keep the existing comparison style to avoid off-by-one)
        const eventDate = new Date(offer.event_date);
        return eventDate >= in24Hours && eventDate <= in48Hours;
      }
      // Undated: nudge once at 5-6 days old
      const ageMs = now.getTime() - new Date(offer.created_at).getTime();
      return (
        ageMs >= UNDATED_NUDGE_MIN_AGE_DAYS * dayMs &&
        ageMs < UNDATED_NUDGE_MAX_AGE_DAYS * dayMs
      );
    });

    if (nudgeTargets.length === 0) {
      return { sent: 0, considered: 0 };
    }

    // Brand names for copy
    const brandIds = [
      ...new Set(nudgeTargets.map((r: any) => (r.offer as Record<string, any>).brand_id)),
    ];
    const { data: brands } = await adminClient
      .from("brands")
      .select("id, company_name")
      .in("id", brandIds);
    const brandMap = new Map((brands || []).map((b: any) => [b.id, b]));

    // Claimed models only — user_id NOT NULL is the hard guardrail
    const modelIds = [...new Set(nudgeTargets.map((r: any) => r.model_id))];
    const { data: models } = await adminClient
      .from("models")
      .select("id, username, user_id")
      .in("id", modelIds)
      .not("user_id", "is", null);
    const modelMap = new Map((models || []).map((m: any) => [m.id, m]));

    const userIds: string[] = (models || []).map((m: any) => m.user_id).filter(Boolean);
    const userEmails = await listUserEmailsByIds(adminClient as any, userIds);

    let sent = 0;
    const errors: string[] = [];

    for (const response of nudgeTargets) {
      const offer = response.offer as Record<string, any>;
      const model = modelMap.get(response.model_id);
      const email = model ? userEmails.get(model.user_id) : null;
      if (!model || !email) continue;

      const brandName =
        (brandMap.get(offer.brand_id) as any)?.company_name || "A brand";

      const locationParts = [
        offer.location_name,
        offer.location_city,
        offer.location_state,
      ].filter(Boolean);
      const location = locationParts.length > 0 ? locationParts.join(", ") : undefined;

      // compensation_amount is stored in cents
      let compensation: string | undefined;
      if (offer.compensation_type === "paid" && offer.compensation_amount) {
        compensation = `$${(offer.compensation_amount / 100).toLocaleString()}`;
      } else if (offer.compensation_description) {
        compensation = offer.compensation_description;
      }

      try {
        await sendOfferExpiryReminderEmail({
          to: email,
          username: model.username || "model",
          offerTitle: offer.title,
          brandName,
          eventDate: offer.event_date
            ? new Date(offer.event_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : undefined,
          eventTime: offer.event_time || undefined,
          location,
          compensation,
          offerId: offer.id,
        });

        // Web push — models.id IS the actor id (models.id references
        // actors.id); 'offers' preference key, tagged per offer so the
        // received-offer push is replaced instead of stacking.
        await sendPushToActor(
          model.id,
          {
            title: offer.event_date
              ? "Offer closing soon"
              : `${brandName} is waiting on you`,
            body: `${offer.title}${compensation ? ` · ${compensation}` : ""} — tap to respond`,
            url: `/offers/${offer.id}`,
            tag: `offer-expiry-${offer.id}`,
          },
          "offers"
        );

        // Bell row — live notifications schema is user_id / type / title /
        // message / metadata / action_url (see earning-notifications.ts).
        // 'offer_expiring' requires migration 20260722000850 to be applied
        // first; on failure we log and continue (never fail the send).
        const { error: notifError } = await (adminClient.from("notifications") as any).insert({
          user_id: model.user_id,
          type: "offer_expiring",
          title: "Offer closing soon",
          message: `"${offer.title}" from ${brandName} is still waiting for your answer`,
          action_url: `/offers/${offer.id}`,
          metadata: { offer_id: offer.id },
        });
        if (notifError) {
          logger.error("Offer expiry bell insert failed", undefined, {
            responseId: response.id,
            message: notifError.message,
            code: notifError.code,
          });
        }

        // Mark AFTER the email went out (same order as pass 1)
        await adminClient
          .from("offer_responses")
          .update({ expiry_reminder_sent_at: new Date().toISOString() })
          .eq("id", response.id);

        sent++;
      } catch (err) {
        logger.error("Failed to send offer expiry nudge", err, {
          responseId: response.id,
        });
        errors.push(`Failed for response ${response.id}`);
      }
    }

    return {
      sent,
      considered: nudgeTargets.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    // Pass 2 must never take down pass 1's response
    logger.error("Offer expiry nudge pass failed", error);
    return { sent: 0, considered: 0, errors: ["expiry pass failed"] };
  }
}
