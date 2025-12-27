import { SupabaseClient } from "@supabase/supabase-js";

/**
 * ID Helper Utilities
 *
 * The EXA platform has 3 types of IDs:
 * - user_id (auth.users.id) - Authentication identity
 * - actor_id (actors.id) - App identity for any role (model/fan/brand/admin)
 * - model_id (models.id) - Model-specific profile
 *
 * These are NOT the same UUIDs! Use these helpers to get the correct ID.
 *
 * Usage:
 * - Actor-owned tables (messages, wallets, coin_transactions) → use actorId
 * - Model-owned tables (premium_content, portfolio) → use modelId
 * - Auth-owned tables → use userId directly
 */

interface ActorInfo {
  id: string;
  type: "model" | "fan" | "brand" | "admin";
}

interface ModelInfo {
  id: string;
  username: string;
}

/**
 * Get the actor ID and type for a given auth user
 */
export async function getActorInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<ActorInfo | null> {
  const { data } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", userId)
    .single();

  return data as ActorInfo | null;
}

/**
 * Get just the actor ID for a given auth user
 */
export async function getActorId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const info = await getActorInfo(supabase, userId);
  return info?.id || null;
}

/**
 * Get the model ID and username for a given auth user
 * Returns null if the user is not a model
 */
export async function getModelInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<ModelInfo | null> {
  const { data } = await supabase
    .from("models")
    .select("id, username")
    .eq("user_id", userId)
    .single();

  return data as ModelInfo | null;
}

/**
 * Get just the model ID for a given auth user
 * Returns null if the user is not a model
 */
export async function getModelId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const info = await getModelInfo(supabase, userId);
  return info?.id || null;
}

/**
 * Get both actor and model info in one call (for models/admins)
 * Useful when you need both IDs
 */
export async function getFullIdentity(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  actorId: string | null;
  actorType: string | null;
  modelId: string | null;
}> {
  const [actorInfo, modelInfo] = await Promise.all([
    getActorInfo(supabase, userId),
    getModelInfo(supabase, userId),
  ]);

  return {
    actorId: actorInfo?.id || null,
    actorType: actorInfo?.type || null,
    modelId: modelInfo?.id || null,
  };
}
