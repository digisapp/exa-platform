import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail as sendCustomPasswordResetEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { escapeIlike } from "@/lib/utils";
import { z } from "zod";

// Zod schema for model signup validation
const modelSignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").trim(),
  email: z.string().email("Invalid email address").max(254, "Email is too long").toLowerCase().trim(),
  instagram_username: z.string().max(30, "Instagram username is too long").optional().nullable(),
  tiktok_username: z.string().max(24, "TikTok username is too long").optional().nullable(),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  height: z.string().max(10, "Height is too long").optional().nullable(),
}).refine(
  (data) => data.instagram_username?.trim() || data.tiktok_username?.trim(),
  { message: "Please provide at least one social media handle", path: ["instagram_username"] }
);

// Admin client to bypass RLS
const adminClient = createServiceRoleClient();

// Helper to extract Instagram username from URL or handle
function extractInstagramUsername(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;

  let username = input.trim();

  // Remove URL prefixes (handles various Instagram URL formats)
  username = username
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split("/")[0]  // Remove trailing paths like /reels, /posts, etc.
    .split("?")[0]  // Remove query params
    .toLowerCase()
    .trim();

  return username || null;
}

// Helper to extract TikTok username from URL or handle
function extractTikTokUsername(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;

  let username = input.trim();

  // Remove URL prefixes (handles various TikTok URL formats)
  username = username
    .replace(/^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\/@?/i, "")
    .replace(/^(www\.)?(tiktok\.com|vm\.tiktok\.com)\/@?/i, "")
    .replace(/^@/, "")
    .split("/")[0]  // Remove trailing paths
    .split("?")[0]  // Remove query params
    .toLowerCase()
    .trim();

  return username || null;
}

