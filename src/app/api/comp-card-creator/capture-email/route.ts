import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(254),
  first_name: z.string().min(1).max(100),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  instagram: z.string().max(100).optional(),
  website: z.string().max(200).optional(),
  height: z.string().max(20).optional(),
  bust: z.string().max(20).optional(),
  waist: z.string().max(20).optional(),
  hips: z.string().max(20).optional(),
  eye_color: z.string().max(50).optional(),
  hair_color: z.string().max(50).optional(),
  dress_size: z.string().max(20).optional(),
  shoe_size: z.string().max(20).optional(),
  export_type: z.enum(["pdf", "jpeg"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please enter a valid email" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createServiceRoleClient();
    const email = parsed.data.email.toLowerCase().trim();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const profileFields = {
      first_name: parsed.data.first_name.trim(),
      last_name: parsed.data.last_name?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      instagram: parsed.data.instagram?.trim() || null,
      website: parsed.data.website?.trim() || null,
      height: parsed.data.height?.trim() || null,
      bust: parsed.data.bust?.trim() || null,
      waist: parsed.data.waist?.trim() || null,
      hips: parsed.data.hips?.trim() || null,
      eye_color: parsed.data.eye_color?.trim() || null,
      hair_color: parsed.data.hair_color?.trim() || null,
      dress_size: parsed.data.dress_size?.trim() || null,
      shoe_size: parsed.data.shoe_size?.trim() || null,
      export_type: parsed.data.export_type || null,
    };

    // If email already exists — update profile and increment download_count
    const { data: existing } = await supabase
      .from("comp_card_leads")
      .select("id, download_count")
      .eq("email", email)
      .single();

    if (existing) {
      await supabase
        .from("comp_card_leads")
        .update({
          ...profileFields,
          download_count: (existing.download_count || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      const { error } = await supabase
        .from("comp_card_leads")
        .insert({
          email,
          ip_address: ip,
          download_count: 1,
          ...profileFields,
        });

      if (error) {
        console.error("Lead capture error:", error);
        return NextResponse.json(
          { error: "Something went wrong" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead capture error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
