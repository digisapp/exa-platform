import { NextResponse } from "next/server";
import { sendGigApplicationAcceptedEmail } from "@/lib/email";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";

// Rejection emails are intentionally unsupported: EXA never sends application
// rejections (bad brand perception). Only positive touchpoints go out here.
const sendGigEmailSchema = z.object({
  type: z.enum(["accepted"]),
  to: z.string().trim().email(),
  modelName: z.string().trim().min(1).max(200),
  gigTitle: z.string().trim().min(1).max(500),
  gigDate: z.string().trim().max(100).optional().nullable(),
  gigLocation: z.string().trim().max(500).optional().nullable(),
  eventName: z.string().trim().max(200).optional().nullable(),
});

// Send gig application email (server-side only)
export const POST = withAuth(
  async ({ request }) => {
    const parsed = sendGigEmailSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { to, modelName, gigTitle, gigDate, gigLocation, eventName } = parsed.data;

    await sendGigApplicationAcceptedEmail({
      to,
      modelName,
      gigTitle,
      gigDate: gigDate ?? undefined,
      gigLocation: gigLocation ?? undefined,
      eventName: eventName ?? undefined,
    });

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
