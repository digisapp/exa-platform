import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

export const GET = withAuth(
  async ({ supabase }) => {
    // Fetch all reserved usernames
    const { data: usernames, error } = await supabase
      .from("reserved_usernames")
      .select("*")
      .order("username", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ usernames: usernames || [] });
  },
  { requireType: "admin", rateLimit: "general" }
);
