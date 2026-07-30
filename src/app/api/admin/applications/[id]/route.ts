import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

export const PATCH = withAuth<{ id: string }>(
  async ({ request, params, supabase }) => {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabase
      .from("gig_applications")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
