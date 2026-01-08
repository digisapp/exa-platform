import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

// Hash IP address for privacy
function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

// POST - Track affiliate click
export async function POST(request: NextRequest) {
  try {
    const { affiliateCode, eventId, source } = await request.json();

    if (!affiliateCode) {
      return NextResponse.json({ error: "Affiliate code required" }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find the model by affiliate code
    const { data: model } = await adminClient
      .from("models")
      .select("id")
      .eq("affiliate_code", affiliateCode)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Invalid affiliate code" }, { status: 404 });
    }

    // Get request headers for tracking
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || null;
    const referrer = headersList.get("referer") || null;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIP = headersList.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIP || "unknown";
    const ipHash = hashIP(ip);

    // Generate a visitor ID from the cookie or create one
    const visitorId = request.cookies.get("exa_visitor_id")?.value || null;

    // Insert the click record
    const { data: click, error } = await adminClient
      .from("affiliate_clicks")
      .insert({
        model_id: model.id,
        event_id: eventId || null,
        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: userAgent?.slice(0, 500), // Limit length
        referrer: referrer?.slice(0, 500),
        source: source || "unknown",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error tracking affiliate click:", error);
      throw error;
    }

    // Set a cookie with the affiliate info for attribution
    const response = NextResponse.json({ success: true, clickId: click.id });

    // Store the click info in a cookie for later attribution (7 day expiry)
    response.cookies.set("exa_affiliate", JSON.stringify({
      modelId: model.id,
      affiliateCode,
      eventId: eventId || null,
      clickId: click.id,
      timestamp: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Also set/renew the visitor ID cookie
    if (!visitorId) {
      const newVisitorId = crypto.randomUUID();
      response.cookies.set("exa_visitor_id", newVisitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Affiliate tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track affiliate click" },
      { status: 500 }
    );
  }
}

// GET - Get affiliate stats for a model
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the model's ID
    const { data: model } = await supabase
      .from("models")
      .select("id, affiliate_code")
      .eq("user_id", user.id)
      .single() as { data: { id: string; affiliate_code: string } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get click count
    const { count: clickCount } = await supabase
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("model_id", model.id);

    // Get commission stats
    const { data: commissions } = await supabase
      .from("affiliate_commissions")
      .select("status, commission_amount_cents")
      .eq("model_id", model.id) as { data: { status: string; commission_amount_cents: number }[] | null };

    const stats = {
      affiliateCode: model.affiliate_code,
      totalClicks: clickCount || 0,
      pendingCommissions: 0,
      confirmedCommissions: 0,
      paidCommissions: 0,
    };

    if (commissions) {
      for (const c of commissions) {
        if (c.status === "pending") {
          stats.pendingCommissions += c.commission_amount_cents;
        } else if (c.status === "confirmed") {
          stats.confirmedCommissions += c.commission_amount_cents;
        } else if (c.status === "paid") {
          stats.paidCommissions += c.commission_amount_cents;
        }
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Get affiliate stats error:", error);
    return NextResponse.json(
      { error: "Failed to get affiliate stats" },
      { status: 500 }
    );
  }
}
