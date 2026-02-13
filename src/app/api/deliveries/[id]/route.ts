import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const updateDeliverySchema = z.object({
  action: z.enum(["approve", "request_revision", "update_notes"]),
  revisionNotes: z.string().max(2000).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// GET - Get single delivery with all files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get actor for auth check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get delivery
    const { data: delivery, error } = await adminClient
      .from("content_deliveries" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle() as { data: any; error: any };

    if (error || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    // Auth check: must be model, recipient, or admin
    const isRecipient = delivery.recipient_actor_id === actor.id;
    const isAdmin = actor.type === "admin";

    let isModel = false;
    if (delivery.model_id) {
      const { data: modelRecord } = await supabase
        .from("models")
        .select("user_id")
        .eq("id", delivery.model_id)
        .maybeSingle();
      isModel = modelRecord?.user_id === user.id;
    }

    if (!isModel && !isRecipient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get files
    const { data: files } = await adminClient
      .from("delivery_files" as any)
      .select("*")
      .eq("delivery_id", id)
      .order("created_at", { ascending: true }) as { data: any };

    // Get model info
    let model = null;
    if (delivery.model_id) {
      const { data: m } = await adminClient
        .from("models")
        .select("id, username, first_name, last_name, profile_photo_url")
        .eq("id", delivery.model_id)
        .maybeSingle();
      model = m;
    }

    // Get booking info if linked
    let booking = null;
    if (delivery.booking_id) {
      const { data: b } = await adminClient
        .from("bookings")
        .select("id, booking_number, service_type, event_date, status")
        .eq("id", delivery.booking_id)
        .maybeSingle();
      booking = b;
    }

    // Get offer info if linked
    let offer = null;
    if (delivery.offer_id) {
      const { data: o } = await adminClient
        .from("offers")
        .select("id, title, event_date")
        .eq("id", delivery.offer_id)
        .maybeSingle();
      offer = o;
    }

    return NextResponse.json({
      delivery: {
        ...delivery,
        files: files || [],
        model,
        booking,
        offer,
      },
    });
  } catch (error) {
    console.error("Fetch delivery error:", error);
    return NextResponse.json({ error: "Failed to fetch delivery" }, { status: 500 });
  }
}

// PATCH - Update delivery (approve, request revision, update notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    // Get delivery
    const { data: delivery } = await adminClient
      .from("content_deliveries" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle() as { data: any };

    if (!delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    // Check permissions
    const isRecipient = delivery.recipient_actor_id === actor.id;
    const isAdmin = actor.type === "admin";

    let isModel = false;
    if (delivery.model_id) {
      const { data: modelRecord } = await supabase
        .from("models")
        .select("user_id")
        .eq("id", delivery.model_id)
        .maybeSingle();
      isModel = modelRecord?.user_id === user.id;
    }

    if (!isModel && !isRecipient && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateDeliverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { action, revisionNotes, title, notes } = parsed.data;
    let updateData: any = {};
    let notificationData: any = null;

    switch (action) {
      case "approve":
        if (!isRecipient && !isAdmin) {
          return NextResponse.json({ error: "Only the recipient can approve" }, { status: 403 });
        }
        updateData = {
          status: "approved",
          approved_at: new Date().toISOString(),
        };

        // Notify model
        const { data: modelActor } = await adminClient
          .from("models")
          .select("user_id")
          .eq("id", delivery.model_id)
          .maybeSingle();

        if (modelActor?.user_id) {
          const { data: modelActorRecord } = await adminClient
            .from("actors")
            .select("id")
            .eq("user_id", modelActor.user_id)
            .maybeSingle();

          if (modelActorRecord) {
            notificationData = {
              actor_id: modelActorRecord.id,
              type: "delivery_approved",
              title: "Content Approved",
              body: "Your content delivery has been approved!",
              data: { delivery_id: id },
            };
          }
        }
        break;

      case "request_revision":
        if (!isRecipient && !isAdmin) {
          return NextResponse.json({ error: "Only the recipient can request revision" }, { status: 403 });
        }
        if (!revisionNotes) {
          return NextResponse.json({ error: "Revision notes are required" }, { status: 400 });
        }
        updateData = {
          status: "revision_requested",
          revision_notes: revisionNotes,
          revision_requested_at: new Date().toISOString(),
        };

        // Notify model
        const { data: revModelActor } = await adminClient
          .from("models")
          .select("user_id")
          .eq("id", delivery.model_id)
          .maybeSingle();

        if (revModelActor?.user_id) {
          const { data: revModelActorRecord } = await adminClient
            .from("actors")
            .select("id")
            .eq("user_id", revModelActor.user_id)
            .maybeSingle();

          if (revModelActorRecord) {
            notificationData = {
              actor_id: revModelActorRecord.id,
              type: "delivery_revision_requested",
              title: "Revision Requested",
              body: `A revision has been requested for your content delivery`,
              data: { delivery_id: id, revision_notes: revisionNotes },
            };
          }
        }
        break;

      case "update_notes":
        if (!isModel && !isAdmin) {
          return NextResponse.json({ error: "Only the model can update notes" }, { status: 403 });
        }
        updateData = {};
        if (title !== undefined) updateData.title = title;
        if (notes !== undefined) updateData.notes = notes;
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await adminClient
      .from("content_deliveries" as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single() as { data: any; error: any };

    if (updateError || !updated) {
      console.error("Failed to update delivery:", updateError);
      return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 });
    }

    // Send notification
    if (notificationData) {
      try {
        await (adminClient.from("notifications") as any).insert(notificationData);
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }

    return NextResponse.json({ delivery: updated });
  } catch (error) {
    console.error("Update delivery error:", error);
    return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 });
  }
}
