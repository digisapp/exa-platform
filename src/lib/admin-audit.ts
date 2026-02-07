import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

interface AuditLogParams {
  supabase: SupabaseClient;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

/**
 * Log an admin action for audit purposes
 * This function is non-blocking and won't fail the main request if logging fails
 */
export async function logAdminAction({
  supabase,
  adminUserId,
  action,
  targetType,
  targetId,
  oldValues,
  newValues,
}: AuditLogParams): Promise<void> {
  try {
    // Get request headers for IP and user agent
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                      headersList.get("x-real-ip") ||
                      null;
    const userAgent = headersList.get("user-agent") || null;

    await (supabase.rpc as any)("log_admin_action", {
      p_admin_user_id: adminUserId,
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId || null,
      p_old_values: oldValues ? JSON.stringify(oldValues) : null,
      p_new_values: newValues ? JSON.stringify(newValues) : null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should not fail main operations
    console.error("Failed to log admin action:", error);
  }
}

// Common admin action types
export const AdminActions = {
  // Model actions
  MODEL_APPROVED: "model_approved",
  MODEL_REJECTED: "model_rejected",
  MODEL_DELETED: "model_deleted",
  MODEL_RATING_CHANGED: "model_rating_changed",
  MODEL_CONVERTED_TO_FAN: "model_converted_to_fan",
  MODEL_NEW_FACE_SET: "model_new_face_set",

  // Fan actions
  FAN_CONVERTED_TO_MODEL: "fan_converted_to_model",
  FAN_UPDATED: "fan_updated",
  FAN_SUSPENDED: "fan_suspended",
  FAN_UNSUSPENDED: "fan_unsuspended",
  FAN_DELETED: "fan_deleted",

  // Brand actions
  BRAND_UPDATED: "brand_updated",
  BRAND_DELETED: "brand_deleted",

  // Model merge actions
  MODELS_MERGED: "models_merged",

  // Gig application actions
  GIG_APPLICATION_UPDATED: "gig_application_updated",

  // Payout actions
  PAYOUT_APPROVED: "payout_approved",
  PAYOUT_REJECTED: "payout_rejected",
  PAYOUT_PROCESSING: "payout_processing",

  // Application actions
  APPLICATION_APPROVED: "application_approved",
  APPLICATION_REJECTED: "application_rejected",

  // Media actions
  MEDIA_DELETED: "media_deleted",
  MEDIA_FEATURED: "media_featured",

  // Gig actions
  GIG_CREATED: "gig_created",
  GIG_APPLICATION_APPROVED: "gig_application_approved",
  GIG_APPLICATION_REJECTED: "gig_application_rejected",
} as const;
