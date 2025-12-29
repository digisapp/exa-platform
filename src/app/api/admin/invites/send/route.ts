import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendModelInviteEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

// Send invite emails to models
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
    const { modelIds, sendAll } = body;

    let modelsToInvite: { id: string; email: string; first_name: string; invite_token: string }[] = [];

    if (sendAll) {
      // Get all models with invite tokens who haven't been invited yet and haven't claimed
      const { data: models, error } = await (supabase
        .from("models") as any)
        .select("id, email, first_name, invite_token")
        .not("invite_token", "is", null)
        .is("user_id", null)
        .is("invite_sent_at", null)
        .not("email", "is", null)
        .limit(100); // Limit to 100 per batch to avoid timeout

      if (error) throw error;
      modelsToInvite = models || [];
    } else if (modelIds && Array.isArray(modelIds)) {
      // Get specific models
      const { data: models, error } = await (supabase
        .from("models") as any)
        .select("id, email, first_name, invite_token")
        .in("id", modelIds)
        .not("invite_token", "is", null)
        .is("user_id", null);

      if (error) throw error;
      modelsToInvite = models || [];
    } else {
      return NextResponse.json(
        { error: "Must provide modelIds array or sendAll: true" },
        { status: 400 }
      );
    }

    if (modelsToInvite.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No models to invite",
      });
    }

    // Filter out models without valid emails
    modelsToInvite = modelsToInvite.filter(m =>
      m.email &&
      m.email.includes("@") &&
      m.invite_token
    );

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send emails with small delay between each to avoid rate limits
    for (const model of modelsToInvite) {
      const claimUrl = `${BASE_URL}/claim/${model.invite_token}`;

      const result = await sendModelInviteEmail({
        to: model.email,
        modelName: model.first_name || "Model",
        claimUrl,
      });

      if (result.success) {
        // Update invite_sent_at
        await (supabase.from("models") as any)
          .update({ invite_sent_at: new Date().toISOString() })
          .eq("id", model.id);
        sent++;
      } else {
        failed++;
        errors.push(`${model.email}: ${result.error}`);
      }

      // Small delay to avoid rate limits (Resend allows 10/sec on free tier)
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: modelsToInvite.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Only return first 10 errors
      hasMore: sendAll && modelsToInvite.length === 100,
    });
  } catch (error) {
    console.error("Send invites error:", error);
    return NextResponse.json(
      { error: "Failed to send invites" },
      { status: 500 }
    );
  }
}

// Get count of models pending invite
export async function GET() {
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

    // Count models that can be invited
    const { count: pendingCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("invite_token", "is", null)
      .is("user_id", null)
      .is("invite_sent_at", null)
      .not("email", "is", null);

    // Count models that have been invited but not claimed
    const { count: invitedCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("invite_token", "is", null)
      .is("user_id", null)
      .not("invite_sent_at", "is", null);

    // Count models that have claimed
    const { count: claimedCount } = await (supabase
      .from("models") as any)
      .select("id", { count: "exact", head: true })
      .not("user_id", "is", null);

    return NextResponse.json({
      pending: pendingCount || 0,
      invited: invitedCount || 0,
      claimed: claimedCount || 0,
    });
  } catch (error) {
    console.error("Get invite stats error:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
