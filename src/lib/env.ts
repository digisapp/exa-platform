/**
 * Environment variable validation
 *
 * Import this module on the server side to validate that all required
 * environment variables are present. Throws a clear error on startup
 * if any are missing, rather than failing at runtime with cryptic errors.
 */

// Required server-side environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

// Validate on module load (server-side only)
if (typeof window === 'undefined') {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`
    );
  }
}
