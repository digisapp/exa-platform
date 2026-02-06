import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendGigApplicationAcceptedEmail, sendGigApplicationRejectedEmail, sendCreatorHouseAcceptedEmail } from "@/lib/email";

// Send gig application notification (chat message + email) - server-side only
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
    const {
      action,
      modelId,
      gigTitle,
      gigDate,
      gigLocation,
      eventName,
      // Creator House specific fields
      isCreatorHouse,
      applicationId,
      gigId,
      gigSlug,
    } = body;

    if (!action || !modelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Only send notifications for accepted applications
    // Rejections/cancellations are handled silently
    if (action !== "accepted") {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Use admin client to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get model's actor id and email
    const { data: modelRecord } = await (adminClient
      .from("models") as any)
      .select("user_id, email, first_name, username")
      .eq("id", modelId)
      .single();

    if (!modelRecord) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      );
    }

    const { data: modelActor } = await adminClient
      .from("actors")
      .select("id")
      .eq("user_id", modelRecord.user_id)
      .eq("type", "model")
      .single() as { data: { id: string } | null };

    // Send chat message if we have both actors
    if (modelActor) {
      // Find existing conversation or create new one
      let conversationId: string | null = null;

      // Check for existing conversation between admin and model
      const { data: existingConv } = await adminClient
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", actor.id) as { data: { conversation_id: string }[] | null };

      if (existingConv) {
        for (const cp of existingConv) {
          const { data: hasModel } = await adminClient
            .from("conversation_participants")
            .select("actor_id")
            .eq("conversation_id", cp.conversation_id)
            .eq("actor_id", modelActor.id)
            .single();
          if (hasModel) {
            conversationId = cp.conversation_id;
            break;
          }
        }
      }

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConv } = await (adminClient
          .from("conversations") as any)
          .insert({ type: "direct" })
          .select()
          .single();

        if (newConv) {
          conversationId = newConv.id;
          await (adminClient.from("conversation_participants") as any).insert([
            { conversation_id: conversationId, actor_id: actor.id },
            { conversation_id: conversationId, actor_id: modelActor.id },
          ]);
        }
      }

      // Send message
      if (conversationId) {
        const message = action === "accepted"
          ? `Congratulations! You've been accepted for "${gigTitle || "a gig"}". We'll be in touch with more details soon!`
          : action === "cancelled"
          ? `Your spot for "${gigTitle || "a gig"}" has been cancelled. If you have questions, please reach out to us.`
          : `Thank you for your interest in "${gigTitle || "a gig"}". Unfortunately, we weren't able to accept your application at this time. We encourage you to apply for future opportunities!`;

        await (adminClient.from("messages") as any).insert({
          conversation_id: conversationId,
          sender_id: actor.id,
          content: message,
          is_system: false,
        });
      }
    }

    // Send email notification
    if (modelRecord.email) {
      const modelName = modelRecord.first_name || modelRecord.username || "Model";

      if (action === "accepted") {
        // Check if this is a Creator House gig
        if (isCreatorHouse && applicationId && gigId && gigSlug) {
          await sendCreatorHouseAcceptedEmail({
            to: modelRecord.email,
            modelName,
            gigTitle: gigTitle || "Models Creator House",
            gigDate,
            gigLocation,
            applicationId,
            gigId,
            modelId,
            gigSlug,
          });
        } else {
          await sendGigApplicationAcceptedEmail({
            to: modelRecord.email,
            modelName,
            gigTitle: gigTitle || "a gig",
            gigDate,
            gigLocation,
            eventName,
          });
        }
      } else if (action === "rejected") {
        await sendGigApplicationRejectedEmail({
          to: modelRecord.email,
          modelName,
          gigTitle: gigTitle || "a gig",
        });
      }
      // Note: cancelled action doesn't send email, only chat message
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send gig notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
