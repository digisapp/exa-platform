import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// GET - Compare two models for merge preview
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keepUsername = searchParams.get("keep");
    const deleteUsername = searchParams.get("delete");

    if (!keepUsername || !deleteUsername) {
      return NextResponse.json(
        { error: "Both 'keep' and 'delete' username params required" },
        { status: 400 }
      );
    }

    // Fetch both models
    const { data: keepModel } = await (adminClient
      .from("models") as any)
      .select("*, actors:user_id(id, type)")
      .eq("username", keepUsername)
      .single();

    const { data: deleteModel } = await (adminClient
      .from("models") as any)
      .select("*, actors:user_id(id, type)")
      .eq("username", deleteUsername)
      .single();

    if (!keepModel) {
      return NextResponse.json({ error: `Model '${keepUsername}' not found` }, { status: 404 });
    }
    if (!deleteModel) {
      return NextResponse.json({ error: `Model '${deleteUsername}' not found` }, { status: 404 });
    }

    // Get content counts
    const [keepContent, deleteContent, keepMedia, deleteMedia] = await Promise.all([
      adminClient.from("premium_content").select("id", { count: "exact", head: true }).eq("model_id", keepModel.id),
      adminClient.from("premium_content").select("id", { count: "exact", head: true }).eq("model_id", deleteModel.id),
      adminClient.from("media_assets").select("id", { count: "exact", head: true }).eq("model_id", keepModel.id),
      adminClient.from("media_assets").select("id", { count: "exact", head: true }).eq("model_id", deleteModel.id),
    ]);

    // Get actor info for both
    let keepActor = null;
    let deleteActor = null;

    if (keepModel.user_id) {
      const { data } = await adminClient.from("actors").select("*").eq("user_id", keepModel.user_id).single();
      keepActor = data;
    }
    if (deleteModel.user_id) {
      const { data } = await adminClient.from("actors").select("*").eq("user_id", deleteModel.user_id).single();
      deleteActor = data;
    }

    return NextResponse.json({
      keep: {
        id: keepModel.id,
        username: keepModel.username,
        email: keepModel.email,
        first_name: keepModel.first_name,
        last_name: keepModel.last_name,
        user_id: keepModel.user_id,
        claimed_at: keepModel.claimed_at,
        last_active_at: keepModel.last_active_at,
        profile_photo_url: keepModel.profile_photo_url,
        content_count: (keepContent.count || 0) + (keepMedia.count || 0),
        premium_content_count: keepContent.count || 0,
        media_count: keepMedia.count || 0,
        coin_balance: keepModel.coin_balance || 0,
        actor: keepActor,
        is_approved: keepModel.is_approved,
      },
      delete: {
        id: deleteModel.id,
        username: deleteModel.username,
        email: deleteModel.email,
        first_name: deleteModel.first_name,
        last_name: deleteModel.last_name,
        user_id: deleteModel.user_id,
        claimed_at: deleteModel.claimed_at,
        last_active_at: deleteModel.last_active_at,
        profile_photo_url: deleteModel.profile_photo_url,
        content_count: (deleteContent.count || 0) + (deleteMedia.count || 0),
        premium_content_count: deleteContent.count || 0,
        media_count: deleteMedia.count || 0,
        coin_balance: deleteModel.coin_balance || 0,
        actor: deleteActor,
        is_approved: deleteModel.is_approved,
      },
      canMerge: true,
      warning: deleteModel.user_id && !keepModel.user_id
        ? "Will transfer login from delete account to keep account"
        : deleteModel.user_id && keepModel.user_id
        ? "Both accounts have logins - will need to pick which auth to keep"
        : null,
    });
  } catch (error) {
    console.error("Merge preview error:", error);
    return NextResponse.json({ error: "Failed to preview merge" }, { status: 500 });
  }
}

// POST - Execute the merge
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { keepUsername, deleteUsername } = await request.json();

    if (!keepUsername || !deleteUsername) {
      return NextResponse.json(
        { error: "Both keepUsername and deleteUsername required" },
        { status: 400 }
      );
    }

    // Fetch both models
    const { data: keepModel } = await adminClient
      .from("models")
      .select("*")
      .eq("username", keepUsername)
      .single();

    const { data: deleteModel } = await adminClient
      .from("models")
      .select("*")
      .eq("username", deleteUsername)
      .single();

    if (!keepModel || !deleteModel) {
      return NextResponse.json({ error: "One or both models not found" }, { status: 404 });
    }

    const actions: string[] = [];

    // Step 1: If delete model has user_id but keep doesn't, transfer it
    if (deleteModel.user_id && !keepModel.user_id) {
      // Update the keep model with the user_id
      await adminClient
        .from("models")
        .update({
          user_id: deleteModel.user_id,
          claimed_at: deleteModel.claimed_at || new Date().toISOString(),
          last_active_at: deleteModel.last_active_at,
        })
        .eq("id", keepModel.id);

      actions.push(`Transferred login (user_id) from ${deleteUsername} to ${keepUsername}`);

      // Update the actor to point to the keep model
      // Since models.id references actors.id, we need to handle this carefully
      // The actor's user_id stays the same, but we need to ensure the model FK is correct

      // First, clear the user_id from delete model so we can delete it
      await adminClient
        .from("models")
        .update({ user_id: null })
        .eq("id", deleteModel.id);

      actions.push("Cleared user_id from duplicate account");
    }

    // Step 2: Transfer any content from delete to keep
    const { data: mediaData } = await adminClient
      .from("media_assets")
      .update({ model_id: keepModel.id })
      .eq("model_id", deleteModel.id)
      .select("id");

    if (mediaData && mediaData.length > 0) {
      actions.push(`Transferred ${mediaData.length} media assets`);
    }

    const { data: contentData } = await adminClient
      .from("premium_content")
      .update({ model_id: keepModel.id })
      .eq("model_id", deleteModel.id)
      .select("id");

    if (contentData && contentData.length > 0) {
      actions.push(`Transferred ${contentData.length} premium content items`);
    }

    // Step 3: Combine coin balances
    if ((deleteModel.coin_balance || 0) > 0) {
      await adminClient
        .from("models")
        .update({
          coin_balance: (keepModel.coin_balance || 0) + (deleteModel.coin_balance || 0)
        })
        .eq("id", keepModel.id);

      actions.push(`Combined coin balances (added ${deleteModel.coin_balance} coins)`);
    }

    // Step 4: Delete the duplicate model
    // First check if there's an actor with this model id
    const { data: deleteActor } = await adminClient
      .from("actors")
      .select("id")
      .eq("id", deleteModel.id)
      .single();

    if (deleteActor) {
      // Delete the actor (will cascade to model due to FK)
      await adminClient
        .from("actors")
        .delete()
        .eq("id", deleteModel.id);

      actions.push(`Deleted duplicate actor and model: ${deleteUsername}`);
    } else {
      // Just delete the model
      await adminClient
        .from("models")
        .delete()
        .eq("id", deleteModel.id);

      actions.push(`Deleted duplicate model: ${deleteUsername}`);
    }

    return NextResponse.json({
      success: true,
      message: `Merged ${deleteUsername} into ${keepUsername}`,
      actions,
      keptModel: keepUsername,
      deletedModel: deleteUsername,
    });
  } catch (error: any) {
    console.error("Merge error:", error);
    return NextResponse.json({
      error: "Failed to merge models",
      details: error?.message
    }, { status: 500 });
  }
}
