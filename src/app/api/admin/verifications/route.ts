/**
 * GET /api/admin/verifications?status=pending_review
 *
 * Lists verification requests for admin review. Includes signed download
 * URLs for the ID document and selfie so the admin UI can render them
 * inline without exposing the storage bucket.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes

const querySchema = z.object({
  status: z.enum(["pending_review", "approved", "rejected", "all"]).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ status: searchParams.get("status") || undefined });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const status = parsed.data.status || "pending_review";

    const admin = createServiceRoleClient();
    let query = (admin as any)
      .from("model_verifications")
      .select(`
        id,
        status,
        submitted_at,
        reviewed_at,
        rejection_reason,
        legal_name,
        date_of_birth,
        country,
        id_document_path,
        selfie_path,
        model:models(id, username, first_name, last_name, email, dob, date_of_birth, country_code, instagram_name)
      `)
      .order("submitted_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      logger.error("Admin verifications list error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sign URLs in parallel.
    const enriched = await Promise.all(
      (data || []).map(async (row: any) => {
        const [idDoc, selfie] = await Promise.all([
          admin.storage
            .from("identity-documents")
            .createSignedUrl(row.id_document_path, SIGNED_URL_TTL_SECONDS),
          admin.storage
            .from("identity-documents")
            .createSignedUrl(row.selfie_path, SIGNED_URL_TTL_SECONDS),
        ]);
        return {
          ...row,
          id_document_url: idDoc.data?.signedUrl || null,
          selfie_url: selfie.data?.signedUrl || null,
        };
      })
    );

    return NextResponse.json({ verifications: enriched });
  } catch (error) {
    logger.error("Admin verifications list error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
