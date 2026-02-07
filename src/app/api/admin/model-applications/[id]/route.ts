import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendModelApprovalEmail } from "@/lib/email";
import { escapeIlike } from "@/lib/utils";

// Update model application status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { status } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get the application
    const { data: application, error: fetchError } = await (supabase
      .from("model_applications") as any)
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Update application status
    const { error: updateError } = await (supabase
      .from("model_applications") as any)
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: actor.id,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    // If approved, convert fan to model
    if (status === "approved") {
      // Use admin client to bypass RLS for actor updates
      const adminClient = createServiceRoleClient();

      // Check if model already exists by user_id
      const { data: existingModelByUser } = await (adminClient.from("models") as any)
        .select("id")
        .eq("user_id", application.user_id)
        .single();

      // Also check for existing model by Instagram username (might be imported with no user_id)
      // Use case-insensitive matching since Instagram usernames can vary in casing
      let existingModelByInstagram = null;
      if (application.instagram_username && !existingModelByUser) {
        const { data: igModel } = await (adminClient.from("models") as any)
          .select("id, username, user_id")
          .ilike("instagram_name", escapeIlike(application.instagram_username))
          .single();

        if (igModel && !igModel.user_id) {
          existingModelByInstagram = igModel;
        }
      }

      // Also check by email if no match yet (case-insensitive)
      let existingModelByEmail = null;
      if (!existingModelByUser && !existingModelByInstagram && application.email) {
        const { data: emailModel } = await (adminClient.from("models") as any)
          .select("id, username, user_id")
          .ilike("email", escapeIlike(application.email))
          .single();

        if (emailModel && !emailModel.user_id) {
          existingModelByEmail = emailModel;
        }
      }

      // Determine which existing model to link to
      const existingModel = existingModelByUser || existingModelByInstagram || existingModelByEmail;

      if (existingModel && !existingModelByUser) {
        // Found existing model by Instagram/email - link user_id to it
        console.log(`Linking user ${application.user_id} to existing model ${existingModel.id} (${existingModel.username})`);

        const { error: linkError } = await (adminClient.from("models") as any)
          .update({
            user_id: application.user_id,
            is_approved: true,
            status: "approved",
          })
          .eq("id", existingModel.id);

        if (linkError) {
          console.error("Error linking model:", linkError);
        }

        // Update actor type to model
        const { data: updatedActor, error: actorError } = await adminClient
          .from("actors")
          .update({ type: "model" })
          .eq("user_id", application.user_id)
          .select("id")
          .single();

        // Delete the old fan record (cleanup)
        if (!actorError && updatedActor?.id) {
          await adminClient
            .from("fans")
            .delete()
            .eq("id", updatedActor.id);
        }
      } else if (!existingModel) {
        // No existing model found - create new one
        const username = application.instagram_username ||
          application.tiktok_username ||
          application.email.split("@")[0];

        // Make username unique by adding numbers if needed
        let finalUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        let attempt = 0;

        while (true) {
          const checkUsername = attempt === 0 ? finalUsername : `${finalUsername}${attempt}`;
          const { data: usernameCheck } = await (adminClient.from("models") as any)
            .select("id")
            .eq("username", checkUsername)
            .single();

          if (!usernameCheck) {
            finalUsername = checkUsername;
            break;
          }
          attempt++;
          if (attempt > 100) {
            finalUsername = `${finalUsername}${Date.now()}`;
            break;
          }
        }

        // Create the model record
        const { error: modelError } = await (adminClient.from("models") as any)
          .insert({
            user_id: application.user_id,
            email: application.email,
            username: finalUsername,
            first_name: application.display_name,
            instagram_name: application.instagram_username || null,
            tiktok_username: application.tiktok_username || null,
            is_approved: true,
            status: "approved",
            show_location: true,
            show_social_media: true,
            coin_balance: 0,
          });

        if (modelError) {
          console.error("Error creating model:", modelError);
        }

        // Update actor type to model using admin client
        const { data: updatedActor, error: actorError } = await adminClient
          .from("actors")
          .update({ type: "model" })
          .eq("user_id", application.user_id)
          .select("id")
          .single();

        // Delete the old fan record (cleanup)
        if (!actorError && updatedActor?.id) {
          await adminClient
            .from("fans")
            .delete()
            .eq("id", updatedActor.id);
        }
      } else {
        // Model already exists by user_id, just approve it
        await (adminClient.from("models") as any)
          .update({ is_approved: true, status: "approved" })
          .eq("user_id", application.user_id);

        // Update actor type to model (in case it was still 'fan')
        const { data: updatedActor, error: actorError } = await adminClient
          .from("actors")
          .update({ type: "model" })
          .eq("user_id", application.user_id)
          .select("id")
          .single();

        // Delete the old fan record (cleanup)
        if (!actorError && updatedActor?.id) {
          await adminClient
            .from("fans")
            .delete()
            .eq("id", updatedActor.id);
        }
      }

      // Send approval email
      const emailResult = await sendModelApprovalEmail({
        to: application.email,
        modelName: application.display_name || "Model",
        username: application.instagram_username ||
                  application.tiktok_username ||
                  application.email.split("@")[0],
      });

      if (!emailResult.success) {
        console.error("Failed to send approval email:", emailResult.error);
        // Don't fail the request, just log the error
      }

      // Send welcome chat message from admin (using adminClient to bypass RLS)
      try {
        // Get model's actor ID
        const { data: modelActor } = await adminClient
          .from("actors")
          .select("id")
          .eq("user_id", application.user_id)
          .single() as { data: { id: string } | null };

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

          // Send welcome message
          if (conversationId) {
            const welcomeMessage = `Welcome to EXA, ${application.display_name || "Model"}! 🎉

Your profile has been approved and you're now part of our community.

Here's how to get started:
• Complete your profile with photos and bio
• Share your examodels.com/${application.instagram_username || application.tiktok_username || application.email.split("@")[0]} on Instagram Bio + Story
• Engage with the community 😊`;

            await (adminClient.from("messages") as any).insert({
              conversation_id: conversationId,
              sender_id: actor.id,
              content: welcomeMessage,
              is_system: false,
            });
          }
        }
      } catch (chatError) {
        console.error("Failed to send welcome chat message:", chatError);
        // Don't fail the request, just log the error
      }
    }
    // Note: No email is sent on rejection

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error("Model application update error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

// Delete model application (for spam)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Use service role client to bypass RLS for delete
    const adminClient = createServiceRoleClient();

    // Delete the application
    const { error: deleteError } = await adminClient
      .from("model_applications")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Model application delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
