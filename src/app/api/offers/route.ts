import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendOfferReceivedEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Zod schema for offer creation validation
const createOfferSchema = z.object({
  campaign_id: z.string().uuid("Invalid campaign ID"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long").trim(),
  description: z.string().max(2000, "Description is too long").optional().nullable(),
  location_name: z.string().max(200, "Location name is too long").optional().nullable(),
  location_city: z.string().max(100, "City is too long").optional().nullable(),
  location_state: z.string().max(100, "State is too long").optional().nullable(),
  event_date: z.string().optional().nullable(),
  event_time: z.string().max(50, "Event time is too long").optional().nullable(),
  compensation_type: z.enum(["paid", "tfp", "perks", "negotiable"]).default("perks"),
  compensation_amount: z.number().min(0, "Amount cannot be negative").optional().nullable(),
  compensation_description: z.string().max(500, "Compensation description is too long").optional().nullable(),
  spots: z.number().int("Spots must be a whole number").min(1, "At least 1 spot required").max(1000, "Maximum 1000 spots").default(1),
  // Recurring offer fields
  is_recurring: z.boolean().default(false),
  recurrence_pattern: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional().nullable(),
  recurrence_end_date: z.string().optional().nullable(),
});

const adminClient = createServiceRoleClient();

// GET /api/offers - Get offers
// For models: offers sent to campaigns they're in
// For brands: offers they've sent (optionally filtered by campaignId)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const campaignId = url.searchParams.get("campaignId");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    if (actor.type === "model") {
      // Get model's ID - use adminClient to bypass RLS
      const { data: model } = await adminClient
        .from("models")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!model) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }

      // Get campaigns the model is in - use adminClient to bypass RLS
      const { data: campaignItems } = await adminClient
        .from("campaign_models")
        .select("campaign_id")
        .eq("model_id", model.id);

      const campaignIds = campaignItems?.map((item: any) => item.campaign_id) || [];

      if (campaignIds.length === 0) {
        return NextResponse.json({ offers: [] });
      }

      // Get offers for those campaigns with brand info - use adminClient
      const { data: offers } = await adminClient
        .from("offers")
        .select(`
          *,
          brand:actors!brand_id(
            id,
            brands:brands(id, company_name, logo_url)
          ),
          campaign:campaigns(id, name)
        `)
        .in("campaign_id", campaignIds)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      // Get model's responses - use adminClient
      const offerIds = offers?.map((o: any) => o.id) || [];
      let responses: any[] = [];
      if (offerIds.length > 0) {
        const { data: respData } = await adminClient
          .from("offer_responses")
          .select("offer_id, status")
          .eq("model_id", model.id)
          .in("offer_id", offerIds);
        responses = respData || [];
      }

      // Attach response status to each offer
      const offersWithResponse = (offers || []).map((offer: any) => {
        const response = responses.find((r: any) => r.offer_id === offer.id);
        return {
          ...offer,
          my_response: response?.status || null,
        };
      });

      return NextResponse.json({ offers: offersWithResponse });
    } else if (actor.type === "brand") {
      // Get brand's offers with model responses
      let query = supabase
        .from("offers")
        .select(`
          *,
          campaign:campaigns(id, name),
          responses:offer_responses(
            id,
            model_id,
            status,
            responded_at,
            checked_in_at,
            no_show,
            model:models(id, username, first_name, last_name, profile_photo_url, reliability_score)
          )
        `)
        .eq("brand_id", actor.id);

      // Filter by campaign if specified
      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data: offers } = await query.order("created_at", { ascending: false });

      return NextResponse.json({ offers: offers || [] });
    } else if (actor.type === "admin") {
      // Admins see all
      const { data: offers } = await supabase
        .from("offers")
        .select(`
          *,
          brand:actors!brand_id(
            id,
            brands:brands(id, company_name, logo_url)
          ),
          campaign:campaigns(id, name)
        `)
        .order("created_at", { ascending: false });

      return NextResponse.json({ offers: offers || [] });
    }

    return NextResponse.json({ offers: [] });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
  }
}

