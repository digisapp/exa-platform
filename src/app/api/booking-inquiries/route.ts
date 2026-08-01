import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  sendBookingInquiryTeamEmail,
  sendBookingInquiryConfirmationEmail,
} from "@/lib/email";
import { logger } from "@/lib/logger";

// Public "Book" inquiries from /models and model profiles — no account
// required. Leads are team-mediated: stored for the admin dashboard and
// emailed to team@examodels.com; the model is deliberately NOT notified.
// Same lead-form conventions as /api/tour/apply (zod + rate limit + dedupe +
// service-role insert), plus a honeypot since this form is shared publicly.

const inquirySchema = z.object({
  modelId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required").max(200),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  inquiryType: z.enum(["photoshoot", "runway", "event", "campaign", "content", "other"]),
  eventDate: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(200).optional().nullable(),
  budgetRange: z.enum(["under_1k", "1k_5k", "5k_15k", "15k_plus", "discuss"]).optional().nullable(),
  details: z.string().trim().max(3000).optional().nullable(),
  source: z.enum(["card", "profile", "explore_header"]).optional().nullable(),
  // Honeypot — hidden offscreen input real users never see. Bots fill it.
  website: z.string().max(500).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "leads");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parsed = inquirySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const email = input.email.toLowerCase().trim();

    // Honeypot tripped: pretend success so the bot learns nothing.
    if (input.website) {
      return NextResponse.json({ success: true });
    }

    const adminClient: any = createServiceRoleClient();

    // Resolve + validate the model (also snapshots the username so the lead
    // stays readable if she renames). Only approved, live models are bookable.
    let modelUsername: string | null = null;
    if (input.modelId) {
      const { data: model } = await adminClient
        .from("models")
        .select("id, username, is_approved, deleted_at")
        .eq("id", input.modelId)
        .single();

      if (!model || !model.is_approved || model.deleted_at) {
        return NextResponse.json(
          { error: "This model isn't accepting inquiries right now." },
          { status: 404 }
        );
      }
      modelUsername = model.username;
    }

    // Dedupe: same inquirer + same model within 24h — absorb the double
    // submit rather than paging the team twice.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let dupeQuery = adminClient
      .from("booking_inquiries")
      .select("id")
      .ilike("email", email)
      .gte("created_at", since);
    dupeQuery = input.modelId
      ? dupeQuery.eq("model_id", input.modelId)
      : dupeQuery.is("model_id", null);
    const { data: existing } = await dupeQuery.maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }

    const { error: insertError } = await adminClient.from("booking_inquiries").insert({
      model_id: input.modelId || null,
      model_username: modelUsername,
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      company: input.company?.trim() || null,
      inquiry_type: input.inquiryType,
      event_date: input.eventDate?.trim() || null,
      location: input.location?.trim() || null,
      budget_range: input.budgetRange || null,
      details: input.details?.trim() || null,
      source: input.source || null,
      status: "new",
    });

    if (insertError) {
      logger.error("Booking inquiry insert error", insertError);
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    // Emails are best-effort — the lead is already stored and visible in
    // /admin/booking-inquiries even if Resend hiccups.
    const emailInput = {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      company: input.company?.trim() || null,
      modelUsername,
      inquiryType: input.inquiryType,
      eventDate: input.eventDate?.trim() || null,
      location: input.location?.trim() || null,
      budgetRange: input.budgetRange || null,
      details: input.details?.trim() || null,
      source: input.source || null,
    };
    await Promise.allSettled([
      sendBookingInquiryTeamEmail(emailInput),
      sendBookingInquiryConfirmationEmail(emailInput),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Booking inquiry error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
