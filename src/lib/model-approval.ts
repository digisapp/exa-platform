import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendModelApprovalEmail } from "@/lib/email";
import { sendModelApprovalSMS } from "@/lib/sms";
import { escapeIlike } from "@/lib/utils";
import { isAdultDob } from "@/lib/age";

// Carries the fan's coin balance onto the model row and soft-deletes the fan
// record (deleted_reason 'converted_to_model') in one transaction — replaces
// the old bare DELETE FROM fans, which dropped the balance (and let clawback
// debt escape) on conversion.
async function migrateFanWallet(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  userId: string
) {
  const { data, error } = await (adminClient.rpc as any)(
    "convert_fan_wallet_to_model",
    { p_user_id: userId }
  );
  const result = data as { success?: boolean; error?: string } | null;
  if (error || !result?.success) {
    console.error("Fan wallet migration failed:", error || result?.error);
  }
}

/**
 * Approves a model application: marks it approved, converts the fan account
 * to a model (linking an unclaimed imported profile when one matches), then
 * fires the approval email/SMS and admin welcome chat in the background.
 *
 * Called from the admin approve route (and one-off triage scripts) — every
 * approval is an explicit admin decision; photo uploads no longer auto-approve.
 * Callers gate on email_confirmed_at and profile_photo_url BEFORE calling —
 * this function does not re-check.
 */
