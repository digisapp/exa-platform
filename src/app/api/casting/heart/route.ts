import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Public, no-account endpoint: a client reviewing a casting link hearts the
// models they want. The unguessable share token IS the authorization — every
// write is validated against it, and the application must belong to that
// token's gig.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const rateLimited = await checkEndpointRateLimit(request, "game");
  if (rateLimited) return rateLimited;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, applicationId, liked } = body || {};
  if (
    typeof token !== "string" || !UUID_RE.test(token) ||
    typeof applicationId !== "string" || !UUID_RE.test(applicationId) ||
    typeof liked !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceRoleClient() as any;

  const { data: link } = await service
    .from("gig_casting_links")
    .select("gig_id")
    .eq("token", token)
    .single();
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: application } = await service
    .from("gig_applications")
    .select("id, gig_id")
    .eq("id", applicationId)
    .single();
  if (!application || application.gig_id !== link.gig_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (liked) {
    const { error } = await service
      .from("gig_casting_hearts")
      .upsert({ application_id: applicationId }, { onConflict: "application_id" });
    if (error) {
      console.error("casting heart insert failed:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
  } else {
    const { error } = await service
      .from("gig_casting_hearts")
      .delete()
      .eq("application_id", applicationId);
    if (error) {
      console.error("casting heart delete failed:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, liked });
}
