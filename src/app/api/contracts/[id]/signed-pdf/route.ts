import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { signedContractStoragePath } from "@/lib/contract-storage";
import { logger } from "@/lib/logger";

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

    const { data: contract } = await adminClient
      .from("contracts")
      .select("id, brand_id, model_id, status")
      .eq("id", id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (contract.status !== "signed") {
      return NextResponse.json(
        { error: "Contract has not been signed yet" },
        { status: 400 }
      );
    }

    // Auth: brand, model, or admin
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const path = signedContractStoragePath(contract.id);
    const { data: signed, error: signError } = await adminClient.storage
      .from("portfolio")
      .createSignedUrl(path, 60 * 10, { download: `contract-${contract.id}.pdf` });

    if (signError || !signed?.signedUrl) {
      logger.error("Signed contract PDF not available", signError, {
        contractId: contract.id,
      });
      return NextResponse.json(
        { error: "Signed PDF not available yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    logger.error("Error fetching signed contract PDF", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
