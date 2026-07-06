import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const SUPPORTED_LANGUAGES = ["en", "es"] as const;

// Persist the user's UI language choice so server-sent messages (emails, SMS)
// arrive in the language they actually use. Called fire-and-forget by the
// i18n provider whenever the user flips the language toggle.
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const language = body?.language;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    // A user can have a fan row, a model row, or both (fan→model conversion);
    // update whichever exist so every notification path sees the same choice.
    const adminClient = createServiceRoleClient();
    await Promise.all([
      (adminClient.from("fans") as any)
        .update({ preferred_language: language })
        .eq("user_id", user.id),
      (adminClient.from("models") as any)
        .update({ preferred_language: language })
        .eq("user_id", user.id),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update language error:", error);
    return NextResponse.json({ error: "Failed to update language" }, { status: 500 });
  }
}
