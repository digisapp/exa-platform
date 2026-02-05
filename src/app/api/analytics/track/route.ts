import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Bot/crawler patterns to filter out
const BOT_PATTERNS = /bot|crawler|spider|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|redditbot|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic|openai|ccbot|scrapy|wget|curl|python-requests|go-http-client|java|libwww|lwp|httpclient/i;

// Detect device type from user agent
function getDeviceType(userAgent: string): string {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) return "mobile";
  return "desktop";
}

// Parse browser from user agent
function getBrowser(userAgent: string): string {
  if (/edg/i.test(userAgent)) return "Edge";
  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return "Safari";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/opera|opr/i.test(userAgent)) return "Opera";
  return "Other";
}

// Parse OS from user agent
function getOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/macintosh|mac os/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent) && !/android/i.test(userAgent)) return "Linux";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  return "Other";
}

// Determine page type from path
function getPageType(path: string): string {
  if (path === "/" || path === "") return "home";
  if (path === "/models") return "explore";
  if (path === "/gigs") return "gigs";
  if (path === "/dashboard") return "dashboard";
  if (path === "/settings") return "settings";
  if (path === "/chats" || path.startsWith("/chats/")) return "chats";
  if (path === "/wallet" || path === "/coins") return "wallet";
  if (path === "/content") return "content";
  if (path === "/signin" || path === "/signup") return "auth";
  if (path === "/apply") return "apply";
  if (path.startsWith("/gigs/")) return "gig_detail";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/claim/")) return "claim";
  // Model profile pages - single segment paths that aren't reserved
  if (/^\/[a-zA-Z0-9_-]+$/.test(path)) return "profile";
  return "other";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      path,
      visitorId,
      sessionId,
      referrer,
      screenWidth,
      modelId,
      modelUsername,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!path || !visitorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user ID if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Get user agent and IP info from headers
    const userAgent = request.headers.get("user-agent") || "";

    // Filter out bots and crawlers
    if (BOT_PATTERNS.test(userAgent)) {
      return NextResponse.json({ success: true }); // Silently ignore bots
    }

    // Rate limit check (60 requests per minute per visitor)
    const rateLimitResponse = await checkEndpointRateLimit(request, "analytics", visitorId);
    if (rateLimitResponse) {
      // Return success to prevent client-side errors, but don't record
      return NextResponse.json({ success: true });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Hash IP for privacy (we don't store raw IPs)
    const ipHash = ip !== "unknown" ?
      Buffer.from(ip).toString("base64").slice(0, 16) : null;

    // Get country from Vercel's geo headers (available on Vercel Edge)
    const country = request.headers.get("x-vercel-ip-country") || null;
    const city = request.headers.get("x-vercel-ip-city") || null;

    const deviceType = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const os = getOS(userAgent);
    const pageType = getPageType(path);

    // Insert page view
    const { error } = await (supabase.from("page_views") as any).insert({
      page_path: path,
      page_type: pageType,
      model_id: modelId || null,
      model_username: modelUsername || null,
      visitor_id: visitorId,
      session_id: sessionId || null,
      user_id: user?.id || null,
      referrer: referrer || null,
      user_agent: userAgent.slice(0, 500), // Limit length
      ip_hash: ipHash,
      device_type: deviceType,
      browser,
      os,
      screen_width: screenWidth || null,
      country,
      city,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
    });

    if (error) {
      console.error("Failed to track page view:", error);
      return NextResponse.json({ error: "Failed to track" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics track error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
