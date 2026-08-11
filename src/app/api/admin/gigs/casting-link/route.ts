import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";

// Create (or fetch) the shareable client casting link for a gig. The token is
// service-role-only in the DB; admins get it through this route and share
// /casting/[token] with outside clients.
export const POST = withAuth(
  async ({ request }) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { gigId } = body || {};
    if (typeof gigId !== "string" || !gigId) {
      return NextResponse.json({ error: "Missing gigId" }, { status: 400 });
    }

    const service = createServiceRoleClient() as any;

    const { data: gig } = await service
      .from("gigs")
      .select("id")
      .eq("id", gigId)
      .single();
    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    let { data: link } = await service
      .from("gig_casting_links")
      .select("token")
      .eq("gig_id", gigId)
      .single();

    if (!link) {
      const { data: created, error } = await service
        .from("gig_casting_links")
        .insert({ gig_id: gigId })
        .select("token")
        .single();
      if (error || !created) {
        console.error("casting link create failed:", error);
        return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
      }
      link = created;
    }

    return NextResponse.json({ token: link.token });
  },
  { requireType: "admin", rateLimit: "general" }
);
