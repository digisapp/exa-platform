import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendContractSignedEmail } from "@/lib/email";
import { z } from "zod";

const updateContractSchema = z.object({
  action: z.enum(["sign", "void"]),
});

const adminClient: any = createServiceRoleClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { data: contract, error } = await adminClient
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Auth check: must be the brand, the model, or an admin
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const isBrand = actor.type === "brand" && contract.brand_id === actor.id;
    const isAdmin = actor.type === "admin";
    let isModel = false;
    if (actor.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("id")
        .eq("user_id", user.id)
        .single();
      isModel = model?.id === contract.model_id;
    }

    if (!isBrand && !isModel && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Enrich with model and brand info
    const [{ data: model }, { data: brand }] = await Promise.all([
      adminClient
        .from("models")
        .select("id, first_name, last_name, profile_photo_url, username")
        .eq("id", contract.model_id)
        .single(),
      adminClient
        .from("brands")
        .select("id, company_name, logo_url")
        .eq("id", contract.brand_id)
        .single(),
    ]);

    return NextResponse.json({
      contract: {
        ...contract,
        model: model || null,
        brand: brand || null,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/contracts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = updateContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { action } = parsed.data;

    // Fetch the contract
    const { data: contract, error: fetchError } = await adminClient
      .from("contracts")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get actor info
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "sign") {
      // Only the model can sign
      if (actor.type !== "model") {
        return NextResponse.json({ error: "Only models can sign contracts" }, { status: 403 });
      }

      const { data: model } = await supabase
        .from("models")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .single();

      if (!model || model.id !== contract.model_id) {
        return NextResponse.json({ error: "This contract is not for you" }, { status: 403 });
      }

      if (contract.status !== "sent") {
        return NextResponse.json({ error: "Contract cannot be signed in its current state" }, { status: 400 });
      }

      const signerName = [model.first_name, model.last_name].filter(Boolean).join(" ") || "Model";
      const signerIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || request.headers.get("x-real-ip")
        || "unknown";

      const { error: updateError } = await adminClient
        .from("contracts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signer_name: signerName,
          signer_ip: signerIp,
        })
        .eq("id", id)
        .eq("status", "sent"); // Idempotency guard

      if (updateError) {
        console.error("Error signing contract:", updateError);
        return NextResponse.json({ error: "Failed to sign contract" }, { status: 500 });
      }

      // Notify the brand
      await adminClient.from("notifications").insert({
        actor_id: contract.brand_id,
        type: "contract_signed",
        title: "Contract Signed",
        body: `${signerName} signed the contract: ${contract.title}`,
        data: { contract_id: contract.id },
      });

      // Send email to brand
      const { data: brandData } = await adminClient
        .from("brands")
        .select("company_name")
        .eq("id", contract.brand_id)
        .single();

      const { data: brandActor } = await adminClient
        .from("actors")
        .select("user_id")
        .eq("id", contract.brand_id)
        .single();

      if (brandActor) {
        const { data: brandAuth } = await adminClient.auth.admin.getUserById(brandActor.user_id);
        if (brandAuth?.user?.email) {
          try {
            await sendContractSignedEmail({
              to: brandAuth.user.email,
              brandName: brandData?.company_name || "Brand",
              modelName: signerName,
              contractTitle: contract.title,
            });
          } catch (emailError) {
            console.error("Failed to send signed email:", emailError);
          }
        }
      }

      return NextResponse.json({ success: true, status: "signed" });
    }

    if (action === "void") {
      // Only the brand can void
      if (actor.type !== "brand" || contract.brand_id !== actor.id) {
        return NextResponse.json({ error: "Only the sending brand can void a contract" }, { status: 403 });
      }

      if (contract.status !== "sent") {
        return NextResponse.json({ error: "Only pending contracts can be voided" }, { status: 400 });
      }

      const { error: updateError } = await adminClient
        .from("contracts")
        .update({ status: "voided" })
        .eq("id", id)
        .eq("status", "sent");

      if (updateError) {
        console.error("Error voiding contract:", updateError);
        return NextResponse.json({ error: "Failed to void contract" }, { status: 500 });
      }

      // Notify the model
      const { data: modelData } = await adminClient
        .from("models")
        .select("user_id, first_name")
        .eq("id", contract.model_id)
        .single();

      if (modelData) {
        const { data: modelActor } = await adminClient
          .from("actors")
          .select("id")
          .eq("user_id", modelData.user_id)
          .single();

        if (modelActor) {
          await adminClient.from("notifications").insert({
            actor_id: modelActor.id,
            type: "contract_voided",
            title: "Contract Voided",
            body: `A contract has been voided: ${contract.title}`,
            data: { contract_id: contract.id },
          });
        }
      }

      return NextResponse.json({ success: true, status: "voided" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in PATCH /api/contracts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
