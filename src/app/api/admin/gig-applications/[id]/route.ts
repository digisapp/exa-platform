import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";
import { sendGigApplicationAcceptedEmail, sendGigWaitlistedEmail } from "@/lib/email";
import { postLiveWallSystemMessage } from "@/lib/live-wall-system";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Award the gig's event badge to a model (same gating as the manage_event_badge
// DB trigger — is_active only; see migration 20260701000001).
async function awardEventBadge(adminClient: SupabaseClient, eventId: string, modelId: string) {
  const { data: badge } = await (adminClient as any)
    .from("badges")
    .select("id")
    .eq("event_id", eventId)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .single();
  if (!badge) return;
  await (adminClient as any)
    .from("model_badges")
    .upsert(
      { model_id: modelId, badge_id: badge.id, earned_at: new Date().toISOString() },
      { onConflict: "model_id,badge_id" }
    );
}

// Promote waitlisted applications into freed spots. Called after any status
// change that can free capacity. Oldest waitlisted first; each promotion goes
// through the same effects as a manual accept (badge award via the DB trigger
// + this safeguard, spots_filled recomputed by trg_sync_gig_spots_filled) and
// sends the standard acceptance email. Data analysis (2026-07-04) showed
// acceptance is the strongest retention driver — 85% of applicants never got
// one; this manufactures more "yes" moments from the same spots.
async function promoteFromWaitlist(adminClient: SupabaseClient, gigId: string, excludeApplicationId?: string) {
  try {
    // Fresh read — spots_filled was just recomputed by the trigger.
    const { data: gig } = await (adminClient as any)
      .from("gigs")
      .select("id, title, spots, spots_filled, event_id, start_at, location_city, location_state, status")
      .eq("id", gigId)
      .single();

    // Only promote into a bounded, open gig with free capacity.
    if (!gig || gig.status !== "open" || !gig.spots) return;
    const freeSpots = gig.spots - (gig.spots_filled ?? 0);
    if (freeSpots <= 0) return;

    let waitlistQuery = (adminClient as any)
      .from("gig_applications")
      .select("id, model_id")
      .eq("gig_id", gigId)
      .eq("status", "waitlist")
      .order("applied_at", { ascending: true })
      .limit(freeSpots);

    // When an accepted applicant was just demoted TO waitlist, don't re-promote
    // that same row — it would silently undo the admin's action.
    if (excludeApplicationId) {
      waitlistQuery = waitlistQuery.neq("id", excludeApplicationId);
    }

    const { data: waitlisted } = await waitlistQuery;

    if (!waitlisted?.length) return;

    let eventName: string | undefined;
    if (gig.event_id) {
      const { data: ev } = await (adminClient as any)
        .from("events")
        .select("short_name, year")
        .eq("id", gig.event_id)
        .single();
      if (ev) eventName = `${ev.short_name} ${ev.year}`;
    }

    for (const app of waitlisted) {
      const { data: promoted } = await (adminClient as any)
        .from("gig_applications")
        .update({
          status: "accepted",
          reviewed_at: new Date().toISOString(),
          admin_note: "Auto-promoted from waitlist",
        })
        .eq("id", app.id)
        .eq("status", "waitlist") // compare-and-set: skip if changed concurrently
        .select("id");

      if (!promoted?.length) continue;

      if (gig.event_id) {
        await awardEventBadge(adminClient, gig.event_id, app.model_id);
      }

      // Congrats email (non-blocking)
      const { data: model } = await (adminClient as any)
        .from("models")
        .select("email, first_name, username")
        .eq("id", app.model_id)
        .single();
      if (model?.username) {
        await postLiveWallSystemMessage(
          `@${model.username} was accepted to ${gig.title} 🎉`
        );
      }
      if (model?.email) {
        sendGigApplicationAcceptedEmail({
          to: model.email,
          modelName: model.first_name || model.username || "Model",
          gigTitle: gig.title,
          gigDate: gig.start_at ? new Date(gig.start_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : undefined,
          gigLocation: [gig.location_city, gig.location_state].filter(Boolean).join(", ") || undefined,
          eventName,
        }).catch((err) => logger.error("Waitlist promotion email failed", err, { applicationId: app.id }));
      }
    }
  } catch (err) {
    // Promotion is best-effort — never fail the admin's original action.
    logger.error("Waitlist promotion failed", err, { gigId });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    let { status } = body;

    if (!status || !["accepted", "rejected", "pending", "cancelled", "waitlist"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // The DB CHECK constraint has no 'cancelled' value (pending/accepted/
    // rejected/withdrawn/waitlist) — the old cancel path always failed at the
    // DB. Map it to 'rejected', which is what the admin UI's "Declined" bucket
    // treats it as anyway.
    if (status === "cancelled") status = "rejected";

    // Use service role client to bypass RLS
    const adminClient = createServiceRoleClient();

    // Get the application with gig and event info
    const { data: application, error: fetchError } = await adminClient
      .from("gig_applications")
      .select("*, gig:gigs(id, title, event_id)")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Guard capacity on manual accept: don't overfill a full gig or accept into
    // a gig that is no longer open. (spots_filled is trigger-maintained; we only
    // read it here.) Re-accepting an already-accepted app is a no-op and skipped.
    if (status === "accepted" && application.status !== "accepted") {
      const { data: capacityGig } = await adminClient
        .from("gigs")
        .select("spots, spots_filled, status")
        .eq("id", application.gig_id)
        .single();
      if (capacityGig) {
        if (capacityGig.status !== "open") {
          return NextResponse.json({ error: "This gig is not open for new acceptances" }, { status: 409 });
        }
        if (capacityGig.spots && (capacityGig.spots_filled ?? 0) >= capacityGig.spots) {
          return NextResponse.json({ error: "All spots for this gig are already filled" }, { status: 409 });
        }
      }
    }

    // Update application status
    const { error: updateError } = await adminClient
      .from("gig_applications")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: `Failed to update: ${updateError.message}` },
        { status: 500 }
      );
    }

    // If accepted, award the event badge. spots_filled is maintained by the DB
    // trigger trg_sync_gig_spots_filled, which recomputes it from the accepted-
    // application count on every status change (migration
    // 20260702000001_sync_gig_spots_filled) -- do NOT increment it here too.
    if (status === "accepted" && application.status !== "accepted") {
      // Heartbeat post on the live wall (username only — real names are
      // admin-only). Non-fatal; never blocks the accept.
      const { data: acceptedModel } = await adminClient
        .from("models")
        .select("username")
        .eq("id", application.model_id)
        .single() as { data: { username: string | null } | null };
      if (acceptedModel?.username && application.gig?.title) {
        await postLiveWallSystemMessage(
          `@${acceptedModel.username} was accepted to ${application.gig.title} 🎉`
        );
      }

      // NOTE: the event badge is intentionally NOT awarded here anymore.
      // Badges are now granted when the EVENT is marked 'completed' (DB function
      // award_event_completion_points, migration 20260711000001), so a badge
      // reads as "walked this show" rather than "confirmed to walk". Acceptance
      // only makes the model eligible for the badge and turns on their profile
      // ticket link (driven by the accepted application, see the profile page).
    }

    // If un-accepting (reject, revert to pending, or move to waitlist), remove
    // the event badge. spots_filled is recomputed by trg_sync_gig_spots_filled;
    // don't decrement it here too.
    if ((status === "rejected" || status === "pending" || status === "waitlist") && application.status === "accepted") {
      // Remove event badge if no other accepted applications for this event
      if (application.gig?.event_id) {
        // Check if model has other accepted applications for gigs linked to this event
        const { data: otherApps } = await adminClient
          .from("gig_applications")
          .select("id, gig:gigs!inner(event_id)")
          .eq("model_id", application.model_id)
          .eq("status", "accepted")
          .eq("gig.event_id", application.gig.event_id)
          .neq("id", id);

        // Only remove badge if no other accepted applications for this event
        if (!otherApps || otherApps.length === 0) {
          const { data: badge } = await adminClient
            .from("badges")
            .select("id")
            .eq("event_id", application.gig.event_id)
            .eq("badge_type", "event")
            .single();

          if (badge) {
            const { error: badgeError } = await adminClient
              .from("model_badges")
              .delete()
              .eq("model_id", application.model_id)
              .eq("badge_id", badge.id);

            if (badgeError) {
              console.error("Badge removal error:", badgeError);
            }
          }
        }
      }
    }

    // Newly waitlisted → positive "you're shortlisted" touchpoint (non-blocking).
    if (status === "waitlist" && application.status !== "waitlist") {
      const { data: model } = await (adminClient as any)
        .from("models")
        .select("email, first_name, username")
        .eq("id", application.model_id)
        .single();
      if (model?.email) {
        let eventName: string | undefined;
        if (application.gig?.event_id) {
          const { data: ev } = await (adminClient as any)
            .from("events")
            .select("short_name, year")
            .eq("id", application.gig.event_id)
            .single();
          if (ev) eventName = `${ev.short_name} ${ev.year}`;
        }
        sendGigWaitlistedEmail({
          to: model.email,
          modelName: model.first_name || model.username || "Model",
          gigTitle: application.gig?.title || "an EXA gig",
          eventName,
        }).catch((err) => logger.error("Waitlist email failed", err, { applicationId: id }));
      }
    }

    // A spot may have been freed (accepted → anything else): promote the oldest
    // waitlisted applicant(s) into the freed capacity — but never re-promote the
    // application we just demoted (accepted → waitlist), which would undo it.
    if (application.status === "accepted" && status !== "accepted") {
      await promoteFromWaitlist(adminClient, application.gig_id, id);
    }

    // Log the admin action
    await logAdminAction({
      supabase,
      adminUserId: user.id,
      action: AdminActions.GIG_APPLICATION_UPDATED,
      targetType: "gig_application",
      targetId: id,
      oldValues: { status: application.status },
      newValues: { status, gig_id: application.gig_id, model_id: application.model_id },
    });

    return NextResponse.json({
      success: true,
      application: {
        id,
        gig_id: application.gig_id,
        model_id: application.model_id,
        gig_title: application.gig?.title,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Gig application update error:", errorMessage, error);
    return NextResponse.json(
      { error: `Failed to update application: ${errorMessage}` },
      { status: 500 }
    );
  }
}
