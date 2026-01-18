import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail as sendCustomPasswordResetEmail } from "@/lib/email";

// Admin client to bypass RLS
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const body = await request.json();
    const {
      name,
      email,
      instagram_username,
      tiktok_username,
      phone,
      date_of_birth,
      height,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!instagram_username?.trim() && !tiktok_username?.trim()) {
      return NextResponse.json(
        { error: "Please provide at least one social media handle" },
        { status: 400 }
      );
    }

    // Age validation
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

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedInstagram = instagram_username?.replace("@", "").trim().toLowerCase();

    // Check for Instagram duplicate in existing models (claimed accounts only)
    if (normalizedInstagram) {
      const { data: existingModelByInsta } = await (adminClient
        .from("models") as any)
        .select("id, email, user_id")
        .ilike("instagram_name", normalizedInstagram)
        .not("user_id", "is", null)  // Only check claimed models
        .single();

      if (existingModelByInsta && existingModelByInsta.email?.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: "This Instagram handle is already registered with a different email. Please use the email associated with your Instagram, or contact support." },
          { status: 400 }
        );
      }

      // Check for Instagram duplicate in pending applications
      const { data: existingAppByInsta } = await (adminClient
        .from("model_applications") as any)
        .select("id, email")
        .ilike("instagram_username", normalizedInstagram)
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
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      // User already exists - check if they have a pending application
      const { data: existingApp } = await (adminClient
        .from("model_applications") as any)
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
      const { data: existingModel } = await (adminClient
        .from("models") as any)
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
      const wasImported = await createFanAndApplication(
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
        message: wasImported
          ? "Welcome back! Please check your email to confirm your account."
          : "Application submitted! Please check your email to confirm your account.",
        isImported: wasImported,
      });
    }

    // Step 1: Create new auth user
    const supabase = await createClient();
    const tempPassword = Math.random().toString(36).slice(-12) + "Aa1!";

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
      return NextResponse.json(
        { error: "This email is already registered. Please check your email for confirmation link." },
        { status: 400 }
      );
    }

    // Step 2: Create fan profile and application using admin client
    const wasImported = await createFanAndApplication(
      authData.user.id,
      normalizedEmail,
      name.trim(),
      instagram_username,
      tiktok_username,
      phone,
      date_of_birth,
      height
    );

    // Step 3: Send custom confirmation email via Resend (if not imported - imported models get password reset email)
    if (!wasImported) {
      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";
        const redirectUrl = `${origin}/auth/callback?type=signup`;

        // Generate confirmation link
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: normalizedEmail,
          options: {
            redirectTo: redirectUrl,
          },
        });

        // Send custom email via Resend
        if (linkData?.properties?.action_link) {
          const { sendEmailConfirmationEmail } = await import("@/lib/email");
          await sendEmailConfirmationEmail({
            to: normalizedEmail,
            confirmUrl: linkData.properties.action_link,
            displayName: name.trim(),
            signupType: "model",
          });
        }
      } catch (emailError) {
        // Non-blocking - Supabase's email is a backup
        console.error("Failed to send custom confirmation email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: wasImported
        ? "Welcome back! Please check your email to confirm your account."
        : "Application submitted! Please check your email to confirm your account.",
      isImported: wasImported,
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
  instagramUsername: string | null,
  tiktokUsername: string | null,
  phone: string | null,
  dateOfBirth: string | null,
  height: string | null
): Promise<boolean> {
  // Check for existing model record with this email (from imports)
  const { data: existingModel } = await (adminClient
    .from("models") as any)
    .select("id, user_id, is_approved")
    .eq("email", email)
    .is("user_id", null)
    .single();

  if (existingModel) {
    // Link the existing model to this user
    await (adminClient.from("models") as any)
      .update({ user_id: userId, claimed_at: new Date().toISOString() })
      .eq("id", existingModel.id);

    // Check/create actor record
    const { data: existingActor } = await (adminClient
      .from("actors") as any)
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingActor) {
      await (adminClient.from("actors") as any)
        .insert({ user_id: userId, type: "model" });
    } else {
      await (adminClient.from("actors") as any)
        .update({ type: "model" })
        .eq("user_id", userId);
    }

    // Send password reset email so they can set their own password after confirming
    await sendPasswordResetEmailForImportedModel(email);

    return true; // Was imported model
  }

  // Create actor record
  const { data: actor } = await (adminClient
    .from("actors") as any)
    .upsert({ user_id: userId, type: "fan" }, { onConflict: "user_id" })
    .select()
    .single();

  const actorId = actor?.id;

  if (!actorId) {
    throw new Error("Failed to create actor record");
  }

  // Create fan profile
  await (adminClient.from("fans") as any)
    .upsert({
      id: actorId,
      user_id: userId,
      email: email,
      display_name: displayName,
      coin_balance: 10,
    }, { onConflict: "user_id" });

  // Record welcome bonus
  await (adminClient.from("coin_transactions") as any)
    .insert({
      actor_id: actorId,
      amount: 10,
      action: "signup_bonus",
      metadata: { reason: "Welcome bonus for new signup" },
    });

  // Check for existing application
  const { data: existingApp } = await (adminClient
    .from("model_applications") as any)
    .select("id")
    .eq("user_id", userId)
    .neq("status", "rejected")
    .single();

  if (existingApp) {
    return false; // Already has an application, not imported
  }

  // Create model application
  await (adminClient.from("model_applications") as any)
    .insert({
      user_id: userId,
      fan_id: actorId,
      display_name: displayName,
      email: email,
      instagram_username: instagramUsername?.replace("@", "").trim() || null,
      tiktok_username: tiktokUsername?.replace("@", "").trim() || null,
      phone: phone?.trim() || null,
      date_of_birth: dateOfBirth || null,
      height: height || null,
      status: "pending",
    });

  return false; // New application, not imported
}
