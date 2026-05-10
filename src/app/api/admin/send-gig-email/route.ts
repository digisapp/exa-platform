import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendGigApplicationAcceptedEmail, sendGigApplicationRejectedEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const sendGigEmailSchema = z.object({
  type: z.enum(["accepted", "rejected"]),
  to: z.string().trim().email(),
  modelName: z.string().trim().min(1).max(200),
  gigTitle: z.string().trim().min(1).max(500),
  gigDate: z.string().trim().max(100).optional().nullable(),
  gigLocation: z.string().trim().max(500).optional().nullable(),
  eventName: z.string().trim().max(200).optional().nullable(),
});

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

    const parsed = sendGigEmailSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { type, to, modelName, gigTitle, gigDate, gigLocation, eventName } = parsed.data;

    if (type === "accepted") {
      await sendGigApplicationAcceptedEmail({
        to,
        modelName,
        gigTitle,
        gigDate: gigDate ?? undefined,
        gigLocation: gigLocation ?? undefined,
        eventName: eventName ?? undefined,
      });
    } else {
      await sendGigApplicationRejectedEmail({
        to,
        modelName,
        gigTitle,
      });
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
