import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
});

// Auto-confirm a user's email address (skips email verification step)
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();

    // Find user by email using admin API
    const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const user = userList?.users?.find(
      (u) => u.email?.toLowerCase() === parsed.data.email
    );

    if (!user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ success: true });
    }

    if (!user.email_confirmed_at) {
      await adminClient.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auto-confirm error:", error);
    return NextResponse.json({ success: true }); // Don't reveal errors
  }
}
