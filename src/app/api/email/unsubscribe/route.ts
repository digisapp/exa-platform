import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit (unauthenticated - IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the unsubscribe function
    const { data: rpcData, error } = await supabase.rpc("unsubscribe_email", {
      p_token: token,
      p_unsubscribe_all: true,
    });
    const data = rpcData as Record<string, any> | null;

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }

    if (!data?.success) {
      return NextResponse.json(
        { error: data?.error || "Invalid token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: data.email,
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
