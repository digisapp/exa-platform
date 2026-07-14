import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendPhotoRequestEmail } from "@/lib/email";
import { approveModelApplication } from "@/lib/model-approval";

// Update model application status (approve/reject/request_photo)
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

    if (!status || !["approved", "rejected", "request_photo", "pending"].includes(status)) {
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

    // Restore a rejected application to pending — the undo path for the
    // triage queue's fast reject. Approved applications can't be reverted
    // this way: approval already created/linked the model account.
    if (status === "pending") {
      if (application.status !== "rejected") {
        return NextResponse.json(
          { error: "Only rejected applications can be restored to pending." },
          { status: 400 }
        );
      }
      const adminClient = createServiceRoleClient();
      const { error: restoreError } = await adminClient
        .from("model_applications")
        .update({ status: "pending", reviewed_at: null, reviewed_by: null })
        .eq("id", id);
      if (restoreError) {
        throw restoreError;
      }
      return NextResponse.json({ success: true, status: "pending" });
    }

    // Approval requires proven email ownership — the confirm link in the
    // application-received email. Pre-feature applications were backfilled
    // as confirmed, so this only gates post-feature applicants. The photo
    // request path shares the gate: auto-approval on upload would otherwise
    // dead-end for unconfirmed applicants.
    if ((status === "approved" || status === "request_photo") && !(application as any).email_confirmed_at) {
      return NextResponse.json(
        { error: "Applicant hasn't confirmed their email yet. Ask them to click the link in their application email (resend available on their pending page)." },
        { status: 400 }
      );
    }

    // A model without a photo is invisible everywhere (explore, gigs, search),
    // so approving her only creates a dead profile. Use "Request photo"
    // instead — she's auto-approved the moment she uploads one.
    if (status === "approved" && !(application as any).profile_photo_url) {
      return NextResponse.json(
        { error: "No profile photo yet — use \"Request photo\" instead: she gets a you're-selected email and is auto-approved the moment she uploads one." },
        { status: 400 }
      );
    }

    // ── Request photo: mark as selected-pending-photo + email the applicant ──
    if (status === "request_photo") {
      if ((application as any).profile_photo_url) {
        return NextResponse.json(
          { error: "This application already has a photo — just approve it." },
          { status: 400 }
        );
      }
      if (application.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending applications can have a photo requested." },
          { status: 400 }
        );
      }

      const adminClient = createServiceRoleClient();
      const { error: requestError } = await adminClient
        .from("model_applications")
        .update({
          photo_requested_at: new Date().toISOString(),
          photo_requested_by: actor.id,
        })
        .eq("id", id);

      if (requestError) {
        throw requestError;
      }

      // Fire-and-forget — don't block the response on Resend
      sendPhotoRequestEmail({
        to: application.email,
        modelName: application.display_name || "Model",
        language: (application as any).preferred_language || "en",
      }).catch((e) => console.error("Failed to send photo request email:", e));

      return NextResponse.json({ success: true, status: "photo_requested" });
    }

    if (status === "approved") {
      const result = await approveModelApplication({
        application,
        reviewerActorId: actor.id,
      });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, status });
    }

    // Rejection: status update only — no email is sent on rejection
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

    // Clean up any photo the applicant uploaded while pending — spam deletion
    // is the one path where the file would otherwise be orphaned forever
    const { data: appToDelete } = await adminClient
      .from("model_applications")
      .select("profile_photo_url")
      .eq("id", id)
      .maybeSingle();
    const photoPath = (appToDelete?.profile_photo_url as string | null)?.split("/avatars/")[1];
    if (photoPath) {
      await adminClient.storage.from("avatars").remove([photoPath]);
    }

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
