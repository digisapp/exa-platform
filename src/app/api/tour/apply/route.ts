import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { normalizeInstagramHandle } from "@/lib/instagram";
import { format } from "date-fns";

// Public designer/media applications for tour stops — no account required.
// Models apply through the normal gig flow (/gigs/[slug] + gig_applications).
// Media applicants are also mirrored into media_contacts so the standing
// press/photographer roster grows automatically.

const applySchema = z.object({
  gigId: z.string().uuid(),
  role: z.enum(["designer", "media"]),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required").max(200),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  instagram_handle: z.string().trim().max(100).optional().nullable(),
  website_url: z.string().trim().max(500).optional().nullable(),
  media_type: z.enum(["photographer", "videographer", "press_pr", "other"]).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
});

const MEDIA_TYPE_TITLES: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  press_pr: "Press / PR",
  other: "Media",
};

const MEDIA_TYPE_CATEGORIES: Record<string, string> = {
  photographer: "photography",
  videographer: "videography",
  press_pr: "news",
  other: "other",
};

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "general");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { gigId, role, name, phone, company, instagram_handle, website_url, media_type, message } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();

    const adminClient: any = createServiceRoleClient();

    const { data: gig } = await adminClient
      .from("gigs")
      .select("id, title, type, visibility, status, start_at")
      .eq("id", gigId)
      .single();

    if (
      !gig ||
      gig.type !== "tour" ||
      gig.visibility !== "public" ||
      !["open", "upcoming"].includes(gig.status)
    ) {
      return NextResponse.json(
        { error: "This show isn't accepting applications right now." },
        { status: 404 }
      );
    }

    const { data: existing } = await adminClient
      .from("tour_applications")
      .select("id")
      .eq("gig_id", gigId)
      .eq("role", role)
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyApplied: true });
    }

    const { error: insertError } = await adminClient.from("tour_applications").insert({
      gig_id: gigId,
      role,
      name: name.trim(),
      email,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      instagram_handle: normalizeInstagramHandle(instagram_handle),
      website_url: website_url?.trim() || null,
      media_type: role === "media" ? media_type || "other" : null,
      message: message?.trim() || null,
      status: "new",
    });

    if (insertError) {
      logger.error("Tour application insert error", insertError);
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    // Mirror media applicants into the standing media roster (best-effort —
    // the application itself already succeeded).
    if (role === "media") {
      try {
        const showDate = gig.start_at ? ` (${format(new Date(gig.start_at), "MMM d, yyyy")})` : "";
        const noteLine = `Tour application: ${gig.title}${showDate}`;
        const typeKey = media_type || "other";

        const { data: contact } = await adminClient
          .from("media_contacts")
          .select("id, notes, phone, instagram_handle, website_url, media_company")
          .ilike("email", email)
          .maybeSingle();

        if (contact) {
          await adminClient
            .from("media_contacts")
            .update({
              phone: contact.phone || phone?.trim() || null,
              instagram_handle: contact.instagram_handle || normalizeInstagramHandle(instagram_handle),
              website_url: contact.website_url || website_url?.trim() || null,
              media_company: contact.media_company || company?.trim() || null,
              notes: contact.notes ? `${contact.notes}\n${noteLine}` : noteLine,
            })
            .eq("id", contact.id);
        } else {
          await adminClient.from("media_contacts").insert({
            name: name.trim(),
            email,
            phone: phone?.trim() || null,
            instagram_handle: normalizeInstagramHandle(instagram_handle),
            website_url: website_url?.trim() || null,
            media_company: company?.trim() || null,
            title: MEDIA_TYPE_TITLES[typeKey],
            category: MEDIA_TYPE_CATEGORIES[typeKey],
            notes: message?.trim() ? `${noteLine}\n"${message.trim()}"` : noteLine,
            status: "new",
          });
        }
      } catch (rosterError) {
        logger.error("Tour media roster sync error", rosterError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Tour apply error", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
