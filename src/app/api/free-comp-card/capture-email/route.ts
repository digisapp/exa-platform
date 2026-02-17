import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(254),
  first_name: z.string().min(1).max(100),
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
    const firstName = parsed.data.first_name.trim();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    // Check if email already exists — if so, increment download_count
    const { data: existing } = await supabase
      .from("comp_card_leads")
      .select("id, download_count")
      .eq("email", email)
      .single();

    if (existing) {
      await supabase
        .from("comp_card_leads")
        .update({
          download_count: (existing.download_count || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      const { error } = await supabase
        .from("comp_card_leads")
        .insert({
          email,
          first_name: firstName,
          ip_address: ip,
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