export async function approveModelApplication({
  application,
  reviewerActorId,
}: {
  /** Full model_applications row (photo/bio fields included) */
  application: any;
  /** Admin actors.id — recorded as reviewed_by and used as welcome-chat sender */
  reviewerActorId: string;
}): Promise<{ success: boolean; error?: string }> {
  // 18+ backstop: every path that publishes a model funnels through here.
  // Applications predating required-DOB signup can have a null date_of_birth —
  // those need the DOB collected before they can be approved.
  if (!application.date_of_birth || !isAdultDob(application.date_of_birth)) {
    return {
      success: false,
      error: application.date_of_birth
        ? "Cannot approve: applicant's date of birth is under 18"
        : "Cannot approve: application has no date of birth on file",
    };
  }

  const adminClient = createServiceRoleClient();

  const { error: updateError } = await adminClient
    .from("model_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerActorId,
    })
    .eq("id", application.id);

  if (updateError) {
    console.error("Application approve update error:", updateError);
    return { success: false, error: "Failed to update application" };
  }

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
      ? adminClient.from("models").select("id, username, user_id, email").ilike("instagram_name", escapeIlike(application.instagram_username)).single()
      : Promise.resolve({ data: null }),
    application.email
      ? adminClient.from("models").select("id, username, user_id").ilike("email", escapeIlike(application.email)).single()
      : Promise.resolve({ data: null }),
  ]);

  const preferredLanguage = fanRecord?.preferred_language || "en";
  // Only hand over an unclaimed profile matched by Instagram when the emails
  // agree (or the stub has none on file) — otherwise an applicant could claim
  // an imported model's profile just by submitting their handle.
  const igEmailMatches = !((igModel as any)?.email) ||
    (igModel as any).email.toLowerCase() === application.email?.toLowerCase();
  const existingModelByInstagram = igModel && !igModel.user_id && !existingModelByUser && igEmailMatches ? igModel : null;
  const existingModelByEmail = emailModel && !emailModel.user_id && !existingModelByUser && !existingModelByInstagram ? emailModel : null;
  const existingModel = existingModelByUser || existingModelByInstagram || existingModelByEmail;

  // Profile the applicant built while pending (photo + bio) — copied onto
  // the model row so she can be visible on /models the moment she's
  // approved. Applicant-uploaded values win over imported/stale ones.
  const pendingProfileFields = {
    ...(application.profile_photo_url
      ? {
          profile_photo_url: application.profile_photo_url,
          profile_photo_width: application.profile_photo_width ?? null,
          profile_photo_height: application.profile_photo_height ?? null,
        }
      : {}),
    ...(application.bio ? { bio: application.bio } : {}),
  };

  if (existingModel && !existingModelByUser) {
    // Found existing model by Instagram/email - link user_id to it
    modelUsername = existingModel.username || "";
    // Parallel: link model + update actor type
    const [{ error: linkError }] = await Promise.all([
      adminClient.from("models").update({
        user_id: application.user_id,
        is_approved: true,
        status: "approved",
        claimed_at: new Date().toISOString(),
        ...(application.instagram_username ? { instagram_name: application.instagram_username } : {}),
        ...(application.date_of_birth
          ? { dob: application.date_of_birth, date_of_birth: application.date_of_birth }
          : {}),
        ...(application.phone ? { phone: application.phone } : {}),
        ...(application.height ? { height: application.height } : {}),
        ...pendingProfileFields,
      }).eq("id", existingModel.id),
      adminClient.from("actors").update({ type: "model" }).eq("user_id", application.user_id).select("id").single(),
    ]);

    if (linkError) console.error("Error linking model:", linkError);
    // Transfer fan wallet to the linked model and remove the fan record
    await migrateFanWallet(adminClient, application.user_id);
  } else if (!existingModel) {
    // No existing model found - create new one
    const looksLikeEmail = (s: string) => s.includes("@") || /\.(com|net|org|io|co|edu|gov|me|info|biz)$/i.test(s) || /[a-z0-9](gmail|yahoo|hotmail|outlook|icloud|aol|protonmail|mail)/i.test(s);
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
        // Short random suffix instead of a 13-digit timestamp
        finalUsername = `${finalUsername}${Math.floor(1000 + Math.random() * 9000)}`;
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
      dob: application.date_of_birth || null,
      date_of_birth: application.date_of_birth || null,
      phone: application.phone || null,
      height: application.height || null,
      is_approved: true,
      status: "approved",
      show_location: true,
      show_social_media: true,
      // NEW approvals default onto the /rates directory (2026-07-22).
      // Deliberately NOT a column-default migration and NOT set on the
      // link-existing / approve-existing paths above — existing rows keep
      // whatever visibility they chose.
      show_on_rates_page: true,
      coin_balance: 0,
      preferred_language: preferredLanguage,
      ...pendingProfileFields,
    });

    // Model must exist before the wallet transfer — the RPC refuses to
    // drop a fan wallet with no model row to receive the balance
    const modelResult = await modelInsert;
    if (modelResult?.error) {
      console.error("Error creating model:", modelResult.error);
    } else {
      await migrateFanWallet(adminClient, application.user_id);
    }
  } else {
    // Model already exists by user_id, just approve it
    modelUsername = existingModelByUser!.username || "";
    // Parallel: approve model + update actor type
    await Promise.all([
      adminClient.from("models").update({ is_approved: true, status: "approved", ...pendingProfileFields }).eq("user_id", application.user_id),
      adminClient.from("actors").update({ type: "model" }).eq("user_id", application.user_id).select("id").single(),
    ]);

    // Transfer any leftover fan wallet to the approved model
    await migrateFanWallet(adminClient, application.user_id);
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

    // SMS is the channel most likely to actually reach her — the email
    // can land in spam and she'd never know she was approved.
    if (application.phone) {
      try {
        await sendModelApprovalSMS(
          application.phone,
          application.display_name || "Model",
          preferredLanguage
        );
      } catch (e) {
        console.error("Failed to send approval SMS:", e);
      }
    }

    try {
      const { data: modelActor } = await adminClient
        .from("actors")
        .select("id")
        .eq("user_id", application.user_id)
        .single();

      if (modelActor) {
        let conversationId: string | null = null;

        // Find a shared conversation starting from the MODEL's side — she's in
        // at most a handful. Starting from the admin (700+ conversations) put
        // every id into one .in(), which blows PostgREST's ~16KB URL limit and
        // silently matches nothing, so each approval spawned a new conversation.
        const { data: modelConvs } = await adminClient
          .from("conversation_participants")
          .select("conversation_id")
          .eq("actor_id", modelActor.id)
          .limit(200);

        if (modelConvs?.length) {
          const convIds = modelConvs.map((c: { conversation_id: string }) => c.conversation_id);
          const { data: match } = await adminClient
            .from("conversation_participants")
            .select("conversation_id")
            .eq("actor_id", reviewerActorId)
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
              { conversation_id: conversationId, actor_id: reviewerActorId },
              { conversation_id: conversationId, actor_id: modelActor.id },
            ]);
          }
        }

        if (conversationId) {
          await adminClient.from("messages").insert({
            conversation_id: conversationId,
            sender_id: reviewerActorId,
            content: `Welcome to EXA, ${application.display_name || "Model"}! 🎉\n\nYour application has been approved and you're live on EXA.\n\nHere's how to get started:\n• Share your examodels.com/${modelUsername} on Instagram Bio + Story\n• Set your rates so fans can message & call you: examodels.com/settings?tab=rates\n• Add more photos to your portfolio\n• Engage with the community 😊`,
            is_system: false,
          });
        }
      }
    } catch (chatError) {
      console.error("Failed to send welcome chat message:", chatError);
    }
  };

  // Don't await — email + chat happen after the caller's response is sent
  sendEmailAndChat();

  return { success: true };
}
