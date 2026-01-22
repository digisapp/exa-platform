import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Creates a Supabase client with the service role key
 * This bypasses RLS and should only be used for server-side operations
 * like sending emails, background jobs, etc.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
