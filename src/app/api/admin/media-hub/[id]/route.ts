import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const adminClient = createServiceRoleClient();

const updateLibraryItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
});

// GET - Get single library item with files and assignments
export const GET = withAuth<{ id: string }>(
  async ({ params }) => {
    const { id } = params;

    const { data: item, error } = await adminClient.from("content_library" as any)
      .select("*")
      .eq("id", id)
      .maybeSingle() as { data: any; error: any };

    if (error || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get files
    const { data: files } = await adminClient.from("content_library_files" as any)
      .select("*")
      .eq("library_item_id", id)
      .order("created_at", { ascending: true }) as { data: any };

    // Get assignments with brand info
    const { data: assignments } = await adminClient.from("content_assignments" as any)
      .select("id, library_item_id, recipient_actor_id, assigned_by, notes, assigned_at")
      .eq("library_item_id", id) as { data: any };

    // Enrich assignments with brand/model names
    let enrichedAssignments: any[] = [];
    if (assignments && assignments.length > 0) {
      const recipientIds = assignments.map((a: any) => a.recipient_actor_id);

      // Fetch brand info
      const { data: brands } = await adminClient.from("brands" as any)
        .select("id, company_name, logo_url")
        .in("id", recipientIds) as { data: any };

      const brandMap: Record<string, any> = {};
      (brands || []).forEach((b: any) => { brandMap[b.id] = b; });

      // Fetch model actor info for non-brand recipients
      const nonBrandIds = recipientIds.filter((id: string) => !brandMap[id]);
      const modelMap: Record<string, any> = {};

      if (nonBrandIds.length > 0) {
        const { data: actors } = await adminClient
          .from("actors")
          .select("id, user_id, type")
          .in("id", nonBrandIds) as { data: any };

        const modelActors = (actors || []).filter((a: any) => a.type === "model");
        if (modelActors.length > 0) {
          const userIds = modelActors.map((a: any) => a.user_id).filter(Boolean);
          const { data: models } = await adminClient
            .from("models")
            .select("user_id, first_name, last_name, username, profile_photo_url")
            .in("user_id", userIds) as { data: any };

          const modelByUserId: Record<string, any> = {};
          (models || []).forEach((m: any) => { modelByUserId[m.user_id] = m; });

          modelActors.forEach((a: any) => {
            const m = modelByUserId[a.user_id];
            if (m) {
              const name = m.first_name
                ? `${m.first_name}${m.last_name ? ` ${m.last_name}` : ""}`
                : m.username || "Unknown";
              modelMap[a.id] = {
                id: a.id,
                name,
                imageUrl: m.profile_photo_url,
              };
            }
          });
        }
      }

      enrichedAssignments = assignments.map((a: any) => ({
        ...a,
        brand: brandMap[a.recipient_actor_id] || null,
        model: modelMap[a.recipient_actor_id] || null,
        recipientType: brandMap[a.recipient_actor_id] ? "brand" : modelMap[a.recipient_actor_id] ? "model" : "unknown",
      }));
    }

    return NextResponse.json({
      item: {
        ...item,
        files: files || [],
        assignments: enrichedAssignments,
      },
    });
  },
  { requireType: "admin", rateLimit: "general" }
);

// PATCH - Update library item
export const PATCH = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id } = params;

    const body = await request.json();
    const parsed = updateLibraryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updateData: any = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

    const { data: updated, error } = await adminClient.from("content_library" as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single() as { data: any; error: any };

    if (error || !updated) {
      logger.error("Failed to update library item", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ item: updated });
  },
  { requireType: "admin", rateLimit: "general" }
);

// DELETE - Delete library item and all associated files
export const DELETE = withAuth<{ id: string }>(
  async ({ params }) => {
    const { id } = params;

    // Get all files to delete from storage
    const { data: files } = await adminClient.from("content_library_files" as any)
      .select("storage_path")
      .eq("library_item_id", id) as { data: any };

    // Delete files from storage
    if (files && files.length > 0) {
      const paths = files.map((f: any) => f.storage_path);
      const { error: storageError } = await adminClient.storage
        .from("portfolio")
        .remove(paths);

      if (storageError) {
        logger.error("Storage delete error", storageError);
      }
    }

    // Delete DB record (CASCADE handles files + assignments)
    const { error } = await adminClient.from("content_library" as any)
      .delete()
      .eq("id", id) as { error: any };

    if (error) {
      logger.error("Failed to delete library item", error);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  },
  { requireType: "admin", rateLimit: "general" }
);
