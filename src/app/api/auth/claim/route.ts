import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Validate token and return model data
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const token = request.nextUrl.searchParams.get("token");

    if (!token || !UUID_REGEX.test(token)) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("models")
      .select("id, email, username, first_name, last_name, profile_photo_url, claimed_at, user_id")
      .eq("invite_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 404 }
      );
    }

    if (data.claimed_at || data.user_id) {
      return NextResponse.json(
        { error: "This profile has already been claimed" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      model: {
        id: data.id,
        email: data.email,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        profile_photo_url: data.profile_photo_url,
      },
    });
  } catch (error) {
    console.error("Claim validate error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// POST: Claim the profile
const claimSchema = z.object({
  token: z.string().regex(UUID_REGEX, "Invalid token"),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = claimSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, username, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();

    // Fetch model by token (service role bypasses RLS)
    const { data: model, error: fetchError } = await adminClient
      .from("models")
      .select("id, email, first_name, username, claimed_at, user_id")
      .eq("invite_token", token)
      .single();

    if (fetchError || !model) {
      return NextResponse.json(
        { error: "Invalid or expired invite link" },
        { status: 404 }
      );
    }

    if (model.claimed_at || model.user_id) {
      return NextResponse.json(
        { error: "This profile has already been claimed" },
        { status: 410 }
      );
    }

    // Check username availability (skip if same as current)
    if (normalizedUsername !== model.username?.toLowerCase()) {
      const { data: existing } = await adminClient
        .from("models")
        .select("id")
        .eq("username", normalizedUsername)
        .neq("id", model.id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
    }

    // Create auth account using admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: model.email,
      password,
      email_confirm: true,
      user_metadata: { model_id: model.id },
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in instead." },
          { status: 409 }
        );
      }
      console.error("Auth create error:", authError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Update the existing actor record with the new user_id
    const { error: actorUpdateError } = await adminClient
      .from("actors")
      .update({ user_id: userId })
      .eq("id", model.id);

    if (actorUpdateError) {
      console.error("Actor update error:", actorUpdateError);
      // If actor doesn't exist or can't be updated, try insert
      const { error: actorInsertError } = await adminClient
        .from("actors")
        .insert({ id: model.id, user_id: userId, type: "model" });

      if (actorInsertError) {
        console.error("Actor insert error:", actorInsertError);
      }
    }

    // Update model with user_id, username, and claimed_at
    const { error: updateError } = await adminClient
      .from("models")
      .update({
        user_id: userId,
        username: normalizedUsername,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", model.id);

    if (updateError) {
      console.error("Model update error:", updateError);
      return NextResponse.json(
        { error: "Failed to claim profile" },
        { status: 500 }
      );
    }

    // Create fan record (non-blocking)
    try {
      await adminClient.from("fans").upsert({
        user_id: userId,
        email: model.email,
        display_name: model.first_name || normalizedUsername,
        coin_balance: 0,
      }, { onConflict: "user_id" });
    } catch {
      // Non-blocking
    }

    // Send confirmation email (non-blocking)
    try {
      const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";
      await fetch(`${origin}/api/auth/send-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: model.email,
          displayName: model.first_name || normalizedUsername,
          signupType: "model",
        }),
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      email: model.email,
    });
  } catch (error) {
    console.error("Claim error:", error);
    return NextResponse.json(
      { error: "Failed to claim profile" },
      { status: 500 }
    );
  }
}
