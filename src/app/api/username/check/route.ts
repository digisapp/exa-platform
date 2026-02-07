import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reserveUsernameSchema = z.object({
  username: z.string().min(1),
  reason: z.string().min(1),
  reserved_for: z.string().nullish(),
  notes: z.string().nullish(),
});

// Reserved paths that conflict with app routes
const RESERVED_PATHS = [
  'signin', 'signup', 'models', 'gigs', 'dashboard', 'profile', 'messages',
  'leaderboard', 'admin', 'onboarding', 'brands', 'designers', 'media',
  'api', 'auth', '_next', 'favicon.ico', 'wallet', 'content', 'coins',
  'earnings', 'fan', 'opportunities', 'settings', 'notifications', 'search',
  'explore', 'trending', 'popular', 'new', 'hot', 'top', 'best', 'featured',
  'favorites', 'chats', 'claim', 'forgot-password', 'rates', 'book', 'booking',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.toLowerCase().trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Validate format
    if (username.length < 3) {
      return NextResponse.json({
        available: false,
        reason: "Username must be at least 3 characters",
      });
    }

    if (username.length > 30) {
      return NextResponse.json({
        available: false,
        reason: "Username must be 30 characters or less",
      });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({
        available: false,
        reason: "Username can only contain letters, numbers, and underscores",
      });
    }

    // Check reserved paths
    if (RESERVED_PATHS.includes(username)) {
      return NextResponse.json({
        available: false,
        reason: "This username is reserved",
      });
    }

    const supabase = await createClient();

    // Check reserved usernames table
    const { data: reserved } = await (supabase
      .from("reserved_usernames") as any)
      .select("reason")
      .eq("username", username)
      .single() as { data: { reason: string } | null };

    if (reserved) {
      const reasonMessages: Record<string, string> = {
        vip: "This username is reserved for VIP users",
        brand: "This username is reserved for brand protection",
        celebrity: "This username is reserved for verification",
        inappropriate: "This username is not allowed",
        system: "This username is reserved",
        held: "This username is currently held",
      };

      return NextResponse.json({
        available: false,
        reason: reasonMessages[reserved.reason] || "This username is reserved",
      });
    }

    // Check if username is already taken by a model
    const { data: existingModel } = await supabase
      .from("models")
      .select("id")
      .eq("username", username)
      .single();

    if (existingModel) {
      return NextResponse.json({
        available: false,
        reason: "This username is already taken",
      });
    }

    return NextResponse.json({
      available: true,
      reason: null,
    });
  } catch (error) {
    console.error("Username check error:", error);
    return NextResponse.json(
      { error: "Failed to check username" },
      { status: 500 }
    );
  }
}

// Admin endpoint to reserve a username
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reserveUsernameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { username, reason, reserved_for, notes } = parsed.data;

    const { error } = await (supabase
      .from("reserved_usernames") as any)
      .insert({
        username: username.toLowerCase().trim(),
        reason,
        reserved_for,
        notes,
        created_by: actor.id,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Username is already reserved" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reserve username error:", error);
    return NextResponse.json(
      { error: "Failed to reserve username" },
      { status: 500 }
    );
  }
}

// Admin endpoint to unreserve a username
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.toLowerCase().trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const { error } = await (supabase
      .from("reserved_usernames") as any)
      .delete()
      .eq("username", username);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unreserve username error:", error);
    return NextResponse.json(
      { error: "Failed to unreserve username" },
      { status: 500 }
    );
  }
}
