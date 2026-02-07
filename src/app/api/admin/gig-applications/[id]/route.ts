import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, AdminActions } from "@/lib/admin-audit";

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
    const { status } = body;

    if (!status || !["accepted", "rejected", "pending", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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

    // If accepted, increment spots_filled and award event badge
    if (status === "accepted" && application.status !== "accepted") {
      const { error: rpcError } = await adminClient.rpc("increment_gig_spots_filled", { gig_id: application.gig_id });
      if (rpcError) {
        console.error("RPC increment error:", rpcError);
        // Non-fatal - application was already updated
      }

      // Award event badge if gig is linked to an event
      if (application.gig?.event_id) {
        // Find the badge for this event
        const { data: badge } = await adminClient
          .from("badges")
          .select("id")
          .eq("event_id", application.gig.event_id)
          .eq("badge_type", "event")
          .eq("is_active", true)
          .single();

        if (badge) {
          // Award the badge (upsert to avoid duplicates)
          const { error: badgeError } = await adminClient
            .from("model_badges")
            .upsert(
              {
                model_id: application.model_id,
                badge_id: badge.id,
                earned_at: new Date().toISOString(),
              },
              { onConflict: "model_id,badge_id" }
            );

          if (badgeError) {
            console.error("Badge award error:", badgeError);
            // Non-fatal - application was already updated
          } else {
            console.log(`Awarded event badge ${badge.id} to model ${application.model_id}`);
          }
        }
      }
    }

    // If cancelling an accepted application, decrement spots_filled and remove badge
    if ((status === "cancelled" || status === "rejected") && application.status === "accepted") {
      const { error: rpcError } = await adminClient.rpc("decrement_gig_spots_filled", { gig_id: application.gig_id });
      if (rpcError) {
        console.error("RPC decrement error:", rpcError);
        // Non-fatal - application was already updated
      }

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
            } else {
              console.log(`Removed event badge ${badge.id} from model ${application.model_id}`);
            }
          }
        }
      }
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
