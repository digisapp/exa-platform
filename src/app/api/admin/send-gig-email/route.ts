import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendGigApplicationAcceptedEmail, sendGigApplicationRejectedEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Send gig application email (server-side only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { type, to, modelName, gigTitle, gigDate, gigLocation, eventName } = body;

    if (!type || !to || !modelName || !gigTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (type === "accepted") {
      await sendGigApplicationAcceptedEmail({
        to,
        modelName,
        gigTitle,
        gigDate,
        gigLocation,
        eventName,
      });
    } else if (type === "rejected") {
      await sendGigApplicationRejectedEmail({
        to,
        modelName,
        gigTitle,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid email type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send gig email error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
