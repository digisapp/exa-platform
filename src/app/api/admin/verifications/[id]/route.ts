/**
 * PATCH /api/admin/verifications/[id]
 *
 * Approve or reject a model verification submission. Approval atomically
 * stamps the model's `identity_verified_at` and copies the legal name +
 * DOB + country from the document into the model row.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Retention policy: the ID photo + selfie exist only to be reviewed. Once a
// decision is made, the extracted facts (legal name, DOB, country, reviewer,
// timestamp) are the durable record and the images are pure breach liability —
// so they are deleted from storage immediately after approve/reject. The admin
// UI already tolerates missing objects (signed URLs degrade to null).
async function purgeVerificationDocuments(verificationId: string) {
  try {
    const admin = createServiceRoleClient();
    const { data: row } = await admin
      .from("model_verifications")
      .select("id_document_path, selfie_path")
      .eq("id", verificationId)
      .single();
    if (!row) return;
    const paths = [row.id_document_path, row.selfie_path].filter(Boolean) as string[];
    if (paths.length === 0) return;
    const { error } = await admin.storage.from("identity-documents").remove(paths);
    if (error) {
      logger.error("Failed to purge verification documents", { verificationId, error });
    }
  } catch (e) {
    logger.error("Failed to purge verification documents", { verificationId, error: e });
  }
}

// Reject DOBs that imply the model is under 18, or in the future.
function isAdultDob(dob: string): boolean {
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (d > now) return false;
  const eighteenYearsAgo = new Date(
    Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate())
  );
  return d <= eighteenYearsAgo;
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    legal_name: z.string().trim().min(1).max(200),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
      .refine(isAdultDob, "model must be 18+ and DOB cannot be in the future"),
    country: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "must be a 2-letter ISO country code"),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(1).max(1000),
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Use the user-context client so the SECURITY DEFINER RPCs can read
    // auth.uid() and confirm the caller is an admin.
    const supabase = await createClient();

    if (parsed.data.action === "approve") {
      const { data, error } = await (supabase as any).rpc("approve_model_verification", {
        p_verification_id: id,
        p_legal_name: parsed.data.legal_name,
        p_date_of_birth: parsed.data.date_of_birth,
        p_country: parsed.data.country.toUpperCase(),
      });

      if (error) {
        logger.error("approve_model_verification RPC failed", error);
        return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
      }
      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        return NextResponse.json({ error: result?.error || "Failed to approve" }, { status: 400 });
      }
      await purgeVerificationDocuments(id);
      return NextResponse.json({ success: true });
    }

    // reject
    const { data, error } = await (supabase as any).rpc("reject_model_verification", {
      p_verification_id: id,
      p_reason: parsed.data.reason,
    });

    if (error) {
      logger.error("reject_model_verification RPC failed", error);
      return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
    }
    const result = data as { success: boolean; error?: string };
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || "Failed to reject" }, { status: 400 });
    }
    await purgeVerificationDocuments(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Admin verification PATCH error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
