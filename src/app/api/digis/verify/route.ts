import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const DIGIS_BASE_URL = "https://www.digis.cc";
const USERNAME_RE = /^[a-z0-9._-]{2,64}$/i;

// GET /api/digis/verify?username=foo
// Checks whether a Digis profile exists for the given username so the
// settings page can warn models about typos before fans hit a dead link.
// Digis returns HTTP 200 for every path (SPA), so existence is detected via
// the server-rendered og:title, which is "{username} Live on Digis" for real
// profiles and a generic site title otherwise.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "externalLookup", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase() || "";
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ status: "not_found" });
    }

    let body: string;
    try {
      const res = await fetch(`${DIGIS_BASE_URL}/${encodeURIComponent(username)}`, {
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "examodels.com digis-username-check" },
      });
      if (!res.ok) {
        return NextResponse.json({ status: "unknown" });
      }
      body = await res.text();
    } catch {
      // Digis unreachable/slow — don't block or mislead the model
      return NextResponse.json({ status: "unknown" });
    }

    const exists = body.toLowerCase().includes(`${username} live on digis`);
    return NextResponse.json({ status: exists ? "found" : "not_found" });
  } catch (error) {
    logger.error("Digis verify error", error);
    return NextResponse.json({ status: "unknown" });
  }
}
