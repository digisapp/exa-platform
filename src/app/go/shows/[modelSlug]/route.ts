import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

const DIGIS_BASE_URL = "https://digis.cc";

function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelSlug: string }> }
) {
  const { modelSlug } = await params;
  const adminClient = createServiceRoleClient();

  // Look up model by username
  const { data: model } = await adminClient
    .from("models")
    .select("id, affiliate_code, digis_username")
    .eq("username", modelSlug)
    .single() as { data: { id: string; affiliate_code: string | null; digis_username: string | null } | null };

  // Build destination URL — always go to Digis shows
  const dest = new URL(`${DIGIS_BASE_URL}/shows`);

  if (model?.affiliate_code) {
    dest.searchParams.set("ref", model.affiliate_code);

    // Log the affiliate click
    try {
      const headersList = await headers();
      const userAgent = headersList.get("user-agent") || null;
      const referrer = headersList.get("referer") || null;
      const forwardedFor = headersList.get("x-forwarded-for");
      const realIP = headersList.get("x-real-ip");
      const ip = forwardedFor?.split(",")[0] || realIP || "unknown";
      const ipHash = hashIP(ip);
      const visitorId = request.cookies.get("exa_visitor_id")?.value || null;

      const { data: click } = await adminClient
        .from("affiliate_clicks")
        .insert({
          model_id: model.id,
          visitor_id: visitorId,
          ip_hash: ipHash,
          user_agent: userAgent?.slice(0, 500),
          referrer: referrer?.slice(0, 500),
          source: "digis_shows_redirect",
        })
        .select("id")
        .single();

      if (click?.id) {
        dest.searchParams.set("aff_sid", click.id);

        // Set affiliate attribution cookie and visitor ID
        const response = NextResponse.redirect(dest.toString(), { status: 302 });

        response.cookies.set(
          "exa_affiliate",
          JSON.stringify({
            modelId: model.id,
            affiliateCode: model.affiliate_code,
            clickId: click.id,
            timestamp: Date.now(),
          }),
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          }
        );

        if (!visitorId) {
          response.cookies.set("exa_visitor_id", crypto.randomUUID(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 365 * 24 * 60 * 60,
            path: "/",
          });
        }

        return response;
      }
    } catch {
      // Non-fatal — still redirect even if click logging fails
    }
  }

  return NextResponse.redirect(dest.toString(), { status: 302 });
}
