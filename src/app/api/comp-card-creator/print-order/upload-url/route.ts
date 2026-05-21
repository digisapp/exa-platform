import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const supabase: any = createServiceRoleClient();
    const orderId = crypto.randomUUID();
    const storagePath = `comp-card-prints/${orderId}.pdf`;

    const { data, error } = await supabase.storage
      .from("portfolio")
      .createSignedUploadUrl(storagePath);

    if (error) {
      logger.error("Comp card print signed upload URL error", error);
      return NextResponse.json(
        { error: "Failed to create upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId,
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
    });
  } catch (error) {
    logger.error("Comp card print upload-url route error", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