// POST /api/offers - Brand creates and sends offer to a campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    const isAdmin = actor?.type === "admin";
    const isBrand = actor?.type === "brand";

    if (!actor || (!isBrand && !isAdmin)) {
      return NextResponse.json({ error: "Only brands and admins can send offers" }, { status: 403 });
    }

    // Check subscription for brands (admins bypass this)
    if (isBrand) {
      const { data: brand } = await supabase
        .from("brands")
        .select("subscription_tier, subscription_status")
        .eq("id", actor.id)
        .single();

      if (!brand || brand.subscription_tier === "free" || brand.subscription_status !== "active") {
        return NextResponse.json({
          error: "Active subscription required to send offers",
          code: "SUBSCRIPTION_REQUIRED"
        }, { status: 403 });
      }
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = createOfferSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const {
      campaign_id,
      title,
      description,
      location_name,
      location_city,
      location_state,
      event_date,
      event_time,
      compensation_type,
      compensation_amount,
      compensation_description,
      spots,
      is_recurring,
      recurrence_pattern,
      recurrence_end_date,
    } = validationResult.data;

    // Get the campaign
    const { data: campaign } = await adminClient
      .from("campaigns")
      .select("id, name, brand_id")
      .eq("id", campaign_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // For brands, verify the campaign belongs to them
    if (isBrand && campaign.brand_id !== actor.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Use the campaign's brand_id for the offer (so admins create on behalf of the brand)
    const offerBrandId = campaign.brand_id;

    // Create the offer
    const { data: offer, error } = await adminClient
      .from("offers")
      .insert({
        brand_id: offerBrandId,
        campaign_id,
        title,
        description,
        location_name,
        location_city,
        location_state,
        event_date,
        event_time,
        compensation_type: compensation_type || "perks",
        compensation_amount: compensation_amount || 0,
        compensation_description,
        spots: spots || 1,
        status: "open",
        // Recurring offer fields
        is_recurring: is_recurring || false,
        recurrence_pattern: is_recurring ? recurrence_pattern : null,
        recurrence_end_date: is_recurring ? recurrence_end_date : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Get models in this campaign to create pending responses
    const { data: campaignModels } = await supabase
      .from("campaign_models")
      .select("model_id")
      .eq("campaign_id", campaign_id);

    if (campaignModels && campaignModels.length > 0) {
      const responses = campaignModels.map((item: any) => ({
        offer_id: offer.id,
        model_id: item.model_id,
        status: "pending",
      }));

      await adminClient.from("offer_responses").insert(responses);

      // Get brand name, model details, and user emails in parallel
      const modelIds = campaignModels.map((item: any) => item.model_id);
      const [brandResult, modelsResult, usersResult] = await Promise.all([
        adminClient.from("brands").select("company_name").eq("id", offerBrandId).single(),
        adminClient.from("models").select("id, first_name, username, user_id").in("id", modelIds),
        adminClient.auth.admin.listUsers(),
      ]);
      const brandName = brandResult.data?.company_name || "A brand";
      const models = modelsResult.data;

      if (models && models.length > 0) {
        const userIds = models.map((m: any) => m.user_id);
        const users = usersResult.data;
        const userEmails = new Map(
          users?.users?.filter((u: any) => userIds.includes(u.id)).map((u: any) => [u.id, u.email]) || []
        );

        // Build location string
        const locationParts = [location_name, location_city, location_state].filter(Boolean);
        const locationStr = locationParts.length > 0 ? locationParts.join(", ") : undefined;

        // Build compensation string
        let compensationStr: string | undefined;
        if (compensation_type === "paid" && compensation_amount) {
          compensationStr = `$${compensation_amount}`;
        } else if (compensation_description) {
          compensationStr = compensation_description;
        }

        // Send emails to all models (fire and forget)
        for (const model of models) {
          const email = userEmails.get(model.user_id);
          if (email) {
            sendOfferReceivedEmail({
              to: email,
              modelName: model.first_name || model.username || "Model",
              brandName,
              offerTitle: title,
              eventDate: event_date ? new Date(event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "",
              eventTime: event_time ?? undefined,
              location: locationStr,
              compensation: compensationStr,
              offerId: offer.id,
            }).catch((err) => console.error("Failed to send offer email:", err));
          }
        }
      }
    }

    return NextResponse.json({ offer, models_notified: campaignModels?.length || 0 });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}
