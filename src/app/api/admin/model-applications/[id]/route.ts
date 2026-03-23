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
      .single();

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
    const { data: application, error: fetchError } = await supabase
      .from("model_applications")
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
    const { error: updateError } = await supabase
      .from("model_applications")
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
      const adminClient = createServiceRoleClient();
      let modelUsername = "";

      // Parallel: fetch fan language + check all 3 possible existing model matches at once
      const [
        { data: fanRecord },
        { data: existingModelByUser },
        { data: igModel },
        { data: emailModel },
      ] = await Promise.all([
        (adminClient as any).from("fans").select("preferred_language").eq("user_id", application.user_id).single(),
        adminClient.from("models").select("id, username, user_id").eq("user_id", application.user_id).single(),
        application.instagram_username
          ? adminClient.from("models").select("id, username, user_id").ilike("instagram_name", escapeIlike(application.instagram_username)).single()
          : Promise.resolve({ data: null }),
        application.email
          ? adminClient.from("models").select("id, username, user_id").ilike("email", escapeIlike(application.email)).single()
          : Promise.resolve({ data: null }),
      ]);

      const preferredLanguage = fanRecord?.preferred_language || "en";
      const existingModelByInstagram = igModel && !igModel.user_id && !existingModelByUser ? igModel : null;
      const existingModelByEmail = emailModel && !emailModel.user_id && !existingModelByUser && !existingModelByInstagram ? emailModel : null;
      const existingModel = existingModelByUser || existingModelByInstagram || existingModelByEmail;

      if (existingModel && !existingModelByUser) {
        // Found existing model by Instagram/email - link user_id to it
        modelUsername = existingModel.username || "";
        // Parallel: link model + update actor type
        const [{ error: linkError }, { data: updatedActor, error: actorError }] = await Promise.all([
          adminClient.from("models").update({
            user_id: application.user_id,
            is_approved: true,
            status: "approved",
            claimed_at: new Date().toISOString(),
            ...(application.instagram_username ? { instagram_name: application.instagram_username } : {}),
          }).eq("id", existingModel.id),
          adminClient.from("actors").update({ type: "model" }).eq("user_id", application.user_id).select("id").single(),
        ]);

        if (linkError) console.error("Error linking model:", linkError);
        if (!actorError && updatedActor?.id) {
          await adminClient.from("fans").delete().eq("id", updatedActor.id);
        }
      } else if (!existingModel) {
        // No existing model found - create new one
        const looksLikeEmail = (s: string) => s.includes("@") || /\.(com|net|org|io|co)$/i.test(s);
        const igUsername = application.instagram_username && !looksLikeEmail(application.instagram_username)
          ? application.instagram_username : null;
        const ttUsername = application.tiktok_username && !looksLikeEmail(application.tiktok_username)
          ? application.tiktok_username : null;
        const username = igUsername || ttUsername || application.email.split("@")[0];

        let finalUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        let attempt = 0;

        while (true) {
          const checkUsername = attempt === 0 ? finalUsername : `${finalUsername}${attempt}`;
          const { data: usernameCheck } = await adminClient.from("models")
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

        modelUsername = finalUsername;

        const { data: updatedActor, error: actorError } = await adminClient
          .from("actors")
          .update({ type: "model" })
          .eq("user_id", application.user_id)
          .select("id")
          .single();

        if (actorError) {
          console.error("Error updating actor:", actorError);
        }

        // Parallel: create model record + delete fan record
        const modelInsert = (adminClient.from("models") as any).insert({
          ...(updatedActor?.id ? { id: updatedActor.id } : {}),
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
          preferred_language: preferredLanguage,
        });

        if (!actorError && updatedActor?.id) {
          const [modelResult] = await Promise.all([
            modelInsert,
            adminClient.from("fans").delete().eq("id", updatedActor.id),
          ]);
          if (modelResult?.error) console.error("Error creating model:", modelResult.error);
        } else {
          const { error: modelError } = await modelInsert;
          if (modelError) console.error("Error creating model:", modelError);
        }
      } else {
        // Model already exists by user_id, just approve it
        modelUsername = existingModelByUser!.username || "";
        // Parallel: approve model + update actor type
        const [, { data: updatedActor, error: actorError }] = await Promise.all([
          adminClient.from("models").update({ is_approved: true, status: "approved" }).eq("user_id", application.user_id),
          adminClient.from("actors").update({ type: "model" }).eq("user_id", application.user_id).select("id").single(),
        ]);

        if (!actorError && updatedActor?.id) {
          await adminClient.from("fans").delete().eq("id", updatedActor.id);
        }
      }

      // Fire-and-forget: send email + welcome chat in background (don't block response)
      const sendEmailAndChat = async () => {
        try {
          const emailResult = await sendModelApprovalEmail({
            to: application.email,
            modelName: application.display_name || "Model",
            username: modelUsername,
            language: preferredLanguage,
          });
          if (!emailResult.success) console.error("Failed to send approval email:", emailResult.error);
        } catch (e) {
          console.error("Failed to send approval email:", e);
        }

        try {
          const { data: modelActor } = await adminClient
            .from("actors")
            .select("id")
            .eq("user_id", application.user_id)
            .single();

          if (modelActor) {
            let conversationId: string | null = null;

            // Single query: find shared conversation instead of looping
            const { data: adminConvs } = await adminClient
              .from("conversation_participants")
              .select("conversation_id")
              .eq("actor_id", actor.id);

            if (adminConvs?.length) {
              const convIds = adminConvs.map((c: { conversation_id: string }) => c.conversation_id);
              const { data: match } = await adminClient
                .from("conversation_participants")
                .select("conversation_id")
                .eq("actor_id", modelActor.id)
                .in("conversation_id", convIds)
                .limit(1)
                .single();

              conversationId = match?.conversation_id || null;
            }

            if (!conversationId) {
              const { data: newConv } = await adminClient
                .from("conversations")
                .insert({ type: "direct" })
                .select()
                .single();

              if (newConv) {
                conversationId = newConv.id;
                await adminClient.from("conversation_participants").insert([
                  { conversation_id: conversationId, actor_id: actor.id },
                  { conversation_id: conversationId, actor_id: modelActor.id },
                ]);
              }
            }

            if (conversationId) {
              await adminClient.from("messages").insert({
                conversation_id: conversationId,
                sender_id: actor.id,
                content: `Welcome to EXA, ${application.display_name || "Model"}! 🎉\n\nYour profile has been approved and you're now part of our community.\n\nHere's how to get started:\n• Complete your profile with photos and bio\n• Share your examodels.com/${modelUsername} on Instagram Bio + Story\n• Engage with the community 😊`,
                is_system: false,
              });
            }
          }
        } catch (chatError) {
          console.error("Failed to send welcome chat message:", chatError);
        }
      };

      // Don't await — email + chat happen after response is sent
      sendEmailAndChat();
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
      .single();

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
