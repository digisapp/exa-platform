import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

export const GET = withAuth(
  async () => {
    const service: any = createServiceRoleClient();
    const { data: leads, error } = await service
      .from("comp_card_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ leads: leads || [] });
  },
  { requireType: "admin" }
);
