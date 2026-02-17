import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendContractSentEmail } from "@/lib/email";
import { z } from "zod";

const createContractSchema = z.object({
  templateId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().max(50000).optional().nullable(),
  pdfUrl: z.string().url().optional().nullable(),
  pdfStoragePath: z.string().optional().nullable(),
  modelId: z.string().uuid("Invalid model ID"),
  bookingId: z.string().uuid().optional().nullable(),
  offerId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "sent"]).default("sent"),
});

const adminClient: any = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Verify caller is a brand
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "brand") {
      return NextResponse.json({ error: "Only brands can send contracts" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const input = parsed.data;

    // Get brand info for template placeholders
    const { data: brand } = await adminClient
      .from("brands")
      .select("company_name")
      .eq("id", actor.id)
      .single();

    const brandName = brand?.company_name || "Brand";

    // Get model info
    const { data: model } = await adminClient
      .from("models")
      .select("id, user_id, first_name, last_name")
      .eq("id", input.modelId)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const modelName = [model.first_name, model.last_name].filter(Boolean).join(" ") || "Model";

    // Resolve content from template if needed
    let resolvedContent = input.content || null;
    const templateId = input.templateId || null;

    if (templateId && !resolvedContent) {
      const { data: template } = await adminClient
        .from("contract_templates")
        .select("content")
        .eq("id", templateId)
        .single();

      if (template) {
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        resolvedContent = template.content
          .replace(/\{\{date\}\}/g, today)
          .replace(/\{\{brand_name\}\}/g, brandName)
          .replace(/\{\{model_name\}\}/g, modelName);
      }
    }

    // If content was provided (brand customized), also resolve placeholders
    if (input.content) {
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      resolvedContent = input.content
        .replace(/\{\{date\}\}/g, today)
        .replace(/\{\{brand_name\}\}/g, brandName)
        .replace(/\{\{model_name\}\}/g, modelName);
    }

    // Verify booking belongs to brand if provided
    if (input.bookingId) {
      const { data: booking } = await adminClient
        .from("bookings")
        .select("id, client_id")
        .eq("id", input.bookingId)
        .single();

      if (!booking || booking.client_id !== actor.id) {
        return NextResponse.json({ error: "Booking not found or not yours" }, { status: 404 });
      }
    }

    // Verify offer belongs to brand if provided
    if (input.offerId) {
      const { data: offer } = await adminClient
        .from("offers")
        .select("id, brand_id")
        .eq("id", input.offerId)
        .single();

      if (!offer || offer.brand_id !== actor.id) {
        return NextResponse.json({ error: "Offer not found or not yours" }, { status: 404 });
      }
    }

    // Insert contract
    const { data: contract, error: insertError } = await adminClient
      .from("contracts")
      .insert({
        brand_id: actor.id,
        model_id: input.modelId,
        template_id: templateId,
        title: input.title,
        content: resolvedContent,
        pdf_storage_path: input.pdfStoragePath || null,
        pdf_url: input.pdfUrl || null,
        booking_id: input.bookingId || null,
        offer_id: input.offerId || null,
        status: input.status,
        sent_at: input.status === "sent" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating contract:", insertError);
      return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
    }

    // Send notification + email if status is "sent"
    if (input.status === "sent") {
      // Get model's actor_id for notification
      const { data: modelActor } = await adminClient
        .from("actors")
        .select("id")
        .eq("user_id", model.user_id)
        .single();

      if (modelActor) {
        await adminClient.from("notifications").insert({
          actor_id: modelActor.id,
          type: "contract_received",
          title: "New Contract to Review",
          body: `${brandName} sent you a contract: ${input.title}`,
          data: { contract_id: contract.id },
        });
      }

      // Send email
      const { data: modelAuth } = await adminClient.auth.admin.getUserById(model.user_id);
      if (modelAuth?.user?.email) {
        try {
          await sendContractSentEmail({
            to: modelAuth.user.email,
            modelName,
            brandName,
            contractTitle: input.title,
          });
        } catch (emailError) {
          console.error("Failed to send contract email:", emailError);
        }
      }
    }

    return NextResponse.json({ success: true, contract });
  } catch (error) {
    console.error("Error in POST /api/contracts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const bookingId = searchParams.get("bookingId");
    const offerId = searchParams.get("offerId");

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ contracts: [] });
    }

    let query = adminClient
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "brand" || actor.type === "brand") {
      query = query.eq("brand_id", actor.id);
    } else if (role === "model" || actor.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!model) {
        return NextResponse.json({ contracts: [] });
      }
      query = query.eq("model_id", model.id);
    } else {
      return NextResponse.json({ contracts: [] });
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }
    if (offerId) {
      query = query.eq("offer_id", offerId);
    }

    const { data: contracts, error } = await query;

    if (error) {
      console.error("Error fetching contracts:", error);
      return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
    }

    // Enrich with model and brand info
    const modelIds = [...new Set((contracts || []).map((c: any) => c.model_id))];
    const brandIds = [...new Set((contracts || []).map((c: any) => c.brand_id))];

    const [{ data: models }, { data: brands }] = await Promise.all([
      modelIds.length > 0
        ? adminClient
            .from("models")
            .select("id, first_name, last_name, profile_photo_url, username")
            .in("id", modelIds)
        : { data: [] },
      brandIds.length > 0
        ? adminClient
            .from("brands")
            .select("id, company_name, logo_url")
            .in("id", brandIds)
        : { data: [] },
    ]);

    const modelMap = new Map((models || []).map((m: any) => [m.id, m]));
    const brandMap = new Map((brands || []).map((b: any) => [b.id, b]));

    const enriched = (contracts || []).map((c: any) => ({
      ...c,
      model: modelMap.get(c.model_id) || null,
      brand: brandMap.get(c.brand_id) || null,
    }));

    return NextResponse.json({ contracts: enriched });
  } catch (error) {
    console.error("Error in GET /api/contracts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
