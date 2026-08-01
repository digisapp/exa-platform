import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";

export const GET = withAuth(
  async () => {
    const service: any = createServiceRoleClient();
    const { data: inquiries, error } = await service
      .from("booking_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({ inquiries: inquiries || [] });
  },
  { requireType: "admin" }
);

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "booked", "closed"]),
});

export const PATCH = withAuth(
  async ({ request }) => {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const service: any = createServiceRoleClient();
    const { error } = await service
      .from("booking_inquiries")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
