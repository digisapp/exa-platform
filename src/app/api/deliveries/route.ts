import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { getModelId, getActorInfo } from "@/lib/ids";
import { z } from "zod";

const createDeliverySchema = z.object({
  bookingId: z.string().uuid().optional().nullable(),
  offerId: z.string().uuid().optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).refine(
  (data) => data.bookingId || data.offerId,
  { message: "Either bookingId or offerId is required" }
);

const adminClient = createServiceRoleClient();

// POST - Create a new content delivery
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get model ID - only models can create deliveries
    const modelId = await getModelId(supabase, user.id);
    if (!modelId) {
      return NextResponse.json({ error: "Only models can create deliveries" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createDeliverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { bookingId, offerId, title, notes } = parsed.data;

    let recipientActorId: string | null = null;

    // Validate booking and get recipient
    if (bookingId) {
      const { data: booking } = await adminClient
        .from("bookings")
        .select("id, model_id, client_id, status")
        .eq("id", bookingId)
        .maybeSingle();

      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.model_id !== modelId) {
        return NextResponse.json({ error: "You are not the model for this booking" }, { status: 403 });
      }

      if (!["confirmed", "completed"].includes(booking.status || "")) {
        return NextResponse.json({ error: "Booking must be confirmed or completed to deliver content" }, { status: 400 });
      }

      recipientActorId = booking.client_id;
    }

    // Validate offer and get recipient
    if (offerId) {
      const { data: offer } = await adminClient
        .from("offers")
        .select("id, brand_id")
        .eq("id", offerId)
        .maybeSingle();

      if (!offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }

      // Verify model has an accepted/confirmed response to this offer
      const { data: response } = await adminClient
        .from("offer_responses")
        .select("id, status")
        .eq("offer_id", offerId)
        .eq("model_id", modelId)
        .maybeSingle();

      if (!response || !["accepted", "confirmed"].includes(response.status)) {
        return NextResponse.json({ error: "You must have an accepted offer response to deliver content" }, { status: 403 });
      }

      recipientActorId = offer.brand_id;
    }

    if (!recipientActorId) {
      return NextResponse.json({ error: "Could not determine recipient" }, { status: 400 });
    }

    // Create the delivery
    const { data: delivery, error: insertError } = await adminClient
      .from("content_deliveries" as any)
      .insert({
        model_id: modelId,
        booking_id: bookingId || null,
        offer_id: offerId || null,
        recipient_actor_id: recipientActorId,
        title: title || null,
        notes: notes || null,
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .select()
      .single() as { data: any; error: any };

    if (insertError || !delivery) {
      console.error("Failed to create delivery:", insertError);
      return NextResponse.json({ error: "Failed to create delivery" }, { status: 500 });
    }

    // Send notification to recipient
    try {
      const { data: model } = await adminClient
        .from("models")
        .select("first_name, username")
        .eq("id", modelId)
        .maybeSingle();

      const modelName = model?.first_name || model?.username || "A model";

      await (adminClient.from("notifications") as any).insert({
        actor_id: recipientActorId,
        type: "content_delivered",
        title: "Content Delivered",
        body: `${modelName} has delivered content${bookingId ? " for your booking" : ""}`,
        data: {
          delivery_id: delivery.id,
          booking_id: bookingId || null,
          offer_id: offerId || null,
        },
      });
    } catch (notifError) {
      console.error("Failed to send delivery notification:", notifError);
    }

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (error) {
    console.error("Create delivery error:", error);
    return NextResponse.json({ error: "Failed to create delivery" }, { status: 500 });
  }
}

// GET - List deliveries for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // 'model' or 'brand'
    const bookingId = searchParams.get("bookingId");
    const offerId = searchParams.get("offerId");
    const status = searchParams.get("status");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResult) return rateLimitResult;

    const actorInfo = await getActorInfo(supabase, user.id);
    if (!actorInfo) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    let query = adminClient
      .from("content_deliveries" as any)
      .select("id, model_id, booking_id, offer_id, recipient_actor_id, title, notes, status, revision_notes, delivered_at, approved_at, revision_requested_at, created_at")
      .order("created_at", { ascending: false });

    // Filter by role
    if (role === "model") {
      const modelId = await getModelId(supabase, user.id);
      if (!modelId) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }
      query = query.eq("model_id", modelId);
    } else {
      // Default: filter by recipient (brand/fan)
      query = query.eq("recipient_actor_id", actorInfo.id);
    }

    // Optional filters
    if (bookingId) query = query.eq("booking_id", bookingId);
    if (offerId) query = query.eq("offer_id", offerId);
    if (status) query = query.eq("status", status);

    const { data: deliveries, error } = await query.limit(50) as { data: any[]; error: any };

    if (error) {
      console.error("Failed to fetch deliveries:", error);
      return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 });
    }

    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json({ deliveries: [] });
    }

    // Batch-fetch file counts
    const deliveryIds = deliveries.map((d: any) => d.id);
    const { data: files } = await adminClient
      .from("delivery_files" as any)
      .select("delivery_id, size_bytes")
      .in("delivery_id", deliveryIds) as { data: any }

    const fileCounts: Record<string, { count: number; totalSize: number }> = {};
    (files || []).forEach((f: any) => {
      if (!fileCounts[f.delivery_id]) {
        fileCounts[f.delivery_id] = { count: 0, totalSize: 0 };
      }
      fileCounts[f.delivery_id].count++;
      fileCounts[f.delivery_id].totalSize += f.size_bytes || 0;
    });

    // Batch-fetch model info
    const modelIds = [...new Set(deliveries.map((d: any) => d.model_id))];
    const { data: models } = await adminClient
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url")
      .in("id", modelIds);

    const modelMap: Record<string, any> = {};
    (models || []).forEach((m: any) => { modelMap[m.id] = m; });

    // Batch-fetch booking info
    const bookingIds = deliveries.map((d: any) => d.booking_id).filter(Boolean);
    const bookingMap: Record<string, any> = {};
    if (bookingIds.length > 0) {
      const { data: bookings } = await adminClient
        .from("bookings")
        .select("id, booking_number, service_type, event_date")
        .in("id", bookingIds);
      (bookings || []).forEach((b: any) => { bookingMap[b.id] = b; });
    }

    // Batch-fetch offer info
    const offerIds = deliveries.map((d: any) => d.offer_id).filter(Boolean);
    const offerMap: Record<string, any> = {};
    if (offerIds.length > 0) {
      const { data: offers } = await adminClient
        .from("offers")
        .select("id, title, event_date")
        .in("id", offerIds);
      (offers || []).forEach((o: any) => { offerMap[o.id] = o; });
    }

    // Enrich deliveries
    const enriched = deliveries.map((d: any) => ({
      ...d,
      fileCount: fileCounts[d.id]?.count || 0,
      totalSize: fileCounts[d.id]?.totalSize || 0,
      model: modelMap[d.model_id] || null,
      booking: d.booking_id ? bookingMap[d.booking_id] || null : null,
      offer: d.offer_id ? offerMap[d.offer_id] || null : null,
    }));

    return NextResponse.json({ deliveries: enriched });
  } catch (error) {
    console.error("Fetch deliveries error:", error);
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 });
  }
}
