import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const submitSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email is required").max(200),
  phone: z.string().max(50).optional().nullable(),
  instagram_handle: z.string().max(100).optional().nullable(),
  media_company: z.string().max(200).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "general");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const parsed = submitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, phone, instagram_handle, media_company, message } = parsed.data;

    const { createServiceRoleClient } = await import("@/lib/supabase/service");
    const adminClient: any = createServiceRoleClient();

    // Check for duplicate by email
    const { data: existing } = await adminClient
      .from("media_contacts")
      .select("id")
      .ilike("email", email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A submission with this email already exists." },
        { status: 400 }
      );
    }

    const { error } = await adminClient.from("media_contacts").insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      instagram_handle: instagram_handle?.trim() || null,
      media_company: media_company?.trim() || null,
      notes: message?.trim() || null,
      status: "new",
    });

    if (error) {
      console.error("Media submit error:", error);
      return NextResponse.json(
        { error: "Failed to submit. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
