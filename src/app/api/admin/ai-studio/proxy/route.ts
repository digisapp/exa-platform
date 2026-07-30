import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/ai-studio/proxy?url=...
 * Proxies a download from imgen.x.ai to avoid CORS issues.
 */
export const GET = withAuth(
  async ({ request }) => {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Only allow proxying from x.ai or supabase storage domains
    const parsed = new URL(url);
    const allowedDomains = [".x.ai", ".supabase.co", ".fal.media", "fal.media"];
    if (!allowedDomains.some((d) => parsed.hostname.endsWith(d))) {
      return NextResponse.json({ error: "Invalid URL domain" }, { status: 400 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "attachment",
      },
    });
  },
  { requireType: "admin", rateLimit: "uploads" }
);