// Helper to send password reset for imported models via Resend
async function sendPasswordResetEmailForImportedModel(email: string) {
  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";

    // Generate the reset link using admin API (doesn't send email)
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${origin}/auth/reset-password`,
      },
    });

    if (error) {
      console.error("Generate link error:", error);
      return false;
    }

    // Send our custom email via Resend
    if (data?.properties?.action_link) {
      const emailResult = await sendCustomPasswordResetEmail({
        to: email,
        resetUrl: data.properties.action_link,
      });

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Password reset email error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (unauthenticated endpoint - use IP)
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = modelSignupSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      instagram_username,
      tiktok_username,
      phone,
      date_of_birth,
      height,
    } = validationResult.data;

    // Age validation (if date_of_birth provided)
    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        return NextResponse.json(
          { error: "You must be at least 18 years old to apply" },
          { status: 400 }
        );
      }
    }

    const normalizedEmail = email; // Already normalized by Zod schema
    const normalizedInstagram = extractInstagramUsername(instagram_username);

    // Check for Instagram duplicate in existing models (claimed accounts only)
    if (normalizedInstagram) {
      const { data: existingModelByInsta } = await adminClient
        .from("models")
        .select("id, email, user_id")
        .ilike("instagram_handle", escapeIlike(normalizedInstagram))
        .not("user_id", "is", null)  // Only check claimed models
        .single();

      if (existingModelByInsta && existingModelByInsta.email?.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: "This Instagram handle is already registered with a different email. Please use the email associated with your Instagram, or contact support." },
          { status: 400 }
        );
      }

      // Check for Instagram duplicate in pending applications
      const { data: existingAppByInsta } = await adminClient
        .from("model_applications")
        .select("id, email")
        .ilike("instagram_username", escapeIlike(normalizedInstagram))
        .eq("status", "pending")
        .single();

      if (existingAppByInsta && existingAppByInsta.email?.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: "This Instagram handle already has a pending application with a different email." },
          { status: 400 }
        );
      }
    }

    // Check if email already exists in auth
    // Use generateLink as a probe - it only succeeds for existing users
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      // Auto-confirm email (no confirmation email needed)
      if (!existingUser.email_confirmed_at) {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          email_confirm: true,
        });
      }

      // User already exists - check if they have a pending application
      const { data: existingApp } = await adminClient
        .from("model_applications")
        .select("id, status")
        .eq("user_id", existingUser.id)
        .neq("status", "rejected")
        .single();

      if (existingApp) {
        return NextResponse.json({
          success: true,
          message: "Application already submitted",
          existing: true,
        });
      }

      // Check if they're already an approved model
      const { data: existingModel } = await adminClient
        .from("models")
        .select("id, is_approved")
        .eq("user_id", existingUser.id)
        .single();

      if (existingModel?.is_approved) {
        return NextResponse.json(
          { error: "This email is already registered as a model. Please sign in." },
          { status: 400 }
        );
      }

      // User exists but no application - create one
      await createFanAndApplication(
        existingUser.id,
        normalizedEmail,
        name.trim(),
        instagram_username,
        tiktok_username,
        phone,
        date_of_birth,
        height
      );

      return NextResponse.json({
        success: true,
        message: "Application submitted!",
      });
    }

    // Step 1: Create new auth user
    const supabase = await createClient();
    const tempPassword = crypto.randomBytes(16).toString("base64url") + "Aa1!";

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: tempPassword,
    });

    if (authError) {
      if (authError.message.includes("already registered") ||
          authError.message.includes("already been registered") ||
          authError.message.includes("Database error")) {
        return NextResponse.json(
          { error: "This email may already be registered. Try signing in instead." },
          { status: 400 }
        );
      }
      if (authError.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Too many attempts. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      throw authError;
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Check for duplicate signup (empty identities means existing unconfirmed user)
    if (authData.user.identities && authData.user.identities.length === 0) {
      // Auto-confirm the existing unconfirmed user so they can sign in
      await adminClient.auth.admin.updateUserById(authData.user.id, {
        email_confirm: true,
      });
      return NextResponse.json(
        { error: "This email is already registered. Please sign in instead." },
        { status: 400 }
      );
    }

    // Step 2: Auto-confirm email immediately (no confirmation email needed)
    await adminClient.auth.admin.updateUserById(authData.user.id, {
      email_confirm: true,
    });

    // Step 3: Create fan profile and application using admin client
    await createFanAndApplication(
      authData.user.id,
      normalizedEmail,
      name.trim(),
      instagram_username,
      tiktok_username,
      phone,
      date_of_birth,
      height
    );

    return NextResponse.json({
      success: true,
      message: "Application submitted!",
    });

  } catch (error) {
    console.error("Model signup error:", error);
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 }
    );
  }
}

async function createFanAndApplication(
  userId: string,
  email: string,
  displayName: string,
  instagramUsername: string | null | undefined,
  tiktokUsername: string | null | undefined,
  phone: string | null | undefined,
  dateOfBirth: string | null | undefined,
  height: string | null | undefined
): Promise<boolean> {
  // Check for existing model record with this email (from imports)
  const { data: existingModel } = await adminClient
    .from("models")
    .select("id, user_id, is_approved")
    .eq("email", email)
    .is("user_id", null)
    .single();

  if (existingModel) {
    // Link the existing model to this user and approve them
    await adminClient.from("models")
      .update({
        user_id: userId,
        claimed_at: new Date().toISOString(),
        is_approved: true, // Auto-approve when imported model claims account
      })
      .eq("id", existingModel.id);

    // Check/create actor record
    const { data: existingActor } = await adminClient
      .from("actors")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingActor) {
      await adminClient.from("actors")
        .insert({ user_id: userId, type: "model" });
    } else {
      await adminClient.from("actors")
        .update({ type: "model" })
        .eq("user_id", userId);
    }

    // Send password reset email so they can set their own password after confirming
    await sendPasswordResetEmailForImportedModel(email);

    return true; // Was imported model
  }

  // Create actor record
  const { data: actor } = await adminClient
    .from("actors")
    .upsert({ user_id: userId, type: "fan" }, { onConflict: "user_id" })
    .select()
    .single();

  const actorId = actor?.id;

  if (!actorId) {
    throw new Error("Failed to create actor record");
  }

  // Create fan profile
  await adminClient.from("fans")
    .upsert({
      id: actorId,
      user_id: userId,
      email: email,
      display_name: displayName,
      coin_balance: 10,
    }, { onConflict: "user_id" });

  // Record welcome bonus
  await adminClient.from("coin_transactions")
    .insert({
      actor_id: actorId,
      amount: 10,
      action: "signup_bonus",
      metadata: { reason: "Welcome bonus for new signup" },
    });

  // Check for existing application
  const { data: existingApp } = await adminClient
    .from("model_applications")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "rejected")
    .single();

  if (existingApp) {
    return false; // Already has an application, not imported
  }

  // Create model application
  await adminClient.from("model_applications")
    .insert({
      user_id: userId,
      fan_id: actorId,
      display_name: displayName,
      email: email,
      instagram_username: extractInstagramUsername(instagramUsername),
      tiktok_username: extractTikTokUsername(tiktokUsername),
      phone: phone?.trim() || null,
      date_of_birth: dateOfBirth || null,
      height: height || null,
      status: "pending",
    });

  return false; // New application, not imported
}
